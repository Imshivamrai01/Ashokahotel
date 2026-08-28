"use client";

import { useEffect } from "react";
import { signOut } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChefHat,
  LogOut,
  ArrowLeft,
  ClipboardList,
  PlusCircle,
  Bell,
  Volume2,
} from "lucide-react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster, toast } from "sonner";
import TableSelector from "@/components/captain/TableSelector";
import OrderBuilder from "@/components/captain/OrderBuilder";
import OrderSummary from "@/components/captain/OrderSummary";
import ActiveOrders from "@/components/captain/ActiveOrders";
import CaptainCallPopup from "@/components/captain/CaptainCallPopup";
import { useCaptainStore } from "@/store/captain";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { useCaptainOrderAudioAlert, playLoudOrderChime } from "@/hooks/useCaptainOrderAudioAlert";
import type { ILocation } from "@/types";

const queryClient = new QueryClient();

interface CaptainAppProps {
  captainName: string;
}

function CaptainApp({ captainName }: CaptainAppProps) {
  const { step, selectedTable, setStep, selectTable, clearTable, resetOrder } =
    useCaptainStore();

  // Continuous background audio alert and order watcher
  useCaptainOrderAudioAlert();

  // Register push notifications for this captain device
  const { permission, enable, disable } = usePushSubscription();

  // Reset on unmount
  useEffect(() => {
    return () => resetOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectTable = (table: ILocation) => {
    selectTable(table);
  };

  const stepLabel: Record<string, string> = {
    table_select: "Select Table",
    order_build: "Add Items",
    order_summary: "Review & Place",
    active_orders: "Active Orders",
  };

  const handleBack = () => {
    if (step === "order_summary") setStep("order_build");
    else if (step === "order_build" || step === "active_orders") clearTable();
    else clearTable();
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-slate-900 flex flex-col">
      <CaptainCallPopup />
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs px-4 py-3.5 flex items-center gap-3">
        {step !== "table_select" && (
          <button
            onClick={handleBack}
            className="btn btn-ghost btn-sm btn-circle text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}

        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 shadow-xs">
            <ChefHat className="w-5 h-5" />
          </div>
          <div>
            <p className="font-black text-sm leading-none text-slate-900">Captain Desk</p>
            <p className="text-xs text-slate-600 font-bold leading-none mt-1">
              {stepLabel[step]}
              {selectedTable && step !== "table_select" && (
                <span className="ml-1 text-amber-800 font-black">
                  · {selectedTable.label}
                </span>
              )}
            </p>
          </div>
        </div>

        <span className="text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl hidden sm:block">
          👤 {captainName}
        </span>

        <button
          onClick={() => {
            playLoudOrderChime();
            toast.success("🔔 Sound Test: Beep playing at full volume!");
          }}
          className="btn bg-white hover:bg-amber-50 border border-slate-200 btn-sm gap-1.5 text-slate-700 font-bold rounded-xl shadow-xs"
          title="Test sound & unblock audio"
        >
          <Volume2 className="w-4 h-4 text-amber-600" />
          <span className="hidden sm:inline">Test Sound</span>
        </button>

        {permission === "default" && (
          <button
            onClick={() => enable()}
            className="btn bg-amber-50 hover:bg-amber-100 border border-amber-300 btn-sm gap-1 text-amber-900 font-bold rounded-xl"
            title="Enable call alerts on this device"
          >
            <Bell className="w-4 h-4 text-amber-600" />
            <span className="hidden sm:inline">Enable alerts</span>
          </button>
        )}

        <button
          onClick={() =>
            disable().finally(() =>
              signOut({ redirect: false }).then(() => {
                window.location.replace("/captain/login");
              }),
            )
          }
          className="btn btn-ghost btn-sm gap-1 text-slate-600 hover:bg-rose-50 hover:text-rose-700 font-bold rounded-xl"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </header>

      {/* Tab bar when a table is selected (but not in summary) */}
      {selectedTable && step !== "order_summary" && (
        <div className="border-b border-slate-200 bg-white flex shadow-xs">
          <button
            onClick={() => setStep("order_build")}
            className={`flex-1 py-3 text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              step === "order_build"
                ? "border-amber-500 text-amber-900 bg-amber-50/60"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <PlusCircle className="w-4 h-4 text-amber-600" />
            New Order
          </button>
          <button
            onClick={() => setStep("active_orders")}
            className={`flex-1 py-3 text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors border-b-2 ${
              step === "active_orders"
                ? "border-rose-500 text-rose-900 bg-rose-50/60"
                : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50"
            }`}
          >
            <ClipboardList className="w-4 h-4 text-rose-600" />
            Active Orders
          </button>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait">
          {step === "table_select" && (
            <motion.div
              key="table_select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <h1 className="font-playfair text-3xl font-black mb-6 text-slate-950 tracking-tight">
                Select a Table
              </h1>
              <TableSelector onSelectTable={handleSelectTable} />
            </motion.div>
          )}

          {step === "order_build" && (
            <motion.div
              key="order_build"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-[calc(100vh-160px)] flex flex-col"
            >
              <OrderBuilder />
            </motion.div>
          )}

          {step === "order_summary" && (
            <motion.div
              key="order_summary"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-[calc(100vh-120px)] flex flex-col"
            >
              <OrderSummary captainName={captainName} />
            </motion.div>
          )}

          {step === "active_orders" && selectedTable && (
            <motion.div
              key="active_orders"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
            >
              <ActiveOrders
                tableId={selectedTable._id}
                tableLabel={selectedTable.label}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

// Server-component wrapper is in page.tsx — this is the client shell
export default function CaptainPageClient({
  captainName,
}: {
  captainName: string;
}) {
  return (
    <QueryClientProvider client={queryClient}>
      <CaptainApp captainName={captainName} />
      <Toaster position="top-center" richColors />
    </QueryClientProvider>
  );
}
