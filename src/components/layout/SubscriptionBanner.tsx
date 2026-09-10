"use client";

import { useAuth } from "@/context/AuthContext";
import { AlertTriangle, X, ExternalLink } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function SubscriptionBanner() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!user || dismissed) return null;
  if (!["overdue", "blocked", "suspended"].includes(user.subscriptionStatus || "")) return null;

  const isOwner = user.role === "owner";
  const isBlocked = user.subscriptionStatus === "blocked" || user.subscriptionStatus === "suspended";

  return (
    <div className={`border-b px-4 py-2.5 flex items-center gap-3 text-sm ${
      isBlocked
        ? "bg-red-50 border-red-200 text-red-800"
        : "bg-orange-50 border-orange-200 text-orange-800"
    }`}>
      <AlertTriangle size={16} className="shrink-0" />
      <div className="flex-1">
        {isOwner ? (
          <span>
            <strong>Subscription {user.subscriptionStatus}:</strong> New booking creation is paused.{" "}
            <Link href="/subscription" className="underline font-medium hover:opacity-80 inline-flex items-center gap-1">
              View billing details & resolve <ExternalLink size={12} />
            </Link>
          </span>
        ) : (
          <span>
            New bookings are temporarily unavailable. Please contact your venue owner to resolve this.
          </span>
        )}
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="p-0.5 rounded hover:bg-black/10"
      >
        <X size={14} />
      </button>
    </div>
  );
}
