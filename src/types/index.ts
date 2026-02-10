export interface WalletData {
    privateKey: string;
    btcAddress: string;
    ethAddress: string;
    status: 'empty' | 'active' | 'unknown';
}

export interface PageData {
    pageNumber: string; // BigInt as string
    wallets: WalletData[];
}
