import { cn } from "@/lib/utils";

export function Badge({
  children,
  variant = "default"
}: {
  children: React.ReactNode;
  variant?: "default" | "success" | "danger" | "neutral";
}) {
  const classes = {
    default: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-800",
    danger: "bg-red-100 text-red-800",
    neutral: "bg-orange-100 text-orange-800"
  };

  return <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", classes[variant])}>{children}</span>;
}
