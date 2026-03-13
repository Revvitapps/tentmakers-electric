"use client";

import Link from "next/link";
import { type ChangeEvent, type ReactNode, useMemo, useState, useTransition } from "react";
import Papa from "papaparse";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  createLeadAction,
  importLeadsFromCsvAction,
  markDepositPaidAction,
  markEstimateSentAction,
  scheduleAppointmentAction,
} from "@/app/actions/leads";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_SOURCES, LEAD_STAGES } from "@/lib/constants";
import { calculateRequiredStopsScore, followUpLockMissing, getSopHealthLabel, hasEstimateCloseGap } from "@/lib/sop";
import type { LeadWithStops, Profile } from "@/lib/types";
import { createLeadSchema } from "@/lib/validators/lead";

type DashboardProps = {
  leads: LeadWithStops[];
  followUpsDue: LeadWithStops[];
  assignees: Pick<Profile, "id" | "full_name" | "role">[];
  kpis: {
    total: number;
    estimates: number;
    deposits: number;
    scheduled: number;
    followupsDue: number;
    closeRate: number;
  };
};

const sourceFilterOptions = ["all", ...LEAD_SOURCES] as const;
const stageFilterOptions = ["all", ...LEAD_STAGES] as const;

type SourceFilter = (typeof sourceFilterOptions)[number];
type StageFilter = (typeof stageFilterOptions)[number];

function healthClass(score: number) {
  const tone = getSopHealthLabel(score);

  if (tone === "Green") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (tone === "Yellow") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  return "border-rose-200 bg-rose-50 text-rose-700";
}

