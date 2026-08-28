"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  UtensilsCrossed,
  Tag,
  MapPin,
  Users,
  Settings,
  ClipboardList,
  BarChart3,
  LogOut,
  PhoneCall,
  Menu,
  Landmark,
  ChefHat,
  ConciergeBell,
  Boxes,
  CalendarDays,
  FileText,
  TicketPercent,
  UserCheck,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/orders", label: "Orders", icon: ClipboardList },
      { href: "/admin/invoices", label: "Invoices", icon: FileText },
      { href: "/admin/crm", label: "Customers & CRM", icon: UserCheck },
      { href: "/admin/dayend", label: "Day-end", icon: CalendarDays },
      { href: "/admin/metrics", label: "Metrics", icon: BarChart3 },
    ],
  },
  {
    // Live operational panels — admin is authorized on all of them
    label: "Operations",
    items: [
      { href: "/receptionist", label: "Receptionist Desk", icon: ConciergeBell },
      { href: "/cashier", label: "Cashier (Billing)", icon: Landmark },
      { href: "/kitchen", label: "Kitchen (KDS)", icon: ChefHat },
      { href: "/captain", label: "Captain (Order)", icon: ConciergeBell },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/categories", label: "Categories", icon: Tag },
      { href: "/admin/items", label: "Menu Items", icon: UtensilsCrossed },
      { href: "/admin/locations", label: "Locations / QR", icon: MapPin },
    ],
  },
  {
    label: "People",
    items: [
      { href: "/admin/staff", label: "Staff", icon: Users },
      { href: "/admin/leads", label: "Leads", icon: PhoneCall },
    ],
  },
  {
    label: "Settings",
    items: [{ href: "/admin/branding", label: "Branding", icon: Settings }],
  },
];

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Logo Header */}
      <div className="px-5 py-4.5 border-b border-slate-200/80 bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/25 shrink-0">
            <UtensilsCrossed className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-playfair font-black text-sm text-slate-900 leading-tight tracking-tight">
              Ashoka Hotel
            </p>
            <p className="text-[10px] text-amber-700 font-bold leading-tight tracking-widest uppercase mt-0.5">
              Admin Panel
            </p>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-5 [scrollbar-width:thin] [scrollbar-color:rgba(217,119,6,0.2)_transparent]">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="text-[10px] font-black tracking-widest uppercase text-amber-900/60 px-3 mb-1.5">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href || (href !== "/admin/dashboard" && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm transition-all duration-150 group cursor-pointer",
                      active
                        ? "bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold shadow-md shadow-amber-500/25"
                        : "text-slate-700 font-semibold hover:bg-amber-50/70 hover:text-amber-900",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4 shrink-0 transition-transform group-hover:scale-110",
                        active ? "text-white" : "text-slate-500 group-hover:text-amber-700",
                      )}
                    />
                    <span className="flex-1 leading-none">{label}</span>
                    {active && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white shadow-xs" />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Sign Out Footer */}
      <div className="px-3 pb-4 pt-3 border-t border-slate-200/80 bg-slate-50/60">
        <button
          onClick={() =>
            signOut({ redirect: false }).then(() => {
              window.location.replace("/login");
            })
          }
          className="w-full flex items-center justify-center gap-2.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-white border border-slate-200/90 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 shadow-xs transition-all duration-150 cursor-pointer group"
        >
          <LogOut className="w-4 h-4 text-slate-500 group-hover:text-rose-600 group-hover:scale-110 transition-transform" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

export default function AdminSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar — hidden below md (768px) */}
      <aside className="hidden md:flex w-64 shrink-0 h-screen sticky top-0 flex-col bg-white border-r border-slate-200/80 shadow-xs">
        <SidebarNav />
      </aside>

      {/* Mobile top bar + Sheet drawer — visible below md (768px) */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 h-14 bg-white/95 backdrop-blur-sm border-b border-slate-200/80 shadow-xs">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Open navigation"
              />
            }
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </SheetTrigger>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="w-64 p-0 bg-white border-r border-slate-200/80"
          >
            <SidebarNav onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-sm shadow-amber-500/20">
            <UtensilsCrossed className="w-4 h-4 text-white" />
          </div>
          <span className="font-playfair font-black text-sm text-slate-900 tracking-tight">
            Ashoka Hotel
          </span>
          <span className="text-[10px] text-amber-700 font-bold tracking-widest uppercase mt-px">
            Admin
          </span>
        </div>
      </div>
    </>
  );
}
