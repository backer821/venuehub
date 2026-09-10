"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { MapPin, Eye, EyeOff, Loader2 } from "lucide-react";

// Deterministic pseudo-random values so server and client render identically (no hydration mismatch).
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const decorativeCircles = Array.from({ length: 20 }, (_, i) => ({
  key: i,
  width: seededRandom(i) * 200 + 50,
  height: seededRandom(i + 100) * 200 + 50,
  left: `${seededRandom(i + 200) * 100}%`,
  top: `${seededRandom(i + 300) * 100}%`,
  opacity: seededRandom(i + 400) * 0.3,
}));

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = await login(identifier, password);
    if (result.error) {
      setError(result.error);
    } else {
      router.replace("/dashboard");
    }
    setLoading(false);
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const res = await fetch("/api/seed", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setIdentifier("owner@grandcelebration.com");
        setPassword("password123");
        alert("✅ Demo data seeded! Credentials filled in. Click Login.");
      } else {
        alert("Seed failed: " + data.error);
      }
    } catch {
      alert("Seed failed");
    }
    setSeeding(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-900 via-indigo-800 to-slate-900 flex-col items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          {decorativeCircles.map((c) => (
            <div
              key={c.key}
              className="absolute rounded-full bg-white"
              style={{
                width: c.width,
                height: c.height,
                left: c.left,
                top: c.top,
                opacity: c.opacity,
              }}
            />
          ))}
        </div>
        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-6 backdrop-blur-sm border border-white/20">
            <MapPin size={36} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">VenueHub</h1>
          <p className="text-indigo-200 text-lg mb-10">Complete Venue Management Platform</p>
          <div className="grid grid-cols-2 gap-4 text-left max-w-sm mx-auto">
            {[
              ["📅", "Booking Management", "Full calendar with status tracking"],
              ["💰", "Billing & GST", "Invoicing with payment tracking"],
              ["👥", "Staff & Assets", "Complete operations management"],
              ["📊", "Reports", "Revenue, occupancy & more"],
            ].map(([icon, title, desc]) => (
              <div key={title} className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                <div className="text-2xl mb-2">{icon}</div>
                <div className="text-white font-semibold text-sm">{title}</div>
                <div className="text-indigo-300 text-xs mt-1">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <MapPin size={20} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-slate-900">VenueHub</p>
              <p className="text-xs text-slate-500">Venue Management Platform</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
          <p className="text-slate-500 mb-8">Sign in to your venue dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email or Phone
              </label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="owner@venue.com or 9876543210"
                className="w-full px-4 py-3 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 pr-12 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-200">
            <p className="text-sm text-slate-500 mb-3 text-center">Demo Accounts (after seeding)</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {[
                { label: "Owner", email: "owner@grandcelebration.com" },
                { label: "Manager", email: "manager@grandcelebration.com" },
                { label: "Accountant", email: "accounts@grandcelebration.com" },
                { label: "Staff", email: "staff@grandcelebration.com" },
              ].map((acc) => (
                <button
                  key={acc.label}
                  onClick={() => { setIdentifier(acc.email); setPassword("password123"); }}
                  className="text-left px-3 py-2 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 rounded-lg transition-colors"
                >
                  <div className="text-xs font-medium text-slate-700">{acc.label}</div>
                  <div className="text-xs text-slate-400 truncate">{acc.email}</div>
                </button>
              ))}
            </div>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="w-full py-2.5 border border-indigo-300 text-indigo-700 hover:bg-indigo-50 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {seeding && <Loader2 size={16} className="animate-spin" />}
              {seeding ? "Seeding demo data..." : "🌱 Seed Demo Data"}
            </button>
            <p className="text-xs text-slate-400 text-center mt-2">
              Password for all demo accounts: <code className="bg-slate-100 px-1 rounded">password123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
