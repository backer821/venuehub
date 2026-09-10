"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatCurrency, formatDate, sessionTypeLabel } from "@/lib/utils";
import { AlertCircle, TrendingUp, Download, ArrowRight } from "lucide-react";
import Link from "next/link";

interface Outstanding {
  bookingId: number;
  bookingRef: string;
  eventDate: string;
  sessionType: string;
  eventType: string;
  status: string;
  totalAmount: string;
  paidAmount: string;
  balanceDue: string;
  customerName: string;
  customerPhone: string;
  hallName: string;
}

export default function PaymentsPage() {
  const [outstanding, setOutstanding] = useState<Outstanding[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments");
      if (res.ok) {
        const data = await res.json();
        setOutstanding(data.outstanding || []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalDue = outstanding.reduce((s, o) => s + parseFloat(o.balanceDue || "0"), 0);

  const exportCSV = () => {
    const headers = ["Booking Ref", "Customer", "Phone", "Hall", "Event Date", "Event Type", "Total", "Paid", "Balance Due", "Status"];
    const rows = outstanding.map(o => [
      o.bookingRef, o.customerName, o.customerPhone, o.hallName,
      o.eventDate, o.eventType,
      o.totalAmount, o.paidAmount, o.balanceDue, o.status
    ]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "outstanding-dues.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Payments & Invoices</h1>
            <p className="text-sm text-slate-500">Track outstanding dues and payment history</p>
          </div>
          <Button variant="outline" onClick={exportCSV}>
            <Download size={16} /> Export CSV
          </Button>
        </div>

        {/* Summary Card */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={18} className="text-orange-600" />
              <span className="text-sm font-semibold text-orange-800">Total Outstanding</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">{formatCurrency(totalDue)}</p>
            <p className="text-xs text-orange-600">{outstanding.length} bookings with balance</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={18} className="text-emerald-600" />
              <span className="text-sm font-semibold text-emerald-800">Pending Events</span>
            </div>
            <p className="text-2xl font-bold text-emerald-700">
              {outstanding.filter(o => new Date(o.eventDate) >= new Date()).length}
            </p>
            <p className="text-xs text-emerald-600">Upcoming events with dues</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={18} className="text-red-600" />
              <span className="text-sm font-semibold text-red-800">Overdue</span>
            </div>
            <p className="text-2xl font-bold text-red-700">
              {outstanding.filter(o => new Date(o.eventDate) < new Date()).length}
            </p>
            <p className="text-xs text-red-600">Past events with unpaid balance</p>
          </div>
        </div>

        {/* Outstanding Dues Table */}
        <Card padding={false}>
          <div className="p-5 border-b border-slate-100">
            <CardTitle>Outstanding Dues</CardTitle>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Booking</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Event</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Event Date</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Total</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Paid</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Balance Due</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <td key={j} className="px-4 py-4">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : outstanding.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-12 text-center text-slate-400">
                      🎉 No outstanding dues!
                    </td>
                  </tr>
                ) : (
                  outstanding.map((o) => {
                    const isOverdue = new Date(o.eventDate) < new Date();
                    return (
                      <tr key={o.bookingId} className={`hover:bg-slate-50 ${isOverdue ? "bg-red-50/30" : ""}`}>
                        <td className="px-5 py-4">
                          <div className="font-semibold text-slate-900">{o.bookingRef}</div>
                          <div className="text-xs text-slate-500">{o.hallName}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-slate-900">{o.customerName}</div>
                          <div className="text-xs text-slate-500">{o.customerPhone}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-slate-900">{o.eventType}</div>
                          <Badge label={o.status} status={o.status} />
                        </td>
                        <td className="px-4 py-4">
                          <div className={isOverdue ? "text-red-600 font-medium" : "text-slate-700"}>
                            {formatDate(o.eventDate)}
                          </div>
                          {isOverdue && <div className="text-xs text-red-500">Overdue</div>}
                        </td>
                        <td className="px-4 py-4 text-right font-medium">{formatCurrency(o.totalAmount)}</td>
                        <td className="px-4 py-4 text-right text-emerald-600">{formatCurrency(o.paidAmount)}</td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-orange-600 font-bold">{formatCurrency(o.balanceDue)}</span>
                        </td>
                        <td className="px-4 py-4">
                          <Link href={`/bookings/${o.bookingId}`}>
                            <Button size="sm" variant="ghost">
                              <ArrowRight size={14} /> View
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
