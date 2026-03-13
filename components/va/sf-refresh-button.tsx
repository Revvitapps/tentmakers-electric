"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

export function SfRefreshButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  async function handleRefresh() {
    setStatus("idle");
    try {
      const response = await fetch("/api/sf/dashboard-refresh", { method: "POST" });
      if (!response.ok) throw new Error("Refresh failed");
      setStatus("ok");
      startTransition(() => {
        router.refresh();
      });
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={handleRefresh} disabled={isPending}>
        {isPending ? "Pulling..." : "Pull SF Now"}
      </Button>
      {status === "ok" ? <span className="text-xs text-emerald-700">Updated</span> : null}
      {status === "error" ? <span className="text-xs text-rose-700">Failed</span> : null}
    </div>
  );
}

