import { ethers } from 'ethers';

const NETWORKS = [
    { name: 'ETH', url: 'https://ethereum-rpc.publicnode.com', ticker: 'ETH' },
    { name: 'BNB', url: 'https://bsc-dataseed.binance.org/', ticker: 'BNB' }
];

// JSON-RPC Payload Builder
const createBatchPayload = (addresses: string[], idStart: number) => {
    return addresses.map((addr, i) => ({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [addr, 'latest'],
        id: idStart + i
    }));
};

// Helper: Chunk array
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

export const checkBalances = async (ethAddresses: string[]): Promise<BalanceResult[]> => {
    const results: BalanceResult[] = [];
    const chunks = chunkArray(ethAddresses, 64); // Split 128 into 2 chunks of 64

    // We check both networks for all addresses
    // To avoid rate limits, we process chunks sequentially with a small delay
    for (const network of NETWORKS) {
        for (const chunk of chunks) {
            try {
                const payload = createBatchPayload(chunk, 1);
                const response = await fetch(network.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) continue;

                const data = await response.json();

                // Process responses
                if (Array.isArray(data)) {
                    data.forEach((item: any, index: number) => {
                        const balanceHex = item.result;
                        if (balanceHex && balanceHex !== '0x0') {
                            const balanceWei = BigInt(balanceHex);
                            // If balance > 0, meaningful amount
                            if (balanceWei > 0n) {
                                const etherVal = Number(ethers.formatEther(balanceWei));
                                if (etherVal > 0) {
                                    results.push({
                                        address: chunk[index],
                                        balance: etherVal,
                                        symbol: network.ticker
                                    });
                                }
                            }
                        }
                    });
                }
            } catch (e) {
                console.error(`Error checking ${network.name}`, e);
            }
            // Small delay between chunks/networks to be safe
            await new Promise(r => setTimeout(r, 200));
        }
    }

    return results;
};

// Keep simulateCheck for compatibility if needed (start empty)
export const simulateCheck = async (_count: number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, 100));
};
