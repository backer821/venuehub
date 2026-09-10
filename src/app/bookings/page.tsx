"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { formatCurrency, formatDate, sessionTypeLabel, generateBookingRef } from "@/lib/utils";
import {
  Plus, Search, Filter, Calendar, List, Eye, Edit2, ChevronLeft, ChevronRight
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface Booking {
  id: number;
  bookingRef: string;
  eventDate: string;
  sessionType: string;
  eventType: string;
  status: string;
  source: string;
  guestCount: number;
  totalAmount: string;
  paidAmount: string;
  balanceDue: string;
  customerName: string;
  customerPhone: string;
  customerId: number;
  hallName: string;
  hallId: number;
  createdAt: string;
}

interface Hall {
  id: number;
  name: string;
  capacity: number;
  pricing: Array<{ sessionType: string; baseRate: string }>;
  packages: Array<{ id: number; name: string; price: string }>;
}

interface Customer {
  id: number;
  name: string;
  phone: string;
}

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "enquiry", label: "Enquiry" },
  { value: "tentative", label: "Tentative" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const SESSION_OPTIONS = [
  { value: "morning", label: "Morning" },
  { value: "evening", label: "Evening" },
  { value: "full_day", label: "Full Day" },
  { value: "hourly", label: "Hourly" },
];

const SOURCE_OPTIONS = [
  { value: "phone", label: "Phone" },
  { value: "online", label: "Online" },
  { value: "walk_in", label: "Walk-in" },
];

export default function BookingsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  // New booking form
  const [form, setForm] = useState({
    hallId: "",
    customerId: "",
    newCustomerName: "",
    newCustomerPhone: "",
    eventDate: "",
    sessionType: "full_day",
    eventType: "",
    guestCount: "",
    packageId: "",
    totalAmount: "",
    advanceAmount: "",
    securityDeposit: "",
    status: "enquiry",
    source: "phone",
    specialRequirements: "",
    internalNotes: "",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      const [bRes, hRes, cRes] = await Promise.all([
        fetch(`/api/bookings?${params}`),
        fetch("/api/halls"),
        fetch("/api/customers"),
      ]);
      if (bRes.ok) setBookings((await bRes.json()).bookings || []);
      if (hRes.ok) setHalls((await hRes.json()).halls || []);
      if (cRes.ok) setCustomers((await cRes.json()).customers || []);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleHallChange = (hallId: string) => {
    const hall = halls.find((h) => h.id === parseInt(hallId));
    const pricing = hall?.pricing?.find((p) => p.sessionType === form.sessionType);
    setForm((f) => ({
      ...f,
      hallId,
      totalAmount: pricing ? pricing.baseRate : f.totalAmount,
      packageId: "",
    }));
  };

  const handleSessionChange = (sessionType: string) => {
    const hall = halls.find((h) => h.id === parseInt(form.hallId));
    const pricing = hall?.pricing?.find((p) => p.sessionType === sessionType);
    setForm((f) => ({
      ...f,
      sessionType,
      totalAmount: pricing ? pricing.baseRate : f.totalAmount,
    }));
  };

  const handlePackageChange = (packageId: string) => {
    const hall = halls.find((h) => h.id === parseInt(form.hallId));
    const pkg = hall?.packages?.find((p) => p.id === parseInt(packageId));
    setForm((f) => ({
      ...f,
      packageId,
      totalAmount: pkg ? pkg.price : f.totalAmount,
    }));
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);

    try {
      let customerId = form.customerId ? parseInt(form.customerId) : null;

      // Create new customer if needed
      if (!customerId && form.newCustomerName) {
        const cRes = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.newCustomerName,
            phone: form.newCustomerPhone,
          }),
        });
        const cData = await cRes.json();
        if (!cRes.ok) {
          if (cData.existingId) customerId = cData.existingId;
          else { setError(cData.error); setSubmitting(false); return; }
        } else {
          customerId = cData.customer.id;
        }
      }

      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hallId: parseInt(form.hallId),
          customerId,
          eventDate: form.eventDate,
          sessionType: form.sessionType,
          eventType: form.eventType,
          guestCount: form.guestCount ? parseInt(form.guestCount) : null,
          packageId: form.packageId ? parseInt(form.packageId) : null,
          totalAmount: form.totalAmount,
          advanceAmount: form.advanceAmount,
          securityDeposit: form.securityDeposit,
          status: form.status,
          source: form.source,
          specialRequirements: form.specialRequirements,
          internalNotes: form.internalNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create booking");
      } else {
        setShowModal(false);
        setForm({
          hallId: "", customerId: "", newCustomerName: "", newCustomerPhone: "",
          eventDate: "", sessionType: "full_day", eventType: "", guestCount: "",
          packageId: "", totalAmount: "", advanceAmount: "", securityDeposit: "",
          status: "enquiry", source: "phone", specialRequirements: "", internalNotes: "",
        });
        fetchData();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = bookings.filter((b) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      b.bookingRef?.toLowerCase().includes(term) ||
      b.customerName?.toLowerCase().includes(term) ||
      b.customerPhone?.includes(term) ||
      b.eventType?.toLowerCase().includes(term) ||
      b.hallName?.toLowerCase().includes(term)
    );
  });

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const getBookingsForDate = (day: number) => {
    const dateStr = `${calendarDate.getFullYear()}-${String(calendarDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return bookings.filter((b) => b.eventDate === dateStr && b.status !== "cancelled");
  };

  const { firstDay, daysInMonth } = getDaysInMonth(calendarDate);
  const canCreate = user?.role === "owner" || user?.role === "manager";

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bookings</h1>
            <p className="text-sm text-slate-500">Manage all venue bookings and events</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 ${viewMode === "list" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <List size={15} /> List
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={`px-3 py-2 text-sm flex items-center gap-1.5 ${viewMode === "calendar" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Calendar size={15} /> Calendar
              </button>
            </div>
            {canCreate && (
              <Button onClick={() => setShowModal(true)}>
                <Plus size={16} /> New Booking
              </Button>
            )}
          </div>
        </div>

        {viewMode === "list" ? (
          <>
            {/* Filters */}
            <div className="flex gap-3 mb-5">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by ref, customer, event type..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>

            {/* Table */}
            <Card padding={false}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Ref / Hall</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Customer</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Event</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Date</th>
                      <th className="text-left px-4 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Status</th>
                      <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Amount</th>
                      <th className="text-right px-4 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wide">Balance</th>
                      <th className="px-4 py-3.5"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 8 }).map((_, j) => (
                            <td key={j} className="px-4 py-4">
                              <div className="h-4 bg-slate-100 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : filtered.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                          No bookings found
                        </td>
                      </tr>
                    ) : (
                      filtered.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="font-semibold text-slate-900">{b.bookingRef}</div>
                            <div className="text-xs text-slate-500">{b.hallName}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-slate-900">{b.customerName || "—"}</div>
                            <div className="text-xs text-slate-500">{b.customerPhone}</div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="text-slate-900">{b.eventType || "—"}</div>
                            <div className="text-xs text-slate-500">{sessionTypeLabel(b.sessionType)} · {b.guestCount} pax</div>
                          </td>
                          <td className="px-4 py-4 text-slate-700">{formatDate(b.eventDate)}</td>
                          <td className="px-4 py-4">
                            <Badge label={b.status} status={b.status} />
                          </td>
                          <td className="px-4 py-4 text-right font-medium text-slate-900">
                            {formatCurrency(b.totalAmount)}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className={parseFloat(String(b.balanceDue)) > 0 ? "text-orange-600 font-medium" : "text-emerald-600"}>
                              {formatCurrency(b.balanceDue)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <Link href={`/bookings/${b.id}`}>
                              <Button size="sm" variant="ghost">
                                <Eye size={14} /> View
                              </Button>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </>
        ) : (
          /* Calendar View */
          <Card>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => {
                  const d = new Date(calendarDate);
                  d.setMonth(d.getMonth() - 1);
                  setCalendarDate(d);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <ChevronLeft size={18} />
              </button>
              <h2 className="text-lg font-semibold text-slate-900">
                {calendarDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
              </h2>
              <button
                onClick={() => {
                  const d = new Date(calendarDate);
                  d.setMonth(d.getMonth() + 1);
                  setCalendarDate(d);
                }}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">
                  {d}
                </div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayBookings = getBookingsForDate(day);
                const isToday =
                  day === new Date().getDate() &&
                  calendarDate.getMonth() === new Date().getMonth() &&
                  calendarDate.getFullYear() === new Date().getFullYear();
                return (
                  <div
                    key={day}
                    className={`min-h-[80px] p-1.5 rounded-lg border text-xs ${
                      isToday ? "border-indigo-400 bg-indigo-50" : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className={`font-semibold mb-1 ${isToday ? "text-indigo-700" : "text-slate-700"}`}>
                      {day}
                    </div>
                    <div className="space-y-0.5">
                      {dayBookings.slice(0, 2).map((b) => (
                        <Link key={b.id} href={`/bookings/${b.id}`}>
                          <div
                            className={`px-1 py-0.5 rounded text-white truncate cursor-pointer ${
                              b.status === "confirmed"
                                ? "bg-emerald-500"
                                : b.status === "tentative"
                                ? "bg-blue-500"
                                : "bg-yellow-500"
                            }`}
                          >
                            {b.bookingRef}
                          </div>
                        </Link>
                      ))}
                      {dayBookings.length > 2 && (
                        <div className="text-slate-500 px-1">+{dayBookings.length - 2} more</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500" /> Confirmed</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-500" /> Tentative</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-yellow-500" /> Enquiry</div>
            </div>
          </Card>
        )}
      </div>

      {/* New Booking Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setError(""); }}
        title="New Booking"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Create Booking</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Hall"
            required
            value={form.hallId}
            onChange={(e) => handleHallChange(e.target.value)}
            options={halls.map((h) => ({ value: String(h.id), label: h.name }))}
            placeholder="Select hall"
          />
          <Select
            label="Session Type"
            required
            value={form.sessionType}
            onChange={(e) => handleSessionChange(e.target.value)}
            options={SESSION_OPTIONS}
          />
          <Input
            label="Event Date"
            type="date"
            required
            value={form.eventDate}
            onChange={(e) => setForm((f) => ({ ...f, eventDate: e.target.value }))}
            min={new Date().toISOString().split("T")[0]}
          />
          <Input
            label="Event Type"
            placeholder="Wedding, Birthday, Corporate..."
            value={form.eventType}
            onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value }))}
          />

          {/* Customer */}
          <div className="col-span-2">
            <p className="text-sm font-medium text-slate-700 mb-2">Customer</p>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Existing Customer"
                value={form.customerId}
                onChange={(e) => setForm((f) => ({ ...f, customerId: e.target.value, newCustomerName: "", newCustomerPhone: "" }))}
                options={customers.map((c) => ({ value: String(c.id), label: `${c.name} (${c.phone})` }))}
                placeholder="Search existing..."
              />
              <div className="text-center text-slate-400 flex items-end pb-2 justify-center text-sm">— or —</div>
            </div>
            {!form.customerId && (
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Input
                  label="New Customer Name"
                  placeholder="Full name"
                  value={form.newCustomerName}
                  onChange={(e) => setForm((f) => ({ ...f, newCustomerName: e.target.value }))}
                />
                <Input
                  label="Phone Number"
                  placeholder="10-digit phone"
                  value={form.newCustomerPhone}
                  onChange={(e) => setForm((f) => ({ ...f, newCustomerPhone: e.target.value }))}
                />
              </div>
            )}
          </div>

          <Input
            label="Guest Count"
            type="number"
            placeholder="No. of guests"
            value={form.guestCount}
            onChange={(e) => setForm((f) => ({ ...f, guestCount: e.target.value }))}
          />

          {form.hallId && halls.find(h => h.id === parseInt(form.hallId))?.packages?.length! > 0 && (
            <Select
              label="Package (optional)"
              value={form.packageId}
              onChange={(e) => handlePackageChange(e.target.value)}
              options={(halls.find(h => h.id === parseInt(form.hallId))?.packages || []).map((p) => ({
                value: String(p.id),
                label: `${p.name} — ${formatCurrency(p.price)}`,
              }))}
              placeholder="No package"
            />
          )}

          <Input
            label="Total Amount (₹)"
            type="number"
            required
            value={form.totalAmount}
            onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
          />
          <Input
            label="Advance Amount (₹)"
            type="number"
            value={form.advanceAmount}
            onChange={(e) => setForm((f) => ({ ...f, advanceAmount: e.target.value }))}
          />
          <Input
            label="Security Deposit (₹)"
            type="number"
            value={form.securityDeposit}
            onChange={(e) => setForm((f) => ({ ...f, securityDeposit: e.target.value }))}
          />

          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            options={[
              { value: "enquiry", label: "Enquiry" },
              { value: "tentative", label: "Tentative" },
            ]}
          />

          <Select
            label="Source"
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            options={SOURCE_OPTIONS}
          />

          <div className="col-span-2">
            <Textarea
              label="Special Requirements"
              placeholder="Any special requirements or notes..."
              value={form.specialRequirements}
              onChange={(e) => setForm((f) => ({ ...f, specialRequirements: e.target.value }))}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
