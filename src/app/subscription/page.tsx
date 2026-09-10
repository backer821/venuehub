"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CreditCard, CheckCircle2, Clock, AlertTriangle, Receipt, TrendingUp } from "lucide-react";

interface SubscriptionData {
  venue: {
    id: number;
    name: string;
    subscriptionStatus: string;
    subscriptionPlan: string;
    trialStartDate: string;
    currentCycleStart: string;
    freeBookingQuota: number;
    perBookingRate: string;
  };
  usage: {
    usedBookings: number;
    freeQuota: number;
    overageBookings: number;
    estimatedOverageFee: number;
  };
  invoices: Array<{
    id: number;
    invoiceNumber: string;
    billingPeriodStart: string;
    billingPeriodEnd: string;
    confirmedBookings: number;
    totalAmount: string;
    isPreview: boolean;
    status: string;
    dueDate: string;
    paidAt: string;
  }>;
}

export default function SubscriptionPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/subscription");
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) return <AppShell><div className="p-6 text-center text-slate-500">Loading...</div></AppShell>;
  if (!data) return <AppShell><div className="p-6 text-center text-slate-500">Failed to load</div></AppShell>;

  const { venue, usage, invoices } = data;
  const usagePercent = Math.min(100, Math.round((usage.usedBookings / usage.freeQuota) * 100));
  const isOverLimit = usage.usedBookings > usage.freeQuota;

  const statusInfo = {
    trial: { color: "bg-purple-50 border-purple-200 text-purple-800", icon: Clock, message: "You are on a free trial. Unlimited bookings during trial period." },
    active: { color: "bg-emerald-50 border-emerald-200 text-emerald-800", icon: CheckCircle2, message: "Your subscription is active and in good standing." },
    overdue: { color: "bg-orange-50 border-orange-200 text-orange-800", icon: AlertTriangle, message: "Your subscription payment is overdue. Please pay to avoid service interruption." },
    blocked: { color: "bg-red-50 border-red-200 text-red-800", icon: AlertTriangle, message: "New booking creation is paused. Please clear your dues to resume." },
    suspended: { color: "bg-red-50 border-red-200 text-red-800", icon: AlertTriangle, message: "Account is suspended. Please contact support." },
  };

  const sInfo = statusInfo[venue.subscriptionStatus as keyof typeof statusInfo] || statusInfo.active;
  const SIcon = sInfo.icon;

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Subscription & Billing</h1>
          <p className="text-sm text-slate-500">VenueHub SaaS subscription management</p>
        </div>

        {/* Status Banner */}
        <div className={`flex items-start gap-3 p-4 rounded-xl border mb-6 ${sInfo.color}`}>
          <SIcon size={20} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold capitalize">{venue.subscriptionStatus} — {venue.subscriptionPlan} Plan</p>
            <p className="text-sm mt-0.5">{sInfo.message}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5 mb-6">
          {/* Current Cycle */}
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle>Current Billing Cycle Usage</CardTitle>
              <Badge label={venue.subscriptionStatus} status={venue.subscriptionStatus} size="md" />
            </CardHeader>

            <div className="mb-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-600">Confirmed Bookings Used</span>
                <span className={`font-bold ${isOverLimit ? "text-red-600" : "text-emerald-600"}`}>
                  {usage.usedBookings} / {usage.freeQuota}
                </span>
              </div>
              <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isOverLimit ? "bg-red-500" : "bg-emerald-500"}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>{usage.freeQuota - usage.usedBookings > 0 ? `${usage.freeQuota - usage.usedBookings} free bookings remaining` : "Free quota exhausted"}</span>
                <span>{usagePercent}% used</span>
              </div>
            </div>

            {isOverLimit && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-red-800 mb-1">
                  Overage: {usage.overageBookings} extra booking{usage.overageBookings !== 1 ? "s" : ""}
                </p>
                <p className="text-sm text-red-700">
                  Estimated overage charge: <strong>{formatCurrency(usage.estimatedOverageFee)}</strong>
                  {" "}at {formatCurrency(venue.perBookingRate)}/booking
                </p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Plan</p>
                <p className="text-sm font-semibold capitalize">{venue.subscriptionPlan}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Free Quota</p>
                <p className="text-sm font-semibold">{venue.freeBookingQuota} bookings/month</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Per Booking Rate</p>
                <p className="text-sm font-semibold">{formatCurrency(venue.perBookingRate)}/booking</p>
              </div>
            </div>
          </Card>

          {/* Billing Info */}
          <Card>
            <CardHeader><CardTitle>Billing Info</CardTitle></CardHeader>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Current Cycle Start</p>
                <p className="text-sm font-semibold">{formatDate(venue.currentCycleStart)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Trial Started</p>
                <p className="text-sm font-semibold">{formatDate(venue.trialStartDate)}</p>
              </div>
              <div className="pt-3 border-t border-slate-100">
                <p className="text-xs text-slate-500 mb-2">Billing Model</p>
                <p className="text-xs text-slate-700 leading-relaxed">
                  First 2 months: Free trial. Month 3: ₹0 preview invoice. Month 4+: Base fee + overage charges billed monthly.
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Invoice History */}
        <Card padding={false}>
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <CardTitle>Invoice History</CardTitle>
            <Receipt size={18} className="text-slate-400" />
          </div>
          {invoices.length === 0 ? (
            <div className="p-10 text-center text-slate-400">
              <Receipt size={32} className="mx-auto mb-2 opacity-30" />
              <p>No invoices yet</p>
              <p className="text-xs mt-1">Invoices will appear here after your trial period</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Invoice</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Period</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Bookings</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="font-semibold">{inv.invoiceNumber}</div>
                      {inv.isPreview && <Badge label="Preview" status="tentative" />}
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {formatDate(inv.billingPeriodStart)} – {formatDate(inv.billingPeriodEnd)}
                    </td>
                    <td className="px-4 py-4 text-center">{inv.confirmedBookings}</td>
                    <td className="px-4 py-4 text-right font-semibold">
                      {parseFloat(inv.totalAmount) === 0 ? (
                        <span className="text-slate-500">₹0 (Preview)</span>
                      ) : (
                        <span className="text-slate-900">{formatCurrency(inv.totalAmount)}</span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Badge label={inv.status} status={inv.status === "paid" ? "confirmed" : inv.status === "pending" ? "enquiry" : "cancelled"} />
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      {inv.paidAt ? (
                        <span className="text-emerald-600 font-medium">Paid {formatDate(inv.paidAt)}</span>
                      ) : (
                        formatDate(inv.dueDate)
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
