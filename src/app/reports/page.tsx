"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Download, TrendingUp, BarChart3, AlertCircle, PieChart as PieChartIcon } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";

interface RevenueData { month: string; total: string }
interface ExpenseData { month: string; total: string }
interface OutstandingItem {
  bookingRef: string; eventDate: string; eventType: string; status: string;
  totalAmount: string; paidAmount: string; balanceDue: string;
  customerName: string; customerPhone: string;
}
interface ConversionData { status: string; count: number; source: string }
interface ExpenseCat { category: string; total: string; count: number }
interface OccupancyData { hallId: number; hallName: string; month: string; bookingCount: number }

const REPORT_TYPES = [
  { id: "revenue", label: "Revenue & Profit", icon: TrendingUp },
  { id: "occupancy", label: "Occupancy Rate", icon: BarChart3 },
  { id: "outstanding", label: "Outstanding Dues", icon: AlertCircle },
  { id: "conversion", label: "Booking Conversion", icon: PieChartIcon },
  { id: "expenses", label: "Expense Analysis", icon: PieChartIcon },
];

const CHART_COLORS = ["#6366f1", "#f43f5e", "#10b981", "#f59e0b", "#3b82f6", "#8b5cf6"];

export default function ReportsPage() {
  const [reportType, setReportType] = useState("revenue");
  const [loading, setLoading] = useState(false);
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [occupancyData, setOccupancyData] = useState<OccupancyData[]>([]);
  const [outstanding, setOutstanding] = useState<OutstandingItem[]>([]);
  const [conversionData, setConversionData] = useState<ConversionData[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseCat[]>([]);

  const thisYear = new Date().getFullYear();
  const [from, setFrom] = useState(`${thisYear}-01-01`);
  const [to, setTo] = useState(new Date().toISOString().split("T")[0]);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=${reportType}&from=${from}&to=${to}`);
      if (!res.ok) return;
      const data = await res.json();
      if (reportType === "revenue") {
        setRevenueData(data.revenueData || []);
        setExpenseData(data.expenseData || []);
      } else if (reportType === "occupancy") {
        setOccupancyData(data.occupancyData || []);
      } else if (reportType === "outstanding") {
        setOutstanding(data.outstanding || []);
      } else if (reportType === "conversion") {
        setConversionData(data.conversionData || []);
      } else if (reportType === "expenses") {
        setExpensesByCategory(data.expensesByCategory || []);
      }
    } finally {
      setLoading(false);
    }
  }, [reportType, from, to]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const exportCSV = (data: Array<Record<string, unknown>>, filename: string) => {
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const rows = data.map(r => headers.map(h => String(r[h] || "")));
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename}.csv`;
    a.click();
  };

  const totalRevenue = revenueData.reduce((s, r) => s + parseFloat(String(r.total || 0)), 0);
  const totalExpenses = expenseData.reduce((s, e) => s + parseFloat(String(e.total || 0)), 0);
  const totalOutstanding = outstanding.reduce((s, o) => s + parseFloat(o.balanceDue || "0"), 0);

  const combinedMonthly = revenueData.map(r => {
    const exp = expenseData.find(e => e.month === r.month);
    return {
      month: r.month,
      Revenue: parseFloat(String(r.total || 0)),
      Expenses: parseFloat(String(exp?.total || 0)),
      Profit: parseFloat(String(r.total || 0)) - parseFloat(String(exp?.total || 0)),
    };
  });

  const conversionPieData = Object.entries(
    conversionData.reduce((acc: Record<string, number>, c) => {
      acc[c.status] = (acc[c.status] || 0) + c.count;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  const sourcePieData = Object.entries(
    conversionData.reduce((acc: Record<string, number>, c) => {
      acc[c.source] = (acc[c.source] || 0) + c.count;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
            <p className="text-sm text-slate-500">Business insights and performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <span className="text-slate-400">to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        {/* Report Type Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {REPORT_TYPES.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setReportType(id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                reportType === id ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Revenue Report */}
        {reportType === "revenue" && (
          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-sm text-emerald-700 font-medium">Total Revenue</p>
                <p className="text-2xl font-bold text-emerald-800">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-red-700 font-medium">Total Expenses</p>
                <p className="text-2xl font-bold text-red-800">{formatCurrency(totalExpenses)}</p>
              </div>
              <div className={`border rounded-xl p-4 ${totalRevenue - totalExpenses >= 0 ? "bg-blue-50 border-blue-200" : "bg-orange-50 border-orange-200"}`}>
                <p className={`text-sm font-medium ${totalRevenue - totalExpenses >= 0 ? "text-blue-700" : "text-orange-700"}`}>Net Profit</p>
                <p className={`text-2xl font-bold ${totalRevenue - totalExpenses >= 0 ? "text-blue-800" : "text-orange-800"}`}>
                  {formatCurrency(totalRevenue - totalExpenses)}
                </p>
              </div>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Monthly Revenue vs Expenses</CardTitle>
                <Button size="sm" variant="outline" onClick={() => exportCSV(combinedMonthly, "revenue-report")}>
                  <Download size={14} /> Export
                </Button>
              </CardHeader>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={combinedMonthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Profit" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* Occupancy Report */}
        {reportType === "occupancy" && (
          <Card>
            <CardHeader>
              <CardTitle>Hall Occupancy by Month</CardTitle>
              <Button size="sm" variant="outline" onClick={() => exportCSV(occupancyData as unknown as Array<Record<string, unknown>>, "occupancy-report")}>
                <Download size={14} /> Export
              </Button>
            </CardHeader>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={occupancyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="bookingCount" name="Bookings" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Outstanding Report */}
        {reportType === "outstanding" && (
          <Card padding={false}>
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <CardTitle>Outstanding Dues Report</CardTitle>
                <p className="text-sm text-orange-600 font-medium mt-0.5">Total Outstanding: {formatCurrency(totalOutstanding)}</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => exportCSV(outstanding as unknown as Array<Record<string, unknown>>, "outstanding-dues")}>
                <Download size={14} /> Export
              </Button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Booking</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Event</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Paid</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outstanding.map((o, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <div className="font-semibold">{o.bookingRef}</div>
                      <div className="text-xs text-slate-500">{formatDate(o.eventDate)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{o.customerName}</div>
                      <div className="text-xs text-slate-500">{o.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div>{o.eventType}</div>
                      <Badge label={o.status} status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-right">{formatCurrency(o.totalAmount)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600">{formatCurrency(o.paidAmount)}</td>
                    <td className="px-5 py-3 text-right font-bold text-orange-600">{formatCurrency(o.balanceDue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        {/* Conversion Report */}
        {reportType === "conversion" && (
          <div className="grid grid-cols-2 gap-5">
            <Card>
              <CardHeader><CardTitle>By Status</CardTitle></CardHeader>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={conversionPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                    {conversionPieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, String(n).replace(/_/g, " ")]} />
                  <Legend formatter={(v) => String(v).replace(/_/g, " ")} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <CardHeader><CardTitle>By Source</CardTitle></CardHeader>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={sourcePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
                    {sourcePieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend formatter={(v) => String(v).replace(/_/g, " ")} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>
        )}

        {/* Expenses Report */}
        {reportType === "expenses" && (
          <div className="grid grid-cols-2 gap-5">
            <Card>
              <CardHeader><CardTitle>Expenses by Category</CardTitle></CardHeader>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={expensesByCategory.map(e => ({ name: e.category.replace(/_/g, " "), value: parseFloat(String(e.total || 0)) }))}
                    dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}
                  >
                    {expensesByCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <CardHeader><CardTitle>Breakdown</CardTitle></CardHeader>
              <div className="space-y-3">
                {expensesByCategory.sort((a, b) => parseFloat(String(b.total || 0)) - parseFloat(String(a.total || 0))).map((e, i) => (
                  <div key={e.category} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <div>
                        <p className="text-sm font-medium text-slate-900 capitalize">{e.category.replace(/_/g, " ")}</p>
                        <p className="text-xs text-slate-500">{e.count} entries</p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-slate-900">{formatCurrency(e.total)}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
