"use client";

import { useEffect, useState, useCallback } from "react";
import AppShell from "@/components/layout/AppShell";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import Badge from "@/components/ui/Badge";
import { formatCurrency, formatDate, capitalize } from "@/lib/utils";
import { Plus, TrendingDown, Download, Receipt } from "lucide-react";

interface Expense {
  id: number;
  category: string;
  description: string;
  amount: string;
  expenseDate: string;
  isRecurring: boolean;
  frequency: string;
  bookingId: number | null;
}

const CATEGORIES = [
  { value: "electricity", label: "Electricity" },
  { value: "salaries", label: "Salaries" },
  { value: "property_tax", label: "Property Tax" },
  { value: "maintenance", label: "Maintenance" },
  { value: "marketing", label: "Marketing" },
  { value: "other", label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  electricity: "bg-yellow-100 text-yellow-800",
  salaries: "bg-blue-100 text-blue-800",
  property_tax: "bg-purple-100 text-purple-800",
  maintenance: "bg-orange-100 text-orange-800",
  marketing: "bg-green-100 text-green-800",
  other: "bg-slate-100 text-slate-800",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState({
    category: "other", description: "", amount: "",
    expenseDate: new Date().toISOString().split("T")[0],
    isRecurring: false, frequency: "",
  });

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const params = categoryFilter !== "all" ? `?category=${categoryFilter}` : "";
    const res = await fetch(`/api/expenses${params}`);
    if (res.ok) {
      const data = await res.json();
      setExpenses(data.expenses || []);
      setTotal(data.total || "0");
    }
    setLoading(false);
  }, [categoryFilter]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const handleSubmit = async () => {
    setSubmitting(true);
    await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowModal(false);
    setForm({ category: "other", description: "", amount: "", expenseDate: new Date().toISOString().split("T")[0], isRecurring: false, frequency: "" });
    await fetchExpenses();
    setSubmitting(false);
  };

  const byCategory = expenses.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] || 0) + parseFloat(e.amount || "0");
    return acc;
  }, {});

  const exportCSV = () => {
    const headers = ["Date", "Category", "Description", "Amount", "Recurring"];
    const rows = expenses.map(e => [e.expenseDate, e.category, e.description, e.amount, e.isRecurring ? "Yes" : "No"]);
    const csv = [headers, ...rows].map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    a.click();
  };

  return (
    <AppShell>
      <div className="p-6 max-w-screen-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Expense Management</h1>
            <p className="text-sm text-slate-500">Total: {formatCurrency(total)}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={exportCSV}>
              <Download size={16} /> Export CSV
            </Button>
            <Button onClick={() => setShowModal(true)}>
              <Plus size={16} /> Add Expense
            </Button>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="col-span-1">
            <CardHeader><CardTitle>By Category</CardTitle></CardHeader>
            <div className="space-y-3">
              {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, amount]) => {
                const pct = parseFloat(String(total)) > 0 ? Math.round((amount / parseFloat(String(total))) * 100) : 0;
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-700 capitalize">{cat.replace("_", " ")}</span>
                      <span className="font-semibold">{formatCurrency(amount)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full">
                      <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="col-span-2">
            {/* Filter */}
            <div className="flex gap-2 mb-4 flex-wrap">
              <button
                onClick={() => setCategoryFilter("all")}
                className={`px-3 py-1.5 rounded-full text-sm font-medium ${categoryFilter === "all" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
              >
                All
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategoryFilter(c.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium ${categoryFilter === c.value ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Expenses Table */}
            <Card padding={false}>
              <div className="overflow-y-auto max-h-[400px]">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-slate-200">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Date</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Category</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase">Description</th>
                      <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 4 }).map((_, j) => (
                            <td key={j} className="px-4 py-3">
                              <div className="h-4 bg-slate-100 rounded animate-pulse" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : expenses.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-5 py-10 text-center text-slate-400">No expenses found</td>
                      </tr>
                    ) : (
                      expenses.map((e) => (
                        <tr key={e.id} className="hover:bg-slate-50">
                          <td className="px-5 py-3 text-slate-700">{formatDate(e.expenseDate)}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CATEGORY_COLORS[e.category] || "bg-slate-100 text-slate-700"}`}>
                              {e.category.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-slate-900">{e.description}</div>
                            {e.isRecurring && (
                              <div className="text-xs text-indigo-600">🔄 {e.frequency}</div>
                            )}
                            {e.bookingId && (
                              <div className="text-xs text-slate-500">Booking #{e.bookingId}</div>
                            )}
                          </td>
                          <td className="px-5 py-3 text-right font-semibold text-red-600">{formatCurrency(e.amount)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title="Add Expense"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button onClick={handleSubmit} loading={submitting}>Add Expense</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Category" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} options={CATEGORIES} />
          <Textarea label="Description" required rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} />
          <Input label="Amount (₹)" type="number" required value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
          <Input label="Expense Date" type="date" value={form.expenseDate} onChange={(e) => setForm(f => ({ ...f, expenseDate: e.target.value }))} />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm(f => ({ ...f, isRecurring: e.target.checked }))} className="w-4 h-4 rounded text-indigo-600" />
            <span className="text-sm text-slate-700">Recurring expense</span>
          </label>
          {form.isRecurring && (
            <Select label="Frequency" value={form.frequency} onChange={(e) => setForm(f => ({ ...f, frequency: e.target.value }))}
              options={[
                { value: "monthly", label: "Monthly" },
                { value: "quarterly", label: "Quarterly" },
                { value: "yearly", label: "Yearly" },
              ]}
              placeholder="Select frequency"
            />
          )}
        </div>
      </Modal>
    </AppShell>
  );
}
