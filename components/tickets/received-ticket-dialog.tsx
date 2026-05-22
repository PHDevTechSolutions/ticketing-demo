"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
    const todayIds = existingTicketIds.filter((id) => id.startsWith(`${prefix}-${datePart}`));
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

const FL: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="mb-1 text-[9px] font-mono font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(249,115,22,0.6)" }}>
        {children}
    </label>
);

const SH: React.FC<{ title: string }> = ({ title }) => (
    <div className="flex items-center gap-2 pt-5 pb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <span className="text-[#f97316] font-mono text-xs">▸</span>
        <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(229,229,208,0.5)" }}>{title}</span>
    </div>
);

const TI: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { inputRef?: React.Ref<HTMLInputElement> }> = ({ className, inputRef, ...props }) => (
    <input
        ref={inputRef}
        className={`w-full text-[#e5e5d0]/80 text-[11px] font-mono px-3 py-1.5 focus:outline-none ${className ?? ""}`}
        style={{ backgroundColor: "#080c10", border: "1px solid rgba(255,255,255,0.08)" }}
        {...props}
    />
);

const TS = (name: string, placeholder: string, options: string[], value: string, onChange: (v: string) => void) => (
    <select
        className="w-full text-[#e5e5d0]/80 text-[11px] font-mono px-3 py-1.5 focus:outline-none"
        style={{ backgroundColor: "#080c10", border: "1px solid rgba(255,255,255,0.08)" }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
    >
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
);

// ─── Main Component ───────────────────────────────────────────────────────────

export const ReceivedDialog: React.FC<TicketDialogProps> = ({
    open, setOpen, editingId, form, handleInputChange, handleSelectChange,
    handleSubmit, handleUpdate, resetForm, fullname, existingTicketIds,
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

    useEffect(() => {
        const fetchUsers = async () => {
            setLoadingUsers(true); setErrorUsers(null);
            try {
                const res = await fetch("/api/fetch-all-user");
                if (!res.ok) throw new Error("Failed to fetch users");
                setUsers(await res.json());
            } catch (err: any) {
                setErrorUsers(err.message ?? "Error fetching users");
            } finally { setLoadingUsers(false); }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        if (open && !editingId && !initializedRef.current) {
            const newTicketId = generateTicketID(existingTicketIds, form.date_created);
            handleInputChange({ target: { name: "ticket_id", value: newTicketId } } as React.ChangeEvent<HTMLInputElement>);
            if (!form.processed_by) handleInputChange({ target: { name: "processed_by", value: fullname } } as React.ChangeEvent<HTMLInputElement>);
            if (!form.technician_name) handleInputChange({ target: { name: "technician_name", value: fullname } } as React.ChangeEvent<HTMLInputElement>);
            if (!form.closed_by) handleInputChange({ target: { name: "closed_by", value: fullname } } as React.ChangeEvent<HTMLInputElement>);
            initializedRef.current = true;
        }
        if (!open) { initializedRef.current = false; setSearchQuery(""); setIsDropdownOpen(false); }
    }, [open, editingId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!open || editingId || !form.date_created) return;
        const newId = generateTicketID(existingTicketIds, form.date_created);
        if (newId !== form.ticket_id) handleInputChange({ target: { name: "ticket_id", value: newId } } as React.ChangeEvent<HTMLInputElement>);
    }, [form.date_created, open, editingId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
                searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (open && editingId && form.requestor_name) setSearchQuery(form.requestor_name);
    }, [open, editingId, form.requestor_name]);

    const onDateCreatedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        handleInputChange({ target: { name: "date_created", value: toISOFromLocal(e.target.value) } } as React.ChangeEvent<HTMLInputElement>);
    }, [handleInputChange]);

    const onDateClosedChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        handleInputChange({ target: { name: "date_closed", value: toISOFromLocal(e.target.value) } } as React.ChangeEvent<HTMLInputElement>);
    }, [handleInputChange]);

    const hasChanges = () => Object.values(form).some((v) => v !== "" && v !== null && v !== undefined);
    const handleAttemptClose = () => { if (hasChanges()) setShowConfirmClose(true); else { setOpen(false); resetForm(); } };
    const confirmClose = () => { setShowConfirmClose(false); setOpen(false); resetForm(); };

    const handleImageUpload = async (file: File) => {
        const data = new FormData();
        data.append("file", file);
        data.append("upload_preset", "Xchire");
        data.append("folder", "proof_of_completion");
        const res = await fetch("https://api.cloudinary.com/v1_1/dhczsyzcz/auto/upload", { method: "POST", body: data });
        const uploaded = await res.json();
        return uploaded.secure_url as string;
    };

    const filteredUsers = searchQuery
        ? users.filter((u) => `${u.Lastname}, ${u.Firstname}`.toLowerCase().includes(searchQuery.toLowerCase()))
        : [];

    const isResolved = form.status === "Resolved";
    const isScheduled = form.status === "Scheduled";

    if (!open) return null;

    return (
        <>
            {/* Full-page overlay */}
            <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "#080c10" }}>

                {/* Top bar */}
                <div className="flex items-center justify-between px-6 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)", backgroundColor: "rgba(255,255,255,0.02)" }}>
                    <div className="flex items-center gap-3">
                        <span className="text-[#f97316] font-mono text-xs">▸</span>
                        <span className="text-[11px] font-mono font-bold text-[#f97316] uppercase tracking-[0.2em]">
                            {editingId ? "Edit Ticket" : "New Ticket"}
                        </span>
                        {editingId && (
                            <span className="text-[9px] font-mono text-white/25 ml-1">· {editingId}</span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleAttemptClose}
                            className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-white/40 hover:text-[#f97316] transition-colors"
                            style={{ border: "1px solid rgba(255,255,255,0.07)" }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={editingId ? handleUpdate : handleSubmit}
                            className="text-[9px] font-mono uppercase tracking-widest px-4 py-1.5 text-[#f97316] hover:bg-[#f97316]/10 transition-colors"
                            style={{ border: "1px solid rgba(249,115,22,0.4)" }}
                        >
                            {editingId ? "[ Update Ticket ]" : "[ Create Ticket ]"}
                        </button>
                    </div>
                </div>

                {/* Meta strip */}
                <div className="px-6 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", backgroundColor: "rgba(255,255,255,0.01)" }}>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                        {[
                            { label: "Ticket ID", name: "ticket_id" },
                            { label: "Processed By", name: "processed_by" },
                            { label: "Technician", name: "technician_name" },
                            ...(isResolved ? [{ label: "Closed By", name: "closed_by" }] : []),
                        ].map(({ label, name }) => (
                            <div key={name} className="flex flex-col gap-1">
                                <FL>{label}</FL>
                                <TI type="text" name={name} value={form[name] || ""} onChange={handleInputChange} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Scrollable body — two column layout */}
                <div className="flex-1 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 h-full">

                        {/* Left column */}
                        <div className="px-6 py-4 space-y-3" style={{ borderRight: "1px solid rgba(255,255,255,0.06)" }}>

                            <SH title="Requestor" />
                            <div className="flex flex-col gap-1">
                                <FL>Requestor Name</FL>
                                {loadingUsers ? (
                                    <p className="text-[10px] font-mono text-white/30">Loading users…</p>
                                ) : errorUsers ? (
                                    <p className="text-[10px] font-mono text-[#ef4444]/70">{errorUsers}</p>
                                ) : (
                                    <div className="relative">
                                        <TI
                                            inputRef={searchInputRef}
                                            type="text"
                                            placeholder="> search by name…"
                                            value={searchQuery}
                                            onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }}
                                            onFocus={() => { if (searchQuery) setIsDropdownOpen(true); }}
                                        />
                                        {searchQuery && (
                                            <button type="button" onClick={() => { setSearchQuery(""); handleSelectChange("requestor_name", ""); setIsDropdownOpen(false); }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#f97316] text-xs font-mono">✕</button>
                                        )}
                                        {isDropdownOpen && filteredUsers.length > 0 && (
                                            <div ref={dropdownRef} className="absolute z-50 w-full mt-0 max-h-48 overflow-auto" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#080c10" }}>
                                                {filteredUsers.map((user) => {
                                                    const displayName = `${user.Lastname}, ${user.Firstname}`;
                                                    return (
                                                        <div key={user.ReferenceID}
                                                            className="px-3 py-2 text-[11px] font-mono cursor-pointer flex items-center justify-between transition-colors"
                                                            style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                                                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}
                                                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
                                                            onMouseDown={(e) => { e.preventDefault(); handleSelectChange("requestor_name", displayName); setSearchQuery(displayName); setIsDropdownOpen(false); }}>
                                                            <span className="text-[#e5e5d0]/80">{displayName}</span>
                                                            <span className="text-white/25 text-[9px]">#{user.ReferenceID}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        {isDropdownOpen && searchQuery && filteredUsers.length === 0 && (
                                            <div className="absolute z-50 w-full mt-0 px-3 py-2 text-[10px] font-mono text-white/30" style={{ border: "1px solid rgba(255,255,255,0.08)", backgroundColor: "#080c10" }}>
                                                No users found for "{searchQuery}"
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <SH title="Ticket Details" />
                            <div className="flex flex-col gap-1">
                                <FL>Ticket Subject</FL>
                                <TI name="ticket_subject" value={form.ticket_subject || ""} onChange={handleInputChange} placeholder="Briefly describe the issue…" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1"><FL>Department</FL>{TS("department","Select…",["Admin","Accounting","Business Development","Customer Service Representative","Engineering","E-Commerce","Human Resources","Information Technology","Marketing","Procurement","Product Development","Sales","Warehouse Operations","Management"],form.department||"",(v)=>handleSelectChange("department",v))}</div>
                                <div className="flex flex-col gap-1"><FL>Request Type</FL>{TS("request_type","Select…",["Advisory","Incident","Maintenance","Major Incident","Request","Service Request"],form.request_type||"",(v)=>handleSelectChange("request_type",v))}</div>
                                <div className="flex flex-col gap-1"><FL>Type of Concern</FL>{TS("type_concern","Select…",["Incident","Request"],form.type_concern||"",(v)=>handleSelectChange("type_concern",v))}</div>
                                <div className="flex flex-col gap-1"><FL>Mode</FL>{TS("mode","Select…",["Chat","Email","Phone Call","System Directory","Walk In","Web Form"],form.mode||"",(v)=>handleSelectChange("mode",v))}</div>
                                <div className="flex flex-col gap-1"><FL>Services Group</FL>{TS("group_services","Select…",["Service Desk","System and Website Services"],form.group_services||"",(v)=>handleSelectChange("group_services",v))}</div>
                                <div className="flex flex-col gap-1"><FL>Site</FL>{TS("site","Select…",["Disruptive - Primex","Disruptive - J&L","Buildchem - Carmona","Disruptive - Pasig","Disruptive - CDO","Disruptive - Cebu","Disruptive - Davao","Disruptive - Granville"],form.site||"",(v)=>handleSelectChange("site",v))}</div>
                            </div>
                        </div>

                        {/* Right column */}
                        <div className="px-6 py-4 space-y-3">

                            <SH title="Priority & Status" />
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1 col-span-2">
                                    <FL>Priority</FL>
                                    <select className="w-full text-[#e5e5d0]/80 text-[11px] font-mono px-3 py-1.5 focus:outline-none" style={{ backgroundColor: "#080c10", border: "1px solid rgba(255,255,255,0.08)" }} value={form.priority || ""} onChange={(e) => handleSelectChange("priority", e.target.value)}>
                                        <option value="">Select priority…</option>
                                        {[{v:"Critical",l:"P-1 · Critical",s:"4h SLA"},{v:"High",l:"P-2 · High",s:"8h SLA"},{v:"Medium",l:"P-3 · Medium",s:"2d SLA"},{v:"Low",l:"P-4 · Low",s:"4d SLA"}].map((p) => (
                                            <option key={p.v} value={p.v}>{p.l} ({p.s})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1 col-span-2">
                                    <FL>Status</FL>
                                    {TS("status","Select status…",["Pending","Scheduled","Ongoing","Resolved"],form.status||"",(v)=>handleSelectChange("status",v))}
                                </div>
                            </div>

                            <SH title="Actions & Dates" />
                            <div className="flex flex-col gap-1">
                                <FL>Actions / Remarks</FL>
                                <textarea name="remarks" value={form.remarks || ""} onChange={(e) => handleSelectChange("remarks", e.target.value)} rows={5}
                                    placeholder="> describe actions taken or notes…"
                                    className="w-full text-[#e5e5d0]/80 text-[11px] font-mono px-3 py-2 resize-none focus:outline-none placeholder:text-white/20"
                                    style={{ backgroundColor: "#080c10", border: "1px solid rgba(255,255,255,0.08)" }} />
                            </div>
                            {isScheduled && (
                                <div className="flex flex-col gap-1"><FL>Date Scheduled</FL><TI type="date" name="date_scheduled" value={form.date_scheduled || ""} onChange={handleInputChange} /></div>
                            )}
                            {!isScheduled && (
                                <div className="flex flex-col gap-1"><FL>Date Created</FL><TI type="datetime-local" name="date_created" value={toDateTimeLocalString(form.date_created)} onChange={onDateCreatedChange} /></div>
                            )}
                            {isResolved && (
                                <div className="flex flex-col gap-1"><FL>Date Closed</FL><TI type="datetime-local" name="date_closed" value={toDateTimeLocalString(form.date_closed)} onChange={onDateClosedChange} /></div>
                            )}
                            {isResolved && (
                                <div className="flex flex-col gap-1" onPaste={async (e: React.ClipboardEvent<HTMLDivElement>) => {
                                    for (const item of e.clipboardData.items) {
                                        if (item.type.startsWith("image/")) {
                                            const file = item.getAsFile();
                                            if (!file) return;
                                            try { const url = await handleImageUpload(file); handleSelectChange("proof_of_completion", url); } catch (err) { console.error(err); }
                                        }
                                    }
                                }}>
                                    <FL>Proof of Completion</FL>
                                    {form.proof_of_completion && (
                                        <div className="flex items-center gap-2 mb-2 px-3 py-2" style={{ border: "1px solid rgba(34,197,94,0.25)", backgroundColor: "rgba(34,197,94,0.04)" }}>
                                            <span className="text-[10px] font-mono text-[#22c55e]/70">✓ proof uploaded</span>
                                            <a href={form.proof_of_completion} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-[#f97316]/70 hover:text-[#f97316] underline ml-1">view</a>
                                            <button type="button" onClick={() => handleSelectChange("proof_of_completion", "")} className="ml-auto text-[10px] font-mono text-[#ef4444]/60 hover:text-[#ef4444]">remove</button>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*"
                                        className="text-[10px] font-mono text-white/40 file:text-[#f97316]/70 file:text-[9px] file:font-mono file:uppercase file:tracking-widest file:px-2 file:py-1 file:mr-2 file:cursor-pointer"
                                        style={{ "--file-bg": "#080c10" } as React.CSSProperties}
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (!file) return;
                                            try { const url = await handleImageUpload(file); handleSelectChange("proof_of_completion", url); } catch (err) { console.error(err); } finally { e.target.value = ""; }
                                        }} />
                                    <p className="text-[9px] font-mono text-white/20 mt-1">You can also paste an image from clipboard.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm discard dialog */}
            <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
                <DialogContent className="sm:max-w-[360px] rounded-none p-0" style={{ backgroundColor: "#080c10", border: "1px solid rgba(255,255,255,0.1)", zIndex: 60 }}>
                    <DialogHeader className="px-5 py-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                        <DialogTitle className="text-[11px] font-mono font-bold text-[#eab308] uppercase tracking-[0.2em]">⚠ Discard changes?</DialogTitle>
                        <DialogDescription className="text-[10px] font-mono text-white/30 mt-1">You have unsaved changes. Closing will reset the form.</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end gap-2 px-5 py-4">
                        <button onClick={() => setShowConfirmClose(false)} className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-white/40 hover:text-[#f97316] transition-colors" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>Keep editing</button>
                        <button onClick={confirmClose} className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-[#ef4444] hover:bg-[#ef4444]/10 transition-colors" style={{ border: "1px solid rgba(239,68,68,0.4)" }}>Discard</button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
