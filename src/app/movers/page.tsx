/**
 * Movers Page - Top Volume & Price Movers
 * Uses Live API - no database required
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Market {
  id: string;
  title: string;
  category: string;
  yesPrice: number;
  volume24h: number;
  liquidity: number;
  volumeZScore: number;
  priceChange24h?: number;
}

export default function MoversPage() {
  const [movers, setMovers] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/polymarket/live?limit=2000", {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setMovers(data.movers || []);
      setLastFetch(data.fetchedAt || new Date().toISOString());
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  const volumeSpikes = movers.filter(m => m.volumeZScore >= 2);

  return (
    <div className="min-h-screen bg-[#08080a] text-[#b8b8c0] font-mono">
      <header className="border-b border-[#1a1a24] bg-[#0a0a0e]/80 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-[#4a4a5a] hover:text-[#8a8a9a]">←</Link>
              <div>
                <h1 className="text-lg tracking-wide text-[#e0e0e8]">TOP MOVERS</h1>
                <p className="text-xs text-[#4a4a5a]">volume & momentum tracking</p>
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 text-xs bg-[#12121a] border border-[#2a2a38] rounded hover:bg-[#1a1a24] disabled:opacity-50"
            >
              {loading ? '◌' : '↻'} REFRESH
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-[#0c0c10] border border-[#1a1a24] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[#e0e0e8]">{movers.length}</div>
            <div className="text-[10px] text-[#4a4a5a]">TRACKED</div>
          </div>
          <div className="bg-[#0c0c10] border border-amber-500/30 rounded-lg p-4 text-center shadow-[0_0_15px_rgba(245,158,11,0.1)]">
            <div className="text-2xl font-bold text-amber-400">{volumeSpikes.length}</div>
            <div className="text-[10px] text-[#4a4a5a]">VOL SPIKES</div>
          </div>
          <div className="bg-[#0c0c10] border border-[#1a1a24] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {movers.filter(m => (m.priceChange24h ?? 0) > 0).length}
            </div>
            <div className="text-[10px] text-[#4a4a5a]">GAINERS</div>
          </div>
        </div>

        {/* List */}
        <div className="bg-[#0c0c10] border border-[#1a1a24] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a24] flex items-center justify-between">
            <span className="text-xs text-[#5a5a6a]">BY VOLUME (24H)</span>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-2xl animate-pulse opacity-30">◌</div>
              <div className="text-xs text-[#4a4a5a] mt-2">loading...</div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-400 text-sm">{error}</div>
          ) : (
            <div className="divide-y divide-[#1a1a24]">
              {movers.map((market, i) => {
                const change = market.priceChange24h ?? 0;
                const isUp = change >= 0;
                const isSpike = market.volumeZScore >= 2;
                
                return (
                  <Link
                    key={market.id}
                    href={`/market/${market.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-[#10101a] transition-colors"
                  >
                    <span className="text-[#2a2a38] text-sm w-6">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#a0a0b0] truncate">{market.title}</div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-[#5a5a6a]">
                        <span>{(market.yesPrice * 100).toFixed(0)}¢</span>
                        <span className="text-[#3a3a48]">|</span>
                        <span className="text-cyan-400">
                          ${(market.volume24h / 1000).toFixed(0)}k vol
                        </span>
                        {isSpike && (
                          <span className="text-amber-400 flex items-center gap-1">
                            🔥 SPIKE
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-lg font-bold ${isUp ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isUp ? '+' : ''}{(change * 100).toFixed(1)}%
                      </div>
                      <div className="text-[10px] text-[#4a4a5a]">24h</div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
