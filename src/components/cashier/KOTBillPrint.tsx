"use client";

import { useRef, useState, Fragment } from "react";
import { useReactToPrint } from "react-to-print";
import { Printer, X } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import type { IOrder } from "@/types";

interface Props {
  order: IOrder;
  hotelName?: string;
  gstNumber?: string;
}

function BillContent({
  order,
  hotelName = "Ashoka Hotel",
  gstNumber,
}: Props) {
  return (
    <div
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "12px",
        lineHeight: "1.4",
        padding: "8mm",
        maxWidth: "80mm",
        color: "#000",
        background: "#fff",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "6px" }}>
        <div
          style={{ fontSize: "16px", fontWeight: "bold", letterSpacing: "1px" }}
        >
          {hotelName.toUpperCase()}
        </div>
        <div style={{ fontSize: "11px" }}>Kitchen Order Ticket</div>
        {gstNumber && (
          <div style={{ fontSize: "10px" }}>GSTIN: {gstNumber}</div>
        )}
        <div style={{ borderTop: "1px dashed #000", margin: "4px 0" }} />
      </div>

      {/* KOT meta */}
      <table style={{ width: "100%", fontSize: "11px" }}>
        <tbody>
          <tr>
            <td style={{ fontWeight: "bold" }}>KOT #:</td>
            <td style={{ textAlign: "right" }}>{order.kotNumber}</td>
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

      {/* Items */}
      <table style={{ width: "100%", fontSize: "11px" }}>
        <thead>
          <tr>
            <td style={{ fontWeight: "bold" }}>QTY</td>
            <td style={{ fontWeight: "bold" }}>ITEM</td>
            <td style={{ fontWeight: "bold", textAlign: "right" }}>AMT</td>
          </tr>
          <tr>
            <td colSpan={3}>
              <div style={{ borderTop: "1px solid #000" }} />
            </td>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item, idx) => (
            <Fragment key={item._id ? String(item._id) : `item-${idx}`}>
              <tr>
                <td style={{ verticalAlign: "top", paddingRight: "4px" }}>
                  {item.quantity}
                </td>
                <td style={{ verticalAlign: "top" }}>
                  {item.name}
                  {item.variationName && ` (${item.variationName})`}
                  {item.isNC && " (NC)"}
                  {item.addons && item.addons.length > 0 && (
                    <div style={{ fontSize: "10px", color: "#555" }}>
                      + {item.addons.map((a) => a.name).join(", ")}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: "right", verticalAlign: "top" }}>
                  {item.isNC
                    ? "FREE"
                    : `₹${(item.price * item.quantity).toFixed(0)}`}
                </td>
              </tr>
              {item.notes && (
                <tr>
                  <td />
                  <td
                    style={{
                      fontSize: "10px",
                      color: "#555",
                      paddingLeft: "4px",
                    }}
                  >
                    * {item.notes}
                  </td>
                  <td />
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />

      {/* Totals */}
      <table style={{ width: "100%", fontSize: "11px" }}>
        <tbody>
          <tr>
            <td>Subtotal</td>
            <td style={{ textAlign: "right" }}>₹{order.subtotal.toFixed(2)}</td>
          </tr>
          {order.tax != null && order.tax > 0 && (
            <>
              <tr>
                <td>CGST</td>
                <td style={{ textAlign: "right" }}>
                  ₹{(order.tax / 2).toFixed(2)}
                </td>
              </tr>
              <tr>
                <td>SGST</td>
                <td style={{ textAlign: "right" }}>
                  ₹{(order.tax / 2).toFixed(2)}
                </td>
              </tr>
            </>
          )}
          <tr>
            <td style={{ fontWeight: "bold", fontSize: "13px" }}>TOTAL</td>
            <td
              style={{
                textAlign: "right",
                fontWeight: "bold",
                fontSize: "13px",
              }}
            >
              ₹{order.total.toFixed(2)}
            </td>
          </tr>
          {order.paymentMethod && (
            <tr>
              <td style={{ fontSize: "10px" }}>Payment</td>
              <td style={{ textAlign: "right", fontSize: "10px" }}>
                {order.paymentMethod.replace("_", " ").toUpperCase()}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Special instructions */}
      {order.specialInstructions && (
        <>
          <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />
          <div style={{ fontSize: "10px" }}>
            <strong>Special:</strong> {order.specialInstructions}
          </div>
        </>
      )}

      <div style={{ borderTop: "1px dashed #000", margin: "5px 0" }} />

      {/* Footer */}
      <div style={{ textAlign: "center", fontSize: "10px", marginTop: "4px" }}>
        <div>Thank you for dining with us!</div>
        <div
          style={{
            marginTop: "8px",
            borderTop: "1px solid #000",
            paddingTop: "4px",
          }}
        >
          ✂ - - - - - - - - - - - - - - - -
        </div>
      </div>
    </div>
  );
}

// Make BillContent importable for preview use
export { BillContent };

export default function KOTBillPrint({ order, hotelName, gstNumber }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `KOT-${order.kotNumber}`,
    pageStyle: `
      @page { size: 80mm auto; margin: 0; }
      @media print { body { margin: 0; } }
    `,
  });

  return (
    <>
      <button
        onClick={() => setPreviewOpen(true)}
        className="btn btn-ghost btn-sm gap-1.5"
        title="Print KOT / Bill"
      >
        <Printer className="w-4 h-4" />
        Print
      </button>

      {/* Hidden print content */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <div ref={printRef}>
          <BillContent order={order} hotelName={hotelName} gstNumber={gstNumber} />
        </div>
      </div>

      {/* Print Preview Modal */}
      <AnimatePresence>
        {previewOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 bg-black/70 flex items-center justify-center p-4"
            onClick={() => setPreviewOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 20, stiffness: 260 }}
              className="bg-base-100 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-base-300">
                <h3 className="font-bold flex items-center gap-2">
                  <Printer className="w-4 h-4 text-success" />
                  Receipt Preview
                </h3>
                <button
                  className="btn btn-ghost btn-xs btn-circle"
                  onClick={() => setPreviewOpen(false)}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview content */}
              <div
                ref={contentRef}
                className="overflow-y-auto max-h-[60vh] flex justify-center bg-white p-4"
              >
                <BillContent order={order} hotelName={hotelName} gstNumber={gstNumber} />
              </div>

              {/* Actions */}
              <div className="flex gap-2 p-3 border-t border-base-300 bg-base-200/50">
                <button
                  className="btn btn-ghost btn-sm flex-1"
                  onClick={() => setPreviewOpen(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn btn-success btn-sm flex-1 gap-2"
                  onClick={() => {
                    handlePrint();
                    setPreviewOpen(false);
                  }}
                >
                  <Printer className="w-4 h-4" />
                  Print Now
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
