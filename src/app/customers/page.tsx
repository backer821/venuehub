"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Search, Phone, Mail, Calendar, DollarSign, Eye } from "lucide-react";
import Link from "next/link";

interface Customer {
  id: number;
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  bookingCount: number;
  totalValue: string;
  createdAt: string;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "" });

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/customers${params}`);
      if (res.ok) setCustomers((await res.json()).customers || []);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(fetchCustomers, 300);
    return () => clearTimeout(t);
  }, [fetchCustomers]);

  const handleSubmit = async () => {
    if (!form.name) { setError("Name is required"); return; }
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Failed to create customer");
    } else {
      setShowModal(false);
      setForm({ name: "", phone: "", email: "", address: "", notes: "" });
      fetchCustomers();
    }
    setSubmitting(false);
  };

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Customers</h1>
            <p className="text-sm text-slate-500">{customers.length} customers total</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Customer
          </Button>
        </div>

        <div className="relative mb-5">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, phone or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse">
                <div className="h-5 bg-slate-100 rounded w-3/4 mb-3" />
                <div className="h-4 bg-slate-100 rounded w-1/2 mb-2" />
                <div className="h-4 bg-slate-100 rounded w-2/3" />
              </div>
            ))
          ) : customers.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-slate-400">
              <Search size={40} className="mx-auto mb-3 opacity-30" />
              <p>No customers found</p>
            </div>
          ) : (
            customers.map((c) => (
              <Link key={c.id} href={`/customers/${c.id}`}>
                <div className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold text-sm">
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <Calendar size={12} /> {c.bookingCount} booking{c.bookingCount !== 1 ? "s" : ""}
                      </div>
                      <div className="text-sm font-semibold text-emerald-600">{formatCurrency(c.totalValue)}</div>
                    </div>
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1">{c.name}</h3>
                  {c.phone && (
                    <p className="text-sm text-slate-500 flex items-center gap-1.5 mb-0.5">
                      <Phone size={12} /> {c.phone}
                    </p>
                  )}
                  {c.email && (
                    <p className="text-sm text-slate-500 flex items-center gap-1.5 truncate">
                      <Mail size={12} /> {c.email}
                    </p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">Since {formatDate(c.createdAt)}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setError(""); }}
        title="New Customer"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Add Customer</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Full Name" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Address" value={form.address} onChange={(e) => setForm(f => ({ ...f, address: e.target.value }))} />
          <Textarea label="Notes" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </Modal>
    </AppShell>
  );
}
