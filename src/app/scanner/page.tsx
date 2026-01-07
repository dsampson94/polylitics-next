/**
 * Scanner Page - Browse All Markets
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
  noPrice: number;
  volume24h: number;
  liquidity: number;
  daysToEnd: number | null;
  edge: number;
  tier: string;
  compositeScore: number;
}

export default function ScannerPage() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<'volume' | 'edge' | 'score'>('volume');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/polymarket/live?limit=200", { cache: "no-store" });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setMarkets(data.markets || []);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter & sort
  const filtered = markets
    .filter(m => !search || m.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'volume') return b.volume24h - a.volume24h;
      if (sortBy === 'edge') return b.edge - a.edge;
      return b.compositeScore - a.compositeScore;
    });

  return (
    <div className="min-h-screen bg-[#08080a] text-[#b8b8c0] font-mono">
      <header className="border-b border-[#1a1a24] bg-[#0a0a0e]/80 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-[#4a4a5a] hover:text-[#8a8a9a]">←</Link>
              <div>
                <h1 className="text-lg tracking-wide text-[#e0e0e8]">SCANNER</h1>
                <p className="text-xs text-[#4a4a5a]">browse all markets</p>
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
        {/* Search & Sort */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search markets..."
            className="flex-1 px-4 py-2 bg-[#0c0c10] border border-[#1a1a24] rounded-lg text-sm
                     focus:outline-none focus:border-[#3a3a48] placeholder:text-[#4a4a5a]"
          />
          <div className="flex gap-1">
            {(['volume', 'edge', 'score'] as const).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`px-3 py-2 text-xs rounded transition-all ${
                  sortBy === s 
                    ? 'bg-[#6366f1]/20 text-[#818cf8] border border-[#6366f1]/30' 
                    : 'bg-[#12121a] text-[#6a6a7a] border border-[#1a1a24]'
                }`}
              >
                {s.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between mb-4 text-xs text-[#5a5a6a]">
          <span>{filtered.length} markets</span>
          <span>sorted by {sortBy}</span>
        </div>

        {/* List */}
        <div className="bg-[#0c0c10] border border-[#1a1a24] rounded-lg overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-2xl animate-pulse opacity-30">◌</div>
              <div className="text-xs text-[#4a4a5a] mt-2">loading...</div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-400 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-[#4a4a5a] text-sm">no markets found</div>
          ) : (
            <div className="divide-y divide-[#1a1a24] max-h-[600px] overflow-y-auto">
              {filtered.map((market, i) => (
                <Link
                  key={market.id}
                  href={`/market/${market.id}`}
                  className="flex items-center gap-4 p-4 hover:bg-[#10101a] transition-colors"
                >
                  <span className="text-[#2a2a38] text-xs w-6">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  
                  {/* Tier badge */}
                  <TierBadge tier={market.tier} />
                  
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-[#a0a0b0] truncate">{market.title}</div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[#5a5a6a]">
                      <span>{market.category}</span>
                      {market.daysToEnd && (
                        <>
                          <span className="text-[#3a3a48]">|</span>
                          <span className={market.daysToEnd <= 7 ? 'text-red-400' : 'text-amber-400'}>
                            {market.daysToEnd}d
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 text-right text-xs">
                    <div>
                      <div className="text-[#a0a0b0]">{(market.yesPrice * 100).toFixed(0)}¢</div>
                      <div className="text-[8px] text-[#4a4a5a]">PRICE</div>
                    </div>
                    <div>
                      <div className="text-cyan-400">${(market.volume24h / 1000).toFixed(0)}k</div>
                      <div className="text-[8px] text-[#4a4a5a]">VOL</div>
                    </div>
                    <div>
                      <div className={market.edge > 0.3 ? 'text-emerald-400' : 'text-[#8a8a9a]'}>
                        {(market.edge * 100).toFixed(0)}%
                      </div>
                      <div className="text-[8px] text-[#4a4a5a]">EDGE</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    S: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    A: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    B: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    C: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    D: 'bg-gray-600/20 text-gray-500 border-gray-600/30',
  };
  
  return (
    <span className={`px-1.5 py-0.5 text-[10px] rounded border ${styles[tier] || styles.D}`}>
      {tier}
    </span>
  );
}
