/**
 * Polylitics Command Center
 * Dark Neumorphic Retro Terminal Vibes
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
  priceChange24h?: number;
}

interface LiveData {
  stats: {
    totalMarkets: number;
    activeMarkets: number;
    byDateMarkets: number;
    avgVolume: number;
    avgLiquidity: number;
  };
  opportunities: Market[];
  movers: Market[];
  deadlines: Market[];
  topCategories: { category: string; count: number }[];
  allCategories?: string[];
  fetchedAt: string;
}

// Default categories to exclude (user can toggle)
const SPORTS_CATEGORIES = ["Sports", "NBA", "NFL", "NHL", "MLB", "Soccer", "Football"];

export default function CommandCenter() {
  const [data, setData] = useState<LiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [excludedCategories, setExcludedCategories] = useState<string[]>(SPORTS_CATEGORIES);
  const [showFilters, setShowFilters] = useState(false);

  const fetchLiveData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build URL with category filters
      const params = new URLSearchParams({ limit: "2000" });
      if (excludedCategories.length > 0) {
        params.set("excludeCategories", excludedCategories.join(","));
      }
      
      const res = await fetch(`/api/polymarket/live?${params.toString()}`, { 
        cache: "no-store",
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      if (!res.ok) {
        throw new Error(`API error: ${res.status}`);
      }
      
      const liveData = await res.json();
      setData(liveData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveData();
    const interval = setInterval(fetchLiveData, 60000);
    return () => clearInterval(interval);
  }, [excludedCategories]); // Re-fetch when filter changes

  const toggleCategory = (cat: string) => {
    setExcludedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const sTier = data?.opportunities.filter(o => o.tier === "S") ?? [];
  const aTier = data?.opportunities.filter(o => o.tier === "A") ?? [];
  const volumeSpikes = data?.movers.filter(m => m.volumeZScore >= 2) ?? [];

  return (
    <div className="min-h-screen bg-[#14151c] text-[#d8d8e0] font-mono">
      {/* Subtle grid background */}
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `
            linear-gradient(#4a4a6e 1px, transparent 1px),
            linear-gradient(90deg, #4a4a6e 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}
      />
      
      {/* Header */}
      <header className="relative border-b border-[#303040] bg-[#1a1b24]/95 backdrop-blur-sm">
        <div className="px-4 sm:px-6 py-3 sm:py-4">
          {/* Top row - Logo and status */}
          <div className="flex items-center justify-between">
            <h1 className="text-base sm:text-lg tracking-[0.2em] text-[#ffffff] font-semibold">
              POLYLITICS
            </h1>
            
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden sm:block text-xs text-[#8a8a9a]">
                {lastUpdated?.toLocaleTimeString('en-US', { hour12: false }) || '--:--:--'}
              </span>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className={`w-2 h-2 rounded-full ${loading ? 'bg-amber-400 animate-pulse' : error ? 'bg-red-400' : 'bg-emerald-400'}`} />
                <span className={`text-[10px] sm:text-xs font-medium ${loading ? 'text-amber-400' : error ? 'text-red-400' : 'text-emerald-400'}`}>
                  {loading ? 'SYNC' : error ? 'ERR' : 'LIVE'}
                </span>
              </div>
            </div>
          </div>
          
          {/* Action buttons row - stacks nicely on mobile */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-xs border rounded transition-all
                       ${excludedCategories.length > 0 
                         ? 'bg-cyan-900/30 border-cyan-600 text-cyan-400' 
                         : 'bg-[#252530] border-[#404055] text-[#d0d0e0]'}
                       hover:bg-[#303040] hover:border-[#505065]`}
            >
              ◇ FILTERS {excludedCategories.length > 0 && `(${excludedCategories.length})`}
            </button>
            <button
              onClick={fetchLiveData}
              disabled={loading}
              className="flex-1 sm:flex-none px-3 py-2 sm:py-1.5 text-xs bg-[#252530] border border-[#404055] rounded 
                       hover:bg-[#303040] hover:border-[#505065] transition-all
                       disabled:opacity-50 active:scale-95 text-[#d0d0e0]"
            >
              {loading ? '◌' : '↻'} REFRESH
            </button>
          </div>
          
          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-3 p-3 sm:p-4 bg-[#1d1e28] border border-[#404055] rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] sm:text-xs text-[#8a8a9a] uppercase tracking-wider">Hide Categories</span>
                <button 
                  onClick={() => setExcludedCategories([])}
                  className="text-[10px] sm:text-xs text-cyan-400 hover:text-cyan-300"
                >
                  Clear All
                </button>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:flex-wrap sm:overflow-visible scrollbar-hide">
                {["Sports", "NBA", "NFL", "NHL", "Soccer", "Politics", "Crypto", "World", "Tech", "Finance", "Breaking", "Other"].map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(cat)}
                    className={`flex-shrink-0 px-3 py-1.5 text-xs rounded border transition-all ${
                      excludedCategories.includes(cat)
                        ? 'bg-red-900/30 border-red-600 text-red-400 line-through'
                        : 'bg-[#252530] border-[#404055] text-[#d0d0e0] hover:border-cyan-600'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <p className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-[#6a6a7a]">
                Tap to hide categories. Sports hidden by default.
              </p>
            </div>
          )}
        </div>
      </header>

      <main className="relative px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">
        {/* Stats Row */}
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-2 sm:gap-3">
          <StatCard label="MARKETS" value={data?.stats.activeMarkets ?? 0} />
          <StatCard label="DEADLINES" value={data?.stats.byDateMarkets ?? 0} accent="amber" />
          <StatCard label="S-TIER" value={sTier.length} accent="yellow" glow />
          <StatCard label="A-TIER" value={aTier.length} accent="emerald" />
          <StatCard label="VOL SPIKES" value={volumeSpikes.length} accent="cyan" />
          <StatCard 
            label="AVG VOL" 
            value={data?.stats.avgVolume ? `$${(data.stats.avgVolume / 1000).toFixed(0)}k` : '-'} 
            accent="purple" 
          />
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <NavLink href="/opportunities" icon="◎" label="OPPORTUNITIES" count={data?.opportunities.length} />
          <NavLink href="/movers" icon="△" label="MOVERS" count={data?.movers.length} />
          <NavLink href="/deadlines" icon="◷" label="DEADLINES" count={data?.deadlines.length} />
          <NavLink href="/scanner" icon="⊞" label="SCANNER" />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Opportunities */}
          <div className="bg-[#1e1f2a] border border-[#353545] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#353545] flex items-center justify-between">
              <span className="text-xs text-[#a0a0b0] tracking-wider font-medium">TOP OPPORTUNITIES</span>
              <Link href="/opportunities" className="text-xs text-[#818cf8] hover:text-[#a5b4fc]">
                VIEW ALL →
              </Link>
            </div>
            <div className="p-2">
              {loading ? (
                <LoadingState message="scanning markets..." />
              ) : data?.opportunities.length === 0 ? (
                <EmptyState message="no opportunities found" />
              ) : (
                <div className="space-y-1">
                  {data?.opportunities.slice(0, 5).map((opp, i) => (
                    <OpportunityRow key={opp.id} market={opp} rank={i + 1} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Movers */}
          <div className="bg-[#1e1f2a] border border-[#353545] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#353545] flex items-center justify-between">
              <span className="text-xs text-[#a0a0b0] tracking-wider font-medium">TOP MOVERS</span>
              <Link href="/movers" className="text-xs text-[#34d399] hover:text-[#6ee7b7]">
                VIEW ALL →
              </Link>
            </div>
            <div className="p-2">
              {loading ? (
                <LoadingState message="tracking momentum..." />
              ) : data?.movers.length === 0 ? (
                <EmptyState message="no movers found" />
              ) : (
                <div className="space-y-1">
                  {data?.movers.slice(0, 5).map((mover, i) => (
                    <MoverRow key={mover.id} market={mover} rank={i + 1} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Deadlines */}
        {(data?.deadlines.length ?? 0) > 0 && (
          <div className="bg-[#1e1f2a] border border-[#353545] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#353545] flex items-center justify-between">
              <span className="text-xs text-[#a0a0b0] tracking-wider font-medium">UPCOMING DEADLINES</span>
              <Link href="/deadlines" className="text-xs text-amber-400 hover:text-amber-300">
                VIEW ALL →
              </Link>
            </div>
            <div className="p-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                {data?.deadlines.slice(0, 4).map((market) => (
                  <DeadlineRow key={market.id} market={market} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Categories */}
        {(data?.topCategories.length ?? 0) > 0 && (
          <div className="bg-[#1e1f2a] border border-[#353545] rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#353545]">
              <span className="text-xs text-[#a0a0b0] tracking-wider font-medium">CATEGORIES</span>
            </div>
            <div className="p-3 flex flex-wrap gap-2">
              {data?.topCategories.map((cat) => (
                <div 
                  key={cat.category} 
                  className="px-3 py-1.5 bg-[#252535] border border-[#404055] rounded text-xs"
                >
                  <span className="text-[#a5b4fc] font-medium">{cat.count}</span>
                  <span className="text-[#b0b0c0] ml-2">{cat.category}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategy Guide */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <StrategyCard
            icon="◷"
            title="DEADLINE DELAY"
            color="emerald"
            tips={["target <30 day markets", "procedural delays = profit", "overpriced → fade it"]}
          />
          <StrategyCard
            icon="◉"
            title="ATTENTION ARB"
            color="blue"
            tips={["low attention, high edge", "front-run the crowd", "exit into volume"]}
          />
          <StrategyCard
            icon="△"
            title="MOMENTUM"
            color="purple"
            tips={["volume + price = signal", "ride the wave", "tight stops"]}
          />
        </div>
      </main>
    </div>
  );
}

// Components

function StatCard({ label, value, accent, glow }: { 
  label: string; 
  value: number | string; 
  accent?: string;
  glow?: boolean;
}) {
  const accentColors: Record<string, string> = {
    amber: 'text-amber-400',
    yellow: 'text-yellow-300',
    emerald: 'text-emerald-400',
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
  };
  
  return (
    <div className={`
      bg-[#1e1f2a] border border-[#353545] rounded-lg p-2 sm:p-3 text-center
      ${glow ? 'border-yellow-400/40 shadow-[0_0_20px_rgba(250,204,21,0.2)]' : ''}
    `}>
      <div className={`text-lg sm:text-2xl font-bold ${accent ? accentColors[accent] : 'text-[#ffffff]'}`}>
        {value}
      </div>
      <div className="text-[8px] sm:text-[10px] text-[#9a9aaa] tracking-wider mt-0.5 sm:mt-1 truncate">{label}</div>
    </div>
  );
}

function NavLink({ href, icon, label, count }: { 
  href: string; 
  icon: string; 
  label: string;
  count?: number;
}) {
  return (
    <Link 
      href={href}
      className="bg-[#1e1f2a] border border-[#353545] rounded-lg p-2.5 sm:p-3
                 hover:border-[#454560] hover:bg-[#252535] transition-all group
                 active:scale-[0.98]"
    >
      <div className="flex items-center justify-between">
        <span className="text-base sm:text-lg opacity-60 group-hover:opacity-90">{icon}</span>
        {count !== undefined && (
          <span className="text-[10px] sm:text-xs text-[#a5b4fc] font-medium">{count}</span>
        )}
      </div>
      <div className="text-[10px] sm:text-xs mt-1 text-[#b0b0c0] group-hover:text-[#e0e0f0] truncate">{label}</div>
    </Link>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    S: 'bg-yellow-400/25 text-yellow-300 border-yellow-400/40',
    A: 'bg-emerald-400/25 text-emerald-300 border-emerald-400/40',
    B: 'bg-blue-400/25 text-blue-300 border-blue-400/40',
    C: 'bg-gray-400/25 text-gray-300 border-gray-400/40',
    D: 'bg-gray-500/25 text-gray-400 border-gray-500/40',
  };
  
  return (
    <span className={`px-1.5 py-0.5 text-[10px] rounded border font-medium ${styles[tier] || styles.D}`}>
      {tier}
    </span>
  );
}

function OpportunityRow({ market, rank }: { market: Market; rank: number }) {
  return (
    <Link
      href={`/market/${market.id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded bg-[#1a1b24] hover:bg-[#252530] transition-colors"
    >
      <span className="text-[#606070] text-sm w-5">{String(rank).padStart(2, '0')}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <TierBadge tier={market.tier} />
          {market.primarySignal && (
            <span className="text-[10px] text-[#a0a0b0]">{market.primarySignal.type}</span>
          )}
        </div>
        <div className="text-xs text-[#d0d0e0] truncate">{market.title}</div>
      </div>
      <div className="text-right">
        <div className={`text-sm font-bold ${market.compositeScore >= 70 ? 'text-emerald-300' : market.compositeScore >= 50 ? 'text-amber-300' : 'text-[#b0b0c0]'}`}>
          {market.compositeScore}
        </div>
        <div className="text-[10px] text-[#8a8a9a]">SCORE</div>
      </div>
    </Link>
  );
}

function MoverRow({ market, rank }: { market: Market; rank: number }) {
  const change = market.priceChange24h ?? 0;
  const isUp = change >= 0;
  
  return (
    <Link
      href={`/market/${market.id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded bg-[#1a1b24] hover:bg-[#252530] transition-colors"
    >
      <span className="text-[#606070] text-sm w-5">{String(rank).padStart(2, '0')}</span>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#d0d0e0] truncate">{market.title}</div>
        <div className="flex items-center gap-2 text-[10px] text-[#9a9aaa]">
          <span>{(market.yesPrice * 100).toFixed(0)}¢</span>
          <span>•</span>
          <span>${(market.volume24h / 1000).toFixed(0)}k vol</span>
          {market.volumeZScore >= 2 && <span className="text-amber-400 font-medium">● SPIKE</span>}
        </div>
      </div>
      <div className={`text-sm font-bold ${isUp ? 'text-emerald-300' : 'text-red-400'}`}>
        {isUp ? '+' : ''}{(change * 100).toFixed(1)}%
      </div>
    </Link>
  );
}

function DeadlineRow({ market }: { market: Market }) {
  const urgent = (market.daysToEnd ?? 999) <= 7;
  
  return (
    <Link
      href={`/market/${market.id}`}
      className="flex items-center gap-3 px-3 py-2.5 rounded bg-[#1a1b24] hover:bg-[#252530] transition-colors"
    >
      <div className={`text-xs font-bold ${urgent ? 'text-red-400' : 'text-amber-400'}`}>
        {market.daysToEnd}d
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-[#d0d0e0] truncate">{market.title}</div>
      </div>
      <div className="text-xs text-[#a0a0b0]">{(market.yesPrice * 100).toFixed(0)}¢</div>
    </Link>
  );
}

function StrategyCard({ icon, title, color, tips }: { 
  icon: string; 
  title: string; 
  color: string;
  tips: string[];
}) {
  const colors: Record<string, string> = {
    emerald: 'text-emerald-400 border-emerald-400/30',
    blue: 'text-blue-400 border-blue-400/30',
    purple: 'text-purple-400 border-purple-400/30',
  };
  
  return (
    <div className={`bg-[#1e1f2a] border border-[#353545] rounded-lg p-4 ${colors[color]?.split(' ')[1]}`}>
      <div className="flex items-center gap-2 mb-3">
        <span className={colors[color]?.split(' ')[0]}>{icon}</span>
        <span className="text-xs text-[#b0b0c0] tracking-wider font-medium">{title}</span>
      </div>
      <ul className="space-y-1.5">
        {tips.map((tip, i) => (
          <li key={i} className="text-[11px] text-[#9a9aaa] flex items-center gap-2">
            <span className="text-[#606070]">›</span>
            {tip}
          </li>
        ))}
      </ul>
    </div>
  );
}

function LoadingState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <div className="text-2xl mb-2 opacity-50 animate-pulse">◌</div>
      <div className="text-xs text-[#8a8a9a]">{message}</div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center">
      <div className="text-2xl mb-2 opacity-40">∅</div>
      <div className="text-xs text-[#8a8a9a]">{message}</div>
    </div>
  );
}
