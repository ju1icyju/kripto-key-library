import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import { Buffer } from 'buffer';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';

// Global Buffer polyfill for browser environment
if (typeof window !== 'undefined') {
    window.Buffer = window.Buffer || Buffer;
}

const ECPair = ECPairFactory(ecc);

export const ROWS_PER_PAGE = 128n;

export const generateWallet = (rowIndex: number, pageNumber: string): { privateKey: string, ethAddress: string, btcAddress: string } => {
    const pageBigInt = BigInt(pageNumber);
    // Formula: (Page - 1) * 128 + RowIndex
    // Note: Page is 1-based, RowIndex is 0-based within the page.
    // Private Key 1 is at Page 1, Row 0.

    // We add 1 to the result because Private Key 0 is invalid/null, but usually we start from 1.
    // Let's assume the very first key (1) is at Page 1, Row 0.
    // TotalOffset = (PageBigInt - 1n) * ROWS_PER_PAGE + BigInt(rowIndex) + 1n;

    const totalOffset = (pageBigInt - 1n) * ROWS_PER_PAGE + BigInt(rowIndex) + 1n;

    // Convert BigInt to 32-byte Hex String
    let hex = totalOffset.toString(16);
    // Pad to 64 chars (32 bytes)
    hex = hex.padStart(64, '0');

    const privateKey = '0x' + hex;

    // ETH Address
    const wallet = new ethers.Wallet(privateKey);
    const ethAddress = wallet.address;

    // BTC Address (Native SegWit - Bech32)
    // We strictly need a Buffer for bitcoinjs-lib
    const privKeyBuffer = Buffer.from(hex, 'hex');
    const keyPair = ECPair.fromPrivateKey(privKeyBuffer);

    const { address: btcAddress } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey });

    return {
        privateKey,
        ethAddress,
        btcAddress: btcAddress || 'Error generating BTC'
    };
};

export const MAX_PAGE = (2n ** 256n) / ROWS_PER_PAGE;
