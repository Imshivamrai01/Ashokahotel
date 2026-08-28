"use client";

import { forwardRef, useRef, useState } from "react";
import { useReactToPrint } from "react-to-print";
import { motion, AnimatePresence } from "framer-motion";
import { Printer, X } from "lucide-react";
import { format } from "date-fns";
import type { IOrder } from "@/types";

/**
 * Kitchen Order Ticket — NO money. Just what the kitchen needs to cook:
 * qty, item, variation, add-ons, notes. 80mm thermal style. This is the
 * kitchen copy; the customer Tax Invoice lives in the Invoices tab.
 */
export const KotTicketContent = forwardRef<
  HTMLDivElement,
  { order: IOrder; hotelName?: string }
>(function KotTicketContent({ order, hotelName = "Ashoka Hotel" }, ref) {
  const items = order.items.filter((i) => i.itemStatus !== "cancelled");
  return (
    <div
      ref={ref}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "12px",
        lineHeight: 1.4,
        padding: "8mm",
        maxWidth: "80mm",
        color: "#000",
        background: "#fff",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 15, fontWeight: "bold", letterSpacing: 1 }}>
          {hotelName.toUpperCase()}
        </div>
        <div style={{ fontSize: 12, fontWeight: "bold" }}>
          KITCHEN ORDER TICKET
        </div>
        <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
      </div>

      <table style={{ width: "100%", fontSize: 11 }}>
        <tbody>
          <tr>
            <td style={{ fontWeight: "bold" }}>KOT #:</td>
            <td style={{ textAlign: "right", fontWeight: "bold" }}>
              {order.kotNumber}
            </td>
          </tr>
          <tr>
            <td>Date:</td>
            <td style={{ textAlign: "right" }}>
              {format(new Date(order.createdAt), "dd MMM yyyy  HH:mm")}
            </td>
          </tr>
          <tr>
            <td>Table:</td>
            <td style={{ textAlign: "right" }}>{order.tableLabel}</td>
          </tr>
          <tr>
            <td>Captain:</td>
            <td style={{ textAlign: "right" }}>{order.captainName}</td>
          </tr>
        </tbody>
      </table>

      <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />

      <table style={{ width: "100%", fontSize: 12 }}>
        <thead>
          <tr>
            <td style={{ fontWeight: "bold", width: "15%" }}>QTY</td>
            <td style={{ fontWeight: "bold" }}>ITEM</td>
          </tr>
          <tr>
            <td colSpan={2}>
              <div style={{ borderTop: "1px solid #000" }} />
            </td>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id}>
              <td
                style={{
                  verticalAlign: "top",
                  fontWeight: "bold",
                  fontSize: 14,
                }}
              >
                {item.quantity}
              </td>
              <td style={{ verticalAlign: "top", paddingBottom: 4 }}>
                <span style={{ fontWeight: "bold" }}>{item.name}</span>
                {item.variationName && ` (${item.variationName})`}
                {item.isNC && " (NC)"}
                {item.addons && item.addons.length > 0 && (
                  <div style={{ fontSize: 11 }}>
                    + {item.addons.map((a) => a.name).join(", ")}
                  </div>
                )}
                {item.notes && (
                  <div style={{ fontSize: 11, fontStyle: "italic" }}>
                    * {item.notes}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {order.specialInstructions && (
        <>
          <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />
          <div style={{ fontSize: 11 }}>
            <strong>Special:</strong> {order.specialInstructions}
          </div>
        </>
      )}

      <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />
      <div style={{ textAlign: "center", fontSize: 10, marginTop: 4 }}>
        ✂ - - - - - - - - - - - - - - - -
      </div>
    </div>
  );
});

/** "KOT" button + preview modal that prints the kitchen ticket (no money). */
export default function KotPrintButton({
  order,
  hotelName,
  label = "KOT",
}: {
  order: IOrder;
  hotelName?: string;
  label?: string;
}) {
  const printRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `KOT-${order.kotNumber}`,
    pageStyle: `@page { size: 80mm auto; margin: 0; } @media print { body { margin: 0; } }`,
  });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-ghost btn-sm gap-1.5"
        title="Print kitchen ticket (KOT)"
      >
        <Printer className="w-4 h-4" />
        {label}
      </button>

      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <KotTicketContent ref={printRef} order={order} hotelName={hotelName} />
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
                <h3 className="font-bold flex items-center gap-2">
                  <Printer className="w-4 h-4 text-warning" /> Kitchen Ticket
                </h3>
                <button
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={() => setOpen(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="overflow-y-auto max-h-[60vh] flex justify-center bg-white p-4">
                <KotTicketContent order={order} hotelName={hotelName} />
              </div>
              <div className="flex gap-2 p-3 border-t border-base-300 bg-base-200/50">
                <button
                  className="btn btn-ghost btn-sm flex-1"
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-warning btn-sm flex-1 gap-2"
                  onClick={() => {
                    handlePrint();
                    setOpen(false);
                  }}
                >
                  <Printer className="w-4 h-4" /> Print KOT
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
