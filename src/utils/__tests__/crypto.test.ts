import { describe, it, expect } from 'vitest';
import { generateWallet, ROWS_PER_PAGE, MAX_PAGE } from '../crypto';

describe('crypto constants', () => {
    it('ROWS_PER_PAGE is 128', () => {
        expect(ROWS_PER_PAGE).toBe(128n);
    });

    it('MAX_PAGE is 2^256 / 128', () => {
        expect(MAX_PAGE).toBe((2n ** 256n) / 128n);
    });

    it('MAX_PAGE is a very large number (>10^74)', () => {
        expect(MAX_PAGE > 10n ** 74n).toBe(true);
    });
});

describe('generateWallet', () => {
    it('generates a valid wallet for page 1, row 0', () => {
        const wallet = generateWallet(0, '1');
        expect(wallet).toHaveProperty('privateKey');
        expect(wallet).toHaveProperty('ethAddress');
        expect(wallet).toHaveProperty('btcAddress');
    });

    it('private key starts with 0x', () => {
        const wallet = generateWallet(0, '1');
        expect(wallet.privateKey.startsWith('0x')).toBe(true);
    });

    it('private key is 66 chars (0x + 64 hex)', () => {
        const wallet = generateWallet(0, '1');
        expect(wallet.privateKey.length).toBe(66);
    });

    it('ETH address starts with 0x', () => {
        const wallet = generateWallet(0, '1');
        expect(wallet.ethAddress.startsWith('0x')).toBe(true);
    });

    it('BTC address starts with bc1 (native segwit)', () => {
        const wallet = generateWallet(0, '1');
        expect(wallet.btcAddress.startsWith('bc1')).toBe(true);
    });

    it('page 1 row 0 = private key 1 (0x00...01)', () => {
        const wallet = generateWallet(0, '1');
        expect(wallet.privateKey).toBe('0x' + '0'.repeat(63) + '1');
    });

    it('page 1 row 127 = private key 128 (0x00...80)', () => {
        const wallet = generateWallet(127, '1');
        expect(wallet.privateKey).toBe('0x' + '0'.repeat(62) + '80');
    });

    it('page 2 row 0 = private key 129 (0x00...81)', () => {
        const wallet = generateWallet(0, '2');
        expect(wallet.privateKey).toBe('0x' + '0'.repeat(62) + '81');
    });

    it('different rows produce different keys', () => {
        const w1 = generateWallet(0, '1');
        const w2 = generateWallet(1, '1');
        expect(w1.privateKey).not.toBe(w2.privateKey);
        expect(w1.ethAddress).not.toBe(w2.ethAddress);
    });

    it('different pages produce different keys', () => {
        const w1 = generateWallet(0, '1');
        const w2 = generateWallet(0, '2');
        expect(w1.privateKey).not.toBe(w2.privateKey);
    });

    it('generates 128 unique wallets for a single page', () => {
        const keys = new Set<string>();
        for (let i = 0; i < 128; i++) {
            const w = generateWallet(i, '1');
            keys.add(w.privateKey);
        }
        expect(keys.size).toBe(128);
    });

    it('handles a very large page number', () => {
        const bigPage = '9'.repeat(50); // 50-digit page number
        const wallet = generateWallet(0, bigPage);
        expect(wallet.privateKey.startsWith('0x')).toBe(true);
        expect(wallet.privateKey.length).toBe(66);
        expect(wallet.ethAddress.startsWith('0x')).toBe(true);
    });
});
