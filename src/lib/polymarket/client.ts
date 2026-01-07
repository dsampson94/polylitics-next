/**
 * Polymarket API Client
 * Handles all interactions with the Polymarket API
 */

import { ApiMarket, ApiMarketPrice } from "./types";

export class PolymarketClient {
  constructor(private baseUrl: string = "https://gamma-api.polymarket.com") {}

  /**
   * Fetch all active markets
   */
  async listMarkets(options?: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
  }): Promise<ApiMarket[]> {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", options.limit.toString());
    if (options?.offset) params.set("offset", options.offset.toString());
    if (options?.active !== undefined) params.set("active", options.active.toString());
    if (options?.closed !== undefined) params.set("closed", options.closed.toString());

    const url = `${this.baseUrl}/markets?${params}`;
    
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch markets: ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as ApiMarket[];
    } catch (error) {
      console.error("Error fetching markets:", error);
      throw error;
    }
  }

  /**
   * Fetch a single market by ID
   */
  async getMarket(marketId: string): Promise<ApiMarket> {
    const url = `${this.baseUrl}/markets/${marketId}`;
    
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch market: ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as ApiMarket;
    } catch (error) {
      console.error(`Error fetching market ${marketId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch current prices for markets
   */
  async getPrices(marketIds: string[]): Promise<ApiMarketPrice[]> {
    if (marketIds.length === 0) return [];

    // In a real implementation, you'd batch these or use a dedicated endpoint
    const prices: ApiMarketPrice[] = [];
    
    for (const marketId of marketIds.slice(0, 100)) {
      try {
        const market = await this.getMarket(marketId);
        // Extract price data from market response
        // This structure depends on actual API response
        prices.push({
          marketId,
          yesPrice: null, // TODO: Extract from actual response
          noPrice: null,
          liquidity: null,
          volume24h: null,
        });
      } catch (error) {
        console.error(`Failed to get price for market ${marketId}:`, error);
      }
    }

    return prices;
  }

  /**
   * Search markets by text query
   */
  async searchMarkets(query: string, limit: number = 50): Promise<ApiMarket[]> {
    const params = new URLSearchParams({
      query,
      limit: limit.toString(),
    });

    const url = `${this.baseUrl}/markets/search?${params}`;
    
    try {
      const res = await fetch(url, {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to search markets: ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as ApiMarket[];
    } catch (error) {
      console.error("Error searching markets:", error);
      throw error;
    }
  }
}

/**
 * Default client instance
 */
export const polymarketClient = new PolymarketClient();
