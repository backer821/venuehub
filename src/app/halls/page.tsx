"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { formatCurrency, sessionTypeLabel } from "@/lib/utils";
import {
  Plus, Building2, Users, Zap, ParkingCircle, Wind, Camera,
  CheckCircle2, XCircle, Edit2, ToggleLeft, ToggleRight, Star
} from "lucide-react";

interface Hall {
  id: number;
  name: string;
  capacity: number;
  hasAc: boolean;
  parkingCount: number;
  stageSize: string;
  stageType: string;
  cateringRule: string;
  hasGeneratorBackup: boolean;
  hasBridalRoom: boolean;
  hasProjector: boolean;
  hasAv: boolean;
  isAccessible: boolean;
  description: string;
  isBookable: boolean;
  photos: Array<{ id: number; url: string; isPrimary: boolean; caption: string }>;
  pricing: Array<{ id: number; sessionType: string; baseRate: string }>;
  packages: Array<{ id: number; name: string; price: string; description: string }>;
}

export default function HallsPage() {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editHall, setEditHall] = useState<Hall | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "", capacity: "", hasAc: false, parkingCount: "0",
    stageSize: "", stageType: "", cateringRule: "outside_allowed",
    hasGeneratorBackup: false, hasBridalRoom: false, hasProjector: false,
    hasAv: false, isAccessible: false, description: "",
  });

  const fetchHalls = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/halls");
    if (res.ok) setHalls((await res.json()).halls || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchHalls(); }, [fetchHalls]);

  const openEdit = (hall: Hall) => {
    setEditHall(hall);
    setForm({
      name: hall.name, capacity: String(hall.capacity || ""),
      hasAc: hall.hasAc, parkingCount: String(hall.parkingCount || 0),
      stageSize: hall.stageSize || "", stageType: hall.stageType || "",
      cateringRule: hall.cateringRule || "outside_allowed",
      hasGeneratorBackup: hall.hasGeneratorBackup, hasBridalRoom: hall.hasBridalRoom,
      hasProjector: hall.hasProjector, hasAv: hall.hasAv,
      isAccessible: hall.isAccessible, description: hall.description || "",
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = { ...form, capacity: parseInt(form.capacity) || 0, parkingCount: parseInt(form.parkingCount) || 0 };
    if (editHall) {
      await fetch(`/api/halls/${editHall.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/halls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }
    setShowModal(false);
    setEditHall(null);
    setForm({ name: "", capacity: "", hasAc: false, parkingCount: "0", stageSize: "", stageType: "", cateringRule: "outside_allowed", hasGeneratorBackup: false, hasBridalRoom: false, hasProjector: false, hasAv: false, isAccessible: false, description: "" });
    await fetchHalls();
    setSubmitting(false);
  };

  const toggleBookable = async (hall: Hall) => {
    const res = await fetch(`/api/halls/${hall.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isBookable: !hall.isBookable }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error);
    else await fetchHalls();
  };

  const Amenity = ({ label, value }: { label: string; value: boolean }) => (
    <div className="flex items-center gap-1.5 text-xs">
      {value ? <CheckCircle2 size={13} className="text-emerald-500" /> : <XCircle size={13} className="text-slate-300" />}
      <span className={value ? "text-slate-700" : "text-slate-400"}>{label}</span>
    </div>
  );

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Halls & Venue Setup</h1>
            <p className="text-sm text-slate-500">{halls.length} halls configured</p>
          </div>
          <Button onClick={() => { setEditHall(null); setShowModal(true); }}>
            <Plus size={16} /> Add Hall
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-64" />
            ))}
          </div>
        ) : halls.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Building2 size={48} className="mx-auto mb-3 opacity-30" />
            <p>No halls configured yet</p>
            <Button className="mt-4" onClick={() => setShowModal(true)}>Add First Hall</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {halls.map((hall) => (
              <Card key={hall.id} padding={false} className="overflow-hidden">
                {/* Photo */}
                {hall.photos?.[0] && (
                  <div className="relative h-48">
                    <img
                      src={hall.photos.find(p => p.isPrimary)?.url || hall.photos[0].url}
                      alt={hall.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3 flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${hall.isBookable ? "bg-emerald-500 text-white" : "bg-slate-700 text-slate-200"}`}>
                        {hall.isBookable ? "Bookable" : "Not Bookable"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">{hall.name}</h3>
                      {hall.description && <p className="text-sm text-slate-500 mt-0.5">{hall.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(hall)}>
                        <Edit2 size={14} />
                      </Button>
                      <button
                        onClick={() => toggleBookable(hall)}
                        className={`p-1.5 rounded-lg transition-colors ${hall.isBookable ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"}`}
                        title={hall.isBookable ? "Disable booking" : "Enable booking"}
                      >
                        {hall.isBookable ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-1.5 text-sm text-slate-600">
                      <Users size={14} className="text-slate-400" /> {hall.capacity || "—"} pax
                    </div>
                    {hall.parkingCount > 0 && (
                      <div className="flex items-center gap-1.5 text-sm text-slate-600">
                        <ParkingCircle size={14} className="text-slate-400" /> {hall.parkingCount} slots
                      </div>
                    )}
                    <div className="text-xs px-2 py-0.5 bg-slate-100 rounded-full text-slate-600 capitalize">
                      {hall.cateringRule?.replace(/_/g, " ")}
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <Amenity label="A/C" value={hall.hasAc} />
                    <Amenity label="Generator" value={hall.hasGeneratorBackup} />
                    <Amenity label="Bridal Room" value={hall.hasBridalRoom} />
                    <Amenity label="Projector" value={hall.hasProjector} />
                    <Amenity label="AV System" value={hall.hasAv} />
                    <Amenity label="Accessible" value={hall.isAccessible} />
                  </div>

                  {/* Pricing */}
                  {hall.pricing?.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Pricing</p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {hall.pricing.map((p) => (
                          <div key={p.id} className="flex justify-between text-xs bg-slate-50 rounded-lg px-3 py-1.5">
                            <span className="text-slate-600">{sessionTypeLabel(p.sessionType)}</span>
                            <span className="font-semibold text-slate-900">{formatCurrency(p.baseRate)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Packages */}
                  {hall.packages?.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Packages</p>
                      <div className="space-y-1">
                        {hall.packages.map((pkg) => (
                          <div key={pkg.id} className="flex justify-between text-xs bg-indigo-50 rounded-lg px-3 py-1.5">
                            <span className="text-indigo-700 font-medium">{pkg.name}</span>
                            <span className="font-semibold text-indigo-900">{formatCurrency(pkg.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bookable Requirements */}
                  {!hall.isBookable && (
                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-700">
                      <strong>To make bookable:</strong> Add capacity, at least one pricing rule, and one photo.
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Hall Form Modal */}
      <Modal
        open={showModal}
        onClose={() => { setShowModal(false); setEditHall(null); }}
        title={editHall ? "Edit Hall" : "Add New Hall"}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>{editHall ? "Update Hall" : "Create Hall"}</Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-4">
          <Input label="Hall Name" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Capacity (pax)" type="number" value={form.capacity} onChange={(e) => setForm(f => ({ ...f, capacity: e.target.value }))} />
          <Input label="Parking Slots" type="number" value={form.parkingCount} onChange={(e) => setForm(f => ({ ...f, parkingCount: e.target.value }))} />
          <Select
            label="Catering Rule"
            value={form.cateringRule}
            onChange={(e) => setForm(f => ({ ...f, cateringRule: e.target.value }))}
            options={[
              { value: "in_house_only", label: "In-house Only" },
              { value: "outside_allowed", label: "Outside Allowed" },
            ]}
          />
          <Input label="Stage Size" placeholder="e.g. 30x20 ft" value={form.stageSize} onChange={(e) => setForm(f => ({ ...f, stageSize: e.target.value }))} />
          <Input label="Stage Type" placeholder="e.g. Elevated, Open" value={form.stageType} onChange={(e) => setForm(f => ({ ...f, stageType: e.target.value }))} />
          <div className="col-span-2">
            <Textarea label="Description" value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>

          {/* Amenities */}
          <div className="col-span-2">
            <p className="text-sm font-medium text-slate-700 mb-3">Amenities</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { key: "hasAc", label: "Air Conditioning" },
                { key: "hasGeneratorBackup", label: "Generator Backup" },
                { key: "hasBridalRoom", label: "Bridal Room" },
                { key: "hasProjector", label: "Projector" },
                { key: "hasAv", label: "AV System" },
                { key: "isAccessible", label: "Accessible (Disabled)" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
