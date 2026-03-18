"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
    SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TicketDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    editingId?: string | null;
    form: Record<string, any>;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSelectChange: (name: string, value: string | string[]) => void;
    handleSubmit: () => void;
    handleUpdate: () => void;
    resetForm: () => void;
    fullname: string;
    existingTicketIds: string[];
}

interface User {
    Firstname: string;
    Lastname: string;
    ReferenceID: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTicketID(existingTicketIds: string[], dateCreated?: string): string {
    const prefix = "DSI";
    const now = dateCreated ? new Date(dateCreated) : new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const datePart = `${year}-${month}-${day}`;

    const todayIds = existingTicketIds.filter((id) =>
        id.startsWith(`${prefix}-${datePart}`)
    );

    let maxSeq = 0;
    for (const id of todayIds) {
        const seqNum = parseInt(id.split("-")[4], 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) maxSeq = seqNum;
    }

    return `${prefix}-${datePart}-${String(maxSeq + 1).padStart(3, "0")}`;
}

function toDateTimeLocalString(isoString?: string): string {
    if (!isoString) return "";
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toISOFromLocal(local: string): string {
    return new Date(local).toISOString();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        {children}
    </label>
);

const SectionHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
    <div className="flex items-center gap-2 pt-2 pb-1">
        <span className="text-base">{icon}</span>
        <span className="text-xs font-bold uppercase tracking-widest text-slate-400">{title}</span>
        <div className="flex-1 h-px bg-slate-100 ml-1" />
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const ReceivedDialog: React.FC<TicketDialogProps> = ({
    open,
    setOpen,
    editingId,
    form,
    handleInputChange,
    handleSelectChange,
    handleSubmit,
    handleUpdate,
    resetForm,
    fullname,
    existingTicketIds,
}) => {
    const [showConfirmClose, setShowConfirmClose] = useState(false);
    const initializedRef = useRef(false);

    const [users, setUsers] = useState<User[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [errorUsers, setErrorUsers] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const searchInputRef = useRef<HTMLInputElement | null>(null);

    // ── Fetch users once on mount ──────────────────────────────────────────────
    useEffect(() => {
        const fetchUsers = async () => {
            setLoadingUsers(true);
            setErrorUsers(null);
            try {
                const res = await fetch("/api/fetch-all-user");
                if (!res.ok) throw new Error("Failed to fetch users");
                setUsers(await res.json());
            } catch (err: any) {
                setErrorUsers(err.message ?? "Error fetching users");
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    // ── Initialize form fields when opening a NEW ticket ──────────────────────
    useEffect(() => {
        if (open && !editingId && !initializedRef.current) {
            const newTicketId = generateTicketID(existingTicketIds, form.date_created);
            handleInputChange({ target: { name: "ticket_id", value: newTicketId } } as React.ChangeEvent<HTMLInputElement>);

            if (!form.processed_by)
                handleInputChange({ target: { name: "processed_by", value: fullname } } as React.ChangeEvent<HTMLInputElement>);
            if (!form.technician_name)
                handleInputChange({ target: { name: "technician_name", value: fullname } } as React.ChangeEvent<HTMLInputElement>);
            if (!form.closed_by)
                handleInputChange({ target: { name: "closed_by", value: fullname } } as React.ChangeEvent<HTMLInputElement>);

            initializedRef.current = true;
        }

        if (!open) {
            initializedRef.current = false;
            setSearchQuery("");
            setIsDropdownOpen(false);
        }
    }, [open, editingId]); // intentionally limited — init runs once per open

    // ── Regenerate ticket ID when date_created changes (new tickets only) ──────
    useEffect(() => {
        if (!open || editingId || !form.date_created) return;
        const newId = generateTicketID(existingTicketIds, form.date_created);
        if (newId !== form.ticket_id) {
            handleInputChange({ target: { name: "ticket_id", value: newId } } as React.ChangeEvent<HTMLInputElement>);
        }
    }, [form.date_created, open, editingId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Close dropdown on outside click ───────────────────────────────────────
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(e.target as Node) &&
                searchInputRef.current &&
                !searchInputRef.current.contains(e.target as Node)
            ) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // ── Sync search query when editing an existing ticket ─────────────────────
    useEffect(() => {
        if (open && editingId && form.requestor_name) {
            setSearchQuery(form.requestor_name);
        }
    }, [open, editingId, form.requestor_name]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const onDateCreatedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        handleInputChange({ target: { name: "date_created", value: toISOFromLocal(e.target.value) } } as React.ChangeEvent<HTMLInputElement>);
    }, [handleInputChange]);

    const onDateClosedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        handleInputChange({ target: { name: "date_closed", value: toISOFromLocal(e.target.value) } } as React.ChangeEvent<HTMLInputElement>);
    }, [handleInputChange]);

    const hasChanges = () =>
        Object.values(form).some((v) => v !== "" && v !== null && v !== undefined);

    const handleAttemptClose = () => {
        if (hasChanges()) setShowConfirmClose(true);
        else { setOpen(false); resetForm(); }
    };

    const confirmClose = () => { setShowConfirmClose(false); setOpen(false); resetForm(); };
    const cancelClose = () => setShowConfirmClose(false);

    const handleImageUpload = async (file: File) => {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "Xchire");
        data.append("folder", "proof_of_completion");
        const res = await fetch("https://api.cloudinary.com/v1_1/dhczsyzcz/auto/upload", {
            method: "POST",
            body: data,
        });
        const uploaded = await res.json();
        return uploaded.secure_url as string;
    };

    const filteredUsers = searchQuery
        ? users.filter((u) =>
            `${u.Lastname}, ${u.Firstname}`.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : [];

    const isResolved = form.status === "Resolved";
    const isScheduled = form.status === "Scheduled";

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <>
            <Sheet open={open} onOpenChange={(newOpen) => { if (!newOpen) handleAttemptClose(); }}>
                <SheetContent
                    side="right"
                    className="w-full sm:w-[560px] flex flex-col p-0 gap-0 overflow-hidden border-l border-slate-200 shadow-2xl bg-white"
                >
                    {/* ── Header ── */}
                    <div className="px-6 py-5 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white shrink-0">
                        <SheetHeader className="space-y-0.5">
                            <SheetTitle className="text-white text-lg font-bold tracking-tight">
                                {editingId ? "✏️ Edit Ticket" : "🎫 New Ticket"}
                            </SheetTitle>
                            <SheetDescription className="text-slate-400 text-xs">
                                {editingId
                                    ? `Editing ticket ${editingId}`
                                    : "Fill out the form below to create a new ticket."}
                            </SheetDescription>
                        </SheetHeader>
                    </div>

                    {/* ── Ticket Meta Banner ── */}
                    <div className="px-6 py-4 bg-indigo-50 border-b border-indigo-100 shrink-0">
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: "Ticket ID", name: "ticket_id" },
                                { label: "Processed By", name: "processed_by" },
                                { label: "Technician", name: "technician_name" },
                            ].map(({ label, name }) => (
                                <div key={name} className="flex flex-col">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">
                                        {label}
                                    </span>
                                    <Input
                                        type="text"
                                        name={name}
                                        value={form[name] || ""}
                                        onChange={handleInputChange}
                                        className="h-7 text-xs bg-white border-indigo-200 text-indigo-900 font-semibold px-2 focus-visible:ring-indigo-300"
                                    />
                                </div>
                            ))}
                        </div>

                        {isResolved && (
                            <div className="mt-3 flex flex-col">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">
                                    Closed By
                                </span>
                                <Input
                                    type="text"
                                    name="closed_by"
                                    value={form.closed_by || ""}
                                    onChange={handleInputChange}
                                    className="h-7 text-xs bg-white border-indigo-200 text-indigo-900 font-semibold px-2 focus-visible:ring-indigo-300"
                                />
                            </div>
                        )}
                    </div>

                    {/* ── Scrollable Body ── */}
                    <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

                        <SectionHeader icon="👤" title="Requestor" />

                        {/* Requestor Name with searchable dropdown */}
                        <div className="flex flex-col relative">
                            <FieldLabel>Requestor Name</FieldLabel>
                            {loadingUsers ? (
                                <div className="text-xs text-slate-400 py-2">Loading users…</div>
                            ) : errorUsers ? (
                                <div className="text-xs text-red-500 py-2">{errorUsers}</div>
                            ) : (
                                <div className="relative">
                                    <Input
                                        ref={searchInputRef}
                                        type="text"
                                        placeholder="Search by name…"
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setIsDropdownOpen(true);
                                        }}
                                        onFocus={() => { if (searchQuery) setIsDropdownOpen(true); }}
                                        className="pr-8"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSearchQuery("");
                                                handleSelectChange("requestor_name", "");
                                                setIsDropdownOpen(false);
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-sm leading-none"
                                        >
                                            ✕
                                        </button>
                                    )}

