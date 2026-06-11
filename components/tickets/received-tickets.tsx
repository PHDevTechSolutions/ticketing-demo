"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { AlertCircleIcon, CheckCircle2Icon, Clock3, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { type DateRange } from "react-day-picker";
import { toast } from "sonner";
import { ReceivedDialog } from "@/components/tickets/received-ticket-dialog";
import { TicketConversationDialog, useUnreadCounts } from "@/components/tickets/ticket-conversation-dialog";
import { supabase } from "@/utils/supabase";
import { fetchAllSupabaseRows } from "@/utils/supabase-fetch-all";

interface RequestItem {
  id: string;
  ticket_id: string;
  requestor_name: string;
  ticket_subject: string;
  department: string;
  request_type: string;
  type_concern: string;
  mode: string;
  group_services: string;
  technician_name: string;
  site: string;
  priority: string;
  status: string;
  date_scheduled: string;
  remarks: string;
  processed_by: string;
  closed_by: string;
  date_created?: string;
  date_closed?: string;
  proof_of_completion?: string;
}

interface RequestProps {
  referenceid: string;
  fullname: string;
  dateCreatedFilterRange: DateRange | undefined;
  setDateCreatedFilterRangeAction: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
}

const PAGE_SIZE = 10;

// ─── priority / status helpers ────────────────────────────────────────────────

function getPriorityStyle(priority?: string): string {
  switch (priority) {
    case "Critical": return "text-[#ef4444] border-[#ef4444]/40 bg-[#ef4444]/5";
    case "High":     return "text-[#f97316] border-[#f97316]/40 bg-[#f97316]/5";
    case "Medium":   return "text-[#eab308] border-[#eab308]/40 bg-[#eab308]/5";
    case "Low":      return "text-[#22c55e] border-[#22c55e]/40 bg-[#22c55e]/5";
    default:         return "text-gray-500 dark:text-[#e5e5d0]/50 border-gray-300 dark:border-[#2a2a1a] bg-transparent";
  }
}

function getStatusStyle(status?: string): string {
  switch (status) {
    case "Ongoing":   return "text-[#f97316] border-[#f97316]/40 bg-[#f97316]/5";
    case "Pending":   return "text-[#eab308] border-[#eab308]/40 bg-[#eab308]/5";
    case "Resolved":  return "text-[#3b82f6] border-[#3b82f6]/40 bg-[#3b82f6]/5";
    case "Scheduled": return "text-[#06b6d4] border-[#06b6d4]/40 bg-[#06b6d4]/5";
    default:          return "text-gray-500 dark:text-[#e5e5d0]/50 border-gray-300 dark:border-[#2a2a1a] bg-transparent";
  }
}

