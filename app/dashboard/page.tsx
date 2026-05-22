"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useSearchParams } from "next/navigation";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { FormatProvider } from "@/contexts/FormatContext";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { type DateRange } from "react-day-picker";
import { toast } from "sonner";
import { supabase } from "@/utils/supabase";
import { fetchAllSupabaseRows } from "@/utils/supabase-fetch-all";

interface RequestItem {
  id: string;
  status: string;
  request_type: string;
  type_concern: string;
  technician_name: string;
  site: string;
  ticket_id: string;
  ticket_subject: string;
  remarks: string;
  priority: string;
  date_created?: string;
  processed_by: string;
  closed_by: string;
  department: string;
}

// ─── status meta ──────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; dot: string; desc: string }> = {
  resolved:  { label: "RESOLVED",  color: "#3b82f6", dot: "#3b82f6", desc: "Tickets successfully closed." },
  ongoing:   { label: "ONGOING",   color: "#f97316", dot: "#f97316", desc: "Currently being worked on." },
  pending:   { label: "PENDING",   color: "#eab308", dot: "#eab308", desc: "Awaiting action or information." },
  scheduled: { label: "SCHEDULED", color: "#06b6d4", dot: "#06b6d4", desc: "Planned for future resolution." },
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function KVRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2 text-[11px] font-mono">
      <span className="text-[#f97316]/60 shrink-0">{label}</span>
      <span className="flex-1 border-b border-dashed border-[#2a2a1a]" />
      <span className="text-[#e5e5d0]/70 shrink-0">{value}</span>
    </div>
  );
}

function PanelHeader({ dot, title, sub, right }: { dot?: string; title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-[rgba(255,255,255,0.06)]">
      <div className="flex items-center gap-2">
        {dot && <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: dot }} />}
        <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em]" style={{ color: dot || "#e5e5d0" }}>
          {title}
        </span>
        {sub && <span className="text-[9px] font-mono text-[#6b6b4a]/50 ml-1">{sub}</span>}
      </div>
      {right}
    </div>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────

