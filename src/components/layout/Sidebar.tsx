"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  CreditCard,
  Building2,
  UserCog,
  Package,
  Truck,
  BarChart3,
  Settings,
  CheckSquare,
  Boxes,
  Receipt,
  LogOut,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Wifi,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  roles: string[];
  badge?: string;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner", "manager", "accountant", "staff"] },
  { href: "/bookings", label: "Bookings", icon: Calendar, roles: ["owner", "manager"] },
  { href: "/customers", label: "Customers", icon: Users, roles: ["owner", "manager", "accountant"] },
  { href: "/payments", label: "Payments & Invoices", icon: CreditCard, roles: ["owner", "accountant", "manager"] },
  { href: "/halls", label: "Halls & Venues", icon: Building2, roles: ["owner", "manager"] },
  { href: "/housekeeping", label: "Housekeeping", icon: CheckSquare, roles: ["owner", "manager", "staff"] },
  { href: "/staff", label: "Staff", icon: UserCog, roles: ["owner", "manager"] },
  { href: "/assets", label: "Assets", icon: Boxes, roles: ["owner", "manager", "accountant", "staff"] },
  { href: "/vendors", label: "Vendors", icon: Truck, roles: ["owner", "manager", "accountant"] },
  { href: "/expenses", label: "Expenses", icon: Package, roles: ["owner", "accountant"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["owner", "manager", "accountant"] },
  { href: "/subscription", label: "Subscription", icon: Receipt, roles: ["owner", "accountant"] },
  { href: "/settings", label: "Settings", icon: Settings, roles: ["owner"] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  return (
    <aside
      className={cn(
        "h-screen bg-slate-900 text-white flex flex-col transition-all duration-300 shrink-0",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-slate-700/50", collapsed && "justify-center px-2")}>
        <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0">
          <MapPin size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-bold text-white text-sm truncate">VenueHub</p>
            <p className="text-xs text-slate-400 truncate">{user?.venueName}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-indigo-600 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white",
                collapsed && "justify-center px-2"
              )}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Subscription status */}
      {!collapsed && user?.subscriptionStatus && user.subscriptionStatus !== "active" && (
        <div className={cn(
          "mx-3 mb-3 p-2 rounded-lg text-xs",
          user.subscriptionStatus === "trial" ? "bg-purple-900/50 text-purple-300" :
          user.subscriptionStatus === "overdue" ? "bg-orange-900/50 text-orange-300" :
          "bg-red-900/50 text-red-300"
        )}>
          <div className="flex items-center gap-1.5">
            <Wifi size={12} />
            <span className="font-medium capitalize">{user.subscriptionStatus}</span>
          </div>
        </div>
      )}

      {/* User & collapse */}
      <div className="border-t border-slate-700/50 p-2">
        {!collapsed && (
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-red-400",
            collapsed && "justify-center"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut size={18} />
          {!collapsed && "Logout"}
        </button>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex items-center justify-center w-full p-2 mt-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800"
          title={collapsed ? "Expand" : "Collapse"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
