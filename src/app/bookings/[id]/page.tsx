"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import { formatCurrency, formatDate, sessionTypeLabel, capitalize } from "@/lib/utils";
import {
  ArrowLeft, User, Building2, CreditCard, CheckSquare, Users, Package,
  Truck, DollarSign, Clock, Plus, Edit2, Check, Circle, Loader2,
  Phone, Mail
} from "lucide-react";
import Link from "next/link";

interface BookingDetail {
  booking: {
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
    securityDeposit: string;
    depositRefunded: boolean;
    advanceAmount: string;
    specialRequirements: string;
    internalNotes: string;
    statusHistory: Array<{ status: string; date: string; by: string }>;
    createdAt: string;
    customer: { id: number; name: string; phone: string; email: string } | null;
    hall: { id: number; name: string; capacity: number } | null;
  };
  payments: Array<{
    id: number; type: string; amount: string; mode: string;
    paymentDate: string; referenceNumber: string;
  }>;
  tasks: Array<{
    id: number; title: string; status: string; dueTime: string;
    assignedStaffId: number; staffName: string; completedAt: string;
  }>;
  staffAssignments: Array<{ id: number; staffId: number; staffName: string; role: string; staffPhone: string }>;
  assetAllocations: Array<{ id: number; assetId: number; assetName: string; category: string; quantityAllocated: number; returnStatus: string }>;
  vendorEngagements: Array<{ id: number; vendorId: number; vendorName: string; vendorCategory: string; serviceDetails: string; agreedAmount: string; paidAmount: string; paymentStatus: string }>;
  expenses: Array<{ id: number; category: string; description: string; amount: string; expenseDate: string }>;
  depositDeductions: Array<{ id: number; reason: string; amount: string }>;
}

interface StaffMember { id: number; name: string; role: string; }
interface Asset { id: number; name: string; category: string; availableQuantity: number; }
interface Vendor { id: number; name: string; category: string; phone: string; }

