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
        fontFamily:
          "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, 'Helvetica Neue', Arial, monospace, sans-serif",
        fontSize: "12.5px",
        fontWeight: 700,
        lineHeight: 1.35,
        padding: "6mm 8mm",
        maxWidth: "80mm",
        color: "#000000",
        background: "#ffffff",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1, color: "#000000" }}>
          {hotelName.toUpperCase()}
        </div>
        <div style={{ fontSize: 13, fontWeight: 900, marginTop: 2, color: "#000000" }}>
          KITCHEN ORDER TICKET
        </div>
        <div style={{ borderTop: "1.5px dashed #000000", margin: "6px 0" }} />
      </div>

      <table style={{ width: "100%", fontSize: 12, fontWeight: 700, color: "#000000", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td style={{ fontWeight: 900, padding: "1px 0" }}>KOT #:</td>
            <td style={{ textAlign: "right", fontWeight: 900, fontSize: 14, padding: "1px 0" }}>
              {order.kotNumber}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "1px 0" }}>Date:</td>
            <td style={{ textAlign: "right", padding: "1px 0" }}>
              {format(new Date(order.createdAt), "dd MMM yyyy  HH:mm")}
            </td>
          </tr>
          <tr>
            <td style={{ fontWeight: 800, padding: "1px 0" }}>Table:</td>
            <td style={{ textAlign: "right", fontWeight: 900, fontSize: 13, padding: "1px 0" }}>
              {order.tableLabel}
            </td>
          </tr>
          <tr>
            <td style={{ padding: "1px 0" }}>Captain:</td>
            <td style={{ textAlign: "right", fontWeight: 800, padding: "1px 0" }}>
              {order.captainName}
            </td>
          </tr>
        </tbody>
      </table>

      <div style={{ borderTop: "1.5px dashed #000000", margin: "6px 0" }} />

      <table style={{ width: "100%", fontSize: 12.5, color: "#000000", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ fontWeight: 900 }}>
            <td style={{ fontWeight: 900, width: "18%", paddingBottom: 2 }}>QTY</td>
            <td style={{ fontWeight: 900, paddingBottom: 2 }}>ITEM</td>
          </tr>
          <tr>
            <td colSpan={2}>
              <div style={{ borderTop: "2px solid #000000", margin: "2px 0 4px" }} />
            </td>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item._id} style={{ fontWeight: 700 }}>
              <td
                style={{
                  verticalAlign: "top",
                  fontWeight: 900,
                  fontSize: 15,
                  paddingRight: 4,
                  paddingTop: 3,
                  paddingBottom: 3,
                }}
              >
                {item.quantity}
              </td>
              <td style={{ verticalAlign: "top", paddingTop: 3, paddingBottom: 3 }}>
                <span style={{ fontWeight: 900, fontSize: 13 }}>{item.name}</span>
                {item.variationName && ` (${item.variationName})`}
                {item.isNC && " (NC)"}
                {item.addons && item.addons.length > 0 && (
                  <div style={{ fontSize: 11.5, fontWeight: 800, marginTop: 1 }}>
                    + {item.addons.map((a) => a.name).join(", ")}
                  </div>
                )}
                {item.notes && (
                  <div style={{ fontSize: 11.5, fontWeight: 800, fontStyle: "italic", marginTop: 1 }}>
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
          <div style={{ borderTop: "1.5px dashed #000000", margin: "6px 0" }} />
          <div style={{ fontSize: 12, fontWeight: 800, color: "#000000" }}>
            <strong>Special:</strong> {order.specialInstructions}
          </div>
        </>
      )}

      <div style={{ borderTop: "1.5px dashed #000000", margin: "6px 0" }} />
      <div style={{ textAlign: "center", fontSize: 11, fontWeight: 800, marginTop: 4, color: "#000000" }}>
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
    pageStyle: `@page { size: 80mm auto; margin: 0; } @media print { body { margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } * { color: #000000 !important; } }`,
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
