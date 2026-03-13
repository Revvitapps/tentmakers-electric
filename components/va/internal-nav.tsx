"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function InternalNav({ role, followUpsDue }: { role: "VA" | "Joe"; followUpsDue: number }) {
  const pathname = usePathname();
  const visibleItems =
    role === "Joe"
      ? [
          { href: "/owner", label: "Owner Dashboard" },
          { href: "/admin", label: "VA Dashboard" },
          { href: "/sf-dashboard", label: "Financial View" },
        ]
      : [{ href: "/admin", label: "Admin Dashboard" }, { href: "/dashboard", label: "Pipeline View" }];

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white/95 p-2 shadow-soft backdrop-blur">
      <div className="flex flex-wrap items-center gap-2">
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 transition",
                active ? "bg-zinc-900 text-zinc-100" : "hover:bg-zinc-100"
              )}
            >
              {item.label}
            </Link>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="rounded-full border-zinc-300 bg-zinc-50 px-3 py-1 text-zinc-700">
            Role: {role}
          </Badge>
          <Badge className="rounded-full bg-rose-600 px-3 py-1 text-white">Due: {followUpsDue}</Badge>
        </div>
      </div>
    </div>
  );
}