function TerminalBadge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono uppercase tracking-widest border ${className}`}>
      {children}
    </span>
  );
}

function getMaxDurationMs(priority: string): number {
  switch (priority) {
    case "Critical": return 4 * 60 * 60 * 1000;
    case "High":     return 8 * 60 * 60 * 1000;
    case "Medium":   return 2 * 24 * 60 * 60 * 1000;
    case "Low":      return 4 * 24 * 60 * 60 * 1000;
    default:         return 0;
  }
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "0h 0m 0s";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / (24 * 60 * 60));
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  return `${hours}h ${minutes}m ${seconds}s`;
}

function computeDuration(dateCreated?: string, dateClosed?: string, status?: string): string {
  if (!dateCreated) return "-";
  const created = new Date(dateCreated).getTime();
  if (isNaN(created)) return "-";
  if (status === "Resolved" && dateClosed) {
    const closed = new Date(dateClosed).getTime();
    if (isNaN(closed)) return "-";
    return formatDuration(closed - created);
  }
  return formatDuration(Date.now() - created);
}

function computeRemainingTime(priority?: string, dateCreated?: string, dateClosed?: string, status?: string): string {
  if (!priority || !dateCreated) return "-";
  const created = new Date(dateCreated).getTime();
  if (isNaN(created)) return "-";
  const maxDuration = getMaxDurationMs(priority);
  if (maxDuration <= 0) return "-";
  let elapsed: number;
  if (status === "Resolved" && dateClosed) {
    const closed = new Date(dateClosed).getTime();
    if (isNaN(closed)) return "-";
    elapsed = closed - created;
  } else {
    elapsed = Date.now() - created;
  }
  const remaining = maxDuration - elapsed;
  if (remaining <= 0) return "0h 0m 0s (Overdue)";
  return formatDuration(remaining);
}

function formatDateCreated(dateStr?: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "-";
  return date.toLocaleString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

// ─── main component ───────────────────────────────────────────────────────────

export const Received: React.FC<RequestProps> = ({ referenceid, fullname, dateCreatedFilterRange }) => {
  const [activities, setActivities] = useState<RequestItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [errorActivities, setErrorActivities] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [, forceTick] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatTicket, setChatTicket] = useState<{ ticket_id: string; ticket_subject: string; requestor_name: string } | null>(null);

  useEffect(() => {
    const interval = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const [form, setForm] = useState<Omit<RequestItem, "id">>({
    ticket_id: "", requestor_name: "", ticket_subject: "", department: "",
    request_type: "", type_concern: "", mode: "", group_services: "",
    technician_name: "", site: "", priority: "", status: "", date_scheduled: "",
    remarks: "", processed_by: "", closed_by: "", date_created: "", proof_of_completion: "",
  });

  const existingTicketIds = activities.map((item) => item.ticket_id);
  const { unread, markSeen } = useUnreadCounts(existingTicketIds);

  function handleSelectChange(name: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const fetchActivities = useCallback(async () => {
    if (!referenceid) { setActivities([]); return; }
    setLoadingActivities(true);
    setErrorActivities(null);
    try {
      const data = await fetchAllSupabaseRows<RequestItem>("tickets", "*", { column: "date_created", ascending: false });
      setActivities(data);
    } catch (error: any) {
      setErrorActivities(error.message || "Error fetching tickets");
      toast.error(error.message || "Error fetching tickets");
    } finally {
      setLoadingActivities(false);
    }
  }, [referenceid]);

  useEffect(() => { fetchActivities(); }, [referenceid, fetchActivities]);

  useEffect(() => {
    if (!referenceid) return;
    const channel = supabase
      .channel(`public:tickets:referenceid=eq.${referenceid}`)
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
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [referenceid]);

  const filteredActivities = useMemo(() => {
    if (!activities.length) return [];
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    if (dateCreatedFilterRange?.from) { startDate = new Date(dateCreatedFilterRange.from); startDate.setHours(0, 0, 0, 0); }
    if (dateCreatedFilterRange?.to) { endDate = new Date(dateCreatedFilterRange.to); endDate.setHours(23, 59, 59, 999); }
    return activities.filter((item) => {
      const matchesSearch = search.trim() === "" || Object.values(item).some((val) => val?.toString().toLowerCase().includes(search.toLowerCase()));
      if (!matchesSearch) return false;
      if (startDate || endDate) {
        if (!item.date_created) return false;
        const itemDate = new Date(item.date_created);
        if (isNaN(itemDate.getTime())) return false;
        if (startDate && itemDate < startDate) return false;
        if (endDate && itemDate > endDate) return false;
      }
      if (statusFilter && item.status !== statusFilter) return false;
      if (requestTypeFilter && item.request_type !== requestTypeFilter) return false;
      if (priorityFilter && item.priority !== priorityFilter) return false;
      return true;
    });
  }, [activities, search, dateCreatedFilterRange, statusFilter, requestTypeFilter, priorityFilter]);

  const pageCount = Math.ceil(filteredActivities.length / PAGE_SIZE);
  const paginatedActivities = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredActivities.slice(start, start + PAGE_SIZE);
  }, [filteredActivities, page]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit() {
    try {
      const { error } = await supabase.from("tickets").insert([{ ...form, referenceid }]);
      if (error) throw error;
      toast.success("Ticket created successfully!");
      fetchActivities();
      setOpen(false);
      resetForm();
    } catch (error: any) {
      toast.error(error.message || "Error creating ticket");
    }
  }

  async function handleUpdate() {
    if (!editingId) return;
    const payload = { ...form, ...(form.status === "Resolved" && { date_closed: new Date().toISOString() }) };
    const { error } = await supabase.from("tickets").update(payload).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    toast.success("Ticket updated");
    setOpen(false);
    resetForm();
  }

  function resetForm() {
    setForm({ ticket_id: "", requestor_name: "", ticket_subject: "", department: "", request_type: "", type_concern: "", mode: "", group_services: "", technician_name: "", site: "", priority: "", status: "", date_scheduled: "", remarks: "", processed_by: "", closed_by: "", date_created: "" });
    setEditingId(null);
  }

  function openEditDialog(item: RequestItem) {
    setEditingId(item.id);
    setForm({ ticket_id: item.ticket_id ?? "", requestor_name: item.requestor_name ?? "", ticket_subject: item.ticket_subject ?? "", department: item.department ?? "", request_type: item.request_type ?? "", type_concern: item.type_concern ?? "", mode: item.mode ?? "", group_services: item.group_services ?? "", technician_name: item.technician_name ?? "", site: item.site ?? "", priority: item.priority ?? "", status: item.status ?? "", date_scheduled: item.date_scheduled ?? "", remarks: item.remarks ?? "", processed_by: item.processed_by ?? "", closed_by: fullname ?? "", date_created: item.date_created ?? "", proof_of_completion: item.proof_of_completion ?? "" });
    setOpen(true);
  }

  function openChatDialog(item: RequestItem) {
    setChatTicket({ ticket_id: item.ticket_id, ticket_subject: item.ticket_subject, requestor_name: item.requestor_name });
    setChatOpen(true);
    markSeen(item.ticket_id);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function toggleSelectAll() {
    const allSelected = paginatedActivities.every((item) => selectedIds.has(item.id));
    setSelectedIds((prev) => {
      const s = new Set(prev);
      allSelected ? paginatedActivities.forEach((item) => s.delete(item.id)) : paginatedActivities.forEach((item) => s.add(item.id));
      return s;
    });
  }

  async function handleDeleteSelected() { if (selectedIds.size === 0) return; setConfirmDeleteOpen(true); }

  async function confirmDeletion() {
    try {
      const { error } = await supabase.from("tickets").delete().in("id", Array.from(selectedIds));
      if (error) throw error;
      toast.success(`${selectedIds.size} item(s) deleted successfully.`);
      setSelectedIds(new Set());
      setConfirmDeleteOpen(false);
      fetchActivities();
    } catch (error: any) {
      toast.error(error.message || "Error deleting ticket items");
      setConfirmDeleteOpen(false);
    }
  }

  function convertToCSV(data: RequestItem[]) {
    if (data.length === 0) return "";
    const headers = ["Ticket ID","Requestor Name","Ticket Subject","Department","Request Type","Type of Concern","Mode","Group Services","Technician Name","Site","Priority","Duration","Remaining Time","Status","Date Scheduled","Remarks","Processed By","Closed By","Date Created","Date Closed"];
    const rows = data.map((item) => [item.ticket_id||"",item.requestor_name||"",item.ticket_subject||"",item.department||"",item.request_type||"",item.type_concern||"",item.mode||"",item.group_services||"",item.technician_name||"",item.site||"",item.priority||"",computeDuration(item.date_created,item.date_closed,item.status),computeRemainingTime(item.priority,item.date_created,item.date_closed,item.status),item.status||"",item.date_scheduled||"",item.remarks||"",item.processed_by||"",item.closed_by||"",item.date_created||"",item.date_closed||""]);
    const esc = (v: string) => (v.includes(",") || v.includes('"') || v.includes("\n")) ? `"${v.replace(/"/g,'""')}"` : v;
    return headers.map(esc).join(",") + "\n" + rows.map((r) => r.map(esc).join(",")).join("\n");
  }

  function downloadCSV() {
    const csv = convertToCSV(filteredActivities);
    if (!csv) { toast.error("No data to export"); return; }
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `tickets_export_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ─── error state ──────────────────────────────────────────────────────────

  if (errorActivities) {
    return (
      <div className="border border-red-200 dark:border-[#ef4444]/30 bg-red-50 dark:bg-[#ef4444]/5 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <AlertCircleIcon className="h-4 w-4 text-[#ef4444]" />
          <span className="text-[10px] font-mono font-bold text-[#ef4444] uppercase tracking-widest">No Data / No Connection</span>
        </div>
        <p className="text-[10px] font-mono text-gray-500 dark:text-[#e5e5d0]/50">Please check your internet connection or try again later.</p>
        <div className="flex items-center gap-2 pt-1">
          <CheckCircle2Icon className="h-4 w-4 text-[#22c55e]" />
          <span className="text-[10px] font-mono text-[#22c55e]/70">You can create new entries to populate your database.</span>
        </div>
      </div>
    );
  }

  // ─── render ───────────────────────────────────────────────────────────────

  return (
    <div className="w-full flex flex-col border border-gray-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#080c10]">

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-200 dark:border-[rgba(255,255,255,0.07)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]">
        <input
          type="text"
          placeholder="> search tickets..."
          className="text-[11px] font-mono text-gray-800 dark:text-[#e5e5d0]/80 placeholder:text-gray-400 dark:placeholder:text-white/20 px-3 py-1.5 w-full max-w-[360px] focus:outline-none bg-white dark:bg-[#080c10] border border-gray-200 dark:border-[rgba(255,255,255,0.07)]"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); setSelectedIds(new Set()); }}
        />
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setFilterOpen(true)} className="text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 text-gray-500 dark:text-white/50 hover:text-[#f97316] transition-colors border border-gray-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#080c10]">
            [ Filters ]
          </button>
          <button onClick={downloadCSV} className="text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 text-gray-500 dark:text-white/50 hover:text-[#f97316] transition-colors border border-gray-200 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-[#080c10]">
            [ CSV ]
          </button>
          {selectedIds.size > 0 && (
            <button onClick={handleDeleteSelected} className="text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors border border-red-200 dark:border-[rgba(239,68,68,0.3)] bg-white dark:bg-[#080c10]">
              [ Delete {selectedIds.size} ]
            </button>
          )}
          <button onClick={() => { resetForm(); setOpen(true); }} className="text-[10px] font-mono uppercase tracking-widest px-3 py-1.5 text-[#f97316] hover:bg-[#f97316]/10 transition-colors border border-orange-200 dark:border-[rgba(249,115,22,0.4)] bg-white dark:bg-[#080c10]">
            [ + New Ticket ]
          </button>
        </div>
      </div>

      {/* Table */}
      {loadingActivities ? (
        <div className="flex items-center gap-2 justify-center py-12">
          <span className="w-1 h-1 bg-[#f97316] animate-bounce [animation-delay:0ms]" />
          <span className="w-1 h-1 bg-[#f97316] animate-bounce [animation-delay:150ms]" />
          <span className="w-1 h-1 bg-[#f97316] animate-bounce [animation-delay:300ms]" />
          <span className="text-[10px] font-mono text-gray-500 dark:text-[#6b6b4a]/50 ml-1 uppercase tracking-widest">Loading...</span>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="text-[10px] font-mono text-gray-500 dark:text-[#6b6b4a]/50 uppercase tracking-widest text-center py-12">
          no ticket data available
        </div>
      ) : (
        <div className="overflow-auto">
          <table className="w-full text-[10px] font-mono whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 dark:border-[rgba(255,255,255,0.06)]">
                <th className="px-3 py-2 bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]">
                  <input type="checkbox" className="w-3 h-3 accent-[#f97316]" onChange={toggleSelectAll} checked={paginatedActivities.length > 0 && paginatedActivities.every((item) => selectedIds.has(item.id))} aria-label="Select all" />
                </th>
                {["Actions","Ticket ID","Subject","Priority","Duration","Remaining","Status","Requestor","Dept","Type","Concern","Mode","Group","Technician","Site","Scheduled","Processed By","Closed By","Remarks","Created","Closed"].map((h) => (
                  <th key={h} className="text-left px-3 py-2 text-[#f97316]/50 uppercase tracking-[0.15em] font-medium bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginatedActivities.map((item) => (
                <tr key={item.id} className="transition-colors border-b border-gray-100 dark:border-[rgba(255,255,255,0.05)] hover:bg-gray-50 dark:hover:bg-[rgba(255,255,255,0.03)]">
                  <td className="px-3 py-2">
                    <input type="checkbox" className="w-4 h-4 accent-[#f97316]" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} aria-label={`Select ${item.ticket_id}`} />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditDialog(item)} className="text-[9px] font-mono uppercase tracking-widest px-2 py-1 text-gray-500 dark:text-white/40 hover:text-[#f97316] transition-colors border border-gray-200 dark:border-[rgba(255,255,255,0.07)]">
                        edit
                      </button>
                      <button
                        onClick={() => openChatDialog(item)}
                        className="relative text-[9px] font-mono uppercase tracking-widest px-2 py-1 text-gray-500 dark:text-white/40 hover:text-[#06b6d4] transition-colors border border-gray-200 dark:border-[rgba(255,255,255,0.07)]"
                      >
                        <MessageSquare className="h-4 w-4" />
                        {(unread[item.ticket_id] ?? 0) > 0 && (
                          <span
                            className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center text-[8px] font-mono font-bold text-white px-0.5 bg-[#ef4444] border border-white dark:border-[#080c10]"
                          >
                            {unread[item.ticket_id] > 9 ? "9+" : unread[item.ticket_id]}
                          </span>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-[#f97316]/80">{item.ticket_id || "-"}</td>
                  <td className="px-3 py-2 text-gray-700 dark:text-[#e5e5d0]/70 capitalize max-w-[200px] truncate">{item.ticket_subject || "-"}</td>
                  <td className="px-3 py-2"><TerminalBadge className={getPriorityStyle(item.priority)}>{item.priority || "-"}</TerminalBadge></td>
                  <td className="px-3 py-2 text-gray-500 dark:text-[#e5e5d0]/50"><span className="flex items-center gap-1"><Clock3 className="w-2.5 h-2.5" />{computeDuration(item.date_created, item.date_closed, item.status)}</span></td>
                  <td className="px-3 py-2 text-[#ef4444]/70"><span className="flex items-center gap-1"><Clock3 className="w-2.5 h-2.5" />{computeRemainingTime(item.priority, item.date_created, item.date_closed, item.status)}</span></td>
                  <td className="px-3 py-2"><TerminalBadge className={getStatusStyle(item.status)}>{item.status || "-"}</TerminalBadge></td>
                  <td className="px-3 py-2 text-gray-600 dark:text-[#e5e5d0]/60 uppercase">{item.requestor_name || "-"}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-[#e5e5d0]/50">{item.department || "-"}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-[#e5e5d0]/50">{item.request_type || "-"}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-[#e5e5d0]/50">{item.type_concern || "-"}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-[#e5e5d0]/50">{item.mode || "-"}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-[#e5e5d0]/50">{item.group_services || "-"}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-[#e5e5d0]/60 uppercase">{item.technician_name || "-"}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-[#e5e5d0]/50">{item.site || "-"}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-[#e5e5d0]/50">{item.date_scheduled || "-"}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-[#e5e5d0]/60 uppercase">{item.processed_by || "-"}</td>
                  <td className="px-3 py-2 text-gray-600 dark:text-[#e5e5d0]/60 uppercase">{item.closed_by || "-"}</td>
                  <td className="px-3 py-2 text-gray-500 dark:text-[#e5e5d0]/50 max-w-[160px] truncate">{item.remarks || "-"}</td>
                  <td className="px-3 py-2 text-gray-400 dark:text-[#e5e5d0]/40">{formatDateCreated(item.date_created)}</td>
                  <td className="px-3 py-2 text-gray-400 dark:text-[#e5e5d0]/40">{formatDateCreated(item.date_closed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {filteredActivities.length > 0 && (
        <div className="flex justify-end px-4 py-3 border-t border-gray-200 dark:border-[rgba(255,255,255,0.07)] bg-gray-50 dark:bg-[rgba(255,255,255,0.02)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (page > 1) setPage(page - 1); }}
              disabled={page <= 1}
              className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-gray-500 dark:text-white/40 hover:text-[#f97316] transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-gray-200 dark:border-[rgba(255,255,255,0.07)]"
            >
              ← prev
            </button>
            <span className="text-[10px] font-mono text-gray-400 dark:text-white/30 tabular-nums">
              {pageCount === 0 ? "0 / 0" : `${page} / ${pageCount}`}
            </span>
            <button
              onClick={() => { if (page < pageCount) setPage(page + 1); }}
              disabled={page >= pageCount}
              className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-gray-500 dark:text-white/40 hover:text-[#f97316] transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-gray-200 dark:border-[rgba(255,255,255,0.07)]"
            >
              next →
            </button>
          </div>
        </div>
      )}

      {/* Filter dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent className="max-w-sm rounded-none p-0 bg-white dark:bg-[#080c10] border border-gray-200 dark:border-[rgba(255,255,255,0.1)]">
          <DialogHeader className="px-5 py-4 border-b border-gray-200 dark:border-[rgba(255,255,255,0.07)]">
            <DialogTitle className="text-[11px] font-mono font-bold text-[#f97316] uppercase tracking-[0.2em]">▸ Filter Tickets</DialogTitle>
            <DialogDescription className="text-[10px] font-mono text-gray-500 dark:text-white/30">Narrow down the ticket list.</DialogDescription>
          </DialogHeader>
          <div className="px-5 py-4 space-y-4">
            {[
              { id: "status", label: "Status", value: statusFilter, setter: setStatusFilter, options: ["Ongoing","Pending","Resolved","Scheduled"] },
              { id: "requestType", label: "Request Type", value: requestTypeFilter, setter: setRequestTypeFilter, options: ["Advisory","Incident","Request"] },
              { id: "priority", label: "Priority", value: priorityFilter, setter: setPriorityFilter, options: ["Critical","High","Medium","Low"] },
            ].map(({ id, label, value, setter, options }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-[#f97316]/60 mb-1.5">{label}</label>
                <select id={id} className="w-full text-gray-700 dark:text-[#e5e5d0]/70 text-[10px] font-mono px-3 py-1.5 focus:outline-none bg-white dark:bg-[#080c10] border border-gray-200 dark:border-[rgba(255,255,255,0.07)]" value={value} onChange={(e) => setter(e.target.value)}>
                  <option value="">All</option>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-200 dark:border-[rgba(255,255,255,0.07)]">
            <button onClick={() => { setStatusFilter(""); setRequestTypeFilter(""); setPriorityFilter(""); }} className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-gray-500 dark:text-white/40 hover:text-[#f97316] transition-colors border border-gray-200 dark:border-[rgba(255,255,255,0.07)]">
              Clear
            </button>
            <button onClick={() => setFilterOpen(false)} className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-[#f97316] hover:bg-[#f97316]/10 transition-colors border border-orange-200 dark:border-[rgba(249,115,22,0.4)]">
              Apply
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Ticket create/edit dialog */}
      <ReceivedDialog
        open={open}
        setOpen={setOpen}
        editingId={editingId}
        form={form}
        handleInputChange={handleInputChange}
        handleSelectChange={handleSelectChange}
        handleSubmit={handleSubmit}
        handleUpdate={handleUpdate}
        resetForm={resetForm}
        fullname={fullname}
        existingTicketIds={existingTicketIds}
      />

      {/* Conversation dialog */}
      {chatTicket && (
        <TicketConversationDialog
          open={chatOpen}
          onClose={() => { setChatOpen(false); setChatTicket(null); }}
          ticketId={chatTicket.ticket_id}
          ticketSubject={chatTicket.ticket_subject}
          requestorName={chatTicket.requestor_name}
          fullname={fullname}
        />
      )}

      {/* Confirm delete dialog */}
      <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <DialogContent className="max-w-sm rounded-none p-0 bg-white dark:bg-[#080c10] border border-red-200 dark:border-[rgba(239,68,68,0.3)]">
          <DialogHeader className="px-5 py-4 border-b border-red-100 dark:border-[rgba(239,68,68,0.15)]">
            <DialogTitle className="text-[11px] font-mono font-bold text-[#ef4444] uppercase tracking-[0.2em]">✕ Confirm Deletion</DialogTitle>
            <DialogDescription className="text-[10px] font-mono text-gray-500 dark:text-white/40">
              Delete <strong className="text-gray-700 dark:text-white/70">{selectedIds.size}</strong> selected item{selectedIds.size > 1 ? "s" : ""}? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 px-5 py-4">
            <button onClick={() => setConfirmDeleteOpen(false)} className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-gray-500 dark:text-white/40 hover:text-[#f97316] transition-colors border border-gray-200 dark:border-[rgba(255,255,255,0.07)]">
              Cancel
            </button>
            <button onClick={confirmDeletion} className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors border border-red-200 dark:border-[rgba(239,68,68,0.4)]">
              Delete
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
