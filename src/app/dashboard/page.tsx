"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatCurrency, formatDate, getStatusColor, sessionTypeLabel } from "@/lib/utils";
import {
  TrendingUp, Calendar, Users, AlertCircle, Building2, DollarSign,
  TrendingDown, RefreshCw, ArrowRight, CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from "recharts";

interface DashboardData {
  kpis: {
    totalBookings: number;
    todayBookings: number;
    monthRevenue: number;
    pendingDues: number;
    totalCustomers: number;
    totalHalls: number;
    monthExpenses: number;
  };
  upcomingBookings: Array<{
    id: number;
    bookingRef: string;
    eventDate: string;
    sessionType: string;
    eventType: string;
    status: string;
    guestCount: number;
    totalAmount: string;
    balanceDue: string;
  }>;
  recentPayments: Array<{
    id: number;
    amount: string;
    type: string;
    mode: string;
    paymentDate: string;
    bookingId: number;
  }>;
  statusBreakdown: Array<{ status: string; count: number }>;
  revenueVsExpenses: { revenue: number; expenses: number; profit: number };
}

const STATUS_COLORS: Record<string, string> = {
  enquiry: "#f59e0b",
  tentative: "#3b82f6",
  confirmed: "#10b981",
  completed: "#6b7280",
  cancelled: "#ef4444",
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const kpis = [
    {
      label: "Confirmed Bookings",
      value: data?.kpis.totalBookings ?? "-",
      icon: Calendar,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      href: "/bookings",
    },
    {
      label: "Today's Events",
      value: data?.kpis.todayBookings ?? "-",
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/bookings",
    },
    {
      label: "Month Revenue",
      value: data ? formatCurrency(data.kpis.monthRevenue) : "-",
      icon: TrendingUp,
      color: "text-blue-600",
      bg: "bg-blue-50",
      href: "/payments",
    },
    {
      label: "Pending Dues",
      value: data ? formatCurrency(data.kpis.pendingDues) : "-",
      icon: AlertCircle,
      color: "text-orange-600",
      bg: "bg-orange-50",
      href: "/payments",
    },
    {
      label: "Total Customers",
      value: data?.kpis.totalCustomers ?? "-",
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/customers",
    },
    {
      label: "Active Halls",
      value: data?.kpis.totalHalls ?? "-",
      icon: Building2,
      color: "text-cyan-600",
      bg: "bg-cyan-50",
      href: "/halls",
    },
    {
      label: "Month Expenses",
      value: data ? formatCurrency(data.kpis.monthExpenses) : "-",
      icon: TrendingDown,
      color: "text-red-600",
      bg: "bg-red-50",
      href: "/expenses",
    },
    {
      label: "Net Profit",
      value: data
        ? formatCurrency(data.revenueVsExpenses.profit)
        : "-",
      icon: DollarSign,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/reports",
    },
  ];

  const revenueData = data
    ? [
        { name: "Revenue", value: data.revenueVsExpenses.revenue },
        { name: "Expenses", value: data.revenueVsExpenses.expenses },
        { name: "Profit", value: Math.max(0, data.revenueVsExpenses.profit) },
      ]
    : [];

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Good {new Date().getHours() < 12 ? "morning" : new Date().getHours() < 17 ? "afternoon" : "evening"}, {user?.name?.split(" ")[0]}! 👋
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              {new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <button
            onClick={fetchDashboard}
            className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg border border-slate-200 transition-colors"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <Link key={kpi.label} href={kpi.href}>
                <div className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-9 h-9 ${kpi.bg} rounded-lg flex items-center justify-center`}>
                      <Icon size={18} className={kpi.color} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-900">{loading ? "—" : kpi.value}</div>
                  <div className="text-xs text-slate-500 mt-1">{kpi.label}</div>
                </div>
              </Link>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
          {/* Revenue vs Expenses */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>This Month — Revenue vs Expenses</CardTitle>
            </CardHeader>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={revenueData} barSize={48}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]}>
                  {revenueData.map((entry, index) => (
                    <Cell
                      key={index}
                      fill={index === 0 ? "#6366f1" : index === 1 ? "#f43f5e" : "#10b981"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Booking Status Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Bookings by Status</CardTitle>
            </CardHeader>
            {data?.statusBreakdown && data.statusBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    innerRadius={40}
                  >
                    {data.statusBreakdown.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={STATUS_COLORS[entry.status] || "#94a3b8"}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, String(n).replace(/_/g, " ")]} />
                  <Legend
                    formatter={(value) => String(value).replace(/_/g, " ")}
                    iconSize={8}
                    wrapperStyle={{ fontSize: "11px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
                No booking data yet
              </div>
            )}
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Upcoming Bookings */}
          <Card padding={false}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <CardTitle>Upcoming Bookings</CardTitle>
              <Link href="/bookings" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                ))
              ) : data?.upcomingBookings?.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">No upcoming bookings</div>
              ) : (
                data?.upcomingBookings?.map((b) => (
                  <Link key={b.id} href={`/bookings/${b.id}`} className="block px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{b.bookingRef}</span>
                        <Badge label={b.status} status={b.status} />
                      </div>
                      <span className="text-sm font-medium text-slate-900">{formatCurrency(b.totalAmount)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{b.eventType} • {sessionTypeLabel(b.sessionType)} • {b.guestCount} pax</span>
                      <span>{formatDate(b.eventDate)}</span>
                    </div>
                    {parseFloat(String(b.balanceDue)) > 0 && (
                      <div className="mt-1 text-xs text-orange-600 font-medium">
                        Balance due: {formatCurrency(b.balanceDue)}
                      </div>
                    )}
                  </Link>
                ))
              )}
            </div>
          </Card>

          {/* Recent Payments */}
          <Card padding={false}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <CardTitle>Recent Payments</CardTitle>
              <Link href="/payments" className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                View all <ArrowRight size={12} />
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="px-5 py-4 animate-pulse">
                    <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-100 rounded w-1/2" />
                  </div>
                ))
              ) : data?.recentPayments?.length === 0 ? (
                <div className="px-5 py-8 text-center text-slate-400 text-sm">No recent payments</div>
              ) : (
                data?.recentPayments?.map((p) => (
                  <Link key={p.id} href={`/bookings/${p.bookingId}`} className="block px-5 py-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${p.type === "refund" ? "bg-red-400" : "bg-green-400"}`} />
                        <span className="text-sm font-medium text-slate-900 capitalize">{p.type}</span>
                        <span className="text-xs text-slate-400 capitalize">· {p.mode}</span>
                      </div>
                      <span className={`text-sm font-semibold ${p.type === "refund" ? "text-red-600" : "text-emerald-600"}`}>
                        {p.type === "refund" ? "-" : "+"}{formatCurrency(p.amount)}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 ml-4">
                      Booking #{p.bookingId} · {formatDate(p.paymentDate)}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