export function DashboardView({ leads, kpis, assignees, followUpsDue }: DashboardProps) {
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [source, setSource] = useState<SourceFilter>("all");
  const [stage, setStage] = useState<StageFilter>("all");
  const [assignedTo, setAssignedTo] = useState<string>("all");
  const [selectedLead, setSelectedLead] = useState<LeadWithStops | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        if (!query.trim()) return true;

        const haystack = [lead.name, lead.phone, lead.email ?? "", lead.address, lead.job_type]
          .join(" ")
          .toLowerCase();

        return haystack.includes(query.trim().toLowerCase());
      })
      .filter((lead) => (source === "all" ? true : lead.source === source))
      .filter((lead) => (stage === "all" ? true : lead.stage === stage))
      .filter((lead) => {
        if (assignedTo === "all") return true;
        return lead.assigned_to === assignedTo;
      });
  }, [assignedTo, leads, query, source, stage]);

  function runLeadAction(action: () => Promise<{ ok: boolean; message: string }>, successMessage: string) {
    startTransition(async () => {
      const result = await action();

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(successMessage);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 md:text-3xl">Sales + Intake Dashboard</h1>
          <p className="text-sm text-zinc-600">Run the checklist, lock follow-ups, and prevent floating leads.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <CreateLeadDialog assignees={assignees} />
          <CsvImportDialog />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Leads" value={kpis.total} hint="Active pipeline volume" />
        <KpiCard title="Estimates Sent" value={kpis.estimates} hint="Required stop complete" />
        <KpiCard title="Deposits Paid" value={kpis.deposits} hint="Revenue commitment" />
        <KpiCard title="Scheduled" value={kpis.scheduled} hint="Appointment secured" />
        <KpiCard title="Follow-ups Due" value={kpis.followupsDue} hint="Needs touch today" />
      </section>

      <section>
        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Follow-ups Due</CardTitle>
          </CardHeader>
          <CardContent>
            {followUpsDue.length === 0 ? (
              <p className="text-sm text-zinc-600">No follow-ups are currently due.</p>
            ) : (
              <div className="space-y-2">
                {followUpsDue.slice(0, 6).map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 transition hover:bg-rose-100"
                  >
                    <span className="font-medium">{lead.name}</span>
                    <span>
                      Due: {lead.next_touch_at ? new Date(lead.next_touch_at).toLocaleString() : "Now"}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
          <CardHeader className="gap-3 md:flex-row md:items-center md:justify-between">
            <CardTitle className="text-base">Leads</CardTitle>

            <div className="grid w-full gap-2 md:w-auto md:grid-cols-[220px_160px_170px_170px]">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, phone, address..."
                className="rounded-xl"
              />

              <Select value={source} onValueChange={(value) => setSource(value as SourceFilter)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sources</SelectItem>
                  {LEAD_SOURCES.map((leadSource) => (
                    <SelectItem key={leadSource} value={leadSource}>
                      {leadSource}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={stage} onValueChange={(value) => setStage(value as StageFilter)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All stages</SelectItem>
                  {LEAD_STAGES.map((leadStage) => (
                    <SelectItem key={leadStage} value={leadStage}>
                      {leadStage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All assignees</SelectItem>
                  {assignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Lead</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>SOP</TableHead>
                  <TableHead>Next Touch</TableHead>
                  <TableHead>Assigned</TableHead>
                  <TableHead>Outcome</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => {
                  const sopScore = calculateRequiredStopsScore(lead.required_stops);
                  const estimateGap = hasEstimateCloseGap(lead.required_stops);
                  const followUpMissing = followUpLockMissing(lead.stage, lead.next_touch_at);

                  return (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium text-zinc-900">{lead.name}</div>
                          <div className="text-xs text-zinc-500">{lead.job_type}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="rounded-full">
                          {lead.source}
                        </Badge>
                      </TableCell>
                      <TableCell>{lead.stage}</TableCell>
                      <TableCell>
                        <Badge className={`rounded-full border ${healthClass(sopScore)}`}>{sopScore}%</Badge>
                      </TableCell>
                      <TableCell>{lead.next_touch_at ? new Date(lead.next_touch_at).toLocaleString() : "-"}</TableCell>
                      <TableCell>{lead.assigned_profile?.full_name ?? "Unassigned"}</TableCell>
                      <TableCell>{lead.outcome ?? "Floating"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isPending}
                            onClick={() =>
                              runLeadAction(
                                async () => markEstimateSentAction({ leadId: lead.id }),
                                "Estimate marked sent."
                              )
                            }
                          >
                            Estimate
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={isPending}
                            onClick={() =>
                              runLeadAction(
                                async () => scheduleAppointmentAction({ leadId: lead.id }),
                                "Appointment scheduled."
                              )
                            }
                          >
                            Schedule
                          </Button>
                          <Button
                            size="sm"
                            disabled={isPending}
                            onClick={() =>
                              runLeadAction(async () => markDepositPaidAction({ leadId: lead.id }), "Deposit marked paid.")
                            }
                          >
                            Deposit
                          </Button>
                        </div>

                        {estimateGap || followUpMissing ? (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs text-amber-800">
                            SOP warning
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {filteredLeads.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-sm text-zinc-500">
                      No leads match your current filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Dialog open={Boolean(selectedLead)} onOpenChange={(open) => (!open ? setSelectedLead(null) : null)}>
        <DialogContent className="max-w-xl rounded-3xl">
          {selectedLead ? (
            <>
              <DialogHeader>
                <DialogTitle>{selectedLead.name}</DialogTitle>
                <DialogDescription>{selectedLead.address}</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 text-zinc-700">
                  <div>Phone: {selectedLead.phone}</div>
                  <div>Email: {selectedLead.email || "-"}</div>
                  <div>Stage: {selectedLead.stage}</div>
                  <div>Source: {selectedLead.source}</div>
                </div>

                {hasEstimateCloseGap(selectedLead.required_stops) ? (
                  <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                    <AlertTitle>Estimate sent without close steps.</AlertTitle>
                    <AlertDescription>Ensure both date options and deposit ask are documented.</AlertDescription>
                  </Alert>
                ) : null}

                {followUpLockMissing(selectedLead.stage, selectedLead.next_touch_at) ? (
                  <Alert className="border-rose-200 bg-rose-50 text-rose-900">
                    <AlertTitle>Follow-up not locked.</AlertTitle>
                    <AlertDescription>
                      Stage is {selectedLead.stage}. Lock a day and time so this lead cannot float.
                    </AlertDescription>
                  </Alert>
                ) : null}
              </div>

              <DialogFooter>
                <Button asChild variant="outline">
                  <Link href={`/leads/${selectedLead.id}`}>Open Lead Workspace</Link>
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function KpiCard({ title, value, hint }: { title: string; value: number; hint: string }) {
  return (
    <Card className="rounded-3xl border-zinc-200/90 bg-white/95 shadow-soft">
      <CardContent className="space-y-1 p-5">
        <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
        <p className="text-3xl font-semibold text-zinc-900">{value}</p>
        <p className="text-xs text-zinc-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

function CreateLeadDialog({ assignees }: { assignees: Pick<Profile, "id" | "full_name" | "role">[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      source: "Other",
      jobType: "",
      stage: "First Contact",
      notes: "",
      assignedTo: "",
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await createLeadAction(values);

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success("Lead created.");
      setOpen(false);
      form.reset();
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl">
          New Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle>Create Lead</DialogTitle>
          <DialogDescription>Capture complete intake and assign ownership immediately.</DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Name">
              <Input {...form.register("name")} placeholder="Homeowner name" />
            </Field>
            <Field label="Phone">
              <Input {...form.register("phone")} placeholder="(555) 555-5555" />
            </Field>
            <Field label="Email">
              <Input {...form.register("email")} placeholder="email@example.com" />
            </Field>
            <Field label="Address">
              <Input {...form.register("address")} placeholder="123 Main St" />
            </Field>
            <Field label="Source">
              <Select value={form.watch("source")} onValueChange={(value) => form.setValue("source", value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_SOURCES.map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Stage">
              <Select value={form.watch("stage")} onValueChange={(value) => form.setValue("stage", value as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STAGES.map((leadStage) => (
                    <SelectItem key={leadStage} value={leadStage}>
                      {leadStage}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Job Type">
              <Input {...form.register("jobType")} placeholder="EV charger, generator, panel, etc" />
            </Field>
            <Field label="Assign To">
              <Select
                value={form.watch("assignedTo") || "none"}
                onValueChange={(value) => form.setValue("assignedTo", value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {assignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      {assignee.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Notes">
            <Textarea {...form.register("notes")} placeholder="Scope, urgency, objections, constraints..." />
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Create Lead"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CsvImportDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function parseCsv(file: File): Promise<Array<Record<string, string>>> {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: any) => {
          if (results.errors.length > 0) {
            reject(new Error(results.errors[0]?.message || "CSV parse error"));
            return;
          }

          resolve((results.data ?? []) as Array<Record<string, string>>);
        },
        error: (error: any) => reject(error),
      });
    });
  }

  function getValue(row: Record<string, string>, keys: string[]) {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && `${row[key]}`.trim() !== "") {
        return `${row[key]}`.trim();
      }
    }

    return "";
  }

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    startTransition(async () => {
      try {
        const parsedRows = await parseCsv(file);

        const rows = parsedRows
          .map((row) => ({
            name: getValue(row, ["name", "Name", "full_name", "Full Name"]),
            phone: getValue(row, ["phone", "Phone", "mobile", "Mobile"]),
            email: getValue(row, ["email", "Email"]),
            address: getValue(row, ["address", "Address"]),
            source: getValue(row, ["source", "Source"]),
            jobType: getValue(row, ["jobType", "Job Type", "job_type", "JobType"]),
            createdAt: getValue(row, ["createdAt", "Created At", "created_at"]),
          }))
          .filter((row) => row.name && row.phone && row.address && row.jobType);

        if (rows.length === 0) {
          toast.error("No valid rows found. Required columns: name, phone, address, jobType.");
          return;
        }

        const result = await importLeadsFromCsvAction({ rows });

        if (!result.ok) {
          toast.error(result.message);
          return;
        }

        toast.success(result.message);
        setOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Import failed.");
      } finally {
        event.target.value = "";
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="rounded-xl">
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl rounded-3xl">
        <DialogHeader>
          <DialogTitle>CSV Import</DialogTitle>
          <DialogDescription>
            Upload rows with name, phone, email, address, source, jobType, createdAt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Alert className="border-zinc-200 bg-zinc-50">
            <AlertTitle>Source mapping</AlertTitle>
            <AlertDescription>
              Unknown source values are safely mapped to <strong>Other</strong>.
            </AlertDescription>
          </Alert>

          <Label htmlFor="csv-file" className="text-sm font-medium">
            CSV file
          </Label>
          <Input id="csv-file" type="file" accept=".csv,text/csv" onChange={onFileChange} disabled={isPending} />

          <p className="text-xs text-zinc-500">
            Example headers: <code>name, phone, email, address, source, jobType, createdAt</code>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