const STATUS_TRANSITIONS: Record<string, string[]> = {
  enquiry: ["tentative", "cancelled"],
  tentative: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [detail, setDetail] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // Modals
  const [paymentModal, setPaymentModal] = useState(false);
  const [taskModal, setTaskModal] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

  const [paymentForm, setPaymentForm] = useState({
    type: "advance", amount: "", mode: "upi", paymentDate: new Date().toISOString().split("T")[0], referenceNumber: "",
  });
  const [taskForm, setTaskForm] = useState({ title: "", assignedStaffId: "", dueTime: "" });
  const [submitting, setSubmitting] = useState(false);

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const [dRes, sRes, aRes, vRes] = await Promise.all([
        fetch(`/api/bookings/${id}`),
        fetch("/api/staff"),
        fetch("/api/assets"),
        fetch("/api/vendors"),
      ]);
      if (dRes.ok) setDetail(await dRes.json());
      if (sRes.ok) setStaff((await sRes.json()).staff || []);
      if (aRes.ok) setAssets((await aRes.json()).assets || []);
      if (vRes.ok) setVendors((await vRes.json()).vendors || []);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleStatusChange = async (newStatus: string) => {
    setStatusChanging(true);
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await fetchDetail();
    setStatusChanging(false);
  };

  const handleAddPayment = async () => {
    setSubmitting(true);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...paymentForm, bookingId: parseInt(id) }),
    });
    if (res.ok) {
      setPaymentModal(false);
      setPaymentForm({ type: "advance", amount: "", mode: "upi", paymentDate: new Date().toISOString().split("T")[0], referenceNumber: "" });
      await fetchDetail();
    }
    setSubmitting(false);
  };

  const handleAddTask = async () => {
    setSubmitting(true);
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...taskForm, bookingId: parseInt(id), assignedStaffId: taskForm.assignedStaffId ? parseInt(taskForm.assignedStaffId) : null }),
    });
    setTaskModal(false);
    setTaskForm({ title: "", assignedStaffId: "", dueTime: "" });
    await fetchDetail();
    setSubmitting(false);
  };

  const handleTaskStatus = async (taskId: number, status: string) => {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchDetail();
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
        </div>
      </AppShell>
    );
  }

  if (!detail) {
    return (
      <AppShell>
        <div className="p-6 text-center text-slate-500">Booking not found</div>
      </AppShell>
    );
  }

  const { booking, payments, tasks, staffAssignments, assetAllocations, vendorEngagements, expenses, depositDeductions } = detail;
  const nextStatuses = STATUS_TRANSITIONS[booking.status] || [];
  const totalPaid = payments.filter(p => !["refund", "deposit_refund"].includes(p.type)).reduce((s, p) => s + parseFloat(p.amount || "0"), 0);

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/bookings")} className="p-2 hover:bg-slate-100 rounded-lg text-slate-600">
              <ArrowLeft size={20} />
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">{booking.bookingRef}</h1>
                <Badge label={booking.status} status={booking.status} size="md" />
              </div>
              <p className="text-sm text-slate-500">
                {booking.eventType} · {sessionTypeLabel(booking.sessionType)} · {formatDate(booking.eventDate)} · {booking.hall?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {nextStatuses.map((s) => (
              <Button
                key={s}
                size="sm"
                variant={s === "cancelled" ? "danger" : s === "completed" ? "success" : "primary"}
                onClick={() => handleStatusChange(s)}
                loading={statusChanging}
              >
                Move to {capitalize(s)}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5">
          <div className="col-span-2 space-y-5">
            {/* Booking Summary */}
            <Card>
              <CardHeader><CardTitle>Booking Details</CardTitle></CardHeader>
              <div className="grid grid-cols-3 gap-4">
                {[
                  ["Hall", booking.hall?.name || "—"],
                  ["Event Type", booking.eventType || "—"],
                  ["Session", sessionTypeLabel(booking.sessionType)],
                  ["Event Date", formatDate(booking.eventDate)],
                  ["Guest Count", booking.guestCount ? `${booking.guestCount} pax` : "—"],
                  ["Source", capitalize(booking.source || "")],
                  ["Total Amount", formatCurrency(booking.totalAmount)],
                  ["Paid Amount", formatCurrency(booking.paidAmount)],
                  ["Balance Due", formatCurrency(booking.balanceDue)],
                  ["Security Deposit", formatCurrency(booking.securityDeposit)],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                    <p className="text-sm font-medium text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
              {booking.specialRequirements && (
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Special Requirements</p>
                  <p className="text-sm text-slate-700">{booking.specialRequirements}</p>
                </div>
              )}
              {booking.internalNotes && (
                <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-1">Internal Notes</p>
                  <p className="text-sm text-slate-700 bg-yellow-50 p-2 rounded-lg">{booking.internalNotes}</p>
                </div>
              )}
            </Card>

            {/* Payments */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>Payments ({payments.length})</CardTitle>
                <Button size="sm" onClick={() => setPaymentModal(true)}>
                  <Plus size={14} /> Add Payment
                </Button>
              </div>
              {payments.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No payments recorded</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${p.type === "refund" || p.type === "deposit_refund" ? "bg-red-400" : "bg-green-400"}`} />
                        <div>
                          <p className="text-sm font-medium capitalize text-slate-900">{p.type.replace(/_/g, " ")}</p>
                          <p className="text-xs text-slate-500">{capitalize(p.mode)} · {formatDate(p.paymentDate)}{p.referenceNumber && ` · Ref: ${p.referenceNumber}`}</p>
                        </div>
                      </div>
                      <span className={`text-sm font-semibold ${p.type.includes("refund") ? "text-red-600" : "text-emerald-600"}`}>
                        {p.type.includes("refund") ? "-" : "+"}{formatCurrency(p.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-sm font-medium text-slate-600">Total Collected</span>
                <span className="text-lg font-bold text-emerald-600">{formatCurrency(totalPaid)}</span>
              </div>
            </Card>

            {/* Tasks */}
            <Card>
              <div className="flex items-center justify-between mb-4">
                <CardTitle>Housekeeping Tasks ({tasks.length})</CardTitle>
                <Button size="sm" onClick={() => setTaskModal(true)}>
                  <Plus size={14} /> Add Task
                </Button>
              </div>
              {tasks.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No tasks assigned</p>
              ) : (
                <div className="space-y-2">
                  {tasks.map((t) => (
                    <div key={t.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                      <button
                        onClick={() => handleTaskStatus(t.id, t.status === "done" ? "pending" : t.status === "pending" ? "in_progress" : "done")}
                        className="shrink-0"
                      >
                        {t.status === "done" ? (
                          <Check size={18} className="text-emerald-600" />
                        ) : t.status === "in_progress" ? (
                          <Clock size={18} className="text-blue-500" />
                        ) : (
                          <Circle size={18} className="text-slate-300" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${t.status === "done" ? "line-through text-slate-400" : "text-slate-900"}`}>{t.title}</p>
                        <p className="text-xs text-slate-500">
                          {t.staffName && `Assigned: ${t.staffName}`}{t.dueTime && ` · Due: ${t.dueTime}`}
                        </p>
                      </div>
                      <Badge label={t.status.replace("_", " ")} status={t.status} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Vendors */}
            {vendorEngagements.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Vendors ({vendorEngagements.length})</CardTitle></CardHeader>
                <div className="space-y-2">
                  {vendorEngagements.map((v) => (
                    <div key={v.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{v.vendorName}</p>
                        <p className="text-xs text-slate-500 capitalize">{v.vendorCategory} · {v.serviceDetails}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(v.agreedAmount)}</p>
                        <Badge label={v.paymentStatus} status={v.paymentStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Expenses */}
            {expenses.length > 0 && (
              <Card>
                <CardHeader><CardTitle>Booking Expenses</CardTitle></CardHeader>
                <div className="space-y-2">
                  {expenses.map((e) => (
                    <div key={e.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{e.description}</p>
                        <p className="text-xs text-slate-500 capitalize">{e.category} · {formatDate(e.expenseDate)}</p>
                      </div>
                      <span className="text-sm font-semibold text-red-600">{formatCurrency(e.amount)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            {/* Customer */}
            <Card>
              <CardHeader><CardTitle><User size={16} className="inline mr-2" />Customer</CardTitle></CardHeader>
              {booking.customer ? (
                <div>
                  <p className="font-semibold text-slate-900 mb-1">{booking.customer.name}</p>
                  {booking.customer.phone && (
                    <a href={`tel:${booking.customer.phone}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600 mb-1">
                      <Phone size={14} /> {booking.customer.phone}
                    </a>
                  )}
                  {booking.customer.email && (
                    <a href={`mailto:${booking.customer.email}`} className="flex items-center gap-2 text-sm text-slate-600 hover:text-indigo-600">
                      <Mail size={14} /> {booking.customer.email}
                    </a>
                  )}
                  <Link href={`/customers/${booking.customer.id}`}>
                    <Button size="sm" variant="ghost" className="mt-3 w-full">View Profile</Button>
                  </Link>
                </div>
              ) : (
                <p className="text-sm text-slate-400">No customer linked</p>
              )}
            </Card>

            {/* Staff Assignments */}
            <Card>
              <CardHeader><CardTitle><Users size={16} className="inline mr-2" />Staff Assigned</CardTitle></CardHeader>
              {staffAssignments.length === 0 ? (
                <p className="text-sm text-slate-400">No staff assigned</p>
              ) : (
                <div className="space-y-2">
                  {staffAssignments.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-semibold text-indigo-700">
                        {s.staffName?.charAt(0) || "S"}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{s.staffName}</p>
                        <p className="text-xs text-slate-500">{s.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Asset Allocations */}
            {assetAllocations.length > 0 && (
              <Card>
                <CardHeader><CardTitle><Package size={16} className="inline mr-2" />Assets Used</CardTitle></CardHeader>
                <div className="space-y-2">
                  {assetAllocations.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p className="font-medium text-slate-900">{a.assetName}</p>
                        <p className="text-xs text-slate-500">{a.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">×{a.quantityAllocated}</p>
                        <Badge label={a.returnStatus} status={a.returnStatus} />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Status History */}
            <Card>
              <CardHeader><CardTitle>Status History</CardTitle></CardHeader>
              <div className="space-y-2">
                {(booking.statusHistory as Array<{ status: string; date: string; by: string }> || []).map((h, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium capitalize text-slate-900">{h.status}</p>
                      <p className="text-xs text-slate-500">{h.date} · by {h.by}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      <Modal
        open={paymentModal}
        onClose={() => setPaymentModal(false)}
        title="Add Payment"
        footer={
          <>
            <Button variant="outline" onClick={() => setPaymentModal(false)}>Cancel</Button>
            <Button onClick={handleAddPayment} loading={submitting}>Save Payment</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Payment Type"
            value={paymentForm.type}
            onChange={(e) => setPaymentForm(f => ({ ...f, type: e.target.value }))}
            options={[
              { value: "advance", label: "Advance" },
              { value: "balance", label: "Balance" },
              { value: "refund", label: "Refund" },
              { value: "deposit", label: "Security Deposit" },
              { value: "deposit_refund", label: "Deposit Refund" },
            ]}
          />
          <Input
            label="Amount (₹)"
            type="number"
            required
            value={paymentForm.amount}
            onChange={(e) => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
          />
          <Select
            label="Payment Mode"
            value={paymentForm.mode}
            onChange={(e) => setPaymentForm(f => ({ ...f, mode: e.target.value }))}
            options={[
              { value: "cash", label: "Cash" },
              { value: "upi", label: "UPI" },
              { value: "card", label: "Card" },
              { value: "netbanking", label: "Net Banking" },
              { value: "cheque", label: "Cheque" },
            ]}
          />
          <Input
            label="Payment Date"
            type="date"
            value={paymentForm.paymentDate}
            onChange={(e) => setPaymentForm(f => ({ ...f, paymentDate: e.target.value }))}
          />
          <Input
            label="Reference Number"
            placeholder="Transaction ID, cheque no., etc."
            value={paymentForm.referenceNumber}
            onChange={(e) => setPaymentForm(f => ({ ...f, referenceNumber: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Task Modal */}
      <Modal
        open={taskModal}
        onClose={() => setTaskModal(false)}
        title="Add Task"
        footer={
          <>
            <Button variant="outline" onClick={() => setTaskModal(false)}>Cancel</Button>
            <Button onClick={handleAddTask} loading={submitting}>Add Task</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Task Title"
            required
            placeholder="e.g. Setup chairs and tables"
            value={taskForm.title}
            onChange={(e) => setTaskForm(f => ({ ...f, title: e.target.value }))}
          />
          <Select
            label="Assign To"
            value={taskForm.assignedStaffId}
            onChange={(e) => setTaskForm(f => ({ ...f, assignedStaffId: e.target.value }))}
            options={staff.filter(s => s).map(s => ({ value: String(s.id), label: `${s.name} (${s.role})` }))}
            placeholder="Select staff"
          />
          <Input
            label="Due Time"
            type="time"
            value={taskForm.dueTime}
            onChange={(e) => setTaskForm(f => ({ ...f, dueTime: e.target.value }))}
          />
        </div>
      </Modal>
    </AppShell>
  );
}
