"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Badge from "@/components/ui/Badge";
import { Phone, Mail, Star, Plus, Truck } from "lucide-react";

interface Vendor {
  id: number;
  name: string;
  category: string;
  phone: string;
  email: string;
  address: string;
  rateCard: string;
  rating: string;
  notes: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  catering: "Catering",
  decoration: "Decoration",
  generator: "Generator",
  orchestra: "Orchestra",
  photography: "Photography",
  other: "Other",
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState({
    name: "", category: "catering", phone: "", email: "", address: "", rateCard: "", rating: "", notes: "",
  });

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/vendors");
    if (res.ok) setVendors((await res.json()).vendors || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const handleSubmit = async () => {
    setSubmitting(true);
    await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setForm({ name: "", category: "catering", phone: "", email: "", address: "", rateCard: "", rating: "", notes: "" });
    await fetchVendors();
    setSubmitting(false);
  };

  const filtered = categoryFilter === "all" ? vendors : vendors.filter(v => v.category === categoryFilter);
  const categories = ["all", ...Object.keys(CATEGORY_LABELS)];

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Vendor Management</h1>
            <p className="text-sm text-slate-500">{vendors.length} vendors in your network</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Vendor
          </Button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                categoryFilter === cat ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat === "all" ? "All" : CATEGORY_LABELS[cat]}
            </button>
          ))}
        </div>

        {/* Vendor Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-44" />
            ))
          ) : filtered.length === 0 ? (
            <div className="col-span-3 text-center py-16 text-slate-400">
              <Truck size={40} className="mx-auto mb-3 opacity-30" />
              <p>No vendors found</p>
            </div>
          ) : (
            filtered.map((vendor) => (
              <div key={vendor.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-900">{vendor.name}</h3>
                    <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full capitalize font-medium">
                      {CATEGORY_LABELS[vendor.category] || vendor.category}
                    </span>
                  </div>
                  {vendor.rating && (
                    <div className="flex items-center gap-1 text-sm font-semibold text-amber-600">
                      <Star size={14} fill="currentColor" /> {vendor.rating}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 mb-3">
                  {vendor.phone && (
                    <a href={`tel:${vendor.phone}`} className="text-sm text-slate-600 flex items-center gap-2 hover:text-indigo-600">
                      <Phone size={13} className="text-slate-400" /> {vendor.phone}
                    </a>
                  )}
                  {vendor.email && (
                    <a href={`mailto:${vendor.email}`} className="text-sm text-slate-600 flex items-center gap-2 hover:text-indigo-600 truncate">
                      <Mail size={13} className="text-slate-400" /> {vendor.email}
                    </a>
                  )}
                </div>

                {vendor.rateCard && (
                  <div className="bg-slate-50 rounded-lg p-2.5 text-xs text-slate-600">
                    💰 {vendor.rateCard}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Vendor"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Add Vendor</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Vendor Name" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          <Select
            label="Category"
            value={form.category}
            onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}
            options={Object.entries(CATEGORY_LABELS).map(([v, l]) => ({ value: v, label: l }))}
          />
          <Input label="Phone" value={form.phone} onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
          <Input label="Rating (1-5)" type="number" min="1" max="5" step="0.1" value={form.rating} onChange={(e) => setForm(f => ({ ...f, rating: e.target.value }))} />
          <Textarea label="Rate Card" rows={2} value={form.rateCard} onChange={(e) => setForm(f => ({ ...f, rateCard: e.target.value }))} placeholder="Pricing details..." />
          <Textarea label="Notes" rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </Modal>
    </AppShell>
  );
}
