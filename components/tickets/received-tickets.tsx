"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, CheckCircle2Icon, Clock3 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell, } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious, } from "@/components/ui/pagination";
import { type DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner";
import { ReceivedDialog } from "@/components/tickets/received-ticket-dialog";
import { supabase } from "@/utils/supabase";
import { fetchAllSupabaseRows } from "@/utils/supabase-fetch-all";

interface RequestItem {
    id: string; // Supabase uses `id` not `_id`
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
    setDateCreatedFilterRangeAction: React.Dispatch<
        React.SetStateAction<DateRange | undefined>
    >;
}

const PAGE_SIZE = 10;

export const Received: React.FC<RequestProps> = ({
    referenceid,
    fullname,
    dateCreatedFilterRange,
}) => {
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

    const [, forceTick] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            forceTick((t) => t + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const [form, setForm] = useState<Omit<RequestItem, "id">>({
        ticket_id: "",
        requestor_name: "",
        ticket_subject: "",
        department: "",
        request_type: "",
        type_concern: "",
        mode: "",
        group_services: "",
        technician_name: "",
        site: "",
        priority: "",
        status: "",
        date_scheduled: "",
        remarks: "",
        processed_by: "",
        closed_by: "",
        date_created: "",
        proof_of_completion: "",
    });

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const existingTicketIds = activities.map(item => item.ticket_id);

    function handleSelectChange(name: string, value: string | string[]) {
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    }

    const fetchActivities = useCallback(async () => {
        if (!referenceid) {
            setActivities([]);
            return;
        }
        setLoadingActivities(true);
        setErrorActivities(null);

        try {
            const data = await fetchAllSupabaseRows<RequestItem>(
                "tickets",
                "*",
                { column: "date_created", ascending: false }
            );

            setActivities(data);
        } catch (error: any) {
            setErrorActivities(error.message || "Error fetching tickets");
            toast.error(error.message || "Error fetching tickets");
        } finally {
            setLoadingActivities(false);
        }
    }, [referenceid]);

    useEffect(() => {
        fetchActivities();
    }, [referenceid, fetchActivities]);

    useEffect(() => {
        if (!referenceid) return;

        const channel = supabase
            .channel(`public:tickets:referenceid=eq.${referenceid}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "tickets",
                },
                (payload) => {
                    const newRecord = payload.new as RequestItem;
                    const oldRecord = payload.old as RequestItem;

                    setActivities((curr) => {
                        switch (payload.eventType) {
                            case "INSERT":
                                if (!curr.some((a) => a.id === newRecord.id)) {
                                    return [...curr, newRecord];
                                }
                                return curr;
                            case "UPDATE":
                                return curr.map((a) => (a.id === newRecord.id ? newRecord : a));
                            case "DELETE":
                                return curr.filter((a) => a.id !== oldRecord.id);
                            default:
                                return curr;
                        }
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [referenceid]);

    const filteredActivities = useMemo(() => {
        if (!activities.length) return [];

        let startDate: Date | null = null;
        let endDate: Date | null = null;

        if (dateCreatedFilterRange?.from) {
            startDate = new Date(dateCreatedFilterRange.from);
            startDate.setHours(0, 0, 0, 0);
        }

        if (dateCreatedFilterRange?.to) {
            endDate = new Date(dateCreatedFilterRange.to);
            endDate.setHours(23, 59, 59, 999);
        }

        return activities.filter((item) => {
            const matchesSearch =
                search.trim() === "" ||
                Object.values(item).some((val) =>
                    val?.toString().toLowerCase().includes(search.toLowerCase())
                );

            if (!matchesSearch) return false;

            if (startDate || endDate) {
                if (!item.date_created) return false;

                const itemDate = new Date(item.date_created);
                if (isNaN(itemDate.getTime())) return false;

                if (startDate && itemDate < startDate) return false;
                if (endDate && itemDate > endDate) return false;
            }

            // New filters here
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
            const { data, error } = await supabase
                .from("tickets")
                .insert([{ ...form, referenceid }]);

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

        const payload = {
            ...form,
            ...(form.status === "Resolved" && {
                date_closed: new Date().toISOString(),
            }),
        };

        const { error } = await supabase
            .from("tickets")
            .update(payload)
            .eq("id", editingId);

        if (error) {
            toast.error(error.message);
            return;
        }

        toast.success("Ticket updated");
        setOpen(false);
        resetForm();
    }

    function resetForm() {
        setForm({
            ticket_id: "",
            requestor_name: "",
            ticket_subject: "",
            department: "",
            request_type: "",
            type_concern: "",
            mode: "",
            group_services: "",
            technician_name: "",
            site: "",
            priority: "",
            status: "",
            date_scheduled: "",
            remarks: "",
            processed_by: "",
            closed_by: "",
            date_created: "",
        });
        setEditingId(null);
    }

    function openEditDialog(item: RequestItem) {
        setEditingId(item.id);
        setForm({
            ticket_id: item.ticket_id ?? "",
            requestor_name: item.requestor_name ?? "",
            ticket_subject: item.ticket_subject ?? "",
            department: item.department ?? "",
            request_type: item.request_type ?? "",
            type_concern: item.type_concern ?? "",
            mode: item.mode ?? "",
            group_services: item.group_services ?? "",
            technician_name: item.technician_name ?? "",
            site: item.site ?? "",
            priority: item.priority ?? "",
            status: item.status ?? "",
            date_scheduled: item.date_scheduled ?? "",
            remarks: item.remarks ?? "",
            processed_by: item.processed_by ?? "",
            closed_by: fullname ?? "",
            date_created: item.date_created ?? "",
            proof_of_completion: item.proof_of_completion ?? "",
        });
        setOpen(true);
    }

    function toggleSelect(id: string) {
        setSelectedIds((prev) => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }

    function toggleSelectAll() {
        const allSelected = paginatedActivities.every((item) => selectedIds.has(item.id));
        if (allSelected) {
            setSelectedIds((prev) => {
                const newSet = new Set(prev);
                paginatedActivities.forEach((item) => newSet.delete(item.id));
                return newSet;
            });
        } else {
            setSelectedIds((prev) => {
                const newSet = new Set(prev);
                paginatedActivities.forEach((item) => newSet.add(item.id));
                return newSet;
            });
        }
    }

    async function handleDeleteSelected() {
        if (selectedIds.size === 0) return;
        setConfirmDeleteOpen(true);
    }

    async function confirmDeletion() {
        try {
            const { data, error } = await supabase
                .from("tickets")
                .delete()
                .in("id", Array.from(selectedIds));

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

    function getMaxDurationMs(priority: string): number {
        switch (priority) {
            case "Critical":
                return 4 * 60 * 60 * 1000; // 4 hours
            case "High":
                return 8 * 60 * 60 * 1000; // 8 hours
            case "Medium":
                return 2 * 24 * 60 * 60 * 1000; // 2 days
            case "Low":
                return 4 * 24 * 60 * 60 * 1000; // 4 days
            default:
                return 0;
        }
    }

    function formatDuration(ms: number): string {
        if (ms <= 0) return "0h 0m 0s";

        const totalSeconds = Math.floor(ms / 1000);

        const days = Math.floor(totalSeconds / (24 * 60 * 60));
        const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60));
        const minutes = Math.floor((totalSeconds % (60 * 60)) / 60);
        const seconds = totalSeconds % 60;

        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m ${seconds}s`;
        }

        return `${hours}h ${minutes}m ${seconds}s`;
    }

    function computeDuration(
        dateCreated?: string,
        dateClosed?: string,
        status?: string
    ): string {
        if (!dateCreated) return "-";

        const created = new Date(dateCreated).getTime();
        if (isNaN(created)) return "-";

        // ✅ Kapag resolved → stop time
        if (status === "Resolved" && dateClosed) {
            const closed = new Date(dateClosed).getTime();
            if (isNaN(closed)) return "-";

            const duration = closed - created;
            return formatDuration(duration);
        }

        // ⏱ Ongoing ticket
        const now = Date.now();
        const elapsed = now - created;
        return formatDuration(elapsed);
    }

    function computeRemainingTime(
        priority?: string,
        dateCreated?: string,
        dateClosed?: string,
        status?: string
    ): string {
        if (!priority || !dateCreated) return "-";

        const created = new Date(dateCreated).getTime();
        if (isNaN(created)) return "-";

        const maxDuration = getMaxDurationMs(priority);
        if (maxDuration <= 0) return "-";

        let elapsed: number;

        // ✅ Kapag resolved → fixed duration
        if (status === "Resolved" && dateClosed) {
            const closed = new Date(dateClosed).getTime();
            if (isNaN(closed)) return "-";
            elapsed = closed - created;
        } else {
            // ⏱ Ongoing
            elapsed = Date.now() - created;
        }

        const remaining = maxDuration - elapsed;

        // ❌ Lampas na sa SLA
        if (remaining <= 0) return "0h 0m 0s (Overdue)";

        return formatDuration(remaining);
    }

    function getPriorityBadgeVariant(priority?: string) {
        switch (priority) {
            case "Critical":
                return "critical";
            case "High":
                return "high";
            case "Medium":
                return "medium";
            case "Low":
                return "low";
            default:
                return "outline";
        }
    }

    function getStatusBadge(status?: string) {
        switch (status) {
            case "Ongoing":
                return "bg-orange-500/20 text-orange-400 border border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.3)]";
            case "Pending":
                return "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30";
            case "Resolved":
                return "bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.3)]";
            case "Scheduled":
                return "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30";
            default:
                return "bg-white/10 text-white/70 border border-white/20"; // fallback
        }
    }

    function formatDateCreated(dateStr?: string): string {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return "-";

        // Example format: Jan 17, 2026 10:30 AM
        return date.toLocaleString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    }

    function convertToCSV(data: RequestItem[]) {
        if (data.length === 0) return "";

        const headers = [
            "Ticket ID",
            "Requestor Name",
            "Ticket Subject",
            "Department",
            "Request Type",
            "Type of Concern",
            "Mode",
            "Group Services",
            "Technician Name",
            "Site",
            "Priority",
            "Duration",
            "Remaining Time",
            "Status",
            "Date Scheduled",
            "Remarks",
            "Processed By",
            "Closed By",
            "Date Created",
            "Date Closed",
        ];

        const rows = data.map((item) => [
            item.ticket_id || "",
            item.requestor_name || "",
            item.ticket_subject || "",
            item.department || "",
            item.request_type || "",
            item.type_concern || "",
            item.mode || "",
            item.group_services || "",
            item.technician_name || "",
            item.site || "",
            item.priority || "",

            // Use your existing computeDuration and computeRemainingTime functions here:
            computeDuration(item.date_created, item.date_closed, item.status),
            computeRemainingTime(item.priority, item.date_created, item.date_closed, item.status),

            item.status || "",
            item.date_scheduled || "",
            item.remarks || "",
            item.processed_by || "",
            item.closed_by || "",
            item.date_created || "",
            item.date_closed || "",
        ]);

        // Escape values that contain commas, quotes, or newlines
        const escapeCSVValue = (value: string) => {
            if (value.includes(",") || value.includes('"') || value.includes("\n")) {
                return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        };

        const csvContent =
            headers.map(escapeCSVValue).join(",") +
            "\n" +
            rows
                .map((row) => row.map(escapeCSVValue).join(","))
                .join("\n");

        return csvContent;
    }

    function downloadCSV() {
        const csv = convertToCSV(filteredActivities);

        if (!csv) {
            toast.error("No data to export");
            return;
        }

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


    if (errorActivities) {
        return (
            <Alert className="flex flex-col space-y-4 p-4 text-xs glass-card border-red-500/30">
                <div className="flex items-center space-x-3">
                    <AlertCircleIcon className="h-6 w-6 text-red-400" />
                    <div>
                        <AlertTitle className="text-red-400">No Data Found or No Network Connection</AlertTitle>
                        <AlertDescription className="text-xs text-white/60">
                            Please check your internet connection or try again later.
                        </AlertDescription>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <CheckCircle2Icon className="h-6 w-6 text-emerald-400" />
                    <div>
                        <AlertTitle className="text-white/90">Create New Data</AlertTitle>
                        <AlertDescription className="text-xs text-white/60">
                            You can start by adding new entries to populate your database.
                        </AlertDescription>
                    </div>
                </div>
            </Alert>
        );
    }

    return (
        <Card className="w-full p-6 rounded-xl flex flex-col glass-card">
            <CardHeader className="p-0 mb-4">
                <div className="flex items-center justify-between">
                    {/* Left side: Search bar */}
                    <Input
                        placeholder="Search Tickets..."
                        className="text-sm max-w-[400px] bg-[#0a0a0f] border-white/10 text-white placeholder:text-white/40"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                            setSelectedIds(new Set());
                        }}
                    />

                    {/* Right side: buttons grouped */}
                    <div className="flex items-center space-x-2">
                        <Button variant="outline" onClick={() => setFilterOpen(true)} className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white">
                            Filters
                        </Button>

                        <Button onClick={downloadCSV} variant="outline" className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white">
                            Download CSV
                        </Button>

                        {selectedIds.size > 0 && (
                            <Button variant="destructive" onClick={handleDeleteSelected} className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">
                                Delete Selected ({selectedIds.size})
                            </Button>
                        )}

                        <Button
                            onClick={() => {
                                resetForm();
                                setOpen(true);
                            }}
                            variant="neon"
                            className="neon-button"
                        >
                            Create Ticket
                        </Button>
                    </div>
                </div>

            </CardHeader>

            {loadingActivities ? (
                <div className="flex justify-center py-10">
                    <Spinner className="text-primary" />
                </div>
            ) : filteredActivities.length === 0 ? (
                <div className="text-white/50 text-sm p-4 border border-white/10 rounded-lg text-center glass-card">
                    No ticket data available.
                </div>
            ) : (
                <>
                    <Table className="text-xs">
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <input
                                        type="checkbox"
                                        className="h-5 w-5"
                                        onChange={toggleSelectAll}
                                        checked={
                                            paginatedActivities.length > 0 &&
                                            paginatedActivities.every((item) => selectedIds.has(item.id))
                                        }
                                        aria-label="Select all items on page"
                                    />
                                </TableHead>
                                <TableHead>Edit</TableHead>
                                <TableHead>Ticket ID</TableHead>
                                <TableHead>Ticket Subject</TableHead>
                                <TableHead>Priority</TableHead>
                                <TableHead>Duration</TableHead>
                                <TableHead>Remaining Time</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Requestor's Fullname</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Request Type</TableHead>
                                <TableHead>Type of Concern</TableHead>
                                <TableHead>Mode</TableHead>
                                <TableHead>Group Services</TableHead>
                                <TableHead>Technician Name</TableHead>
                                <TableHead>Site</TableHead>
                                <TableHead>Date Scheduled</TableHead>
                                <TableHead>Processed By</TableHead>
                                <TableHead>Closed By</TableHead>
                                <TableHead>Actions</TableHead>
                                <TableHead>Date Created</TableHead>
                                <TableHead>Date Closed</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedActivities.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            className="h-5 w-5"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => toggleSelect(item.id)}
                                            aria-label={`Select item ${item.requestor_name || item.id}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                                            Edit
                                        </Button>
                                    </TableCell>
                                    <TableCell>{item.ticket_id || "-"}</TableCell>
                                    <TableCell className="capitalize">{item.ticket_subject || "-"}</TableCell>
                                    <TableCell>
                                        <Badge variant={getPriorityBadgeVariant(item.priority)}>
                                            {item.priority || "-"}
                                        </Badge>
                                    </TableCell>

                                    <TableCell>
                                        <Badge>
                                            <Clock3 />
                                            {computeDuration(
                                                item.date_created,
                                                item.date_closed,
                                                item.status
                                            )}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="destructive">
                                            <Clock3 />
                                            {computeRemainingTime(
                                                item.priority,
                                                item.date_created,
                                                item.date_closed,
                                                item.status
                                            )}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            className={`inline-block px-2 font-semibold ${getStatusBadge(item.status)}`}
                                        >
                                            {item.status || "-"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="uppercase">{item.requestor_name || "-"}</TableCell>
                                    <TableCell>{item.department || "-"}</TableCell>
                                    <TableCell>{item.request_type || "-"}</TableCell>
                                    <TableCell>{item.type_concern || "-"}</TableCell>
                                    <TableCell>{item.mode || "-"}</TableCell>
                                    <TableCell>{item.group_services || "-"}</TableCell>
                                    <TableCell className="uppercase">{item.technician_name || "-"}</TableCell>
                                    <TableCell>{item.site || "-"}</TableCell>
                                    <TableCell>{item.date_scheduled || "-"}</TableCell>
                                    <TableCell className="uppercase">{item.processed_by || "-"}</TableCell>
                                    <TableCell className="uppercase">{item.closed_by || "-"}</TableCell>
                                    <TableCell>{item.remarks || "-"}</TableCell>
                                    <TableCell>{formatDateCreated(item.date_created)}</TableCell>
                                    <TableCell>{formatDateCreated(item.date_closed)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="flex justify-end mt-6">
                        <Pagination>
                            <PaginationContent className="flex items-center space-x-4 bg-[#0a0a0f] rounded-lg border border-white/10 px-4 py-2">
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (page > 1) setPage(page - 1);
                                        }}
                                        aria-disabled={page <= 1}
                                        className={page <= 1 ? "pointer-events-none opacity-30 text-white/50" : "text-white/70 hover:text-white hover:bg-white/10"}
                                    />
                                </PaginationItem>

                                <div className="px-4 font-medium text-white/80">
                                    {pageCount === 0 ? "0 / 0" : `${page} / ${pageCount}`}
                                </div>

                                <PaginationItem>
                                    <PaginationNext
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (page < pageCount) setPage(page + 1);
                                        }}
                                        aria-disabled={page >= pageCount}
                                        className={page >= pageCount ? "pointer-events-none opacity-30 text-white/50" : "text-white/70 hover:text-white hover:bg-white/10"}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </>
            )}

            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                <DialogContent className="max-w-md glass-card border-white/10">
                    <DialogHeader>
                        <DialogTitle className="text-white/90 gradient-text">Filter Tickets</DialogTitle>
                        <DialogDescription className="text-white/50">
                            Apply filters to narrow down the ticket list.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {/* Status Filter */}
                        <div>
                            <label htmlFor="status" className="block font-medium text-sm mb-1 text-white/80">Status</label>
                            <select
                                id="status"
                                className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white/90 focus:border-primary focus:ring-1 focus:ring-primary"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="">All</option>
                                <option value="Ongoing">Ongoing</option>
                                <option value="Pending">Pending</option>
                                <option value="Resolved">Resolved</option>
                                <option value="Scheduled">Scheduled</option>
                            </select>
                        </div>

                        {/* Request Type Filter */}
                        <div>
                            <label htmlFor="requestType" className="block font-medium text-sm mb-1 text-white/80">Request Type</label>
                            <select
                                id="requestType"
                                className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white/90 focus:border-primary focus:ring-1 focus:ring-primary"
                                value={requestTypeFilter}
                                onChange={(e) => setRequestTypeFilter(e.target.value)}
                            >
                                <option value="">All</option>
                                <option value="Advisory">Advisory</option>
                                <option value="Incident">Incident</option>
                                <option value="Request">Request</option>
                            </select>
                        </div>

                        {/* Priority Filter */}
                        <div>
                            <label htmlFor="priority" className="block font-medium text-sm mb-1 text-white/80">Priority</label>
                            <select
                                id="priority"
                                className="w-full bg-[#0a0a0f] border border-white/10 rounded px-3 py-2 text-white/90 focus:border-primary focus:ring-1 focus:ring-primary"
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                            >
                                <option value="">All</option>
                                <option value="Critical">Critical</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>
                    </div>

                    <DialogFooter className="flex justify-end space-x-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setStatusFilter("");
                                setRequestTypeFilter("");
                                setPriorityFilter("");
                            }}
                            className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white"
                        >
                            Clear Filters
                        </Button>
                        <Button onClick={() => setFilterOpen(false)} variant="neon" className="neon-button">Apply</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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


            <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                <DialogContent className="max-w-md glass-card border-red-500/30">
                    <DialogHeader>
                        <DialogTitle className="text-red-400">Confirm Deletion</DialogTitle>
                        <DialogDescription className="text-white/60">
                            Are you sure you want to delete{" "}
                            <strong className="text-white/90">{selectedIds.size}</strong> selected item
                            {selectedIds.size > 1 ? "s" : ""}?
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)} className="border-white/20 text-white/80 hover:bg-white/10 hover:text-white">
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDeletion} className="bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30">
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};