                                    {isDropdownOpen && filteredUsers.length > 0 && (
                                        <div
                                            ref={dropdownRef}
                                            className="absolute z-50 w-full mt-1 max-h-52 overflow-auto rounded-lg border border-slate-200 bg-white shadow-xl"
                                        >
                                            {filteredUsers.map((user) => {
                                                const displayName = `${user.Lastname}, ${user.Firstname}`;
                                                return (
                                                    <div
                                                        key={user.ReferenceID}
                                                        className="px-3 py-2.5 text-sm hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
                                                        onMouseDown={(e) => {
                                                            // use mousedown so blur doesn't fire first
                                                            e.preventDefault();
                                                            handleSelectChange("requestor_name", displayName);
                                                            setSearchQuery(displayName);
                                                            setIsDropdownOpen(false);
                                                        }}
                                                    >
                                                        <span className="font-medium text-slate-800">{displayName}</span>
                                                        <span className="text-xs text-slate-400 ml-2">#{user.ReferenceID}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {isDropdownOpen && searchQuery && filteredUsers.length === 0 && (
                                        <div className="absolute z-50 w-full mt-1 rounded-lg border border-slate-200 bg-white shadow-xl px-3 py-3 text-sm text-slate-400">
                                            No users found for "{searchQuery}"
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <SectionHeader icon="🗂️" title="Ticket Details" />

                        {/* Ticket Subject */}
                        <div className="flex flex-col">
                            <FieldLabel>Ticket Subject</FieldLabel>
                            <Input
                                name="ticket_subject"
                                value={form.ticket_subject || ""}
                                onChange={handleInputChange}
                                placeholder="Briefly describe the issue or request"
                                className="capitalize"
                            />
                        </div>

                        {/* Two-column grid for selects */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Department */}
                            <div className="flex flex-col">
                                <FieldLabel>Department</FieldLabel>
                                <Select value={form.department || ""} onValueChange={(v) => handleSelectChange("department", v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[
                                            "Admin", "Accounting", "Business Development",
                                            "Customer Service Representative", "Engineering",
                                            "E-Commerce", "Human Resources", "Information Technology",
                                            "Marketing", "Procurement", "Product Development",
                                            "Sales", "Warehouse Operations",
                                        ].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                                        <SelectItem value="Management">Management / Director</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Request Type */}
                            <div className="flex flex-col">
                                <FieldLabel>Request Type</FieldLabel>
                                <Select value={form.request_type || ""} onValueChange={(v) => handleSelectChange("request_type", v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[
                                            "Advisory", "Incident", "Maintenance",
                                            "Major Incident",
                                            "Request", "Service Request",
                                        ].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Type of Concern */}
                            <div className="flex flex-col">
                                <FieldLabel>Type of Concern</FieldLabel>
                                <Select value={form.type_concern || ""} onValueChange={(v) => handleSelectChange("type_concern", v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Incident">Incident</SelectItem>
                                        <SelectItem value="Request">Request</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Mode */}
                            <div className="flex flex-col">
                                <FieldLabel>Mode</FieldLabel>
                                <Select value={form.mode || ""} onValueChange={(v) => handleSelectChange("mode", v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Chat">Chat</SelectItem>
                                        <SelectItem value="Email">Email</SelectItem>
                                        <SelectItem value="Phone Call">Phone Call</SelectItem>
                                        <SelectItem value="System Directory">System Directory</SelectItem>
                                        <SelectItem value="Walk In">Walk In</SelectItem>
                                        <SelectItem value="Web Form">Web Form</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Services Group */}
                            <div className="flex flex-col">
                                <FieldLabel>Services Group</FieldLabel>
                                <Select value={form.group_services || ""} onValueChange={(v) => handleSelectChange("group_services", v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Service Desk">Service Desk</SelectItem>
                                        <SelectItem value="System and Website Services">System & Website Services</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Site */}
                            <div className="flex flex-col">
                                <FieldLabel>Site</FieldLabel>
                                <Select value={form.site || ""} onValueChange={(v) => handleSelectChange("site", v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[
                                            "Disruptive - Primex", "Disruptive - J&L",
                                            "Buildchem - Carmona", "Disruptive - Pasig",
                                            "Disruptive - CDO", "Disruptive - Cebu",
                                            "Disruptive - Davao", "Disruptive - Granville",
                                        ].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <SectionHeader icon="⚡" title="Priority & Status" />

                        <div className="grid grid-cols-2 gap-3">
                            {/* Priority */}
                            <div className="flex flex-col col-span-2">
                                <FieldLabel>Priority</FieldLabel>
                                <Select value={form.priority || ""} onValueChange={(v) => handleSelectChange("priority", v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select priority…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[
                                            { value: "Critical", label: "P-1 · Critical", sub: "Response 15 min · Resolved 4 hrs", color: "text-red-600" },
                                            { value: "High", label: "P-2 · High", sub: "Response 1 hr · Resolved 8 hrs", color: "text-orange-500" },
                                            { value: "Medium", label: "P-3 · Medium", sub: "Response 4 hrs · Resolved 1–2 days", color: "text-yellow-600" },
                                            { value: "Low", label: "P-4 · Low", sub: "Response 8 hrs · Resolved 3–4 days", color: "text-green-600" },
                                        ].map((p) => (
                                            <SelectItem key={p.value} value={p.value}>
                                                <span className={`font-semibold ${p.color}`}>{p.label}</span>
                                                <span className="text-slate-400 text-xs ml-2">({p.sub})</span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Status */}
                            <div className="flex flex-col col-span-2">
                                <FieldLabel>Status</FieldLabel>
                                <Select value={form.status || ""} onValueChange={(v) => handleSelectChange("status", v)}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select status…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {["Pending", "Scheduled", "Ongoing", "Resolved"].map((s) => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <SectionHeader icon="📝" title="Actions & Dates" />

                        {/* Remarks */}
                        <div className="flex flex-col">
                            <FieldLabel>Actions / Remarks</FieldLabel>
                            <textarea
                                name="remarks"
                                value={form.remarks || ""}
                                onChange={(e) => handleSelectChange("remarks", e.target.value)}
                                rows={4}
                                placeholder="Describe the actions taken or notes…"
                                className="rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition-colors"
                            />
                        </div>

                        {/* Date Scheduled — only when Scheduled */}
                        {isScheduled && (
                            <div className="flex flex-col">
                                <FieldLabel>Date Scheduled</FieldLabel>
                                <Input
                                    type="date"
                                    name="date_scheduled"
                                    value={form.date_scheduled || ""}
                                    onChange={handleInputChange}
                                />
                            </div>
                        )}

                        {/* Date Created — hidden when Scheduled */}
                        {!isScheduled && (
                            <div className="flex flex-col">
                                <FieldLabel>Date Created</FieldLabel>
                                <Input
                                    type="datetime-local"
                                    name="date_created"
                                    value={toDateTimeLocalString(form.date_created)}
                                    onChange={onDateCreatedChange}
                                />
                            </div>
                        )}

                        {/* Date Closed — only when Resolved */}
                        {isResolved && (
                            <div className="flex flex-col">
                                <FieldLabel>Date Closed</FieldLabel>
                                <Input
                                    type="datetime-local"
                                    name="date_closed"
                                    value={toDateTimeLocalString(form.date_closed)}
                                    onChange={onDateClosedChange}
                                />
                            </div>
                        )}

                        {/* Proof of Completion — only when Resolved */}
                        {isResolved && (
                            <div
                                className="flex flex-col"
                                onPaste={async (e: React.ClipboardEvent<HTMLDivElement>) => {
                                    for (const item of e.clipboardData.items) {
                                        if (item.type.startsWith("image/")) {
                                            const file = item.getAsFile();
                                            if (!file) return;
                                            try {
                                                const url = await handleImageUpload(file);
                                                handleSelectChange("proof_of_completion", url);
                                            } catch (err) {
                                                console.error("Paste upload failed", err);
                                            }
                                        }
                                    }
                                }}
                            >
                                <FieldLabel>Proof of Completion</FieldLabel>

                                {form.proof_of_completion && (
                                    <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                                        <span className="text-green-600 text-xs">✅ Proof uploaded</span>
                                        <a
                                            href={form.proof_of_completion}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-indigo-600 underline text-xs font-medium"
                                        >
                                            View
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectChange("proof_of_completion", "")}
                                            className="ml-auto text-red-400 hover:text-red-600 text-xs font-bold transition-colors"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}

                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        try {
                                            const url = await handleImageUpload(file);
                                            handleSelectChange("proof_of_completion", url);
                                        } catch (err) {
                                            console.error("File upload failed", err);
                                        } finally {
                                            e.target.value = "";
                                        }
                                    }}
                                />
                                <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                                    <span>💡</span> You can also paste an image directly from your clipboard.
                                </p>
                            </div>
                        )}

                        {/* Bottom spacer */}
                        <div className="h-2" />
                    </div>

                    {/* ── Footer ── */}
                    <SheetFooter className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-2">
                        <Button variant="outline" onClick={handleAttemptClose} className="min-w-[90px]">
                            Cancel
                        </Button>
                        <Button
                            onClick={editingId ? handleUpdate : handleSubmit}
                            className="min-w-[90px] bg-indigo-600 hover:bg-indigo-700 text-white"
                        >
                            {editingId ? "Update Ticket" : "Create Ticket"}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* Confirm discard dialog */}
            <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
                <DialogContent className="sm:max-w-[380px] w-full p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <span>⚠️</span> Discard changes?
                        </DialogTitle>
                        <DialogDescription className="mt-1">
                            You have unsaved changes. Closing will reset the form and all changes will be lost.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="mt-5 flex justify-end gap-2">
                        <Button variant="outline" onClick={cancelClose}>Keep editing</Button>
                        <Button variant="destructive" onClick={confirmClose}>Discard</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};