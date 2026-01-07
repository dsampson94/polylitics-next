/**
 * Deadlines Page - Markets with Upcoming Deadlines
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
  daysToEnd: number | null;
  edge: number;
  edgeDirection: string;
  tier: string;
}

export default function DeadlinesPage() {
  const [deadlines, setDeadlines] = useState<Market[]>([]);
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'week' | 'month'>('all');

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/polymarket/live?limit=200", { cache: "no-store" });
      if (!res.ok) throw new Error("API error");
      const data = await res.json();
      setDeadlines(data.deadlines || []);
      // Also get all markets with deadlines
      const marketsWithDeadlines = (data.markets || [])
        .filter((m: Market) => m.daysToEnd !== null && m.daysToEnd > 0)
        .sort((a: Market, b: Market) => (a.daysToEnd ?? 999) - (b.daysToEnd ?? 999));
      setAllMarkets(marketsWithDeadlines);
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

  // Apply filter
  const filtered = allMarkets.filter(m => {
    if (filter === 'week') return (m.daysToEnd ?? 999) <= 7;
    if (filter === 'month') return (m.daysToEnd ?? 999) <= 30;
    return true;
  });

  const urgent = allMarkets.filter(m => (m.daysToEnd ?? 999) <= 7);
  const soon = allMarkets.filter(m => (m.daysToEnd ?? 999) > 7 && (m.daysToEnd ?? 999) <= 30);

  return (
    <div className="min-h-screen bg-[#08080a] text-[#b8b8c0] font-mono">
      <header className="border-b border-[#1a1a24] bg-[#0a0a0e]/80 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-[#4a4a5a] hover:text-[#8a8a9a]">←</Link>
              <div>
                <h1 className="text-lg tracking-wide text-[#e0e0e8]">DEADLINES</h1>
                <p className="text-xs text-[#4a4a5a]">delay risk analysis</p>
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
          <div className="bg-[#0c0c10] border border-red-500/30 rounded-lg p-4 text-center shadow-[0_0_15px_rgba(239,68,68,0.1)]">
            <div className="text-2xl font-bold text-red-400">{urgent.length}</div>
            <div className="text-[10px] text-[#4a4a5a]">≤7 DAYS</div>
          </div>
          <div className="bg-[#0c0c10] border border-amber-500/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{soon.length}</div>
            <div className="text-[10px] text-[#4a4a5a]">8-30 DAYS</div>
          </div>
          <div className="bg-[#0c0c10] border border-[#1a1a24] rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-[#e0e0e8]">{allMarkets.length}</div>
            <div className="text-[10px] text-[#4a4a5a]">TOTAL</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4">
          {(['all', 'week', 'month'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs rounded transition-all ${
                filter === f 
                  ? 'bg-[#6366f1]/20 text-[#818cf8] border border-[#6366f1]/30' 
                  : 'bg-[#12121a] text-[#6a6a7a] border border-[#1a1a24] hover:border-[#2a2a38]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'week' ? '≤7 Days' : '≤30 Days'}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="bg-[#0c0c10] border border-[#1a1a24] rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-[#1a1a24]">
            <span className="text-xs text-[#5a5a6a]">{filtered.length} MARKETS</span>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="text-2xl animate-pulse opacity-30">◌</div>
              <div className="text-xs text-[#4a4a5a] mt-2">loading...</div>
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-400 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-[#4a4a5a] text-sm">no deadline markets found</div>
          ) : (
            <div className="divide-y divide-[#1a1a24]">
              {filtered.map((market) => {
                const days = market.daysToEnd ?? 999;
                const isUrgent = days <= 7;
                const isSoon = days <= 30;
                
                return (
                  <Link
                    key={market.id}
                    href={`/market/${market.id}`}
                    className="flex items-center gap-4 p-4 hover:bg-[#10101a] transition-colors"
                  >
                    {/* Days Badge */}
                    <div className={`
                      w-14 h-14 rounded-lg flex flex-col items-center justify-center
                      ${isUrgent 
                        ? 'bg-red-500/10 border border-red-500/30' 
                        : isSoon 
                          ? 'bg-amber-500/10 border border-amber-500/30'
                          : 'bg-[#1a1a24] border border-[#2a2a38]'
                      }
                    `}>
                      <div className={`text-xl font-bold ${
                        isUrgent ? 'text-red-400' : isSoon ? 'text-amber-400' : 'text-[#8a8a9a]'
                      }`}>
                        {days}
                      </div>
                      <div className="text-[8px] text-[#5a5a6a]">DAYS</div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-[#a0a0b0] truncate">{market.title}</div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-[#5a5a6a]">
                        <span>{market.category}</span>
                        <span className="text-[#3a3a48]">|</span>
                        <span>Edge: {(market.edge * 100).toFixed(0)}%</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-emerald-500/10 px-2 py-1 rounded text-center">
                          <div className="text-emerald-400 font-bold">
                            {(market.yesPrice * 100).toFixed(0)}¢
                          </div>
                          <div className="text-[8px] text-[#5a5a6a]">YES</div>
                        </div>
                        <div className="bg-red-500/10 px-2 py-1 rounded text-center">
                          <div className="text-red-400 font-bold">
                            {(market.noPrice * 100).toFixed(0)}¢
                          </div>
                          <div className="text-[8px] text-[#5a5a6a]">NO</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Strategy Tip */}
        <div className="mt-6 bg-[#0c0c10] border border-emerald-500/20 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-emerald-400">◷</span>
            <span className="text-xs text-[#8a8a9a]">DEADLINE DELAY STRATEGY</span>
          </div>
          <p className="text-xs text-[#5a5a6a] leading-relaxed">
            Markets with tight deadlines often overprice the probability of resolution. 
            If procedural steps remain or there&apos;s bureaucratic uncertainty, consider 
            fading the market (betting NO on high-yes or YES on high-no markets).
          </p>
        </div>
      </div>
    </div>
  );
}
