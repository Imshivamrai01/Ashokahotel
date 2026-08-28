"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { signOut } from "next-auth/react";
import {
  Bell,
  CheckCircle2,
  Clock,
  ConciergeBell,
  CreditCard,
  History,
  LayoutGrid,
  LogOut,
  Minus,
  Plus,
  PlusCircle,
  Receipt,
  Search,
  Send,
  ShoppingBag,
  Timer,
  Trash2,
  UtensilsCrossed,
  Check,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { formatElapsed, formatPrice } from "@/lib/utils";
import type { IOrder, ICategory, IItem, ILocation } from "@/types";
import type { TableBill } from "@/app/api/orders/cashier/route";
import { Pill, type PillVariant } from "@/components/ui/Pill";
import { FssaiDot } from "@/components/ui/FssaiDot";
import OrdersQueue from "@/components/cashier/OrdersQueue";
import TableStatusGrid from "@/components/cashier/TableStatusGrid";
import CashierInvoices from "@/components/cashier/CashierInvoices";
import CancelOrderModal from "@/components/captain/CancelOrderModal";
import KOTBillPrint from "@/components/cashier/KOTBillPrint";

interface Props {
  staffName: string;
  role: string;
}

const STATUS_CONFIG: Record<string, { label: string; pill: PillVariant }> = {
  pending_captain: { label: "Needs Confirmation", pill: "error" },
  pending: { label: "Queued / Confirmed", pill: "warning" },
  preparing: { label: "Kitchen Preparing", pill: "info" },
  partially_ready: { label: "Partially Ready", pill: "info" },
  ready: { label: "Ready for Delivery", pill: "success" },
  partially_delivered: { label: "Partially Delivered", pill: "success" },
  delivered: { label: "Delivered to Room", pill: "neutral" },
  cancelled: { label: "Cancelled", pill: "error" },
};

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function ReceptionistPageClient({ staffName, role }: Props) {
  const queryClient = useQueryClient();
  const now = useNow();

  const [activeTab, setActiveTab] = useState<"live" | "billing" | "new_order" | "invoices">("live");
  const [liveFilter, setLiveFilter] = useState<"all" | "unconfirmed" | "active" | "delivered">("all");
  const [cancellingOrder, setCancellingOrder] = useState<IOrder | null>(null);

  // New Order State
  const [selectedRoomId, setSelectedRoomId] = useState<string>("");
  const [selectedRoomLabel, setSelectedRoomLabel] = useState<string>("");
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [cart, setCart] = useState<Array<{ item: IItem; quantity: number; notes?: string }>>([]);
  const [orderNotes, setOrderNotes] = useState("");

  // 1. Fetch All Active Orders for Live Feed
  const { data: allOrders = [], isLoading: loadingOrders } = useQuery<IOrder[]>({
    queryKey: ["receptionist-orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders/captain");
      if (!res.ok) throw new Error("Failed to fetch active orders");
      return res.json();
    },
    refetchInterval: 4000,
  });

  // 2. Fetch Cashier Billing Tables
  const { data: billingTables = [] } = useQuery<TableBill[]>({
    queryKey: ["cashier-tables"],
    queryFn: async () => {
      const res = await fetch("/api/orders/cashier");
      if (!res.ok) throw new Error("Failed to fetch billing tables");
      return res.json();
    },
    refetchInterval: 5000,
  });

  // 3. Fetch Locations (Rooms & Tables)
  const { data: locations = [] } = useQuery<ILocation[]>({
    queryKey: ["all-locations"],
    queryFn: async () => {
      const res = await fetch("/api/locations");
      if (!res.ok) throw new Error("Failed to fetch locations");
      return res.json();
    },
  });

  // 4. Fetch Menu for New Orders
  const { data: menuData } = useQuery<{ categories: ICategory[]; items: IItem[] }>({
    queryKey: ["menu-data"],
    queryFn: async () => {
      const res = await fetch("/api/menu");
      if (!res.ok) throw new Error("Failed to fetch menu");
      return res.json();
    },
    staleTime: 60_000,
  });

  // Sound chime when new unconfirmed order arrives
  const prevUnconfirmedCount = useRef(0);
  const unconfirmedOrders = useMemo(
    () => allOrders.filter((o) => o.status === "pending_captain" || !o.isCaptainConfirmed),
    [allOrders],
  );

  useEffect(() => {
    if (unconfirmedOrders.length > prevUnconfirmedCount.current) {
      toast.info(`🔔 New Room Order received! (${unconfirmedOrders.length} waiting confirmation)`, {
        duration: 6000,
      });
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
        osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.15); // A5
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      } catch {
        // audio context blocked
      }
    }
    prevUnconfirmedCount.current = unconfirmedOrders.length;
  }, [unconfirmedOrders.length]);

  // Mutations
  const confirmMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "captain_confirm" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to confirm order");
      return data;
    },
    onSuccess: () => {
      toast.success("Order confirmed! KOT sent to Kitchen Print Queue.");
      queryClient.invalidateQueries({ queryKey: ["receptionist-orders"] });
      queryClient.invalidateQueries({ queryKey: ["cashier-tables"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to confirm order");
    },
  });

  const deliverMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "delivered" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to mark delivered");
      return data;
    },
    onSuccess: () => {
      toast.success("Order marked as Delivered to Room!");
      queryClient.invalidateQueries({ queryKey: ["receptionist-orders"] });
      queryClient.invalidateQueries({ queryKey: ["cashier-tables"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update delivery status");
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!selectedRoomId || !selectedRoomLabel) {
        throw new Error("Please select a Room or Table.");
      }
      if (!cart.length) {
        throw new Error("Cart is empty. Please add items.");
      }

      const payload = {
        tableId: selectedRoomId,
        tableLabel: selectedRoomLabel,
        items: cart.map((c) => ({
          itemId: c.item._id,
          quantity: c.quantity,
          notes: c.notes,
        })),
        specialInstructions: orderNotes || undefined,
        placedByRole: "captain",
      };

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create order");
      return data;
    },
    onSuccess: () => {
      toast.success(`Order created for ${selectedRoomLabel}!`);
      setCart([]);
      setOrderNotes("");
      setActiveTab("live");
      queryClient.invalidateQueries({ queryKey: ["receptionist-orders"] });
      queryClient.invalidateQueries({ queryKey: ["cashier-tables"] });
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to place order");
    },
  });

  // Filtered Live Orders
  const filteredOrders = useMemo(() => {
    return allOrders.filter((order) => {
      if (liveFilter === "unconfirmed") {
        return order.status === "pending_captain" || !order.isCaptainConfirmed;
      }
      if (liveFilter === "active") {
        return ["pending", "preparing", "partially_ready", "ready", "partially_delivered"].includes(order.status);
      }
      if (liveFilter === "delivered") {
        return order.status === "delivered";
      }
      return true;
    });
  }, [allOrders, liveFilter]);

  // Cart operations
  const addToCart = (item: IItem) => {
    setCart((prev) => {
      const idx = prev.findIndex((p) => p.item._id === item._id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((p) => {
          if (p.item._id === itemId) {
            const nextQty = p.quantity + delta;
            return nextQty > 0 ? { ...p, quantity: nextQty } : null;
          }
          return p;
        })
        .filter(Boolean) as Array<{ item: IItem; quantity: number; notes?: string }>,
    );
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, c) => sum + (c.item.discountPrice ?? c.item.price) * c.quantity, 0);
  }, [cart]);

  // Display items for new order
  const displayItems = useMemo(() => {
    const all = menuData?.items ?? [];
    return all.filter((item) => {
      if (!item.isAvailable) return false;
      if (vegOnly && !item.isVegetarian) return false;
      if (selectedCatId && item.categoryId !== selectedCatId) return false;
      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        return item.name.toLowerCase().includes(q) || (item.description?.toLowerCase().includes(q) ?? false);
      }
      return true;
    });
  }, [menuData?.items, vegOnly, selectedCatId, orderSearch]);

  return (
    <div className="flex flex-col h-screen bg-[#FAF9F6] text-slate-900 overflow-hidden font-sans">
      {/* Top Receptionist Light Header */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200/80 shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
            <ConciergeBell className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-playfair font-black text-base text-slate-900 tracking-tight">Ashoka Hotel</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                Reception Desk
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Staff: <span className="text-slate-800 font-semibold">{staffName}</span>
              {role === "admin" && " (Admin Access)"}
            </p>
          </div>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/80">
          <button
            onClick={() => setActiveTab("live")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "live"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/30"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Live Room Orders</span>
            {unconfirmedOrders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500 text-white font-extrabold animate-pulse">
                {unconfirmedOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("billing")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "billing"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/30"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>Room Billing & Checkout</span>
            {billingTables.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-900 font-bold border border-amber-200">
                {billingTables.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("new_order")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "new_order"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/30"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Room Order (POS)</span>
          </button>

          <button
            onClick={() => setActiveTab("invoices")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "invoices"
                ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/30"
                : "text-slate-600 hover:text-slate-900 hover:bg-white"
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Invoices & History</span>
          </button>
        </div>

        {/* Right Exit / Sign out */}
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <a
              href="/admin/dashboard"
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
            >
              Admin Dashboard
            </a>
          )}
          <button
            onClick={() =>
              signOut({ redirect: false }).then(() => {
                window.location.replace("/login");
              })
            }
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden flex flex-col bg-[#FAF9F6]">
        {/* ─── TAB 1: LIVE ROOM ORDERS ────────────────────────────────────────── */}
        {activeTab === "live" && (
          <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 max-w-7xl w-full mx-auto">
            {/* Filter Bar & Quick Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between pb-4 mb-4 border-b border-slate-200/80 gap-3 shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto [scrollbar-width:none]">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-1">Filter:</span>
                {[
                  { id: "all", label: `All Orders (${allOrders.length})` },
                  {
                    id: "unconfirmed",
                    label: `🚨 Needs Confirmation (${unconfirmedOrders.length})`,
                    highlight: unconfirmedOrders.length > 0,
                  },
                  {
                    id: "active",
                    label: `In Progress (${
                      allOrders.filter((o) =>
                        ["pending", "preparing", "partially_ready", "ready", "partially_delivered"].includes(o.status),
                      ).length
                    })`,
                  },
                  {
                    id: "delivered",
                    label: `Delivered (${allOrders.filter((o) => o.status === "delivered").length})`,
                  },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setLiveFilter(f.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                      liveFilter === f.id
                        ? f.highlight
                          ? "bg-rose-600 text-white shadow-sm shadow-rose-600/30"
                          : "bg-slate-900 text-white shadow-xs"
                        : f.highlight
                          ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                          : "bg-white text-slate-600 border border-slate-200/90 hover:text-slate-900 hover:bg-slate-50 shadow-2xs"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setActiveTab("new_order")}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white transition-all shadow-md shadow-amber-500/25 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Take Room Order</span>
              </button>
            </div>

            {/* Orders Feed Grid */}
            <div className="flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {loadingOrders ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
                  <span className="loading loading-spinner loading-lg text-amber-600" />
                  <p className="text-sm font-medium text-slate-600">Loading live room orders...</p>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3 border-2 border-dashed border-slate-200 rounded-3xl p-8 bg-white/60">
                  <ConciergeBell className="w-12 h-12 text-slate-300" />
                  <p className="text-base font-bold text-slate-700">No orders in this view</p>
                  <p className="text-xs text-slate-500 max-w-sm text-center">
                    When guests order from room QR code or via phone call, orders will appear here automatically.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredOrders.map((order) => {
                    const isUnconfirmed = order.status === "pending_captain" || !order.isCaptainConfirmed;
                    const isDelivered = order.status === "delivered";
                    const isReady = order.status === "ready";
                    const statusMeta = STATUS_CONFIG[order.status] || {
                      label: order.status,
                      pill: "neutral" as PillVariant,
                    };

                    return (
                      <motion.div
                        key={order._id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex flex-col justify-between rounded-2xl border transition-all p-4.5 bg-white ${
                          isUnconfirmed
                            ? "border-amber-400 shadow-md shadow-amber-500/10 ring-2 ring-amber-400/30"
                            : isReady
                              ? "border-emerald-400/80 shadow-md shadow-emerald-500/10"
                              : "border-slate-200/90 shadow-xs hover:shadow-sm"
                        }`}
                      >
                        <div>
                          {/* Header: Room & KOT */}
                          <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-playfair font-black text-lg text-slate-900">
                                  {order.tableLabel}
                                </span>
                                {order.placedByRole === "customer" ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                    QR Self-Order
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                                    Intercom
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                                KOT #{order.kotNumber} · {formatElapsed(new Date(order.createdAt).getTime(), now)}
                              </p>
                            </div>
                            <Pill variant={statusMeta.pill}>{statusMeta.label}</Pill>
                          </div>

                          {/* Items List */}
                          <div className="py-3 flex flex-col gap-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                  <FssaiDot isVeg={item.isVegetarian} />
                                  <span className="font-bold text-slate-800 truncate">
                                    {item.quantity} × {item.name}
                                  </span>
                                  {item.isNC && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-100 text-amber-800">
                                      NC
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono font-medium text-slate-600 shrink-0 ml-2">
                                  {formatPrice(item.price * item.quantity)}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Special instructions */}
                          {order.specialInstructions && (
                            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] mb-3">
                              <span className="font-bold">Guest Request: </span>
                              {order.specialInstructions}
                            </div>
                          )}
                        </div>

                        {/* Footer: Subtotal & Actions */}
                        <div className="pt-3 border-t border-slate-100 flex flex-col gap-2 mt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Order Total:</span>
                            <span className="font-mono font-black text-amber-700 text-sm">
                              {formatPrice(order.total || order.subtotal)}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1.5 mt-1">
                            {isUnconfirmed ? (
                              <button
                                onClick={() => confirmMutation.mutate(order._id)}
                                disabled={confirmMutation.isPending}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-500/25 transition-all cursor-pointer"
                              >
                                <Check className="w-4 h-4 stroke-[3]" />
                                <span>Confirm Order</span>
                              </button>
                            ) : !isDelivered ? (
                              <button
                                onClick={() => deliverMutation.mutate(order._id)}
                                disabled={deliverMutation.isPending}
                                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-sm shadow-amber-500/25 transition-all cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Mark Delivered</span>
                              </button>
                            ) : (
                              <div className="flex-1 py-2 px-2 rounded-xl bg-emerald-50 text-emerald-800 text-[11px] font-bold flex items-center justify-center gap-1 border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Delivered to Room</span>
                              </div>
                            )}

                            <KOTBillPrint order={order} hotelName="Ashoka Hotel" />

                            <button
                              onClick={() => {
                                setActiveTab("billing");
                              }}
                              className="py-2 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                              title="Go to Room Billing"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setCancellingOrder(order)}
                              className="py-2 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
                              title="Cancel / Void Order"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── TAB 2: ROOM BILLING & CHECKOUT (CASHIER COMBO) ────────────────── */}
        {activeTab === "billing" && (
          <div className="flex-1 flex overflow-hidden bg-base-100">
            {/* Left: Orders Queue (Grouped table-wise / room-wise) */}
            <div className="flex-1 border-r border-slate-200 overflow-hidden flex flex-col">
              <OrdersQueue />
            </div>
            {/* Right: Room Status Grid */}
            <div className="w-64 shrink-0 overflow-hidden flex flex-col bg-white border-l border-slate-200">
              <TableStatusGrid />
            </div>
          </div>
        )}

        {/* ─── TAB 3: NEW ROOM ORDER (POS / INTERCOM COMBO) ───────────────────── */}
        {activeTab === "new_order" && (
          <div className="flex-1 flex overflow-hidden bg-[#FAF9F6]">
            {/* Left: Menu & Categories */}
            <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 border-r border-slate-200">
              {/* Room Selector & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pb-4 border-b border-slate-200 shrink-0">
                <div className="w-full sm:w-64">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Select Room / Table:
                  </label>
                  <select
                    value={selectedRoomId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setSelectedRoomId(id);
                      const found = locations.find((l) => l._id === id);
                      setSelectedRoomLabel(found ? found.label : "");
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500 shadow-2xs"
                  >
                    <option value="">-- Choose Room / Location --</option>
                    <optgroup label="Hotel Rooms">
                      {locations
                        .filter((l) => l.type === "room")
                        .map((l) => (
                          <option key={l._id} value={l._id}>
                            {l.label} ({l.floor || "Room"}) {l.isOccupied ? "• Occupied" : "• Free"}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Dining Tables & Lawn">
                      {locations
                        .filter((l) => l.type === "table")
                        .map((l) => (
                          <option key={l._id} value={l._id}>
                            {l.label} ({l.floor || "Table"}) {l.isOccupied ? "• Occupied" : "• Free"}
                          </option>
                        ))}
                    </optgroup>
                  </select>
                </div>

                <div className="flex-1 relative">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                    Search Menu Dishes:
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      placeholder="Search items (e.g. Biryani, Paneer, Naan, Chai, Omelette)..."
                      className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="flex items-end shrink-0">
                  <button
                    onClick={() => setVegOnly((v) => !v)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      vegOnly
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                        : "bg-white text-slate-600 border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    <span>Veg Only</span>
                  </button>
                </div>
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-2 py-3 overflow-x-auto shrink-0 [scrollbar-width:none]">
                <button
                  onClick={() => setSelectedCatId(null)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                    selectedCatId === null
                      ? "bg-amber-500 text-white font-black shadow-xs shadow-amber-500/25"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  All Items
                </button>
                {menuData?.categories?.map((cat) => (
                  <button
                    key={cat._id}
                    onClick={() => setSelectedCatId(cat._id)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-colors cursor-pointer ${
                      selectedCatId === cat._id
                        ? "bg-amber-500 text-white font-black shadow-xs shadow-amber-500/25"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Items Grid */}
              <div className="flex-1 overflow-y-auto pr-1 [scrollbar-width:thin]">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {displayItems.map((item) => {
                    const cartEntry = cart.find((c) => c.item._id === item._id);
                    const qty = cartEntry?.quantity ?? 0;

                    return (
                      <div
                        key={item._id}
                        onClick={() => addToCart(item)}
                        className={`flex flex-col justify-between p-4 rounded-2xl border transition-all cursor-pointer group select-none bg-white ${
                          qty > 0
                            ? "border-amber-400 shadow-md shadow-amber-500/10 ring-2 ring-amber-400/30"
                            : "border-slate-200/90 shadow-2xs hover:border-amber-300 hover:shadow-xs"
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5">
                              <FssaiDot isVeg={item.isVegetarian} />
                              <span className="font-bold text-sm text-slate-900 group-hover:text-amber-800 transition-colors line-clamp-1">
                                {item.name}
                              </span>
                            </div>
                          </div>
                          {item.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-snug">
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                          <span className="font-mono font-black text-amber-700 text-sm">
                            {formatPrice(item.discountPrice ?? item.price)}
                          </span>

                          {qty > 0 ? (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 bg-slate-50 px-2 py-0.5 rounded-xl border border-slate-200"
                            >
                              <button
                                onClick={() => updateCartQty(item._id, -1)}
                                className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono font-bold text-xs text-amber-800">{qty}</span>
                              <button
                                onClick={() => updateCartQty(item._id, 1)}
                                className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                              + Add
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Cart Summary */}
            <div className="w-80 shrink-0 flex flex-col bg-white p-4 sm:p-5 border-l border-slate-200 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-amber-600" />
                  <h3 className="font-bold text-sm text-slate-900">Room Order Summary</h3>
                </div>
                {cart.length > 0 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Target Room Header */}
              <div className="py-3 px-3.5 my-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Target Room</p>
                  <p className="font-playfair font-black text-base text-amber-800">
                    {selectedRoomLabel || "None Selected"}
                  </p>
                </div>
                {!selectedRoomLabel && (
                  <span className="text-[10px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    Select room 👈
                  </span>
                )}
              </div>

              {/* Cart Items List */}
              <div className="flex-1 overflow-y-auto pr-1 [scrollbar-width:thin] flex flex-col gap-2">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400 gap-2 text-center p-4">
                    <UtensilsCrossed className="w-8 h-8 text-slate-300" />
                    <p className="text-xs font-bold text-slate-700">Cart is empty</p>
                    <p className="text-[11px] text-slate-500">Select dishes from the menu to build the room order.</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.item._id} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex items-center gap-1.5 font-bold text-slate-800">
                          <FssaiDot isVeg={item.item.isVegetarian} />
                          <span>{item.item.name}</span>
                        </div>
                        <span className="font-mono font-bold text-amber-700 shrink-0">
                          {formatPrice((item.item.discountPrice ?? item.item.price) * item.quantity)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60">
                        <span className="text-[11px] text-slate-500 font-mono">
                          {formatPrice(item.item.discountPrice ?? item.item.price)} each
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateCartQty(item.item._id, -1)}
                            className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="font-mono font-bold text-amber-800">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQty(item.item._id, 1)}
                            className="w-5 h-5 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Special Instructions Note */}
              <div className="pt-3 border-t border-slate-100">
                <input
                  type="text"
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  placeholder="Special instructions (e.g. less spicy, extra water)..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 mb-3 shadow-2xs"
                />

                <div className="flex items-center justify-between py-2 border-t border-slate-100 text-sm">
                  <span className="text-slate-600 font-bold">Total Payable:</span>
                  <span className="font-mono font-black text-amber-800 text-base">{formatPrice(cartTotal)}</span>
                </div>

                <button
                  onClick={() => createOrderMutation.mutate()}
                  disabled={!selectedRoomId || cart.length === 0 || createOrderMutation.isPending}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    !selectedRoomId || cart.length === 0
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                      : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-md shadow-amber-500/25"
                  }`}
                >
                  <Send className="w-4 h-4" />
                  <span>{createOrderMutation.isPending ? "Creating Order..." : "Place & Confirm Room Order"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB 4: INVOICES & HISTORY ──────────────────────────────────────── */}
        {activeTab === "invoices" && (
          <div className="flex-1 overflow-hidden bg-base-100">
            <CashierInvoices onExit={() => setActiveTab("live")} />
          </div>
        )}
      </main>

      {/* Cancel / Void Modal */}
      {cancellingOrder && (
        <CancelOrderModal
          order={cancellingOrder}
          onClose={() => setCancellingOrder(null)}
          onSuccess={() => {
            setCancellingOrder(null);
            queryClient.invalidateQueries({ queryKey: ["receptionist-orders"] });
            queryClient.invalidateQueries({ queryKey: ["cashier-tables"] });
          }}
        />
      )}

      <Toaster position="bottom-right" richColors />
    </div>
  );
}
