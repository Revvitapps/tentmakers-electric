"use client";

import { type ReactNode, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { deleteScriptTemplateAction, upsertScriptTemplateAction } from "@/app/actions/scripts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ScriptTemplate } from "@/lib/types";

type ScriptsViewProps = {
  scripts: ScriptTemplate[];
  role: "VA" | "Joe";
};

const defaultNewScript = {
  id: "",
  templateKey: "",
  title: "",
  body: "",
  isSystem: false,
};

export function ScriptsView({ scripts, role }: ScriptsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedId, setSelectedId] = useState<string>(scripts[0]?.id ?? "new");
  const [draft, setDraft] = useState(defaultNewScript);

  const orderedScripts = useMemo(
    () => [...scripts].sort((a, b) => Number(b.is_system) - Number(a.is_system) || a.title.localeCompare(b.title)),
    [scripts]
  );

  function openScript(script: ScriptTemplate) {
    setSelectedId(script.id);
    setDraft({
      id: script.id,
      templateKey: script.template_key,
      title: script.title,
      body: script.body,
      isSystem: script.is_system,
    });
  }

  function openNewScript() {
    setSelectedId("new");
    setDraft(defaultNewScript);
  }

  if (role !== "Joe") {
    return (
      <div className="space-y-4">
        <header>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">Script Library</h1>
          <p className="text-sm text-zinc-600">Copy standard SOP scripts with one click.</p>
        </header>

        <div className="grid gap-3">
          {orderedScripts.map((script) => (
            <ReadOnlyScriptCard key={script.id} title={script.title} body={script.body} isSystem={script.is_system} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">Script Library</h1>
          <p className="text-sm text-zinc-600">Manage SOP templates for VAs and owner communication standards.</p>
        </div>

        <Button onClick={openNewScript} className="rounded-xl">
          New template
        </Button>
      </header>

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Templates</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {orderedScripts.map((script) => (
              <button
                key={script.id}
                type="button"
                onClick={() => openScript(script)}
                className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                  selectedId === script.id ? "border-zinc-800 bg-zinc-900 text-zinc-50" : "border-zinc-200 bg-white hover:bg-zinc-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{script.title}</span>
                  {script.is_system ? <Badge className="rounded-full bg-zinc-100 text-zinc-700">System</Badge> : null}
                </div>
                <p className={`mt-1 text-xs ${selectedId === script.id ? "text-zinc-200" : "text-zinc-500"}`}>{script.template_key}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader>
            <CardTitle className="text-base">Editor</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Template key">
                <Input
                  value={draft.templateKey}
                  onChange={(event) => setDraft((prev) => ({ ...prev, templateKey: event.target.value }))}
                  placeholder="day2_follow_up"
                />
              </Field>

              <Field label="Title">
                <Input
                  value={draft.title}
                  onChange={(event) => setDraft((prev) => ({ ...prev, title: event.target.value }))}
                  placeholder="Day 2 Follow-up"
                />
              </Field>
            </div>

            <Field label="Body">
              <Textarea
                value={draft.body}
                onChange={(event) => setDraft((prev) => ({ ...prev, body: event.target.value }))}
                placeholder="Use [Name], [Day], [Morning/Afternoon], [DepositLink] tokens."
                className="min-h-[220px]"
              />
            </Field>

            <div className="flex flex-wrap gap-2">
              <Button
                disabled={isPending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await upsertScriptTemplateAction({
                      id: draft.id || undefined,
                      templateKey: draft.templateKey,
                      title: draft.title,
                      body: draft.body,
                      isSystem: draft.isSystem,
                    });

                    if (!result.ok) {
                      toast.error(result.message);
                      return;
                    }

                    toast.success(result.message);
                    router.refresh();
                  })
                }
              >
                Save template
              </Button>

              {draft.id ? (
                <Button
                  variant="outline"
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      const result = await deleteScriptTemplateAction({ id: draft.id });

                      if (!result.ok) {
                        toast.error(result.message);
                        return;
                      }

                      toast.success(result.message);
                      openNewScript();
                      router.refresh();
                    })
                  }
                >
                  Delete
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
        <CardHeader>
          <CardTitle className="text-base">Live Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <ReadOnlyScriptCard title={draft.title || "Untitled"} body={draft.body || ""} isSystem={draft.isSystem} />
        </CardContent>
      </Card>
    </div>
  );
}

function ReadOnlyScriptCard({ title, body, isSystem }: { title: string; body: string; isSystem: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copyScript() {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
      toast.success("Script copied.");
    } catch {
      toast.error("Clipboard unavailable.");
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-200 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-900">{title}</p>
          {isSystem ? <Badge className="rounded-full bg-zinc-100 text-zinc-700">System</Badge> : null}
        </div>

        <Button size="sm" variant="secondary" onClick={copyScript}>
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>

      <pre className="mt-2 whitespace-pre-wrap text-xs text-zinc-700">{body}</pre>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-zinc-500">{label}</Label>
      {children}
    </div>
  );
}
