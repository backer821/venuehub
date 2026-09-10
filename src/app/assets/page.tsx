"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, Boxes, DollarSign, Package } from "lucide-react";

interface Asset {
  id: number;
  name: string;
  category: string;
  totalQuantity: number;
  availableQuantity: number;
  purchaseDate: string;
  purchaseCost: string;
  condition: string;
  notes: string;
}

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "", category: "", totalQuantity: "1", purchaseDate: "", purchaseCost: "", condition: "good", notes: "",
  });

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/assets");
    if (res.ok) setAssets((await res.json()).assets || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAssets(); }, [fetchAssets]);

  const handleSubmit = async () => {
    setSubmitting(true);
    await fetch("/api/assets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, totalQuantity: parseInt(form.totalQuantity) }),
    });
    setShowModal(false);
    setForm({ name: "", category: "", totalQuantity: "1", purchaseDate: "", purchaseCost: "", condition: "good", notes: "" });
    await fetchAssets();
    setSubmitting(false);
  };

  const byCategory = assets.reduce((acc: Record<string, Asset[]>, asset) => {
    const cat = asset.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(asset);
    return acc;
  }, {});

  const totalValue = assets.reduce((s, a) => s + parseFloat(a.purchaseCost || "0"), 0);

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Assets & Inventory</h1>
            <p className="text-sm text-slate-500">{assets.length} assets tracked · Total value: {formatCurrency(totalValue)}</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus size={16} /> Add Asset
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Assets", value: assets.length, icon: Boxes, color: "text-indigo-600", bg: "bg-indigo-50" },
            { label: "Total Value", value: formatCurrency(totalValue), icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Excellent/Good", value: assets.filter(a => ["excellent", "good"].includes(a.condition)).length, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Needs Attention", value: assets.filter(a => ["fair", "poor"].includes(a.condition)).length, icon: Package, color: "text-orange-600", bg: "bg-orange-50" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bg-white border border-slate-200 rounded-xl p-4">
                <div className={`w-8 h-8 ${item.bg} rounded-lg flex items-center justify-center mb-2`}>
                  <Icon size={16} className={item.color} />
                </div>
                <div className="text-xl font-bold text-slate-900">{item.value}</div>
                <div className="text-xs text-slate-500">{item.label}</div>
              </div>
            );
          })}
        </div>

        {/* Assets by Category */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-200 p-5 animate-pulse h-32" />
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {Object.entries(byCategory).map(([category, categoryAssets]) => (
              <Card key={category} padding={false}>
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 rounded-t-xl">
                  <h3 className="font-semibold text-slate-900">{category}</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Asset</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Total Qty</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Available</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Condition</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Purchase Date</th>
                        <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {categoryAssets.map((asset) => (
                        <tr key={asset.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3">
                            <p className="font-medium text-slate-900">{asset.name}</p>
                            {asset.notes && <p className="text-xs text-slate-500">{asset.notes}</p>}
                          </td>
                          <td className="px-4 py-3 text-center font-semibold">{asset.totalQuantity}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-semibold ${asset.availableQuantity < asset.totalQuantity ? "text-orange-600" : "text-emerald-600"}`}>
                              {asset.availableQuantity}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge label={asset.condition} status={
                              asset.condition === "excellent" ? "confirmed" :
                              asset.condition === "good" ? "active" :
                              asset.condition === "fair" ? "tentative" : "cancelled"
                            } />
                          </td>
                          <td className="px-4 py-3 text-slate-600">{formatDate(asset.purchaseDate)}</td>
                          <td className="px-5 py-3 text-right font-medium text-slate-900">{formatCurrency(asset.purchaseCost)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Asset"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Add Asset</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Asset Name" required value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} />
          <Input label="Category" placeholder="Furniture, AV Equipment, Power..." value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} />
          <Input label="Total Quantity" type="number" min="1" value={form.totalQuantity} onChange={(e) => setForm(f => ({ ...f, totalQuantity: e.target.value }))} />
          <Input label="Purchase Date" type="date" value={form.purchaseDate} onChange={(e) => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
          <Input label="Purchase Cost (₹)" type="number" value={form.purchaseCost} onChange={(e) => setForm(f => ({ ...f, purchaseCost: e.target.value }))} />
          <Select
            label="Condition"
            value={form.condition}
            onChange={(e) => setForm(f => ({ ...f, condition: e.target.value }))}
            options={[
              { value: "excellent", label: "Excellent" },
              { value: "good", label: "Good" },
              { value: "fair", label: "Fair" },
              { value: "poor", label: "Poor" },
            ]}
          />
        </div>
      </Modal>
    </AppShell>
  );
}
