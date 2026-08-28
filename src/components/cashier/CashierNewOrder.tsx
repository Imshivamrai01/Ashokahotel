"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import TableSelector from "@/components/captain/TableSelector";
import OrderBuilder from "@/components/captain/OrderBuilder";
import OrderSummary from "@/components/captain/OrderSummary";
import { useCaptainStore } from "@/store/captain";
import type { ILocation } from "@/types";

interface CashierNewOrderProps {
  cashierName: string;
  onExit: () => void;
}

// Reuses the captain order-building flow (shared zustand store + the same
// TableSelector / OrderBuilder / OrderSummary components). Lets the cashier
// place an order when the captain is unavailable.
export default function CashierNewOrder({
  cashierName,
  onExit,
}: CashierNewOrderProps) {
  const { step, selectedTable, setStep, selectTable, clearTable, resetOrder } =
    useCaptainStore();

  // Start clean and clean up on exit so a half-built order never leaks between
  // the cashier flow and (a logged-in captain on the same device, unlikely but safe).
  useEffect(() => {
    resetOrder();
    return () => resetOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectTable = (loc: ILocation) => selectTable(loc);

  const handleBack = () => {
    if (step === "order_summary") setStep("order_build");
    else if (step === "order_build") clearTable();
    else onExit();
  };

  const stepLabel: Record<string, string> = {
    table_select: "Select Table / Room",
    order_build: "Add Items",
    order_summary: "Review & Place",
    active_orders: "Active Orders",
  };

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-base-300 bg-base-200/50 shrink-0">
        <button onClick={handleBack} className="btn btn-ghost btn-sm btn-circle">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm leading-none">New Order</p>
          <p className="text-xs text-base-content/50 leading-none mt-0.5 truncate">
            {stepLabel[step]}
            {selectedTable && step !== "table_select" && (
              <span className="ml-1 text-warning font-medium">
                · {selectedTable.label}
              </span>
            )}
          </p>
        </div>
        <button onClick={onExit} className="btn btn-ghost btn-xs">
          Close
        </button>
      </header>

      <main className="flex-1 overflow-hidden max-w-3xl mx-auto w-full px-4 py-4">
        <AnimatePresence mode="wait">
          {step === "table_select" && (
            <motion.div
              key="table_select"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full overflow-y-auto"
            >
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
              className="h-full flex flex-col"
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
              className="h-full flex flex-col"
            >
              <OrderSummary captainName={cashierName} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
