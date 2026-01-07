/**
 * UI Components for Polylitics Dashboard
 */

"use client";

import { ReactNode } from "react";

// Tier Badge Component
export function TierBadge({ tier }: { tier: "S" | "A" | "B" | "C" | "D" }) {
  const colors = {
    S: "bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-bold",
    A: "bg-green-500 text-white",
    B: "bg-blue-500 text-white",
    C: "bg-gray-500 text-white",
    D: "bg-gray-300 text-gray-700",
  };
  
  return (
    <span className={`px-2 py-1 rounded text-xs ${colors[tier]}`}>
      {tier}-Tier
    </span>
  );
}

// Signal Badge Component
export function SignalBadge({ type, direction }: { type: string; direction: string }) {
  const typeColors: Record<string, string> = {
    "deadline-overpriced": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    "momentum-entry": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    "attention-arbitrage": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    "volume-precursor": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    "mean-reversion": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  };
  
  const labels: Record<string, string> = {
    "deadline-overpriced": "⏰ Deadline Risk",
    "momentum-entry": "📈 Momentum",
    "attention-arbitrage": "🎯 Low Attention",
    "volume-precursor": "📊 Volume Signal",
    "mean-reversion": "↩️ Mean Reversion",
  };
  
  return (
    <span className={`px-2 py-1 rounded text-xs ${typeColors[type] || "bg-gray-100"}`}>
      {labels[type] || type} → {direction}
    </span>
  );
}

// Edge Display Component
export function EdgeDisplay({ edge, size = "md" }: { edge: number; size?: "sm" | "md" | "lg" }) {
  const isPositive = edge >= 0;
  const color = isPositive ? "text-green-600" : "text-red-600";
  const sizeClass = size === "lg" ? "text-3xl" : size === "md" ? "text-xl" : "text-sm";
  
  return (
    <span className={`font-bold ${color} ${sizeClass}`}>
      {isPositive ? "+" : ""}{(edge * 100).toFixed(1)}%
    </span>
  );
}

// Price Display Component
export function PriceDisplay({ price, label }: { price: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-2xl font-bold">{(price * 100).toFixed(0)}¢</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

// Sparkline Component (simple CSS-based)
export function Sparkline({ data, height = 30 }: { data: number[]; height?: number }) {
  if (data.length < 2) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: ((v - min) / range) * 100,
  }));
  
  const pathD = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${100 - p.y}`)
    .join(" ");
  
  const isUp = data[data.length - 1] > data[0];
  
  return (
    <svg width="100" height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
      <path
        d={pathD}
        fill="none"
        stroke={isUp ? "#22c55e" : "#ef4444"}
        strokeWidth="3"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// Progress Bar Component
export function ProgressBar({ value, max = 100, color = "blue" }: { value: number; max?: number; color?: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const colors: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    red: "bg-red-500",
    yellow: "bg-yellow-500",
    purple: "bg-purple-500",
  };
  
  return (
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className={`h-full ${colors[color] || colors.blue} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// Stat Card Component
export function StatCard({ 
  title, 
  value, 
  subValue, 
  icon,
  trend,
}: { 
  title: string; 
  value: string | number; 
  subValue?: string;
  icon?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const trendColors = {
    up: "text-green-500",
    down: "text-red-500",
    neutral: "text-gray-500",
  };
  
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-3xl font-bold">{value}</span>
        {trend && (
          <span className={trendColors[trend]}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
          </span>
        )}
      </div>
      {subValue && (
        <div className="text-xs text-muted-foreground mt-1">{subValue}</div>
      )}
    </div>
  );
}

// Market Card Component
export function MarketCard({ 
  market,
  onClick,
}: { 
  market: any;
  onClick?: () => void;
}) {
  return (
    <div 
      className="border rounded-lg p-4 hover:border-primary transition-colors cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <TierBadge tier={market.tier} />
            {market.primarySignal && (
              <SignalBadge 
                type={market.primarySignal.type} 
                direction={market.primarySignal.direction} 
              />
            )}
          </div>
          <h3 className="font-semibold truncate">{market.title}</h3>
          {market.category && (
            <span className="text-xs text-muted-foreground">{market.category}</span>
          )}
        </div>
        <div className="text-right">
          <EdgeDisplay edge={market.edge} size="lg" />
          <div className="text-xs text-muted-foreground mt-1">
            Score: {market.compositeScore.toFixed(0)}
          </div>
        </div>
      </div>
      
      <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground text-xs">Market</div>
          <div className="font-medium">{(market.currentYesPrice * 100).toFixed(0)}¢</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Model</div>
          <div className="font-medium">{(market.modelProb * 100).toFixed(0)}¢</div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">24h</div>
          <div className={`font-medium ${market.priceVelocity24h >= 0 ? "text-green-600" : "text-red-600"}`}>
            {market.priceVelocity24h >= 0 ? "+" : ""}{(market.priceVelocity24h * 100).toFixed(1)}%
          </div>
        </div>
        <div>
          <div className="text-muted-foreground text-xs">Size</div>
          <div className="font-medium capitalize">{market.suggestedSize}</div>
        </div>
      </div>
      
      {market.signals.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="text-xs text-muted-foreground mb-1">Signals</div>
          <ul className="text-xs space-y-1">
            {market.primarySignal?.rationale.slice(0, 2).map((r: string, i: number) => (
              <li key={i} className="flex items-center gap-1">
                <span className="text-primary">•</span> {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// Filter Button Component
export function FilterButton({ 
  active, 
  onClick, 
  children 
}: { 
  active: boolean; 
  onClick: () => void; 
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
        active 
          ? "bg-primary text-primary-foreground" 
          : "bg-muted hover:bg-muted/80"
      }`}
    >
      {children}
    </button>
  );
}

// Urgency Badge
export function UrgencyBadge({ urgency }: { urgency: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500 text-white animate-pulse",
    urgent: "bg-orange-500 text-white",
    moderate: "bg-yellow-500 text-black",
    distant: "bg-green-500 text-white",
    unknown: "bg-gray-400 text-white",
  };
  
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[urgency] || colors.unknown}`}>
      {urgency.toUpperCase()}
    </span>
  );
}

// Momentum Indicator
export function MomentumIndicator({ momentum }: { momentum: "bullish" | "bearish" | "neutral" }) {
  const config = {
    bullish: { icon: "🟢", text: "Bullish", color: "text-green-600" },
    bearish: { icon: "🔴", text: "Bearish", color: "text-red-600" },
    neutral: { icon: "⚪", text: "Neutral", color: "text-gray-500" },
  };
  
  const { icon, text, color } = config[momentum];
  
  return (
    <span className={`flex items-center gap-1 ${color}`}>
      {icon} {text}
    </span>
  );
}

// Kelly Gauge
export function KellyGauge({ kelly }: { kelly: number }) {
  const pct = Math.min(100, kelly * 400); // Scale 0-25% to 0-100%
  const color = kelly > 0.15 ? "green" : kelly > 0.08 ? "yellow" : kelly > 0.02 ? "blue" : "gray";
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Kelly %</span>
        <span className="font-medium">{(kelly * 100).toFixed(1)}%</span>
      </div>
      <ProgressBar value={pct} color={color} />
    </div>
  );
}
