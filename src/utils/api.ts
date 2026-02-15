import { ethers } from 'ethers';

const NETWORKS = [
    { name: 'ETH', url: 'https://rpc.ankr.com/eth', ticker: 'ETH' },
    { name: 'BNB', url: 'https://bsc-dataseed1.binance.org/', ticker: 'BNB' }
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

/**
 * Check balances for a list of ETH addresses across all networks.
 * Supports AbortSignal for cancellation (prevents false eliminations).
 */
export const checkBalances = async (
    ethAddresses: string[],
    signal?: AbortSignal
): Promise<CheckResult> => {
    const result: CheckResult = {
        balances: [],
        allVerified: false,
        errors: [],
        chunkStatuses: [],
        networksVerified: [],
        aborted: false,
    };

    const chunks = chunkArray(ethAddresses, 64);
    let totalChunks = 0;
    let successfulChunks = 0;
    const verifiedNetworks = new Set<string>();

    for (const network of NETWORKS) {
        let networkOk = true;

        for (let ci = 0; ci < chunks.length; ci++) {
            const chunk = chunks[ci];
            totalChunks++;

            // Check if aborted before starting
            if (signal?.aborted) {
                result.aborted = true;
                return result;
            }

            try {
                const payload = createBatchPayload(chunk, 1);
                const response = await fetch(network.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    signal, // Pass AbortSignal to fetch
                });

                if (!response.ok) {
                    const errMsg = `${network.name} chunk ${ci}: HTTP ${response.status}`;
                    result.errors.push(errMsg);
                    result.chunkStatuses.push({
                        network: network.name,
                        chunkIndex: ci,
                        status: 'error',
                        error: `HTTP ${response.status}`,
                    });
                    networkOk = false;
                    continue;
                }

                const data = await response.json();

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

            // Small delay between chunks
            await new Promise(r => setTimeout(r, 200));
        }

        if (networkOk) {
            verifiedNetworks.add(network.name);
        }
    }

    result.networksVerified = Array.from(verifiedNetworks);
    result.allVerified = successfulChunks === totalChunks && totalChunks > 0;

    return result;
};
