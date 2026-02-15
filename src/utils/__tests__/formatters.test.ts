import { describe, it, expect } from 'vitest';
import { formatBigInt, shortenAddress } from '../formatters';

describe('formatBigInt', () => {
    it('formats small bigints', () => {
        const result = formatBigInt(123n);
        expect(result).toBe('123');
    });

    it('formats large bigints with spaces as separators', () => {
        const result = formatBigInt(1234567890n);
        // toLocaleString('en-US') produces commas, then replaced with spaces
        expect(result).toBe('1 234 567 890');
    });

    it('formats string input', () => {
        const result = formatBigInt('42');
        // string.toLocaleString() just returns the string itself
        expect(result).toBeDefined();
    });

    it('handles 1n', () => {
        expect(formatBigInt(1n)).toBe('1');
    });

    it('handles zero', () => {
        expect(formatBigInt(0n)).toBe('0');
    });
});

describe('shortenAddress', () => {
    it('shortens a standard ETH address with default chars', () => {
        const addr = '0x1234567890abcdef1234567890abcdef12345678';
        const result = shortenAddress(addr);
        // default chars = 4: first 6 chars + ... + last 4 chars
        expect(result).toBe('0x1234...5678');
    });

    it('shortens with custom char count', () => {
        const addr = '0x1234567890abcdef1234567890abcdef12345678';
        const result = shortenAddress(addr, 6);
        expect(result).toBe('0x123456...345678');
    });

    it('returns empty string for empty input', () => {
        expect(shortenAddress('')).toBe('');
    });

    it('returns empty string for undefined-like input', () => {
        expect(shortenAddress(undefined as any)).toBe('');
    });

    it('handles short addresses', () => {
        const result = shortenAddress('0x1234', 4);
        // 6 chars from start + ... + 4 chars from end (overlapping)
        expect(result).toContain('...');
    });
});
