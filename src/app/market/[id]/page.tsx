/**
 * Market Detail Page - PROFIT ENGINE
 * Your complete guide to making money on this market
 */

"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Market {
  id: string;
  slug?: string;
  conditionId?: string;
  title: string;
  description: string;
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
  tier: string;
  primarySignal: { type: string; direction: string } | null;
  kellyFraction: number;
  volumeZScore: number;
}

export default function MarketDetailPage() {
  const params = useParams();
  const marketId = params.id as string;
  
  const [market, setMarket] = useState<Market | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [betAmount, setBetAmount] = useState(100);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Store initial AI analysis data separately (only updates on full page refresh)
  const [aiSnapshot, setAiSnapshot] = useState<{
    edge: number;
    edgeDirection: string;
    compositeScore: number;
    tier: string;
    primarySignal: { type: string; direction: string } | null;
    kellyFraction: number;
    volumeZScore: number;
  } | null>(null);

  // Fetch market data
  const fetchMarket = async (isInitialLoad = false) => {
    try {
      if (isInitialLoad) setLoading(true);
      const res = await fetch("/api/polymarket/live?limit=200", { cache: "no-store" });
      if (!res.ok) throw new Error("API error");
      
      const data = await res.json();
      const found = (data.markets || []).find((m: Market) => m.id === marketId);
      
      if (found) {
        setMarket(found);
        setLastUpdated(new Date());
        
        // Only set AI snapshot on initial load (page refresh)
        if (isInitialLoad && !aiSnapshot) {
          setAiSnapshot({
            edge: found.edge,
            edgeDirection: found.edgeDirection,
            compositeScore: found.compositeScore,
            tier: found.tier,
            primarySignal: found.primarySignal,
            kellyFraction: found.kellyFraction,
            volumeZScore: found.volumeZScore,
          });
        }
      } else {
        setError("Market not found");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    if (marketId) fetchMarket(true);
  }, [marketId]);

  // Poll every 30 seconds for live price/volume updates
  useEffect(() => {
    if (!marketId || loading) return;
    
    const interval = setInterval(() => {
      fetchMarket(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [marketId, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#14151c] flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl animate-pulse">💰</div>
          <div className="text-sm text-[#8a8a9a] mt-3">Analyzing profit opportunity...</div>
        </div>
      </div>
    );
  }

  if (error || !market || !aiSnapshot) {
    return (
      <div className="min-h-screen bg-[#14151c] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl opacity-30 mb-4">✕</div>
          <div className="text-red-400 mb-4">{error || "Market not found"}</div>
          <Link href="/" className="text-[#818cf8] hover:text-[#a5b4fc] text-sm">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Use aiSnapshot for AI-derived values (stable until page refresh)
  // Use market for live data (prices, volume, liquidity)
  const ai = aiSnapshot;

  // Core calculations - use AI snapshot for direction
  const isLongYes = ai.edgeDirection === "LONG YES";
  const targetSide = isLongYes ? "YES" : "NO";
  const entryPrice = isLongYes ? market.yesPrice : market.noPrice;
  const entryPriceCents = (entryPrice * 100).toFixed(0);
  
  // Profit calculations - use live price
  const payout = betAmount / entryPrice;
  const profit = payout - betAmount;
  const roi = ((1 / entryPrice) - 1) * 100;
  
  // Edge estimation - use AI snapshot edge with live price
  const edgeMultiplier = 1 + (ai.edge * 0.25);
  const estimatedTrueProb = Math.min(entryPrice * edgeMultiplier, 0.92);
  
  // Expected value
  const ev = (estimatedTrueProb * profit) - ((1 - estimatedTrueProb) * betAmount);
  const evPercent = (ev / betAmount) * 100;
  
  // Kelly calculations
  const b = (1 / entryPrice) - 1;
  const kellyFull = Math.max(0, (b * estimatedTrueProb - (1 - estimatedTrueProb)) / b);
  const kellyHalf = kellyFull / 2;
  const kellyQuarter = kellyFull / 4;

  // Confidence scoring - use AI snapshot
  let confidenceLevel = "MEDIUM";
  let confidenceColor = "text-amber-400";
  let confidenceBg = "bg-amber-500/10 border-amber-500/30";
  if (ai.compositeScore >= 75 && ai.volumeZScore >= 1.5) {
    confidenceLevel = "HIGH";
    confidenceColor = "text-emerald-400";
    confidenceBg = "bg-emerald-500/10 border-emerald-500/30";
  } else if (ai.compositeScore < 50) {
    confidenceLevel = "LOW";
    confidenceColor = "text-red-400";
    confidenceBg = "bg-red-500/10 border-red-500/30";
  }

  return (
    <div className="min-h-screen bg-[#14151c] text-[#d8d8e0] font-mono">
      {/* Header */}
      <header className="border-b border-[#303040] bg-[#1a1b24]/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-[#8a8a9a] hover:text-[#c0c0d0] text-xl">←</Link>
              <TierBadge tier={ai.tier} />
              <span className="text-xs text-[#9a9aaa]">{market.category}</span>
            </div>
            <div className="flex items-center gap-3">
              {lastUpdated && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] text-[#6a6a7a]">
                    {lastUpdated.toLocaleTimeString()}
                  </span>
                </div>
              )}
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${confidenceBg} ${confidenceColor} border`}>
                {confidenceLevel} CONFIDENCE
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-4">
        {/* Hero Section */}
        <section className="bg-gradient-to-br from-[#1e1f2a] to-[#252535] border border-[#404055] rounded-2xl p-6">
          <div className="text-[10px] text-[#818cf8] tracking-widest mb-2">THE OPPORTUNITY</div>
          <h1 className="text-xl md:text-2xl text-white font-medium leading-relaxed mb-4">{market.title}</h1>
          
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[#7a7a8a]">Score:</span>
              <span className={`font-bold ${ai.compositeScore >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {ai.compositeScore}/100
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#7a7a8a]">Volume:</span>
              <span className="text-cyan-400 font-bold">${(market.volume24h / 1000).toFixed(0)}k</span>
              {ai.volumeZScore >= 2 && <span className="text-amber-400 text-xs">🔥</span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#7a7a8a]">Liquidity:</span>
              <span className="text-white">${(market.liquidity / 1000).toFixed(0)}k</span>
            </div>
            {market.daysToEnd && (
              <div className="flex items-center gap-2">
                <span className="text-[#7a7a8a]">Ends:</span>
                <span className={market.daysToEnd <= 7 ? 'text-red-400' : 'text-amber-400'}>
                  {market.daysToEnd} days
                </span>
              </div>
            )}
          </div>
        </section>

        {/* THE PLAY */}
        <section className={`rounded-2xl p-6 border-2 ${isLongYes ? 'bg-emerald-500/5 border-emerald-500/40' : 'bg-red-500/5 border-red-500/40'}`}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🎯</span>
            <span className="text-xs text-white font-bold tracking-widest">THE PLAY</span>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-[10px] text-[#9a9aaa] mb-2">BUY THIS</div>
              <div className={`text-5xl font-black ${isLongYes ? 'text-emerald-400' : 'text-red-400'}`}>
                {targetSide}
              </div>
              <div className="text-2xl text-white mt-2">@ {entryPriceCents}¢</div>
              <div className="text-xs text-[#7a7a8a] mt-1">current market price</div>
            </div>
            
            <div className="text-center border-l border-r border-[#303040] px-4">
              <div className="text-[10px] text-[#9a9aaa] mb-2">IF YOU WIN</div>
              <div className="text-4xl font-black text-emerald-400">+{roi.toFixed(0)}%</div>
              <div className="text-lg text-white mt-1">${profit.toFixed(0)} profit</div>
              <div className="text-xs text-[#7a7a8a] mt-1">on ${betAmount} bet</div>
            </div>
            
            <div className="text-center">
              <div className="text-[10px] text-[#9a9aaa] mb-2">IF YOU LOSE</div>
              <div className="text-4xl font-black text-red-400">-100%</div>
              <div className="text-lg text-white mt-1">-${betAmount}</div>
              <div className="text-xs text-[#7a7a8a] mt-1">total loss</div>
            </div>
          </div>
        </section>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Left Column */}
          <div className="space-y-4">
            {/* Why This Makes Money */}
            <section className="bg-[#1e1f2a] border border-[#353545] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">💡</span>
                <span className="text-xs text-[#a5b4fc] font-bold tracking-wider">WHY THIS MAKES MONEY</span>
              </div>
              
              <div className="space-y-4">
                <div className="bg-[#14151c] rounded-lg p-4">
                  <div className="text-sm text-white font-medium mb-2">The Edge</div>
                  <p className="text-sm text-[#b0b0c0] leading-relaxed">
                    Market prices {targetSide} at <span className="text-white font-bold">{entryPriceCents}¢</span>, 
                    implying a {entryPriceCents}% probability. Our analysis suggests the true probability 
                    is closer to <span className="text-emerald-400 font-bold">{(estimatedTrueProb * 100).toFixed(0)}%</span>.
                    {ai.edge >= 0.6 && " This is a significant mispricing."}
                  </p>
                </div>
                
                <div className="bg-[#14151c] rounded-lg p-4">
                  <div className="text-sm text-white font-medium mb-2">Signal Analysis</div>
                  <div className="space-y-2 text-sm">
                    {ai.primarySignal && (
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span className="text-[#b0b0c0]">
                          <span className="text-white">{ai.primarySignal.type}</span> detected - 
                          suggests {ai.primarySignal.direction.toLowerCase()}
                        </span>
                      </div>
                    )}
                    {ai.volumeZScore >= 2 && (
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span className="text-[#b0b0c0]">
                          <span className="text-white">Volume spike</span> ({ai.volumeZScore.toFixed(1)}σ above average)
                        </span>
                      </div>
                    )}
                    {ai.compositeScore >= 70 && (
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span className="text-[#b0b0c0]">
                          <span className="text-white">High composite score</span> ({ai.compositeScore})
                        </span>
                      </div>
                    )}
                    {(entryPrice >= 0.15 && entryPrice <= 0.40) && (
                      <div className="flex items-start gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span className="text-[#b0b0c0]">
                          <span className="text-white">Sweet spot pricing</span> - high upside potential
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Risk Factors */}
            <section className="bg-[#1e1f2a] border border-[#353545] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">⚠️</span>
                <span className="text-xs text-amber-400 font-bold tracking-wider">RISK FACTORS</span>
              </div>
              
              <div className="space-y-2">
                {market.daysToEnd && market.daysToEnd <= 7 && (
                  <RiskItem severity="high" text="Deadline imminent - high time decay risk" />
                )}
                {market.liquidity < 50000 && (
                  <RiskItem severity="medium" text="Lower liquidity - may face slippage" />
                )}
                {(entryPrice < 0.10 || entryPrice > 0.90) && (
                  <RiskItem severity="medium" text="Extreme odds - binary outcome" />
                )}
                {ai.volumeZScore >= 3 && (
                  <RiskItem severity="medium" text="Unusual volume - possible news event" />
                )}
                <RiskItem severity="low" text="All prediction markets carry risk of total loss" />
              </div>
            </section>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            {/* Calculator */}
            <section className="bg-[#1e1f2a] border border-[#353545] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">🧮</span>
                <span className="text-xs text-[#a5b4fc] font-bold tracking-wider">PROFIT CALCULATOR</span>
              </div>
              
              <div className="mb-4">
                <label className="text-xs text-[#8a8a9a] mb-2 block">YOUR BET SIZE</label>
                <div className="flex gap-2">
                  {[50, 100, 250, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setBetAmount(amt)}
                      className={`flex-1 py-2 text-xs rounded-lg border transition-all ${
                        betAmount === amt 
                          ? 'bg-[#6366f1] border-[#6366f1] text-white' 
                          : 'bg-[#14151c] border-[#404055] text-[#9a9aaa] hover:border-[#606070]'
                      }`}
                    >
                      ${amt}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <ResultBox label="YOU BET" value={`$${betAmount}`} subtext="at risk" />
                <ResultBox label="WIN PAYOUT" value={`$${(betAmount / entryPrice).toFixed(0)}`} subtext="total return" highlight="emerald" />
                <ResultBox label="PROFIT IF WIN" value={`+$${((betAmount / entryPrice) - betAmount).toFixed(0)}`} subtext={`+${roi.toFixed(0)}% ROI`} highlight="emerald" />
                <ResultBox label="LOSS IF WRONG" value={`-$${betAmount}`} subtext="-100%" highlight="red" />
              </div>
            </section>

            {/* Mathematical Edge */}
            <section className="bg-[#1e1f2a] border border-[#353545] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">📐</span>
                <span className="text-xs text-[#a5b4fc] font-bold tracking-wider">MATHEMATICAL EDGE</span>
              </div>
              
              <div className="bg-gradient-to-r from-[#14151c] to-[#1a1b24] rounded-xl p-4 mb-4 text-center border border-[#303040]">
                <div className="text-xs text-[#8a8a9a] mb-1">EXPECTED VALUE</div>
                <div className={`text-4xl font-black ${evPercent > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {evPercent > 0 ? '+' : ''}{evPercent.toFixed(1)}%
                </div>
                <div className="text-xs text-[#7a7a8a] mt-1">per bet based on estimated edge</div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#14151c] rounded-lg p-3 text-center">
                  <div className="text-xs text-[#7a7a8a]">Market Implied</div>
                  <div className="text-xl font-bold text-white">{(entryPrice * 100).toFixed(0)}%</div>
                </div>
                <div className="bg-[#14151c] rounded-lg p-3 text-center">
                  <div className="text-xs text-[#7a7a8a]">Our Estimate</div>
                  <div className="text-xl font-bold text-emerald-400">{(estimatedTrueProb * 100).toFixed(0)}%</div>
                </div>
              </div>
              
              <div className="mb-4">
                <div className="text-xs text-[#8a8a9a] mb-2">OPTIMAL BET SIZE (KELLY)</div>
                <div className="grid grid-cols-3 gap-2">
                  <KellyBox label="¼ Kelly" sublabel="Conservative" value={kellyQuarter} />
                  <KellyBox label="½ Kelly" sublabel="Recommended" value={kellyHalf} recommended />
                  <KellyBox label="Full Kelly" sublabel="Aggressive" value={kellyFull} />
                </div>
              </div>
              
              <div className="bg-[#14151c] rounded-lg p-3 text-xs">
                <div className="text-[#9a9aaa] font-medium mb-2">How This Works:</div>
                <div className="space-y-1 text-[#7a7a8a]">
                  <p>• Buy {targetSide} at {entryPriceCents}¢ → If correct, receive $1.00/share</p>
                  <p>• Profit: $1.00 - ${entryPrice.toFixed(2)} = <span className="text-emerald-400">${(1 - entryPrice).toFixed(2)}</span>/share</p>
                  <p>• ROI: <span className="text-emerald-400">{roi.toFixed(0)}%</span></p>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* AI Interpretation */}
        <section className="bg-gradient-to-br from-[#1e1f2a] via-[#252535] to-[#1e1f2a] border border-[#404055] rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🤖</span>
            <span className="text-sm text-white font-bold tracking-wider">AI INTERPRETATION</span>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="text-xs text-[#818cf8] font-medium mb-2">SITUATION ANALYSIS</div>
              <p className="text-sm text-[#c0c0d0] leading-relaxed mb-3">
                {generateSituationAnalysis(ai, market, entryPrice, estimatedTrueProb)}
              </p>
              <div className="text-xs text-[#818cf8] font-medium mb-2 mt-4">MARKET PSYCHOLOGY</div>
              <p className="text-sm text-[#c0c0d0] leading-relaxed">
                {generatePsychologyAnalysis(ai, entryPrice)}
              </p>
            </div>
            
            <div>
              <div className="text-xs text-emerald-400 font-medium mb-2">RECOMMENDED ACTION</div>
              <div className="bg-[#14151c] rounded-xl p-4 border border-[#303040]">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black ${isLongYes ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                    {targetSide.charAt(0)}
                  </div>
                  <div>
                    <div className="text-white font-bold">Buy {targetSide} @ {entryPriceCents}¢</div>
                    <div className="text-xs text-[#8a8a9a]">
                      {kellyHalf > 0 ? `${(kellyHalf * 100).toFixed(1)}% of bankroll (½ Kelly)` : 'Small speculative position'}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-[#8a8a9a]">Entry</span>
                    <span className="text-white">{entryPriceCents}¢</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8a8a9a]">Target</span>
                    <span className="text-emerald-400">100¢</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8a8a9a]">Max Gain</span>
                    <span className="text-emerald-400">+{roi.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8a8a9a]">EV</span>
                    <span className={evPercent > 0 ? 'text-emerald-400' : 'text-red-400'}>
                      {evPercent > 0 ? '+' : ''}{evPercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 text-xs text-[#7a7a8a]">
                <span className="text-amber-400">⚡</span> {generateQuickTip(ai, market)}
              </div>
            </div>
          </div>
        </section>

        {/* Scenario Table */}
        <section className="bg-[#1e1f2a] border border-[#353545] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📊</span>
            <span className="text-xs text-[#a5b4fc] font-bold tracking-wider">SCENARIO ANALYSIS</span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#8a8a9a] text-xs border-b border-[#303040]">
                  <th className="text-left py-3 px-2">Scenario</th>
                  <th className="text-center py-3 px-2">True Prob</th>
                  <th className="text-center py-3 px-2">Edge</th>
                  <th className="text-center py-3 px-2">EV</th>
                  <th className="text-center py-3 px-2">Kelly</th>
                  <th className="text-right py-3 px-2">Verdict</th>
                </tr>
              </thead>
              <tbody>
                <ScenarioRow name="Bear" prob={entryPrice * 0.9} marketProb={entryPrice} />
                <ScenarioRow name="Base" prob={estimatedTrueProb} marketProb={entryPrice} highlight />
                <ScenarioRow name="Bull" prob={Math.min(entryPrice * 1.4, 0.85)} marketProb={entryPrice} />
                <ScenarioRow name="Moon" prob={Math.min(entryPrice * 1.8, 0.92)} marketProb={entryPrice} />
              </tbody>
            </table>
          </div>
        </section>

        {/* Trade Button */}
        <a
          href={`https://polymarket.com/event/${market.slug || market.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-4 text-center bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white rounded-xl 
                   hover:from-[#5558e3] hover:to-[#7c4feb] transition-all text-base font-bold
                   shadow-lg shadow-[#6366f1]/20"
        >
          🚀 TRADE ON POLYMARKET →
        </a>

        <p className="text-[10px] text-[#5a5a6a] text-center pb-4">
          Not financial advice. Only bet what you can afford to lose.
        </p>
      </main>
    </div>
  );
}

// Helper Components

function TierBadge({ tier }: { tier: string }) {
  const styles: Record<string, string> = {
    S: 'bg-yellow-400/20 text-yellow-300 border-yellow-400/40',
    A: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/40',
    B: 'bg-blue-400/20 text-blue-300 border-blue-400/40',
    C: 'bg-gray-400/20 text-gray-300 border-gray-400/40',
    D: 'bg-gray-500/20 text-gray-400 border-gray-500/40',
  };
  
  return (
    <span className={`px-2 py-1 text-xs rounded-lg border font-bold ${styles[tier] || styles.D}`}>
      {tier}-TIER
    </span>
  );
}

function ResultBox({ label, value, subtext, highlight }: { 
  label: string; 
  value: string; 
  subtext: string;
  highlight?: 'emerald' | 'red';
}) {
  const colors = {
    emerald: 'text-emerald-400',
    red: 'text-red-400',
    default: 'text-white'
  };
  
  return (
    <div className="bg-[#14151c] rounded-lg p-3 text-center">
      <div className="text-[10px] text-[#7a7a8a] mb-1">{label}</div>
      <div className={`text-xl font-bold ${colors[highlight || 'default']}`}>{value}</div>
      <div className="text-[10px] text-[#5a5a6a]">{subtext}</div>
    </div>
  );
}

function KellyBox({ label, sublabel, value, recommended }: { 
  label: string; 
  sublabel: string;
  value: number;
  recommended?: boolean;
}) {
  return (
    <div className={`bg-[#14151c] rounded-lg p-3 text-center ${recommended ? 'border-2 border-emerald-500/50 ring-1 ring-emerald-500/20' : 'border border-[#303040]'}`}>
      <div className={`text-lg font-bold ${recommended ? 'text-emerald-400' : value > 0 ? 'text-white' : 'text-[#6a6a7a]'}`}>
        {(value * 100).toFixed(1)}%
      </div>
      <div className="text-[10px] text-[#8a8a9a]">{label}</div>
      <div className="text-[9px] text-[#5a5a6a]">{sublabel}</div>
    </div>
  );
}

function RiskItem({ severity, text }: { severity: 'high' | 'medium' | 'low'; text: string }) {
  const colors = {
    high: 'text-red-400 bg-red-500/10',
    medium: 'text-amber-400 bg-amber-500/10',
    low: 'text-[#8a8a9a] bg-[#14151c]'
  };
  
  return (
    <div className={`flex items-start gap-2 text-sm p-2 rounded-lg ${colors[severity]}`}>
      <span>{severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '⚪'}</span>
      <span>{text}</span>
    </div>
  );
}

function ScenarioRow({ name, prob, marketProb, highlight }: { 
  name: string; 
  prob: number; 
  marketProb: number;
  highlight?: boolean;
}) {
  const edge = ((prob - marketProb) / marketProb) * 100;
  const betAmount = 100;
  const payout = betAmount / marketProb;
  const profit = payout - betAmount;
  const ev = (prob * profit) - ((1 - prob) * betAmount);
  const evPercent = (ev / betAmount) * 100;
  const b = (1 / marketProb) - 1;
  const kelly = Math.max(0, (b * prob - (1 - prob)) / b);
  
  let verdict = "PASS";
  let verdictColor = "text-[#6a6a7a]";
  if (evPercent > 20) {
    verdict = "STRONG";
    verdictColor = "text-emerald-400";
  } else if (evPercent > 5) {
    verdict = "GOOD";
    verdictColor = "text-emerald-400";
  } else if (evPercent > 0) {
    verdict = "MARGINAL";
    verdictColor = "text-amber-400";
  }
  
  return (
    <tr className={`border-b border-[#252535] ${highlight ? 'bg-[#252535]/50' : ''}`}>
      <td className={`py-3 px-2 ${highlight ? 'text-white font-medium' : 'text-[#b0b0c0]'}`}>{name}</td>
      <td className="py-3 px-2 text-center text-white">{(prob * 100).toFixed(0)}%</td>
      <td className={`py-3 px-2 text-center ${edge > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {edge > 0 ? '+' : ''}{edge.toFixed(0)}%
      </td>
      <td className={`py-3 px-2 text-center font-mono ${evPercent > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {evPercent > 0 ? '+' : ''}{evPercent.toFixed(0)}%
      </td>
      <td className="py-3 px-2 text-center text-[#9a9aaa]">{(kelly * 100).toFixed(1)}%</td>
      <td className={`py-3 px-2 text-right font-bold ${verdictColor}`}>{verdict}</td>
    </tr>
  );
}

// AI Snapshot type for stable analysis values
interface AISnapshot {
  edge: number;
  edgeDirection: string;
  compositeScore: number;
  tier: string;
  primarySignal: { type: string; direction: string } | null;
  kellyFraction: number;
  volumeZScore: number;
}

// AI Text Generation

function generateSituationAnalysis(ai: AISnapshot, market: Market, price: number, trueProb: number): string {
  const pricePct = (price * 100).toFixed(0);
  const truePct = (trueProb * 100).toFixed(0);
  
  if (ai.tier === "S") {
    return `S-tier opportunity with strong signal confluence. Market prices at ${pricePct}%, our analysis suggests ${truePct}%. ${ai.volumeZScore >= 2 ? 'Volume confirms institutional interest.' : ''} Excellent risk-adjusted setup.`;
  } else if (ai.tier === "A") {
    return `Solid A-tier setup. Market implied ${pricePct}% appears to underestimate true likelihood of ${truePct}%. ${market.daysToEnd && market.daysToEnd <= 30 ? 'Near-term catalyst.' : 'Time for thesis development.'}`;
  } else {
    return `Speculative at ${pricePct}% implied. Model suggests ${truePct}% but conviction lower. Size small and ensure independent research supports the view.`;
  }
}

function generatePsychologyAnalysis(ai: AISnapshot, price: number): string {
  if (price < 0.20) {
    return "Low-probability outcomes often mispriced - retail avoids 'long shots.' Even 15-20% true prob at these prices creates massive EV.";
  } else if (price > 0.80) {
    return "Favorites often poor value as crowd piles on 'sure things.' If edge assessment correct, this is rare underpriced favorite.";
  } else if (ai.volumeZScore >= 2) {
    return "Volume surge = new information. Question: following smart money or retail FOMO?";
  } else {
    return "Market in equilibrium. Edge from analysis, not information asymmetry. Patience and proper sizing key.";
  }
}

function generateQuickTip(ai: AISnapshot, market: Market): string {
  if (market.daysToEnd && market.daysToEnd <= 3) {
    return "Deadline fast approaching. Monitor for resolution news, consider early profit-taking.";
  } else if (ai.volumeZScore >= 3) {
    return "Extreme volume spike. News may be breaking - verify thesis before entry.";
  } else if (market.liquidity < 30000) {
    return "Low liquidity. Use limit orders and size down to avoid slippage.";
  } else if (ai.tier === "S") {
    return "S-tier setup. Worth meaningful position if thesis aligns with research.";
  } else {
    return "Size per Kelly guidance. Maintain discipline on entry and exit.";
  }
}
