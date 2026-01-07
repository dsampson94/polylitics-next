/**
 * Alerts Page
 * Configure and manage market alerts
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type AlertType = "PRICE_ABOVE" | "PRICE_BELOW" | "VOLUME_SPIKE" | "EDGE_THRESHOLD" | "DEADLINE_NEAR";

interface Alert {
  id: string;
  marketId: string;
  type: AlertType;
  threshold: number;
  isActive: boolean;
  triggered: boolean;
  triggeredAt: string | null;
  createdAt: string;
  market: {
    id: string;
    title: string;
    category: string;
    yesPrice: number;
    noPrice: number;
    volume24h: number;
  };
}

const ALERT_TYPE_INFO: Record<AlertType, { label: string; icon: string; description: string }> = {
  PRICE_ABOVE: { label: "Price Above", icon: "📈", description: "Triggers when YES price goes above threshold" },
  PRICE_BELOW: { label: "Price Below", icon: "📉", description: "Triggers when YES price falls below threshold" },
  VOLUME_SPIKE: { label: "Volume Spike", icon: "🔥", description: "Triggers when volume exceeds threshold" },
  EDGE_THRESHOLD: { label: "Edge Found", icon: "💎", description: "Triggers when edge % exceeds threshold" },
  DEADLINE_NEAR: { label: "Deadline Near", icon: "⏰", description: "Triggers when days to deadline is below threshold" },
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<any>(null);
  const [newAlert, setNewAlert] = useState<{ type: AlertType; threshold: number }>({
    type: "PRICE_ABOVE",
    threshold: 0.5,
  });

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/polymarket/alerts");
      if (res.ok) {
        const data = await res.json();
        setAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const searchMarkets = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/polymarket/markets?search=${encodeURIComponent(query)}&limit=10`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.markets || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const createAlert = async () => {
    if (!selectedMarket) return;
    try {
      const res = await fetch("/api/polymarket/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          marketId: selectedMarket.id,
          type: newAlert.type,
          threshold: newAlert.threshold,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setSelectedMarket(null);
        setSearchQuery("");
        setSearchResults([]);
        fetchAlerts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      await fetch("/api/polymarket/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", alertId, isActive }),
      });
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteAlert = async (alertId: string) => {
    try {
      await fetch("/api/polymarket/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", alertId }),
      });
      fetchAlerts();
    } catch (err) {
      console.error(err);
    }
  };

  const checkAlerts = async () => {
    try {
      const res = await fetch("/api/polymarket/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.triggered?.length > 0) {
          alert(`🔔 ${data.triggered.length} alert(s) triggered!`);
        } else {
          alert("No alerts triggered");
        }
        fetchAlerts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchMarkets(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeAlerts = alerts.filter(a => a.isActive && !a.triggered);
  const triggeredAlerts = alerts.filter(a => a.triggered);
  const inactiveAlerts = alerts.filter(a => !a.isActive && !a.triggered);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-2 block">← Back to Command Center</Link>
            <h1 className="text-3xl font-bold">🔔 Alerts</h1>
            <p className="text-muted-foreground">Get notified when markets hit your thresholds</p>
          </div>
          <div className="flex gap-2">
            <button onClick={checkAlerts} className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg">🔍 Check Now</button>
            <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">+ New Alert</button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="p-4 border rounded-lg text-center">
            <div className="text-3xl font-bold text-green-600">{activeAlerts.length}</div>
            <div className="text-sm text-muted-foreground">Active</div>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-3xl font-bold text-orange-600">{triggeredAlerts.length}</div>
            <div className="text-sm text-muted-foreground">Triggered</div>
          </div>
          <div className="p-4 border rounded-lg text-center">
            <div className="text-3xl font-bold text-gray-400">{inactiveAlerts.length}</div>
            <div className="text-sm text-muted-foreground">Paused</div>
          </div>
        </div>

        {/* Triggered Alerts */}
        {triggeredAlerts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-orange-500 rounded-full animate-pulse"></span>
              Triggered Alerts
            </h2>
            <div className="space-y-2">
              {triggeredAlerts.map(alert => (
                <div key={alert.id} className="p-4 border-2 border-orange-500 rounded-lg bg-orange-50 dark:bg-orange-950/20">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{ALERT_TYPE_INFO[alert.type].icon}</span>
                        <span className="font-medium">{ALERT_TYPE_INFO[alert.type].label}</span>
                        <span className="text-sm text-muted-foreground">@ {alert.type.includes("PRICE") ? `${(alert.threshold * 100).toFixed(0)}¢` : alert.threshold}</span>
                      </div>
                      <div className="text-sm">{alert.market.title}</div>
                      <div className="text-xs text-muted-foreground">Triggered: {new Date(alert.triggeredAt!).toLocaleString()}</div>
                    </div>
                    <button onClick={() => deleteAlert(alert.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3">Active Alerts</h2>
            <div className="space-y-2">
              {activeAlerts.map(alert => {
                const currentValue = alert.type.includes("PRICE") ? alert.market.yesPrice : alert.market.volume24h;
                const progress = alert.type === "PRICE_ABOVE" 
                  ? Math.min((currentValue / alert.threshold) * 100, 100)
                  : alert.type === "PRICE_BELOW"
                  ? Math.min(((1 - currentValue) / (1 - alert.threshold)) * 100, 100)
                  : 50;
                
                return (
                  <div key={alert.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{ALERT_TYPE_INFO[alert.type].icon}</span>
                          <span className="font-medium">{ALERT_TYPE_INFO[alert.type].label}</span>
                          <span className="text-sm text-muted-foreground">
                            @ {alert.type.includes("PRICE") ? `${(alert.threshold * 100).toFixed(0)}¢` : alert.threshold}
                          </span>
                        </div>
                        <div className="text-sm truncate">{alert.market.title}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">Current: {alert.type.includes("PRICE") ? `${(alert.market.yesPrice * 100).toFixed(0)}¢` : `$${(alert.market.volume24h/1000).toFixed(0)}k`}</span>
                        <button onClick={() => toggleAlert(alert.id, false)} className="text-yellow-500 hover:text-yellow-700">⏸️</button>
                        <button onClick={() => deleteAlert(alert.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Inactive Alerts */}
        {inactiveAlerts.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-3 text-muted-foreground">Paused Alerts</h2>
            <div className="space-y-2 opacity-60">
              {inactiveAlerts.map(alert => (
                <div key={alert.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span>{ALERT_TYPE_INFO[alert.type].icon}</span>
                        <span className="font-medium">{ALERT_TYPE_INFO[alert.type].label}</span>
                      </div>
                      <div className="text-sm truncate">{alert.market.title}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => toggleAlert(alert.id, true)} className="text-green-500 hover:text-green-700">▶️</button>
                      <button onClick={() => deleteAlert(alert.id)} className="text-red-500 hover:text-red-700">🗑️</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {alerts.length === 0 && (
          <div className="text-center py-16 border rounded-xl">
            <div className="text-6xl mb-4">🔔</div>
            <h2 className="text-xl font-bold mb-2">No Alerts Set</h2>
            <p className="text-muted-foreground mb-4">Create alerts to get notified when markets hit your targets</p>
            <button onClick={() => setShowCreate(true)} className="px-6 py-3 bg-primary text-primary-foreground rounded-lg">Create First Alert</button>
          </div>
        )}

        {/* Create Alert Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-bold mb-4">Create Alert</h2>
              
              {/* Market Search */}
              {!selectedMarket ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Select Market</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search markets..."
                    className="w-full px-4 py-3 border rounded-lg"
                    autoFocus
                  />
                  {searchResults.length > 0 && (
                    <div className="mt-2 border rounded-lg max-h-48 overflow-y-auto">
                      {searchResults.map(market => (
                        <button
                          key={market.id}
                          onClick={() => { setSelectedMarket(market); setSearchQuery(""); setSearchResults([]); }}
                          className="w-full p-3 text-left hover:bg-muted border-b last:border-b-0"
                        >
                          <div className="font-medium truncate">{market.title}</div>
                          <div className="text-sm text-muted-foreground">{(market.yesPrice * 100).toFixed(0)}¢</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{selectedMarket.title}</div>
                      <div className="text-sm text-muted-foreground">Current: {(selectedMarket.yesPrice * 100).toFixed(0)}¢</div>
                    </div>
                    <button onClick={() => setSelectedMarket(null)} className="text-muted-foreground hover:text-foreground">✕</button>
                  </div>
                </div>
              )}

              {selectedMarket && (
                <>
                  {/* Alert Type */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Alert Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(Object.keys(ALERT_TYPE_INFO) as AlertType[]).map(type => (
                        <button
                          key={type}
                          onClick={() => setNewAlert(prev => ({ ...prev, type }))}
                          className={`p-3 border rounded-lg text-left transition ${newAlert.type === type ? "border-primary bg-primary/10" : "hover:border-muted-foreground"}`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{ALERT_TYPE_INFO[type].icon}</span>
                            <span className="font-medium">{ALERT_TYPE_INFO[type].label}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">{ALERT_TYPE_INFO[type].description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Threshold */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Threshold {newAlert.type.includes("PRICE") ? "(price in cents)" : newAlert.type === "VOLUME_SPIKE" ? "(volume in $)" : newAlert.type === "DEADLINE_NEAR" ? "(days)" : "(%)"}
                    </label>
                    <input
                      type="number"
                      value={newAlert.type.includes("PRICE") ? newAlert.threshold * 100 : newAlert.threshold}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setNewAlert(prev => ({
                          ...prev,
                          threshold: prev.type.includes("PRICE") ? val / 100 : val
                        }));
                      }}
                      className="w-full px-4 py-3 border rounded-lg"
                      step={newAlert.type.includes("PRICE") ? 1 : newAlert.type === "VOLUME_SPIKE" ? 1000 : 1}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 justify-end">
                <button onClick={() => { setShowCreate(false); setSelectedMarket(null); }} className="px-4 py-2 text-muted-foreground hover:text-foreground">Cancel</button>
                <button onClick={createAlert} disabled={!selectedMarket} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg disabled:opacity-50">Create Alert</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