function DashboardContent() {
  const [dateCreatedFilterRange, setDateCreatedFilterRangeAction] = React.useState<DateRange | undefined>(undefined);
  const searchParams = useSearchParams();
  const { userId, setUserId } = useUser();

  const [activities, setActivities] = useState<RequestItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [errorActivities, setErrorActivities] = useState<string | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [errorUser, setErrorUser] = useState<string | null>(null);

  const queryUserId = searchParams?.get("id") ?? "";

  useEffect(() => {
    if (queryUserId && queryUserId !== userId) setUserId(queryUserId);
  }, [queryUserId, userId, setUserId]);

  useEffect(() => {
    if (!userId) { setErrorUser("User ID is missing."); setLoadingUser(false); return; }
    const run = async () => {
      setErrorUser(null); setLoadingUser(true);
      try {
        const res = await fetch(`/api/user?id=${encodeURIComponent(userId)}`);
        if (!res.ok) throw new Error("Failed to fetch user data");
        await res.json();
        toast.success("User data loaded successfully!");
      } catch (err) {
        console.error(err);
        setErrorUser("Failed to connect to server.");
        toast.error("Failed to connect to server. Please refresh.");
      } finally { setLoadingUser(false); }
    };
    run();
  }, [userId]);

  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true); setErrorActivities(null);
    try {
      const data = await fetchAllSupabaseRows<RequestItem>("tickets", "*", { column: "date_created", ascending: false });
      setActivities(data);
    } catch (error: any) {
      setErrorActivities(error.message || "Error fetching tickets");
      toast.error(error.message || "Error fetching tickets");
    } finally { setLoadingActivities(false); }
  }, []);

  useEffect(() => { fetchActivities(); }, [fetchActivities]);

  useEffect(() => {
    const channel = supabase.channel("public:tickets")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, (payload) => {
        const n = payload.new as RequestItem;
        const o = payload.old as RequestItem;
        setActivities((curr) => {
          switch (payload.eventType) {
            case "INSERT": return curr.some((a) => a.id === n.id) ? curr : [...curr, n];
            case "UPDATE": return curr.map((a) => (a.id === n.id ? n : a));
            case "DELETE": return curr.filter((a) => a.id !== o.id);
            default: return curr;
          }
        });
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  function parseDate(s?: string) {
    if (!s) return null;
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  const filteredActivities = React.useMemo(() => {
    if (!dateCreatedFilterRange?.from && !dateCreatedFilterRange?.to) return activities;
    const from = dateCreatedFilterRange?.from?.getTime() ?? -Infinity;
    const to = dateCreatedFilterRange?.to
      ? new Date(dateCreatedFilterRange.to.getFullYear(), dateCreatedFilterRange.to.getMonth(), dateCreatedFilterRange.to.getDate(), 23, 59, 59, 999).getTime()
      : Infinity;
    return activities.filter((item) => { const d = parseDate(item.date_created); return d ? d.getTime() >= from && d.getTime() <= to : false; });
  }, [activities, dateCreatedFilterRange]);

  const grandTotal = filteredActivities.length;

  const counts = React.useMemo(() => {
    const n = (s?: string) => s?.toLowerCase() ?? "";
    return {
      resolved:  filteredActivities.filter((i) => n(i.status) === "resolved").length,
      ongoing:   filteredActivities.filter((i) => n(i.status) === "ongoing").length,
      pending:   filteredActivities.filter((i) => n(i.status) === "pending").length,
      scheduled: filteredActivities.filter((i) => n(i.status) === "scheduled").length,
    };
  }, [filteredActivities]);

  const advisoryTickets = React.useMemo(() =>
    filteredActivities.filter((i) => i.request_type === "Advisory" && i.status.toLowerCase() !== "resolved"),
    [filteredActivities]);

  const criticalTickets = React.useMemo(() =>
    filteredActivities.filter((i) => i.priority?.toLowerCase() === "critical" && i.status.toLowerCase() !== "resolved"),
    [filteredActivities]);

  const normalizeKey = (s?: string) =>
    s ? s.trim().toLowerCase().replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ").replace(/^,|,$/g, "") || "unassigned" : "unassigned";

  const formatName = (k: string) =>
    k === "unassigned" ? "Unassigned" : k.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");

  const groupedByProcessor = React.useMemo(() => {
    const g: Record<string, RequestItem[]> = {};
    for (const item of filteredActivities) { const k = normalizeKey(item.processed_by); if (!g[k]) g[k] = []; g[k].push(item); }
    return g;
  }, [filteredActivities]);

  const sortedGrouped = React.useMemo(() =>
    Object.entries(groupedByProcessor).sort(([, a], [, b]) => b.length - a.length),
    [groupedByProcessor]);

  const barChartData = React.useMemo(() =>
    sortedGrouped.map(([k, t]) => ({ processor: formatName(k), total: t.length })),
    [sortedGrouped]);

  const chartConfig = React.useMemo(() => {
    const c: Record<string, { label: string; color?: string }> = {};
    barChartData.forEach((d, i) => { c[d.processor] = { label: d.processor, color: `var(--chart-${(i % 5) + 1})` }; });
    return c satisfies ChartConfig;
  }, [barChartData]);

  const countsByDepartment = React.useMemo(() => {
    const c: Record<string, number> = {};
    for (const item of filteredActivities) { const k = item.department?.trim() || "Unknown"; c[k] = (c[k] || 0) + 1; }
    return Object.entries(c).sort(([, a], [, b]) => b - a);
  }, [filteredActivities]);

  const countsByRequestor = React.useMemo(() => {
    const c: Record<string, number> = {};
    for (const item of filteredActivities) { const k = item.closed_by?.trim() || "Unknown"; c[k] = (c[k] || 0) + 1; }
    return Object.entries(c).sort(([, a], [, b]) => b - a);
  }, [filteredActivities]);

  const PANEL_BG = "rgba(255,255,255,0.02)";
  const PANEL_BORDER = "rgba(255,255,255,0.07)";

  // ─── render ────────────────────────────────────────────────────────────────

  return (
    <>
      <SidebarLeft />
      <SidebarInset style={{ backgroundColor: "#080c10", minHeight: "100%" }}>

        {/* Header */}
        <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 px-4"
          style={{ backgroundColor: "rgba(8,12,16,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <SidebarTrigger className="text-white/40 hover:text-white/80 hover:bg-white/5" />
          <Separator orientation="vertical" className="h-3.5 mx-1" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbPage className="text-[11px] font-mono text-white/60 uppercase tracking-widest">
                  Dashboard
                </BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="ml-auto flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
            <span className="text-[9px] font-mono text-[#22c55e]/60 uppercase tracking-widest">live</span>
          </div>
        </header>

        <main className="p-5 flex flex-col gap-5" style={{ minHeight: "calc(100vh - 3rem)" }}>

          {loadingUser ? (
            <div className="flex items-center gap-2 justify-center h-32">
              <span className="w-1 h-1 bg-[#f97316] animate-bounce [animation-delay:0ms]" />
              <span className="w-1 h-1 bg-[#f97316] animate-bounce [animation-delay:150ms]" />
              <span className="w-1 h-1 bg-[#f97316] animate-bounce [animation-delay:300ms]" />
              <span className="text-[10px] font-mono text-white/30 ml-1 uppercase tracking-widest">Loading...</span>
            </div>
          ) : errorUser ? (
            <div className="border px-4 py-3 flex items-start gap-2" style={{ borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.05)" }}>
              <span className="text-[#ef4444] font-mono text-xs mt-0.5">✕</span>
              <p className="text-[11px] font-mono text-[#ef4444]/80">{errorUser}</p>
            </div>
          ) : (
            <>
              {/* Loading */}
              {loadingActivities && (
                <div className="flex items-center gap-2 justify-center py-3">
                  <span className="w-1 h-1 bg-[#06b6d4] animate-bounce [animation-delay:0ms]" />
                  <span className="w-1 h-1 bg-[#06b6d4] animate-bounce [animation-delay:150ms]" />
                  <span className="w-1 h-1 bg-[#06b6d4] animate-bounce [animation-delay:300ms]" />
                  <span className="text-[10px] font-mono text-white/30 ml-1 uppercase tracking-widest">Fetching tickets...</span>
                </div>
              )}

              {/* Alerts */}
              {advisoryTickets.length > 0 && (
                <div className="border" style={{ borderColor: "rgba(249,115,22,0.3)", backgroundColor: "rgba(249,115,22,0.04)" }}>
                  <PanelHeader dot="#f97316" title="Advisory Notice" />
                  <div className="p-4 space-y-3">
                    {advisoryTickets.map((item) => (
                      <div key={item.id} className="px-4 py-3 space-y-1.5 border" style={{ borderColor: PANEL_BORDER, backgroundColor: PANEL_BG }}>
                        <KVRow label="ticket_id" value={item.ticket_id} />
                        <KVRow label="subject" value={item.ticket_subject} />
                        <KVRow label="concern" value={item.type_concern} />
                        <KVRow label="technician" value={item.technician_name} />
                        <KVRow label="site" value={item.site} />
                        <KVRow label="remarks" value={item.remarks || "—"} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {criticalTickets.length > 0 && (
                <div className="border" style={{ borderColor: "rgba(239,68,68,0.3)", backgroundColor: "rgba(239,68,68,0.04)" }}>
                  <PanelHeader dot="#ef4444" title="Critical Priority Alert" />
                  <div className="p-4 space-y-3">
                    {criticalTickets.map((item) => (
                      <div key={item.id} className="px-4 py-3 space-y-1.5 border" style={{ borderColor: PANEL_BORDER, backgroundColor: PANEL_BG }}>
                        <KVRow label="ticket_id" value={item.ticket_id} />
                        <KVRow label="subject" value={item.ticket_subject} />
                        <KVRow label="concern" value={item.type_concern} />
                        <KVRow label="technician" value={item.technician_name} />
                        <KVRow label="site" value={item.site} />
                        <KVRow label="remarks" value={item.remarks || "—"} />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TOTAL TICKETS banner ── */}
              <div className="border p-5 flex items-end justify-between" style={{ borderColor: PANEL_BORDER, backgroundColor: PANEL_BG }}>
                <div>
                  <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/40 mb-1">Total Tickets</p>
                  <p className="text-5xl font-mono font-bold text-white leading-none">{grandTotal}</p>
                  <p className="text-[10px] font-mono text-white/30 mt-1.5">All tickets regardless of status.</p>
                </div>
                <a href="#" className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 border text-[#06b6d4] hover:bg-[#06b6d4]/10 transition-colors"
                  style={{ borderColor: "rgba(6,182,212,0.3)" }}>
                  VIEW ALL →
                </a>
              </div>

              {/* ── STATUS CARDS ── */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border" style={{ borderColor: PANEL_BORDER }}>
                {Object.entries(STATUS_META).map(([key, meta], idx) => {
                  const total = counts[key as keyof typeof counts] ?? 0;
                  const isLast = idx === Object.entries(STATUS_META).length - 1;
                  return (
                    <div
                      key={key}
                      className={`p-5 flex flex-col gap-3 ${!isLast ? "border-r" : ""}`}
                      style={{ borderColor: PANEL_BORDER, backgroundColor: PANEL_BG }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: meta.dot }} />
                        <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em]" style={{ color: meta.color }}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="text-4xl font-mono font-bold leading-none" style={{ color: meta.color }}>
                        {total}
                      </p>
                      <p className="text-[9px] font-mono text-white/30 leading-relaxed">{meta.desc}</p>
                      <a href="#" className="text-[9px] font-mono uppercase tracking-widest mt-auto" style={{ color: meta.color }}>
                        VIEW →
                      </a>
                    </div>
                  );
                })}
              </div>

              {/* ── CHARTS ROW ── */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                {/* Processed By — horizontal bar */}
                <div className="border flex flex-col" style={{ borderColor: PANEL_BORDER, backgroundColor: PANEL_BG }}>
                  <PanelHeader dot="#06b6d4" title="Tickets per Processed By" sub="Based on processor counts" />
                  <div className="p-4 flex-1">
                    <ChartContainer config={chartConfig} style={{ height: "300px", width: "100%" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barChartData} layout="vertical" margin={{ right: 32, left: 8 }}>
                          <CartesianGrid horizontal={false} stroke="rgba(255,255,255,0.04)" />
                          <YAxis dataKey="processor" type="category" tickLine={false} axisLine={false} width={140}
                            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "monospace" }} />
                          <XAxis type="number" tickLine={false} axisLine={false}
                            tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9, fontFamily: "monospace" }} />
                          <ChartTooltip content={<ChartTooltipContent nameKey="total" hideLabel />} />
                          <Bar dataKey="total" fill="#06b6d4" radius={0}>
                            <LabelList dataKey="total" position="right"
                              style={{ fill: "rgba(6,182,212,0.8)", fontSize: 10, fontFamily: "monospace" }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                    <p className="text-[9px] font-mono text-white/25 mt-3">
                      {sortedGrouped.length} processors · {grandTotal} total
                    </p>
                  </div>
                </div>

                {/* Department — vertical bar */}
                <div className="border flex flex-col" style={{ borderColor: PANEL_BORDER, backgroundColor: PANEL_BG }}>
                  <PanelHeader dot="#8b5cf6" title="Tickets per Department" sub="Based on department counts" />
                  <div className="p-4 flex-1">
                    <ChartContainer config={{}} style={{ height: "300px", width: "100%" }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={countsByDepartment.map(([k, v]) => ({ dept: k, total: v }))} margin={{ top: 16, right: 8, left: 0, bottom: 60 }}>
                          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="dept" tickLine={false} axisLine={false} angle={-45} textAnchor="end" interval={0}
                            tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 9, fontFamily: "monospace" }} />
                          <YAxis tickLine={false} axisLine={false}
                            tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 9, fontFamily: "monospace" }} />
                          <ChartTooltip content={<ChartTooltipContent nameKey="total" hideLabel />} />
                          <Bar dataKey="total" radius={0}>
                            {countsByDepartment.map(([k], i) => (
                              <Cell key={k} fill="#8b5cf6" fillOpacity={0.7 + (i % 3) * 0.1} />
                            ))}
                            <LabelList dataKey="total" position="top"
                              style={{ fill: "rgba(139,92,246,0.8)", fontSize: 9, fontFamily: "monospace" }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                    <p className="text-[9px] font-mono text-white/25 mt-3">
                      {countsByDepartment.length} departments · {grandTotal} total
                    </p>
                  </div>
                </div>
              </div>

              {/* ── LOCATION / CLOSED BY grid ── */}
              <div className="border" style={{ borderColor: PANEL_BORDER, backgroundColor: PANEL_BG }}>
                <PanelHeader
                  dot="#f97316"
                  title="Closed By Distribution"
                  sub="Grouped by closing agent"
                  right={
                    <span className="text-[9px] font-mono px-2 py-0.5 border" style={{ borderColor: "rgba(249,115,22,0.3)", color: "#f97316" }}>
                      {countsByRequestor.length} AGENTS
                    </span>
                  }
                />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
                  {countsByRequestor.map(([name, count], idx) => {
                    const isLastRow = idx >= countsByRequestor.length - (countsByRequestor.length % 4 || 4);
                    return (
                      <div
                        key={name}
                        className="flex items-center justify-between px-4 py-3 border-b border-r"
                        style={{ borderColor: PANEL_BORDER }}
                      >
                        <span className="text-[10px] font-mono text-white/60 uppercase truncate max-w-[120px]">{name}</span>
                        <span className="text-[11px] font-mono font-bold px-2 py-0.5 border ml-2 shrink-0"
                          style={{ color: "#f97316", borderColor: "rgba(249,115,22,0.3)", backgroundColor: "rgba(249,115,22,0.08)" }}>
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </>
          )}
        </main>
      </SidebarInset>

      <SidebarRight
        userId={userId ?? undefined}
        dateCreatedFilterRange={dateCreatedFilterRange}
        setDateCreatedFilterRangeAction={setDateCreatedFilterRangeAction}
      />
    </>
  );
}

export default function Page() {
  return (
    <UserProvider>
      <FormatProvider>
        <SidebarProvider>
          <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen" style={{ backgroundColor: "#080c10" }}>
              <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Initializing...</span>
            </div>
          }>
            <DashboardContent />
          </Suspense>
        </SidebarProvider>
      </FormatProvider>
    </UserProvider>
  );
}
