"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Badge from "@/components/ui/Badge";
import { formatDate } from "@/lib/utils";
import { Plus, Users, Phone, Mail, UserCheck, UserX, Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface StaffMember {
  id: number;
  name: string;
  role: string;
  phone: string;
  email: string;
  joiningDate: string;
  isActive: boolean;
  notes: string;
}

interface AttendanceRecord {
  id: number;
  date: string;
  status: string;
  checkIn: string;
  checkOut: string;
  staffId: number;
  staffName: string;
  staffRole: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"list" | "attendance">("list");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  const [form, setForm] = useState({ name: "", role: "", phone: "", email: "", joiningDate: "", notes: "" });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/staff");
    if (res.ok) setStaff((await res.json()).staff || []);
    setLoading(false);
  }, []);

  const fetchAttendance = useCallback(async () => {
    const res = await fetch(`/api/attendance?date=${selectedDate}`);
    if (res.ok) setAttendance((await res.json()).attendance || []);
  }, [selectedDate]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);
  useEffect(() => { if (tab === "attendance") fetchAttendance(); }, [tab, fetchAttendance]);

  const handleSubmit = async () => {
    setSubmitting(true);
    await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setForm({ name: "", role: "", phone: "", email: "", joiningDate: "", notes: "" });
    await fetchStaff();
    setSubmitting(false);
  };

  const handleDeactivate = async (id: number) => {
    if (!confirm("Deactivate this staff member? Historical records will be preserved.")) return;
    await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: false }),
    });
    await fetchStaff();
  };

  const markAttendance = async (staffId: number, status: string) => {
    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ staffId, date: selectedDate, status }),
    });
    await fetchAttendance();
  };

  const getAttendanceForStaff = (staffId: number) =>
    attendance.find((a) => a.staffId === staffId);

  const activeStaff = staff.filter((s) => s.isActive);

  const navigateDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split("T")[0]);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Staff Management</h1>
            <p className="text-sm text-slate-500">{activeStaff.length} active staff members</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
              <button onClick={() => setTab("list")} className={`px-4 py-2 text-sm ${tab === "list" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                Staff List
              </button>
              <button onClick={() => setTab("attendance")} className={`px-4 py-2 text-sm ${tab === "attendance" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
                Attendance
              </button>
            </div>
            <Button onClick={() => setShowModal(true)}>
              <Plus size={16} /> Add Staff
            </Button>
          </div>
        </div>

        {tab === "list" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-40" />
              ))
            ) : (
              [...activeStaff, ...staff.filter(s => !s.isActive)].map((member) => (
                <div key={member.id} className={`bg-white rounded-xl border p-5 ${member.isActive ? "border-slate-200" : "border-slate-100 opacity-60"}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${member.isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-500"}`}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.role}</p>
                      </div>
                    </div>
                    <Badge label={member.isActive ? "Active" : "Inactive"} status={member.isActive ? "active" : "cancelled"} />
                  </div>
                  <div className="space-y-1.5">
                    {member.phone && (
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Phone size={13} className="text-slate-400" /> {member.phone}
                      </p>
                    )}
                    {member.email && (
                      <p className="text-sm text-slate-600 flex items-center gap-2">
                        <Mail size={13} className="text-slate-400" /> {member.email}
                      </p>
                    )}
                    {member.joiningDate && (
                      <p className="text-xs text-slate-400 flex items-center gap-2">
                        <Calendar size={12} /> Joined {formatDate(member.joiningDate)}
                      </p>
                    )}
                  </div>
                  {member.isActive && (
                    <button
                      onClick={() => handleDeactivate(member.id)}
                      className="mt-3 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                    >
                      <UserX size={12} /> Deactivate
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ) : (
          <Card>
            {/* Date Navigator */}
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => navigateDate(-1)} className="p-2 hover:bg-slate-100 rounded-lg">
                <ChevronLeft size={18} />
              </button>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-900">
                  {new Date(selectedDate).toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                </h2>
                {selectedDate === new Date().toISOString().split("T")[0] && (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Today</span>
                )}
              </div>
              <button onClick={() => navigateDate(1)} className="p-2 hover:bg-slate-100 rounded-lg">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-4 gap-3 mb-6">
              {["present", "absent", "half_day"].map((s) => {
                const cnt = attendance.filter(a => a.status === s).length;
                return (
                  <div key={s} className={`p-3 rounded-xl text-center text-sm font-medium ${
                    s === "present" ? "bg-emerald-50 text-emerald-700" :
                    s === "absent" ? "bg-red-50 text-red-700" :
                    "bg-orange-50 text-orange-700"
                  }`}>
                    <div className="text-2xl font-bold">{cnt}</div>
                    <div className="capitalize">{s.replace("_", " ")}</div>
                  </div>
                );
              })}
              <div className="bg-slate-50 p-3 rounded-xl text-center text-sm font-medium text-slate-600">
                <div className="text-2xl font-bold">{activeStaff.length - attendance.filter(a => ["present", "absent", "half_day"].includes(a.status)).length}</div>
                <div>Unmarked</div>
              </div>
            </div>

            {/* Attendance List */}
            <div className="space-y-2">
              {activeStaff.map((member) => {
                const rec = getAttendanceForStaff(member.id);
                return (
                  <div key={member.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-sm font-semibold text-indigo-700">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {rec && <Badge label={rec.status.replace("_", " ")} status={rec.status} />}
                      <div className="flex gap-1">
                        {[
                          { status: "present", label: "P", color: "bg-emerald-500 text-white" },
                          { status: "absent", label: "A", color: "bg-red-500 text-white" },
                          { status: "half_day", label: "H", color: "bg-orange-500 text-white" },
                        ].map(({ status, label, color }) => (
                          <button
                            key={status}
                            onClick={() => markAttendance(member.id, status)}
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                              rec?.status === status ? color : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Staff Member"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Add Staff</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Role / Designation" placeholder="Event Coordinator, Housekeeping, Security..." value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Joining Date" type="date" value={form.joiningDate} onChange={(e) => setForm(f => ({ ...f, joiningDate: e.target.value }))} />
        </div>
      </Modal>
    </AppShell>
  );
}
