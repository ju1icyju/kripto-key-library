import { ethers } from 'ethers';

export const NETWORKS = [
    {
        name: 'ETH',
        urls: [
            'https://rpc.ankr.com/eth',
            'https://ethereum-rpc.publicnode.com',
            'https://eth.drpc.org',
            'https://rpc.payload.de',
        ],
        ticker: 'ETH'
    },
    {
        name: 'BNB',
        urls: [
            'https://bsc-dataseed1.binance.org/',
            'https://rpc.ankr.com/bsc',
            'https://bsc-rpc.publicnode.com',
            'https://bsc.drpc.org',
        ],
        ticker: 'BNB'
    }
];

const createBatchPayload = (addresses: string[], idStart: number) => {
    return addresses.map((addr, i) => ({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [addr, 'latest'],
        id: idStart + i
    }));
};

const chunkArray = <T>(arr: T[], size: number): T[][] => {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size)
    );
};

export interface BalanceResult {
    address: string;
    balance: number;
    symbol: string;
}

export interface ChunkStatus {
    network: string;
    chunkIndex: number;
    status: 'ok' | 'error';
    error?: string;
}

export interface CheckResult {
    balances: BalanceResult[];
    allVerified: boolean;
    errors: string[];
    chunkStatuses: ChunkStatus[];
    networksVerified: string[];
    aborted: boolean;
}

export type SpeedMode = 'normal' | 'fast' | 'turbo';

const SPEED_DELAYS: Record<SpeedMode, number> = {
    normal: 200,
    fast: 80,
    turbo: 30,
};

// Timeout per speed mode — turbo needs shorter timeouts to avoid request pile-up
const SPEED_TIMEOUTS: Record<SpeedMode, number> = {
    normal: 10000,
    fast: 7000,
    turbo: 5000,
};

/**
 * Race a single RPC request against multiple URLs simultaneously.
 * Returns the parsed JSON from the first successful response.
 * Throws if ALL urls fail.
 */
const raceRpcRequest = async (
    urls: string[],
    payload: object[],
    signal?: AbortSignal,
    timeoutMs = 10000,
): Promise<any> => {
    // Create per-request abort controllers so we can cancel losers
    const controllers = urls.map(() => new AbortController());

    const makeRequest = async (url: string, index: number): Promise<any> => {
        const controller = controllers[index];
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // Combine user signal + per-request timeout
        const combined = new AbortController();
        const abortCombined = () => combined.abort();

        // Check upfront before adding listeners
        if (signal?.aborted || controller.signal.aborted) {
            combined.abort();
        } else {
            signal?.addEventListener('abort', abortCombined, { once: true });
            controller.signal.addEventListener('abort', abortCombined, { once: true });
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: combined.signal,
            });
            clearTimeout(timeoutId);
            // Clean up listeners
            signal?.removeEventListener('abort', abortCombined);
            controller.signal.removeEventListener('abort', abortCombined);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            // Cancel other in-flight requests
            controllers.forEach((c, i) => { if (i !== index) c.abort(); });
            return data;
        } catch (e: any) {
            clearTimeout(timeoutId);
            // Clean up listeners
            signal?.removeEventListener('abort', abortCombined);
            controller.signal.removeEventListener('abort', abortCombined);
            if (e.name === 'AbortError' && signal?.aborted) {
                // User-initiated abort — propagate immediately
                throw e;
            }
            throw e;
        }
    };

    // Race ALL URLs simultaneously — first successful response wins, losers are cancelled.
    // This is more reliable than racing just 2: if any URL is broken (adblock, CORS, geo),
    // the others still succeed. Overhead is minimal since losers are aborted immediately.
    try {
        return await Promise.any(urls.map((url, i) => makeRequest(url, i)));
    } catch (aggErr: any) {
        // If user aborted, propagate AbortError
        if (signal?.aborted) {
            throw new DOMException('Aborted', 'AbortError');
        }
        // All URLs failed
        const errors = (aggErr as AggregateError).errors ?? [aggErr];
        throw new Error(`All RPCs failed: ${errors.map((e: any) => e.message).join(', ')}`);
    }
};

/**
 * Check a single network's balance for all address chunks.
 * Returns per-network result.
 */
