"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatCurrency, formatDate, sessionTypeLabel } from "@/lib/utils";
import { ArrowLeft, Phone, Mail, MapPin, Calendar, DollarSign, Loader2 } from "lucide-react";
import Link from "next/link";

interface CustomerDetail {
  customer: {
    id: number; name: string; phone: string; email: string;
    address: string; notes: string; createdAt: string;
  };
  bookings: Array<{
    id: number; bookingRef: string; eventDate: string; sessionType: string;
    eventType: string; status: string; totalAmount: string; balanceDue: string; hallName: string;
  }>;
  communicationLogs: Array<{ id: number; type: string; message: string; createdAt: string }>;
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/customers/${id}`)
      .then(r => r.json())
      .then(setDetail)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <AppShell><div className="flex items-center justify-center h-full"><Loader2 className="animate-spin text-indigo-600" size={32} /></div></AppShell>;
  if (!detail) return <AppShell><div className="p-6 text-center text-slate-500">Not found</div></AppShell>;

  const { customer, bookings } = detail;
  const totalValue = bookings.reduce((s, b) => s + parseFloat(b.totalAmount || "0"), 0);
  const totalDue = bookings.reduce((s, b) => s + parseFloat(b.balanceDue || "0"), 0);

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => router.push("/customers")} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-lg">
              {customer.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{customer.name}</h1>
              <p className="text-sm text-slate-500">Customer since {formatDate(customer.createdAt)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-5">
            {/* Booking History */}
            <Card padding={false}>
              <div className="p-5 border-b border-slate-100">
                <CardTitle>Booking History ({bookings.length})</CardTitle>
              </div>
              <div className="divide-y divide-slate-100">
                {bookings.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">No bookings yet</div>
                ) : (
                  bookings.map((b) => (
                    <Link key={b.id} href={`/bookings/${b.id}`} className="block px-5 py-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900 text-sm">{b.bookingRef}</span>
                          <Badge label={b.status} status={b.status} />
                        </div>
                        <span className="font-semibold text-slate-900">{formatCurrency(b.totalAmount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{b.eventType} · {b.hallName} · {sessionTypeLabel(b.sessionType)}</span>
                        <span>{formatDate(b.eventDate)}</span>
                      </div>
                      {parseFloat(String(b.balanceDue)) > 0 && (
                        <p className="text-xs text-orange-600 mt-0.5">Balance: {formatCurrency(b.balanceDue)}</p>
                      )}
                    </Link>
                  ))
                )}
              </div>
            </Card>
          </div>

          <div className="space-y-5">
            {/* Contact Info */}
            <Card>
              <CardHeader><CardTitle>Contact Info</CardTitle></CardHeader>
              <div className="space-y-3">
                {customer.phone && (
                  <a href={`tel:${customer.phone}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-600">
                    <Phone size={16} className="text-slate-400" /> {customer.phone}
                  </a>
                )}
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className="flex items-center gap-2 text-sm text-slate-700 hover:text-indigo-600">
                    <Mail size={16} className="text-slate-400" /> {customer.email}
                  </a>
                )}
                {customer.address && (
                  <div className="flex items-start gap-2 text-sm text-slate-700">
                    <MapPin size={16} className="text-slate-400 mt-0.5 shrink-0" /> {customer.address}
                  </div>
                )}
                {customer.notes && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                    <p className="text-sm text-slate-700">{customer.notes}</p>
                  </div>
                )}
              </div>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Total Bookings</span>
                  <span className="text-sm font-semibold">{bookings.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Total Value</span>
                  <span className="text-sm font-semibold text-emerald-600">{formatCurrency(totalValue)}</span>
                </div>
                {totalDue > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Outstanding Dues</span>
                    <span className="text-sm font-semibold text-orange-600">{formatCurrency(totalDue)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Confirmed</span>
                  <span className="text-sm font-semibold">{bookings.filter(b => b.status === "confirmed").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Completed</span>
                  <span className="text-sm font-semibold">{bookings.filter(b => b.status === "completed").length}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
