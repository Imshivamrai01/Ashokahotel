import type { UserRole } from "@/types";

export const ROLE_REDIRECTS: Record<UserRole, string> = {
  admin: "/admin/dashboard",
  receptionist: "/receptionist",
  captain: "/captain",
  kitchen: "/kitchen",
  cashier: "/cashier",
  lead_manager: "/leads",
  inventory_manager: "/inventory",
};

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  receptionist: "Receptionist",
  captain: "Captain",
  kitchen: "Kitchen",
  cashier: "Cashier",
  lead_manager: "Lead Manager",
  inventory_manager: "Inventory Manager",
};