const checkNetworkBalances = async (
    network: typeof NETWORKS[number],
    chunks: string[][],
    signal: AbortSignal | undefined,
    delay: number,
    timeoutMs: number,
): Promise<{
    balances: BalanceResult[];
    chunkStatuses: ChunkStatus[];
    errors: string[];
    allOk: boolean;
    aborted: boolean;
}> => {
    const balances: BalanceResult[] = [];
    const chunkStatuses: ChunkStatus[] = [];
    const errors: string[] = [];
    let allOk = true;

    for (let ci = 0; ci < chunks.length; ci++) {
        const chunk = chunks[ci];

        if (signal?.aborted) {
            return { balances, chunkStatuses, errors, allOk: false, aborted: true };
        }

        try {
            const payload = createBatchPayload(chunk, 1);
            const data = await raceRpcRequest(network.urls, payload, signal, timeoutMs);

            if (Array.isArray(data)) {
                data.forEach((item: any, index: number) => {
                    const balanceHex = item.result;
                    if (balanceHex && balanceHex !== '0x0') {
                        const balanceWei = BigInt(balanceHex);
                        if (balanceWei > 0n) {
                            const etherVal = Number(ethers.formatEther(balanceWei));
                            if (etherVal > 0) {
                                balances.push({
                                    address: chunk[index],
                                    balance: etherVal,
                                    symbol: network.ticker,
                                });
                            }
                        }
                    }
                });
            }

            chunkStatuses.push({ network: network.name, chunkIndex: ci, status: 'ok' });
        } catch (e: any) {
            if (e.name === 'AbortError') {
                return { balances, chunkStatuses, errors, allOk: false, aborted: true };
            }

            const errMsg = `${network.name} chunk ${ci}: ${e.message}`;
            errors.push(errMsg);
            chunkStatuses.push({
                network: network.name,
                chunkIndex: ci,
                status: 'error',
                error: e.message,
            });
            allOk = false;
            console.warn(errMsg);
        }

        if (ci < chunks.length - 1) {
            await new Promise(r => setTimeout(r, delay));
        }
    }

    return { balances, chunkStatuses, errors, allOk, aborted: false };
};

/**
 * Check balances for a list of ETH addresses across selected networks.
 * Networks are checked in PARALLEL for speed.
 * Each chunk races 2 RPC nodes simultaneously — fastest wins.
 * Supports AbortSignal for cancellation (prevents false eliminations).
 */
export const checkBalances = async (
    ethAddresses: string[],
    signal?: AbortSignal,
    options?: { speed?: SpeedMode; networks?: string[] }
): Promise<CheckResult> => {
    const speed = options?.speed ?? 'normal';
    const enabledNetworks = options?.networks;
    const delay = SPEED_DELAYS[speed];
    const timeoutMs = SPEED_TIMEOUTS[speed];

    const result: CheckResult = {
        balances: [],
        allVerified: false,
        errors: [],
        chunkStatuses: [],
        networksVerified: [],
        aborted: false,
    };

    if (signal?.aborted) {
        result.aborted = true;
        return result;
    }

    const activeNetworks = enabledNetworks
        ? NETWORKS.filter(n => enabledNetworks.includes(n.name))
        : NETWORKS;

    const chunks = chunkArray(ethAddresses, 64);

    // Check all networks in PARALLEL
    const networkResults = await Promise.all(
        activeNetworks.map(network => checkNetworkBalances(network, chunks, signal, delay, timeoutMs))
    );

    // Merge results from all networks
    let totalChunks = 0;
    let successfulChunks = 0;

    for (let ni = 0; ni < activeNetworks.length; ni++) {
        const nr = networkResults[ni];

        if (nr.aborted) {
            result.aborted = true;
            return result;
        }

        result.balances.push(...nr.balances);
        result.chunkStatuses.push(...nr.chunkStatuses);
        result.errors.push(...nr.errors);

        const okCount = nr.chunkStatuses.filter(s => s.status === 'ok').length;
        totalChunks += chunks.length;
        successfulChunks += okCount;

        if (nr.allOk) {
            result.networksVerified.push(activeNetworks[ni].name);
        }
    }

    result.allVerified = successfulChunks === totalChunks && totalChunks > 0;
    return result;
};

/** Available network names for turbo config */
export const AVAILABLE_NETWORKS = NETWORKS.map(n => n.name);
