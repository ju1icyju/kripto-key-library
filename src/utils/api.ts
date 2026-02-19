import { ethers } from 'ethers';

export const NETWORKS = [
    {
        name: 'ETH',
        urls: [
            'https://rpc.ankr.com/eth',
            'https://eth.llamarpc.com',
            'https://cloudflare-eth.com',
            'https://1rpc.io/eth'
        ],
        ticker: 'ETH'
    },
    {
        name: 'BNB',
        urls: [
            'https://bsc-dataseed1.binance.org/',
            'https://bsc-dataseed2.binance.org/',
            'https://rpc.ankr.com/bsc',
            'https://binance.llamarpc.com'
        ],
        ticker: 'BNB'
    }
];

// Simple round-robin or random selection could work, but we'll try sequential failover per batch
const getRpcUrl = (networkName: string, attempt: number) => {
    const net = NETWORKS.find(n => n.name === networkName);
    if (!net) return '';
    return net.urls[attempt % net.urls.length];
};

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

/**
 * Check balances for a list of ETH addresses across selected networks.
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

    const result: CheckResult = {
        balances: [],
        allVerified: false,
        errors: [],
        chunkStatuses: [],
        networksVerified: [],
        aborted: false,
    };

    const activeNetworks = enabledNetworks
        ? NETWORKS.filter(n => enabledNetworks.includes(n.name))
        : NETWORKS;

    const chunks = chunkArray(ethAddresses, 64);
    let totalChunks = 0;
    let successfulChunks = 0;
    const verifiedNetworks = new Set<string>();

    for (const network of activeNetworks) {
        let networkOk = true;

        for (let ci = 0; ci < chunks.length; ci++) {
            const chunk = chunks[ci];
            totalChunks++;

            if (signal?.aborted) {
                result.aborted = true;
                return result;
            }

            try {
                let rpcSuccess = false;
                // Try up to 3 RPCs per chunk
                for (let attempt = 0; attempt < 3; attempt++) {
                    const rpcUrl = getRpcUrl(network.name, attempt);
                    try {
                        const payload = createBatchPayload(chunk, 1);
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

                        // Combine user signal + timeout — compatible with all browsers (no AbortSignal.any)
                        const finalSignal = (() => {
                            if (!signal) return controller.signal;
                            const combined = new AbortController();
                            const abort = () => combined.abort();
                            if (signal.aborted || controller.signal.aborted) { combined.abort(); }
                            else {
                                signal.addEventListener('abort', abort, { once: true });
                                controller.signal.addEventListener('abort', abort, { once: true });
                            }
                            return combined.signal;
                        })();

                        const response = await fetch(rpcUrl, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(payload),
                            signal: finalSignal,
                        }).finally(() => clearTimeout(timeoutId));

                        if (!response.ok) throw new Error(`HTTP ${response.status}`);

                        const data = await response.json();

                        // Process data...
                        if (Array.isArray(data)) {
                            data.forEach((item: any, index: number) => {
                                const balanceHex = item.result;
                                if (balanceHex && balanceHex !== '0x0') {
                                    const balanceWei = BigInt(balanceHex);
                                    if (balanceWei > 0n) {
                                        const etherVal = Number(ethers.formatEther(balanceWei));
                                        if (etherVal > 0) {
                                            result.balances.push({
                                                address: chunk[index],
                                                balance: etherVal,
                                                symbol: network.ticker
                                            });
                                        }
                                    }
                                }
                            });
                        }

                        result.chunkStatuses.push({
                            network: network.name,
                            chunkIndex: ci,
                            status: 'ok',
                        });
                        successfulChunks++;
                        rpcSuccess = true;
                        break; // Success, exit retry loop

                    } catch (e: any) {
                        if (e.name === 'AbortError' && signal?.aborted) throw e; // User aborted
                        // Otherwise it's an RPC error, try next
                        console.warn(`${network.name} RPC ${rpcUrl} failed:`, e.message);
                    }
                }

                if (!rpcSuccess) {
                    const errMsg = `${network.name} chunk ${ci}: All RPCs failed`;
                    result.errors.push(errMsg);
                    result.chunkStatuses.push({
                        network: network.name,
                        chunkIndex: ci,
                        status: 'error',
                        error: 'All RPCs failed'
                    });
                    networkOk = false;
                    // If one chunk fails completely, the network is likely unreachable or issues are severe
                    // We continue to try other chunks or networks? 
                    // Let's continue, maybe just one bad batch.
                }

            } catch (e: any) {
                if (e.name === 'AbortError') {
                    result.aborted = true;
                    return result;
                }
                const errMsg = `${network.name} chunk ${ci}: ${e.message}`;
                result.errors.push(errMsg);
                result.chunkStatuses.push({
                    network: network.name,
                    chunkIndex: ci,
                    status: 'error',
                    error: e.message,
                });
                networkOk = false;
            }

            await new Promise(r => setTimeout(r, delay));
        }

        if (networkOk) {
            verifiedNetworks.add(network.name);
        }
    }

    result.networksVerified = Array.from(verifiedNetworks);
    result.allVerified = successfulChunks === totalChunks && totalChunks > 0;

    return result;
};

/** Available network names for turbo config */
export const AVAILABLE_NETWORKS = NETWORKS.map(n => n.name);
