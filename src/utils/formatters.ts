export const formatBigInt = (value: bigint | string): string => {
    return value.toLocaleString('en-US').replace(/,/g, ' ');
};

export const shortenAddress = (address: string, chars = 4): string => {
    if (!address) return '';
    return `${address.substring(0, chars + 2)}...${address.substring(address.length - chars)}`;
};
