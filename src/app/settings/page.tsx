"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { formatDate, getDaysUntil } from "@/lib/utils";
import { Settings, Globe, Bell, FileText, Shield, Plus, Trash2, CheckCircle2, AlertTriangle, Edit2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface VenueData {
  venue: {
    id: number; name: string; address: string; district: string; gstNumber: string;
    phone: string; email: string; website: string; gstRate: string;
    invoicePrefix: string; language: string;
    cancellationPolicy: string; refundPolicy: string;
    notifyWhatsapp: boolean; notifySms: boolean; notifyEmail: boolean;
  };
  licences: Array<{ id: number; name: string; documentType: string; expiryDate: string; reminderSent: boolean }>;
  users: Array<{ id: number; name: string; email: string; phone: string; role: string; isActive: boolean; lastLogin: string }>;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<VenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("venue");
  const [showUserModal, setShowUserModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", email: "", phone: "", role: "manager", password: "password123" });
  const [venueForm, setVenueForm] = useState({
    name: "", address: "", district: "", gstNumber: "", phone: "", email: "",
    gstRate: "18.00", invoicePrefix: "INV", language: "en",
    cancellationPolicy: "", refundPolicy: "",
    notifyWhatsapp: true, notifySms: false, notifyEmail: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/venue");
    if (res.ok) {
      const d = await res.json();
      setData(d);
      setVenueForm({
        name: d.venue.name || "",
        address: d.venue.address || "",
        district: d.venue.district || "",
        gstNumber: d.venue.gstNumber || "",
        phone: d.venue.phone || "",
        email: d.venue.email || "",
        gstRate: d.venue.gstRate || "18.00",
        invoicePrefix: d.venue.invoicePrefix || "INV",
        language: d.venue.language || "en",
        cancellationPolicy: d.venue.cancellationPolicy || "",
        refundPolicy: d.venue.refundPolicy || "",
        notifyWhatsapp: d.venue.notifyWhatsapp ?? true,
        notifySms: d.venue.notifySms ?? false,
        notifyEmail: d.venue.notifyEmail ?? true,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSaveVenue = async () => {
    setSaving(true);
    await fetch("/api/venue", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(venueForm),
    });
    await fetchData();
    setSaving(false);
    alert("Settings saved!");
  };

  const handleAddUser = async () => {
    setSubmitting(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    });
    if (res.ok) {
      setShowUserModal(false);
      setUserForm({ name: "", email: "", phone: "", role: "manager", password: "password123" });
      await fetchData();
    } else {
      const d = await res.json();
      alert(d.error);
    }
    setSubmitting(false);
  };

  const handleToggleUser = async (userId: number, isActive: boolean) => {
    if (!confirm(`${isActive ? "Deactivate" : "Activate"} this user?`)) return;
    await fetch(`/api/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    await fetchData();
  };

  const TABS = [
    { id: "venue", label: "Venue Profile", icon: Settings },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "billing", label: "Billing Config", icon: FileText },
    { id: "licences", label: "Licences", icon: Shield },
    { id: "users", label: "Users & Access", icon: Shield },
  ];

  if (loading) return <AppShell><div className="p-6 text-center text-slate-500">Loading settings...</div></AppShell>;

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
          <p className="text-sm text-slate-500">Configure your venue preferences and management</p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 shrink-0">
            <nav className="space-y-1">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                    activeTab === id ? "bg-indigo-50 text-indigo-700" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Venue Profile */}
            {activeTab === "venue" && (
              <Card>
                <CardHeader><CardTitle>Venue Profile</CardTitle></CardHeader>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Venue Name" value={venueForm.name} onChange={(e) => setVenueForm(f => ({ ...f, name: e.target.value }))} />
                  <Input label="Phone" value={venueForm.phone} onChange={(e) => setVenueForm(f => ({ ...f, phone: e.target.value }))} />
                  <Input label="Email" type="email" value={venueForm.email} onChange={(e) => setVenueForm(f => ({ ...f, email: e.target.value }))} />
                  <Input label="District" value={venueForm.district} onChange={(e) => setVenueForm(f => ({ ...f, district: e.target.value }))} />
                  <Input label="GST Number" value={venueForm.gstNumber} onChange={(e) => setVenueForm(f => ({ ...f, gstNumber: e.target.value }))} />
                  <Select label="Language" value={venueForm.language} onChange={(e) => setVenueForm(f => ({ ...f, language: e.target.value }))}
                    options={[{ value: "en", label: "English" }, { value: "ml", label: "Malayalam" }]}
                  />
                  <div className="col-span-2">
                    <Textarea label="Address" value={venueForm.address} onChange={(e) => setVenueForm(f => ({ ...f, address: e.target.value }))} />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSaveVenue} loading={saving}>Save Changes</Button>
                </div>
              </Card>
            )}

            {/* Notifications */}
            {activeTab === "notifications" && (
              <Card>
                <CardHeader><CardTitle>Notification Preferences</CardTitle></CardHeader>
                <div className="space-y-4">
                  {[
                    { key: "notifyWhatsapp", label: "WhatsApp Notifications", desc: "Send booking confirmations and reminders via WhatsApp" },
                    { key: "notifySms", label: "SMS Notifications", desc: "Send SMS alerts for booking status changes" },
                    { key: "notifyEmail", label: "Email Notifications", desc: "Send email notifications for invoices and updates" },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                      <div>
                        <p className="font-medium text-slate-900">{label}</p>
                        <p className="text-sm text-slate-500">{desc}</p>
                      </div>
                      <button
                        onClick={() => setVenueForm(f => ({ ...f, [key]: !f[key as keyof typeof f] }))}
                        className={`w-12 h-6 rounded-full transition-colors ${venueForm[key as keyof typeof venueForm] ? "bg-indigo-600" : "bg-slate-300"}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${venueForm[key as keyof typeof venueForm] ? "translate-x-6" : ""}`} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSaveVenue} loading={saving}>Save Preferences</Button>
                </div>
              </Card>
            )}

            {/* Billing Config */}
            {activeTab === "billing" && (
              <Card>
                <CardHeader><CardTitle>Billing & Invoice Configuration</CardTitle></CardHeader>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="GST Rate (%)" type="number" step="0.01" value={venueForm.gstRate} onChange={(e) => setVenueForm(f => ({ ...f, gstRate: e.target.value }))} />
                  <Input label="Invoice Prefix" placeholder="GCV, INV..." value={venueForm.invoicePrefix} onChange={(e) => setVenueForm(f => ({ ...f, invoicePrefix: e.target.value }))} />
                </div>
                <div className="grid grid-cols-1 gap-4 mt-4">
                  <Textarea label="Cancellation Policy" rows={4} value={venueForm.cancellationPolicy} onChange={(e) => setVenueForm(f => ({ ...f, cancellationPolicy: e.target.value }))} />
                  <Textarea label="Refund Policy" rows={4} value={venueForm.refundPolicy} onChange={(e) => setVenueForm(f => ({ ...f, refundPolicy: e.target.value }))} />
                </div>
                <div className="mt-4 flex justify-end">
                  <Button onClick={handleSaveVenue} loading={saving}>Save Configuration</Button>
                </div>
              </Card>
            )}

            {/* Licences */}
            {activeTab === "licences" && (
              <Card padding={false}>
                <div className="p-5 border-b border-slate-100">
                  <CardTitle>Licence Documents</CardTitle>
                </div>
                <div className="divide-y divide-slate-100">
                  {data?.licences.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">No licence documents added</div>
                  ) : (
                    data?.licences.map((lic) => {
                      const daysLeft = getDaysUntil(lic.expiryDate);
                      const isExpiringSoon = daysLeft <= 30 && daysLeft > 0;
                      const isExpired = daysLeft <= 0;
                      return (
                        <div key={lic.id} className="p-5 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpired ? (
                              <AlertTriangle size={18} className="text-red-500" />
                            ) : isExpiringSoon ? (
                              <AlertTriangle size={18} className="text-orange-500" />
                            ) : (
                              <CheckCircle2 size={18} className="text-emerald-500" />
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{lic.name}</p>
                              <p className="text-sm text-slate-500">{lic.documentType}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-slate-900">Expires: {formatDate(lic.expiryDate)}</p>
                            {isExpired && <p className="text-xs text-red-600 font-semibold">Expired!</p>}
                            {isExpiringSoon && <p className="text-xs text-orange-600 font-semibold">{daysLeft} days remaining</p>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            )}

            {/* Users */}
            {activeTab === "users" && user?.role === "owner" && (
              <Card padding={false}>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                  <CardTitle>Users & Access Management</CardTitle>
                  <Button size="sm" onClick={() => setShowUserModal(true)}>
                    <Plus size={14} /> Add User
                  </Button>
                </div>
                <div className="divide-y divide-slate-100">
                  {data?.users.map((u) => (
                    <div key={u.id} className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${u.isActive ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"}`}>
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{u.name}</p>
                          <p className="text-sm text-slate-500">{u.email || u.phone}</p>
                          {u.lastLogin && <p className="text-xs text-slate-400">Last login: {formatDate(u.lastLogin)}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge label={u.role} status="active" />
                        <Badge label={u.isActive ? "Active" : "Inactive"} status={u.isActive ? "active" : "cancelled"} />
                        {u.id !== user?.id && (
                          <Button
                            size="sm"
                            variant={u.isActive ? "danger" : "success"}
                            onClick={() => handleToggleUser(u.id, u.isActive)}
                          >
                            {u.isActive ? "Deactivate" : "Activate"}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal
        open={showUserModal}
        onClose={() => setShowUserModal(false)}
        title="Add User"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowUserModal(false)}>Cancel</Button>
            <Button onClick={handleAddUser} loading={submitting}>Add User</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" required value={userForm.name} onChange={(e) => setUserForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Email" type="email" value={userForm.email} onChange={(e) => setUserForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Phone" value={userForm.phone} onChange={(e) => setUserForm(f => ({ ...f, phone: e.target.value }))} />
          <Select label="Role" value={userForm.role} onChange={(e) => setUserForm(f => ({ ...f, role: e.target.value }))}
            options={[
              { value: "manager", label: "Manager" },
              { value: "accountant", label: "Accountant" },
              { value: "staff", label: "Staff" },
            ]}
          />
          <Input label="Initial Password" value={userForm.password} onChange={(e) => setUserForm(f => ({ ...f, password: e.target.value }))} />
        </div>
      </Modal>
    </AppShell>
  );
}
