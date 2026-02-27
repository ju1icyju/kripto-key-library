import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkBalances } from '../api';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
    mockFetch.mockReset();
});

const createMockResponse = (balances: string[], ok = true, status = 200) => ({
    ok,
    status,
    json: async () => balances.map((hex, i) => ({
        jsonrpc: '2.0',
        id: i + 1,
        result: hex,
    })),
});

const twoAddresses = [
    '0x0000000000000000000000000000000000000001',
    '0x0000000000000000000000000000000000000002',
];

describe('checkBalances', () => {
    it('returns allVerified=true when all chunks return 200 with zero balances', async () => {
        // 2 addresses, chunk size 64 → 1 chunk per network, 2 networks = 2 fetches
        mockFetch.mockResolvedValue(createMockResponse(['0x0', '0x0']));

        const result = await checkBalances(twoAddresses);

        expect(result.allVerified).toBe(true);
        expect(result.balances).toHaveLength(0);
        expect(result.errors).toHaveLength(0);
        expect(result.aborted).toBe(false);
        expect(result.networksVerified).toContain('ETH');
        expect(result.networksVerified).toContain('BNB');
    });

    it('returns balance results when funds are found', async () => {
        // 1 ETH = 10^18 wei = 0xde0b6b3a7640000
        mockFetch.mockResolvedValue(
            createMockResponse(['0xde0b6b3a7640000', '0x0'])
        );

        const result = await checkBalances(twoAddresses);

        expect(result.allVerified).toBe(true);
        // Both ETH and BNB find something on the first address
        expect(result.balances.length).toBeGreaterThanOrEqual(1);
        expect(result.balances[0].balance).toBeCloseTo(1.0, 4);
    });

    it('returns allVerified=false when a network returns non-200', async () => {
        // URL-based mock: ETH succeeds, BNB returns 429
        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('bsc') || url.includes('binance')) {
                return { ok: false, status: 429 };
            }
            return createMockResponse(['0x0', '0x0']);
        });

        const result = await checkBalances(twoAddresses);

        expect(result.allVerified).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('429');
    });

    it('returns allVerified=false when fetch throws', async () => {
        // URL-based mock: ETH succeeds, BNB throws
        mockFetch.mockImplementation(async (url: string) => {
            if (url.includes('bsc') || url.includes('binance')) {
                throw new Error('Network timeout');
            }
            return createMockResponse(['0x0', '0x0']);
        });

        const result = await checkBalances(twoAddresses);

        expect(result.allVerified).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('Network timeout');
    });

    it('returns aborted=true when signal is aborted', async () => {
        const controller = new AbortController();
        controller.abort(); // Pre-abort

        mockFetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

        const result = await checkBalances(twoAddresses, controller.signal);

        expect(result.aborted).toBe(true);
        expect(result.allVerified).toBe(false);
    });

    it('handles aborted signal mid-flight', async () => {
        const controller = new AbortController();

        // URL-based mock: first ETH call triggers abort, rest see aborted signal
        let callCount = 0;
        mockFetch.mockImplementation(async (_url: string, init: any) => {
            callCount++;
            if (callCount === 1) {
                // Simulate: first call starts, then user aborts mid-flight
                controller.abort();
                const err = new DOMException('Aborted', 'AbortError');
                throw err;
            }
            // All subsequent calls see the aborted signal
            if (init?.signal?.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }
            return createMockResponse(['0x0', '0x0']);
        });

        const result = await checkBalances(twoAddresses, controller.signal);

        expect(result.aborted).toBe(true);
        expect(result.allVerified).toBe(false);
    });

    it('passes signal to fetch (abort is respected)', async () => {
        const controller = new AbortController();
        mockFetch.mockImplementation(async (_url: string, init: any) => {
            // If the signal is already aborted (or gets aborted), throw AbortError
            if (init?.signal?.aborted) {
                throw new DOMException('Aborted', 'AbortError');
            }
            return createMockResponse(['0x0', '0x0']);
        });

        // Abort immediately
        controller.abort();
        const result = await checkBalances(twoAddresses, controller.signal);
        expect(result.aborted).toBe(true);
    });
});
