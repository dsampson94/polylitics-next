/**
 * Opportunities Page
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
  endDate: string | null;
  daysToEnd: number | null;
  edge: number;
  edgeDirection: string;
  compositeScore: number;
  tier: "S" | "A" | "B" | "C" | "D";
  primarySignal: { type: string; direction: string } | null;
  kellyFraction: number;
  volumeZScore: number;
}

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Market | null>(null);
  const [lastFetch, setLastFetch] = useState<string | null>(null);
  
  // Filters
  const [tierFilter, setTierFilter] = useState<string | null>(null);
  const [signalFilter, setSignalFilter] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const res = await fetch("/api/polymarket/live?limit=2000", {
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!res.ok) throw new Error("API error");
      
      const data = await res.json();
      setLastFetch(data.fetchedAt || new Date().toISOString());
      
      // Show way more opportunities - include S, A, B tier or score > 15
      let opps = data.opportunities || [];
      
      // Add all markets with scores > 15 if no tier filter
      if (!tierFilter) {
        opps = (data.markets || []).filter((m: Market) => m.compositeScore > 15);
      }
      
      setOpportunities(opps);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Apply filters
  const filtered = opportunities.filter(opp => {
    if (tierFilter && opp.tier !== tierFilter) return false;
    if (signalFilter && opp.primarySignal?.type !== signalFilter) return false;
    return true;
  });

  // Stats
  const tierCounts = opportunities.reduce((acc, o) => {
    acc[o.tier] = (acc[o.tier] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-[#08080a] text-[#b8b8c0] font-mono">
      {/* Header */}
      <header className="border-b border-[#1a1a24] bg-[#0a0a0e]/80 backdrop-blur-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-[#4a4a5a] hover:text-[#8a8a9a]">←</Link>
              <div>
                <h1 className="text-lg tracking-wide text-[#e0e0e8]">OPPORTUNITIES</h1>
                <p className="text-xs text-[#4a4a5a]">
                  multi-signal edge detection · live data
                  {lastFetch && ` · updated ${new Date(lastFetch).toLocaleTimeString()}`}
                </p>
              </div>
            </div>
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-3 py-1.5 text-xs bg-[#12121a] border border-[#2a2a38] rounded 
                       hover:bg-[#1a1a24] disabled:opacity-50"
            >
              {loading ? '◌' : '↻'} REFRESH
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {['S', 'A', 'B', 'C', 'D'].map(tier => (
            <button
              key={tier}
              onClick={() => setTierFilter(tierFilter === tier ? null : tier)}
              className={`p-3 rounded-lg text-center transition-all ${
                tierFilter === tier 
                  ? 'bg-[#1a1a24] border-[#3a3a48]' 
                  : 'bg-[#0c0c10] border-[#1a1a24]'
              } border`}
            >
              <div className={`text-2xl font-bold ${getTierColor(tier)}`}>
                {tierCounts[tier] || 0}
              </div>
              <div className="text-[10px] text-[#4a4a5a]">{tier}-TIER</div>
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <FilterPill 
            active={!tierFilter} 
            onClick={() => setTierFilter(null)}
          >
            All Tiers
          </FilterPill>
          <span className="text-[#2a2a38]">|</span>
          <FilterPill
            active={signalFilter === 'deadline-catalyst'}
            onClick={() => setSignalFilter(signalFilter === 'deadline-catalyst' ? null : 'deadline-catalyst')}
          >
            ⏰ Deadline
          </FilterPill>
          <FilterPill
            active={signalFilter === 'volume-spike'}
            onClick={() => setSignalFilter(signalFilter === 'volume-spike' ? null : 'volume-spike')}
          >
            📊 Volume
          </FilterPill>
          <FilterPill
            active={signalFilter === 'mispriced-odds'}
            onClick={() => setSignalFilter(signalFilter === 'mispriced-odds' ? null : 'mispriced-odds')}
          >
            🎯 Mispriced
          </FilterPill>
          <FilterPill
            active={signalFilter === 'liquidity-opportunity'}
            onClick={() => setSignalFilter(signalFilter === 'liquidity-opportunity' ? null : 'liquidity-opportunity')}
          >
            💧 Liquidity
          </FilterPill>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* List */}
          <div className="bg-[#0c0c10] border border-[#1a1a24] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1a1a24]">
              <span className="text-xs text-[#5a5a6a]">
                {filtered.length} OPPORTUNITIES
              </span>
            </div>
            <div className="max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="text-2xl animate-pulse opacity-30">◌</div>
                  <div className="text-xs text-[#4a4a5a] mt-2">scanning...</div>
                </div>
              ) : error ? (
                <div className="p-8 text-center">
                  <div className="text-red-400 text-sm">{error}</div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-[#4a4a5a] text-sm">no opportunities match filters</div>
                </div>
              ) : (
                <div className="divide-y divide-[#1a1a24]">
                  {filtered.map((opp, i) => (
                    <button
                      key={opp.id}
                      onClick={() => setSelected(opp)}
                      className={`w-full p-3 text-left hover:bg-[#10101a] transition-colors ${
                        selected?.id === opp.id ? 'bg-[#12121a]' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-[#2a2a38] text-sm w-5 pt-0.5">
                          {String(i + 1).padStart(2, '0')}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <TierBadge tier={opp.tier} />
                            {opp.primarySignal && (
                              <span className="text-[10px] text-[#5a5a6a]">
                                {opp.primarySignal.type}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-[#a0a0b0] truncate pr-2">
                            {opp.title}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[10px] text-[#5a5a6a]">
                            <span>{(opp.yesPrice * 100).toFixed(0)}¢</span>
                            <span>Score: {opp.compositeScore}</span>
                            {opp.daysToEnd && <span>{opp.daysToEnd}d</span>}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-sm font-bold ${opp.edge >= 0.6 ? 'text-emerald-400' : opp.edge >= 0.4 ? 'text-amber-400' : 'text-[#8a8a9a]'}`}>
                            {(opp.edge * 100).toFixed(0)}
                          </div>
                          <div className="text-[10px] text-[#4a4a5a]">EDGE</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detail Panel */}
          <div className="bg-[#0c0c10] border border-[#1a1a24] rounded-lg overflow-hidden">
            {selected ? (
              <div className="p-4 space-y-4">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <TierBadge tier={selected.tier} />
                    <span className="text-xs text-[#5a5a6a]">{selected.category}</span>
                  </div>
                  <h2 className="text-sm text-[#e0e0e8] leading-relaxed">{selected.title}</h2>
                </div>

                {/* Prices */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#08080a] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-emerald-400">
                      {(selected.yesPrice * 100).toFixed(0)}¢
                    </div>
                    <div className="text-[10px] text-[#4a4a5a]">YES PRICE</div>
                  </div>
                  <div className="bg-[#08080a] rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-red-400">
                      {(selected.noPrice * 100).toFixed(0)}¢
                    </div>
                    <div className="text-[10px] text-[#4a4a5a]">NO PRICE</div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <StatBox label="EDGE SCORE" value={`${(selected.edge * 100).toFixed(0)}`} />
                  <StatBox label="TOTAL SCORE" value={selected.compositeScore} />
                  <StatBox label="KELLY %" value={`${(selected.kellyFraction * 100).toFixed(1)}%`} />
                </div>

                {/* Signal */}
                {selected.primarySignal && (
                  <div className="bg-[#08080a] rounded-lg p-3">
                    <div className="text-[10px] text-[#5a5a6a] mb-1">PRIMARY SIGNAL</div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{getSignalIcon(selected.primarySignal.type)}</span>
                      <span className="text-xs text-[#a0a0b0]">{selected.primarySignal.type}</span>
                      <span className="text-xs text-[#6366f1]">→ {selected.primarySignal.direction}</span>
                    </div>
                  </div>
                )}

                {/* More Stats */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#08080a] rounded p-2">
                    <span className="text-[#5a5a6a]">Volume 24h:</span>
                    <span className="text-[#a0a0b0] ml-2">${(selected.volume24h / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="bg-[#08080a] rounded p-2">
                    <span className="text-[#5a5a6a]">Liquidity:</span>
                    <span className="text-[#a0a0b0] ml-2">${(selected.liquidity / 1000).toFixed(0)}k</span>
                  </div>
                  {selected.daysToEnd && (
                    <div className="bg-[#08080a] rounded p-2">
                      <span className="text-[#5a5a6a]">Days Left:</span>
                      <span className={`ml-2 ${selected.daysToEnd <= 7 ? 'text-red-400' : 'text-amber-400'}`}>
                        {selected.daysToEnd}
                      </span>
                    </div>
                  )}
                  {selected.volumeZScore >= 2 && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded p-2">
                      <span className="text-amber-400">🔥 Volume Spike</span>
                    </div>
                  )}
                </div>

                {/* Action */}
                <a
                  href={`https://polymarket.com/event/${selected.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-2 text-center text-xs bg-[#6366f1] text-white rounded hover:bg-[#5558e3] transition-colors"
                >
                  TRADE ON POLYMARKET →
                </a>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8">
                <div className="text-center">
                  <div className="text-4xl opacity-20 mb-2">◎</div>
                  <div className="text-xs text-[#4a4a5a]">select a market for details</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Components

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

function FilterPill({ active, onClick, children }: { 
  active: boolean; 
  onClick: () => void; 
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs rounded transition-all ${
        active 
          ? 'bg-[#6366f1]/20 text-[#818cf8] border border-[#6366f1]/30' 
          : 'bg-[#12121a] text-[#6a6a7a] border border-[#1a1a24] hover:border-[#2a2a38]'
      }`}
    >
      {children}
    </button>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#08080a] rounded-lg p-3 text-center">
      <div className="text-lg font-bold text-[#e0e0e8]">{value}</div>
      <div className="text-[10px] text-[#4a4a5a]">{label}</div>
    </div>
  );
}

function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    S: 'text-yellow-400',
    A: 'text-emerald-400',
    B: 'text-blue-400',
    C: 'text-gray-400',
    D: 'text-gray-500',
  };
  return colors[tier] || colors.D;
}

function getSignalIcon(type: string): string {
  const icons: Record<string, string> = {
    'deadline-catalyst': '⏰',
    'volume-spike': '📊',
    'mispriced-odds': '🎯',
    'liquidity-opportunity': '💧',
    'extreme-odds': '🎯',
    'momentum': '📈',
  };
  return icons[type] || '◎';
}
