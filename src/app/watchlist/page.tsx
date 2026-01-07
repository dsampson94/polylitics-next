/**
 * Watchlist Page
 * Track positions and monitor P&L
 */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface WatchlistItem {
  id: string;
  marketId: string;
  entryPrice: number | null;
  position: string;
  size: number | null;
  notes: string | null;
  addedAt: string;
  market: {
    id: string;
    title: string;
    category: string;
    yesPrice: number;
    noPrice: number;
    volume24h: number;
    liquidity: number;
  };
  currentPrice: number;
  unrealizedPL: number;
  plPercent: number;
}

interface Watchlist {
  id: string;
  name: string;
  items: WatchlistItem[];
}

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([]);
  const [activeList, setActiveList] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newListName, setNewListName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [addingTo, setAddingTo] = useState<string | null>(null);

  const fetchWatchlists = async () => {
    try {
      const res = await fetch("/api/polymarket/watchlist");
      if (res.ok) {
        const data = await res.json();
        setWatchlists(data.watchlists || []);
        if (!activeList && data.watchlists?.length > 0) {
          setActiveList(data.watchlists[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createWatchlist = async () => {
    if (!newListName.trim()) return;
    try {
      const res = await fetch("/api/polymarket/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createList", name: newListName }),
      });
      if (res.ok) {
        setNewListName("");
        setShowAddModal(false);
        fetchWatchlists();
      }
    } catch (err) {
      console.error(err);
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

  const addToWatchlist = async (marketId: string, position: string = "WATCHING") => {
    if (!addingTo) return;
    try {
      const res = await fetch("/api/polymarket/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          action: "addItem",
          watchlistId: addingTo,
          marketId,
          position,
        }),
      });
      if (res.ok) {
        setSearchQuery("");
        setSearchResults([]);
        setAddingTo(null);
        fetchWatchlists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const removeItem = async (watchlistId: string, itemId: string) => {
    try {
      const res = await fetch("/api/polymarket/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "removeItem", watchlistId, itemId }),
      });
      if (res.ok) {
        fetchWatchlists();
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchWatchlists();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => searchMarkets(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const currentWatchlist = watchlists.find(w => w.id === activeList);
  const totalPL = currentWatchlist?.items.reduce((sum, item) => sum + (item.unrealizedPL || 0), 0) ?? 0;
  const positionsWithEntry = currentWatchlist?.items.filter(i => i.entryPrice !== null) ?? [];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/" className="text-sm text-muted-foreground hover:text-primary mb-2 block">← Back to Command Center</Link>
            <h1 className="text-3xl font-bold">📋 Watchlist</h1>
            <p className="text-muted-foreground">Track positions and monitor P&L</p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90">+ New List</button>
        </div>

        {watchlists.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {watchlists.map(wl => (
              <button
                key={wl.id}
                onClick={() => setActiveList(wl.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${activeList === wl.id ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"}`}
              >
                {wl.name} ({wl.items?.length ?? 0})
              </button>
            ))}
          </div>
        )}

        {watchlists.length === 0 && (
          <div className="text-center py-16 border rounded-xl">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-xl font-bold mb-2">No Watchlists Yet</h2>
            <p className="text-muted-foreground mb-4">Create your first watchlist to start tracking markets</p>
            <button onClick={() => setShowAddModal(true)} className="px-6 py-3 bg-primary text-primary-foreground rounded-lg">Create Watchlist</button>
          </div>
        )}

        {currentWatchlist && (
          <>
            {positionsWithEntry.length > 0 && (
              <div className="mb-6 p-4 border rounded-xl bg-gradient-to-r from-muted/50 to-muted">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Tracked Positions</div>
                    <div className="text-2xl font-bold">{positionsWithEntry.length}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Total Unrealized P&L</div>
                    <div className={`text-2xl font-bold ${totalPL >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {totalPL >= 0 ? "+" : ""}{totalPL.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Watching</div>
                    <div className="text-2xl font-bold">{currentWatchlist.items.filter(i => i.position === "WATCHING").length}</div>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-4">
              {addingTo === currentWatchlist.id ? (
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search markets to add..."
                    className="w-full px-4 py-3 border rounded-lg"
                    autoFocus
                  />
                  <button onClick={() => { setAddingTo(null); setSearchQuery(""); setSearchResults([]); }} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">✕</button>
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {searchResults.map(market => (
                        <div key={market.id} className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0">
                          <div className="font-medium truncate">{market.title}</div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-sm text-muted-foreground">{market.category}</span>
                            <div className="flex gap-2">
                              <button onClick={() => addToWatchlist(market.id, "LONG")} className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded">+ Long</button>
                              <button onClick={() => addToWatchlist(market.id, "SHORT")} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">+ Short</button>
                              <button onClick={() => addToWatchlist(market.id, "WATCHING")} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">+ Watch</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <button onClick={() => setAddingTo(currentWatchlist.id)} className="w-full py-3 border-2 border-dashed rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition">+ Add Market</button>
              )}
            </div>

            {currentWatchlist.items.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground"><p>No markets in this watchlist yet</p></div>
            ) : (
              <div className="space-y-3">
                {currentWatchlist.items.map(item => {
                  const priceDisplay = item.position === "SHORT" ? item.market.noPrice : item.market.yesPrice;
                  const hasPosition = item.entryPrice !== null;
                  return (
                    <div key={item.id} className="p-4 border rounded-lg hover:border-primary/50 transition">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${item.position === "LONG" ? "bg-green-100 text-green-700" : item.position === "SHORT" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>{item.position}</span>
                            <span className="text-xs text-muted-foreground">{item.market.category}</span>
                          </div>
                          <div className="font-medium">{item.market.title}</div>
                          {item.notes && <div className="text-sm text-muted-foreground mt-1">{item.notes}</div>}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold">{(priceDisplay * 100).toFixed(0)}¢</div>
                          {hasPosition && (
                            <>
                              <div className="text-xs text-muted-foreground">Entry: {(item.entryPrice! * 100).toFixed(0)}¢</div>
                              <div className={`text-sm font-medium ${item.plPercent >= 0 ? "text-green-600" : "text-red-600"}`}>{item.plPercent >= 0 ? "+" : ""}{item.plPercent.toFixed(1)}%</div>
                            </>
                          )}
                        </div>
                        <button onClick={() => removeItem(currentWatchlist.id, item.id)} className="text-muted-foreground hover:text-red-500 transition">🗑️</button>
                      </div>
                      <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                        <span>Vol 24h: ${(item.market.volume24h / 1000).toFixed(1)}k</span>
                        <span>Liq: ${(item.market.liquidity / 1000).toFixed(1)}k</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-background p-6 rounded-xl w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Create Watchlist</h2>
              <input type="text" value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="Watchlist name..." className="w-full px-4 py-3 border rounded-lg mb-4" autoFocus />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-muted-foreground hover:text-foreground">Cancel</button>
                <button onClick={createWatchlist} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">Create</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
