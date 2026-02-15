const NETWORKS = [
    { name: 'ETH', url: 'https://rpc.ankr.com/eth', ticker: 'ETH' },
    { name: 'BNB', url: 'https://bsc-dataseed1.binance.org/', ticker: 'BNB' },
];

export interface BalanceResult {
    address: string;
    balance: number;
    symbol: string;
}

export interface CheckResult {
    balances: BalanceResult[];
    allVerified: boolean;
    networksVerified: string[];
    errors: string[];
}

const createBatchPayload = (addresses: string[], idStart: number) =>
    addresses.map((addr, i) => ({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [addr, 'latest'],
        id: idStart + i,
    }));

const chunkArray = <T>(arr: T[], size: number): T[][] =>
    Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
        arr.slice(i * size, i * size + size)
    );

export const checkBalances = async (ethAddresses: string[]): Promise<CheckResult> => {
    const result: CheckResult = {
        balances: [],
        allVerified: false,
        networksVerified: [],
        errors: [],
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

            try {
                const payload = createBatchPayload(chunk, 1);
                const response = await fetch(network.url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    result.errors.push(`${network.name}: HTTP ${response.status}`);
                    networkOk = false;
                    continue;
                }

                const data = await response.json();

                if (Array.isArray(data)) {
                    for (let index = 0; index < data.length; index++) {
                        const balanceHex = data[index].result;
                        if (balanceHex && balanceHex !== '0x0') {
                            const balanceWei = BigInt(balanceHex);
                            if (balanceWei > 0n) {
                                const { ethers } = await import('ethers');
                                const etherVal = Number(ethers.formatEther(balanceWei));
                                if (etherVal > 0) {
                                    result.balances.push({
                                        address: chunk[index],
                                        balance: etherVal,
                                        symbol: network.ticker,
                                    });
                                }
                            }
                        }
                    }
                }

                successfulChunks++;
            } catch (e: any) {
                result.errors.push(`${network.name}: ${e.message}`);
                networkOk = false;
            }

            // Rate limiting
            await new Promise(r => setTimeout(r, 150));
        }

        if (networkOk) verifiedNetworks.add(network.name);
    }

    result.networksVerified = Array.from(verifiedNetworks);
    result.allVerified = successfulChunks === totalChunks && totalChunks > 0;

    return result;
};
