import { cn, getStatusColor } from "@/lib/utils";

interface BadgeProps {
  label: string;
  status?: string;
  className?: string;
  size?: "sm" | "md";
}

export default function Badge({ label, status, className, size = "sm" }: BadgeProps) {
  const colorClass = status ? getStatusColor(status) : "bg-slate-100 text-slate-700";

  return (
    <span
      className={cn(
        "inline-flex items-center font-medium rounded-full capitalize",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        colorClass,
        className
      )}
    >
      {label}
    </span>
  );
}
