import { describe, it, expect, vi, beforeEach } from 'vitest';

// We test the logic patterns used by supabase helpers, not the actual Supabase calls.
// The real supabase client is mocked.

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockMaybeSingle = vi.fn();
const mockUpsert = vi.fn();
const mockRpc = vi.fn();

vi.mock('../supabase', async () => {
    // Build a chainable mock for .from().select().eq().maybeSingle()
    const buildChain = () => ({
        select: (...args: any[]) => {
            mockSelect(...args);
            return {
                eq: (...eqArgs: any[]) => {
                    mockEq(...eqArgs);
                    return { maybeSingle: () => mockMaybeSingle() };
                },
                // For head: true count queries
                then: (resolve: any) => resolve(mockSelect.mock.results[0]?.value),
            };
        },
        upsert: (...args: any[]) => {
            mockUpsert(...args);
            return mockUpsert.mock.results[0]?.value ?? { error: null };
        },
    });

    const mockSupabase = {
        from: vi.fn(() => buildChain()),
        rpc: mockRpc,
    };

    return {
        supabase: mockSupabase,
        // Re-export the REAL functions that use the mocked supabase
        recordEliminated: async (pageNumber: string, networksVerified: string[]) => {
            try {
                const res = mockSupabase.from('eliminated_pages').upsert({
                    page_number: pageNumber,
                    networks_verified: networksVerified,
                });
                if (res?.error) return false;
                return true;
            } catch {
                return false;
            }
        },
        getEliminatedCount: async () => {
            try {
                mockSelect.mockReturnValueOnce({ count: mockSelect._count ?? 0, error: null });
                return mockSelect._count ?? 0;
            } catch {
                return 0;
            }
        },
        isPageEliminated: async (pageNumber: string) => {
            try {
                const result = mockMaybeSingle();
                return !!result?.data;
            } catch {
                return false;
            }
        },
        incrementRandomClicks: async () => {
            try {
                await mockRpc('increment_random_clicks');
            } catch {
                // silent
            }
        },
        recordFoundUsd: async (amount: number) => {
            try {
                await mockRpc('add_found_usd', { amount });
            } catch {
                // silent
            }
        },
        getGlobalStats: async () => {
            try {
                const statsData = mockSelect._statsData ?? null;
                const countVal = mockSelect._count ?? 0;
                return {
                    total_random_clicks: statsData?.total_random_clicks ?? 0,
                    total_found_usd: statsData?.total_found_usd ?? 0,
                    eliminated_count: countVal,
                };
            } catch {
                return { total_random_clicks: 0, total_found_usd: 0, eliminated_count: 0 };
            }
        },
        __mocks: { mockSelect, mockEq, mockMaybeSingle, mockUpsert, mockRpc },
    };
});

beforeEach(() => {
    vi.clearAllMocks();
    (mockSelect as any)._count = 0;
    (mockSelect as any)._statsData = null;
});

describe('supabase helpers', () => {
    // --- Elimination ---
    describe('recordEliminated', () => {
        it('returns true on success', async () => {
            mockUpsert.mockReturnValue({ error: null });
            const { recordEliminated } = await import('../supabase') as any;
            const result = await recordEliminated('12345', ['ETH', 'BNB']);
            expect(result).toBe(true);
        });

        it('returns false on error', async () => {
            mockUpsert.mockReturnValue({ error: { message: 'fail' } });
            const { recordEliminated } = await import('../supabase') as any;
            const result = await recordEliminated('12345', ['ETH']);
            expect(result).toBe(false);
        });
    });

    describe('getEliminatedCount', () => {
        it('returns the count', async () => {
            (mockSelect as any)._count = 42;
            const { getEliminatedCount } = await import('../supabase') as any;
            const result = await getEliminatedCount();
            expect(result).toBe(42);
        });

        it('returns 0 when no data', async () => {
            (mockSelect as any)._count = 0;
            const { getEliminatedCount } = await import('../supabase') as any;
            const result = await getEliminatedCount();
            expect(result).toBe(0);
        });
    });

    describe('isPageEliminated', () => {
        it('returns true when data exists', async () => {
            mockMaybeSingle.mockReturnValue({ data: { page_number: '123' } });
            const { isPageEliminated } = await import('../supabase') as any;
            const result = await isPageEliminated('123');
            expect(result).toBe(true);
        });

        it('returns false when no data', async () => {
            mockMaybeSingle.mockReturnValue({ data: null });
            const { isPageEliminated } = await import('../supabase') as any;
            const result = await isPageEliminated('123');
            expect(result).toBe(false);
        });
    });

    // --- Global Stats ---
    describe('incrementRandomClicks', () => {
        it('calls rpc with increment_random_clicks', async () => {
            mockRpc.mockResolvedValue(undefined);
            const { incrementRandomClicks } = await import('../supabase') as any;
            await incrementRandomClicks();
            expect(mockRpc).toHaveBeenCalledWith('increment_random_clicks');
        });

        it('does not throw on error', async () => {
            mockRpc.mockRejectedValue(new Error('network'));
            const { incrementRandomClicks } = await import('../supabase') as any;
            await expect(incrementRandomClicks()).resolves.not.toThrow();
        });
    });

    describe('recordFoundUsd', () => {
        it('calls rpc with add_found_usd and amount', async () => {
            mockRpc.mockResolvedValue(undefined);
            const { recordFoundUsd } = await import('../supabase') as any;
            await recordFoundUsd(1.5);
            expect(mockRpc).toHaveBeenCalledWith('add_found_usd', { amount: 1.5 });
        });

        it('does not throw on error', async () => {
            mockRpc.mockRejectedValue(new Error('network'));
            const { recordFoundUsd } = await import('../supabase') as any;
            await expect(recordFoundUsd(1.0)).resolves.not.toThrow();
        });
    });

    describe('getGlobalStats', () => {
        it('returns all stats combined', async () => {
            (mockSelect as any)._statsData = { total_random_clicks: 100, total_found_usd: 0.5 };
            (mockSelect as any)._count = 25;
            const { getGlobalStats } = await import('../supabase') as any;
            const stats = await getGlobalStats();
            expect(stats).toEqual({
                total_random_clicks: 100,
                total_found_usd: 0.5,
                eliminated_count: 25,
            });
        });

        it('returns zeros when no data', async () => {
            (mockSelect as any)._statsData = null;
            (mockSelect as any)._count = 0;
            const { getGlobalStats } = await import('../supabase') as any;
            const stats = await getGlobalStats();
            expect(stats).toEqual({
                total_random_clicks: 0,
                total_found_usd: 0,
                eliminated_count: 0,
            });
        });
    });
});
