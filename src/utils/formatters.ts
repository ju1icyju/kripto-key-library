export const formatBigInt = (value: bigint | string): string => {
    try {
        const big = typeof value === 'string' ? BigInt(value) : value;
        return big.toLocaleString('en-US').replace(/,/g, ' ');
    } catch {
        return String(value);
    }
};

export const shortenAddress = (address: string, chars = 4): string => {
    if (!address) return '';
    return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
};
