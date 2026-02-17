"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, FlaskConical, FolderKanban } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/runs", label: "Runs", icon: BarChart3 },
  { href: "/tests", label: "Tests", icon: FlaskConical }
];

export function Nav() {
  const pathname = usePathname();

  return (
    <aside className="panel h-fit w-full p-3 lg:w-64">
      <div className="mb-3 border-b border-slate-200 pb-3">
        <p className="text-xs uppercase tracking-wider text-slate-500">LLM Reliability Lab</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">Control Center ??</p>
      </div>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

