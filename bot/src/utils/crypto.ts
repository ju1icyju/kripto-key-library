import { ethers } from 'ethers';
import * as bitcoin from 'bitcoinjs-lib';
import * as ecc from 'tiny-secp256k1';
import { ECPairFactory } from 'ecpair';

const ECPair = ECPairFactory(ecc);

export const ROWS_PER_PAGE = 128n;
export const MAX_PAGE = (2n ** 256n) / ROWS_PER_PAGE;

export interface Wallet {
    privateKey: string;
    ethAddress: string;
    btcAddress: string;
}

export const generateWallet = (rowIndex: number, pageNumber: string): Wallet => {
    const pageBigInt = BigInt(pageNumber);
    const totalOffset = (pageBigInt - 1n) * ROWS_PER_PAGE + BigInt(rowIndex) + 1n;

    let hex = totalOffset.toString(16);
    hex = hex.padStart(64, '0');
    const privateKey = '0x' + hex;

    // ETH
    const wallet = new ethers.Wallet(privateKey);
    const ethAddress = wallet.address;

    // BTC (Native SegWit)
    const privKeyBuffer = Buffer.from(hex, 'hex');
    const keyPair = ECPair.fromPrivateKey(privKeyBuffer);
    const { address: btcAddress } = bitcoin.payments.p2wpkh({ pubkey: keyPair.publicKey });

    return {
        privateKey,
        ethAddress,
        btcAddress: btcAddress || 'Error',
    };
};

export const generateRandomPage = (): string => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const rand = BigInt('0x' + hex);
    return ((rand % MAX_PAGE) + 1n).toString();
};
