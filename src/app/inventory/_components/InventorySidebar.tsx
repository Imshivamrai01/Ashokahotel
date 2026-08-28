"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Carrot,
  BookOpen,
  ChefHat,
  PackagePlus,
  Trash2,
  ClipboardCheck,
  Truck,
  FileText,
  ScrollText,
  BarChart3,
  LogOut,
  ArrowLeft,
  Boxes,
  Menu,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/inventory", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory/items", label: "Ingredients", icon: Carrot },
  { href: "/inventory/recipes", label: "Recipes", icon: BookOpen },
  { href: "/inventory/prep", label: "Prep / Sub-recipes", icon: ChefHat },
  { href: "/inventory/stock-in", label: "Stock In", icon: PackagePlus },
  { href: "/inventory/wastage", label: "Wastage", icon: Trash2 },
  { href: "/inventory/stock-count", label: "Stock Check", icon: ClipboardCheck },
  { href: "/inventory/suppliers", label: "Suppliers", icon: Truck },
  { href: "/inventory/purchase-orders", label: "Purchase Orders", icon: FileText },
  { href: "/inventory/ledger", label: "Stock Ledger", icon: ScrollText },
  { href: "/inventory/reports", label: "Reports", icon: BarChart3 },
];

function NavBody({
  isAdmin,
  onNavigate,
}: {
  isAdmin: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-base-300/60 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-linear-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
          <Boxes className="w-4 h-4 text-primary-content" />
        </div>
        <div>
          <p className="font-playfair font-bold text-sm leading-tight">
            Inventory
          </p>
          <p className="text-[10px] text-base-content/40 uppercase tracking-widest">
            Ashoka Hotel
          </p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/inventory"
              ? pathname === "/inventory"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-content"
                  : "text-base-content/70 hover:bg-base-300/60",
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-base-300/60 flex flex-col gap-1">
        {isAdmin && (
          <Link
            href="/admin/dashboard"
            onClick={onNavigate}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-base-content/60 hover:bg-base-300/60"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Admin
          </Link>
        )}
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-error hover:bg-error/10"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );
}

export default function InventorySidebar({ isAdmin }: { isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {/* Desktop */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-base-300/60 bg-base-200/40 min-h-screen sticky top-0">
        <NavBody isAdmin={isAdmin} />
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="md:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center gap-2 px-3 border-b border-base-300/60 bg-base-200/95 backdrop-blur-sm">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Open menu" />
            }
          >
            <Menu className="w-5 h-5" />
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="p-0 w-64 bg-base-200 border-r border-base-300/60"
          >
            <NavBody isAdmin={isAdmin} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2">
          <Boxes className="w-4 h-4 text-primary" />
          <span className="font-playfair font-bold text-sm">Inventory</span>
        </div>
      </div>
    </>
  );
}
