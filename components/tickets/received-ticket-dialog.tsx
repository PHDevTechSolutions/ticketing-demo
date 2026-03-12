"use client";

import React, { useEffect, useRef, useState } from "react";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

interface TicketDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    editingId?: string | null;
    form: Record<string, any>;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    // change this line:
    handleSelectChange: (name: string, value: string | string[]) => void;
    handleSubmit: () => void;
    handleUpdate: () => void;
    resetForm: () => void;
    fullname: string;
    existingTicketIds: string[];
}

function generateTicketID(existingTicketIds: string[], dateCreated?: string): string {
    const prefix = "DSI";

    // Use dateCreated if provided, else current date
    const now = dateCreated ? new Date(dateCreated) : new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const datePart = `${year}-${month}-${day}`;

    // Filter tickets by the datePart (year-month-day)
    const todayIds = existingTicketIds.filter((id) => id.startsWith(`${prefix}-${datePart}`));

    let maxSeq = 0;
    for (const id of todayIds) {
        const parts = id.split("-");
        const seqStr = parts[4]; // expected sequence part
        const seqNum = parseInt(seqStr, 10);
        if (!isNaN(seqNum) && seqNum > maxSeq) {
            maxSeq = seqNum;
        }
    }

    const nextSeq = String(maxSeq + 1).padStart(3, "0");

    return `${prefix}-${datePart}-${nextSeq}`;
}

function toDateTimeLocalString(isoString?: string): string {
    if (!isoString) return "";

    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hour = String(date.getHours()).padStart(2, "0");
    const minute = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hour}:${minute}`;
}

// Convert local datetime string back to ISO timestamp (UTC)
function toISOStringFromLocalDateTime(localDateTime: string): string {
    // localDateTime format: yyyy-MM-ddTHH:mm
    const date = new Date(localDateTime);
    return date.toISOString();
}

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
    existingTicketIds
}) => {
    const [showConfirmClose, setShowConfirmClose] = useState(false);
    const initializedRef = useRef(false);

    const [users, setUsers] = useState<{ Firstname: string; Lastname: string; ReferenceID: string }[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [errorUsers, setErrorUsers] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchUsers = async () => {
            setLoadingUsers(true);
            setErrorUsers(null);
            try {
                const res = await fetch("/api/fetch-all-user");
                if (!res.ok) throw new Error("Failed to fetch users");
                const data = await res.json();
                setUsers(data);
            } catch (err: any) {
                console.error(err);
                setErrorUsers(err.message || "Error fetching users");
            } finally {
                setLoadingUsers(false);
            }
        };
        fetchUsers();
    }, []);

    useEffect(() => {
        if (open && !editingId && !initializedRef.current) {
            // Generate new ticket ID based on initial date_created or today
            const newTicketId = generateTicketID(existingTicketIds, form.date_created);
            handleInputChange({
                target: { name: "ticket_id", value: newTicketId },
            } as React.ChangeEvent<HTMLInputElement>);

            // Initialize other fields if empty
            if (!form.processed_by) {
                handleInputChange({
                    target: { name: "processed_by", value: fullname },
                } as React.ChangeEvent<HTMLInputElement>);
            }
            if (!form.technician_name) {
                handleInputChange({
                    target: { name: "technician_name", value: fullname },
                } as React.ChangeEvent<HTMLInputElement>);
            }
            if (!form.closed_by) {
                handleInputChange({
                    target: { name: "closed_by", value: fullname },
                } as React.ChangeEvent<HTMLInputElement>);
            }

            initializedRef.current = true;
        }

        if (!open) {
            initializedRef.current = false;
        }
    }, [open, editingId, existingTicketIds, fullname, handleInputChange, form.processed_by]);

    // New effect: regenerate ticket ID whenever date_created changes and not editing
    useEffect(() => {
        if (open && !editingId && form.date_created) {
            const newTicketId = generateTicketID(existingTicketIds, form.date_created);
            if (newTicketId !== form.ticket_id) {
                handleInputChange({
                    target: { name: "ticket_id", value: newTicketId },
                } as React.ChangeEvent<HTMLInputElement>);
            }
        }
    }, [form.date_created, open, editingId, existingTicketIds, handleInputChange, form.ticket_id]);

    const onDateCreatedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const localValue = e.target.value;
        const isoTimestamp = toISOStringFromLocalDateTime(localValue);

        handleInputChange({
            target: { name: "date_created", value: isoTimestamp }
        } as React.ChangeEvent<HTMLInputElement>);
    };

    const onDateClosedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const localValue = e.target.value;
        const isoTimestamp = toISOStringFromLocalDateTime(localValue);

        handleInputChange({
            target: { name: "date_closed", value: isoTimestamp }
        } as React.ChangeEvent<HTMLInputElement>);
    };

    const hasChanges = () => {
        // Checks if any form field is filled
        return Object.values(form).some((val) => val !== "" && val !== null && val !== undefined);
    };

    const handleAttemptClose = () => {
        if (hasChanges()) {
            setShowConfirmClose(true); // Show confirmation
        } else {
            setOpen(false); // No changes, safe to close
            resetForm();
        }
    };

    const confirmClose = () => {
        setShowConfirmClose(false);
        setOpen(false);
        resetForm();
    };

    const cancelClose = () => {
        setShowConfirmClose(false);
    };

    useEffect(() => {
        if (open && !editingId && !initializedRef.current) {
            // Initialize default fields like before...
            initializedRef.current = true;
        }

        if (!open) {
            initializedRef.current = false;
        }
    }, [open, editingId]);

    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);



    return (
        <>
            <Sheet
                open={open}
                onOpenChange={(newOpen) => {
                    if (!newOpen) handleAttemptClose();
                }}
            >
                <SheetContent side="right" className="w-[420px] sm:w-[540px]">
                    <SheetHeader>
                        <SheetTitle>
                            {editingId ? "Edit Ticket" : "Add New Ticket"}
                        </SheetTitle>
                        <SheetDescription>
                            Fill out the form below to {editingId ? "update" : "add"} a ticket.
                        </SheetDescription>
                    </SheetHeader>

                    <div className="grid grid-cols-1 gap-4 max-h-[70vh] overflow-auto pr-4 pl-4">

                        <div className="flex flex-col gap-4">
                            <Alert className="p-4">
                                <AlertTitle className="mb-2">Ticket Information</AlertTitle>
                                <AlertDescription>
                                    {/* Ticket ID display */}
                                    <div className="flex items-center gap-x-2 text-indigo-900">
                                        <div className="font-semibold whitespace-nowrap">
                                            Ticket ID:
                                        </div>
                                        <Input
                                            type="text"
                                            name="ticket_id"
                                            value={form.ticket_id || ""}
                                            onChange={handleInputChange}
                                            className="border-none shadow-none p-0"
                                        />
                                    </div>

                                    {/* Processed By display */}
                                    <div className="flex items-center gap-x-2 text-indigo-900">
                                        <div className="font-semibold whitespace-nowrap">
                                            Processed By:
                                        </div>
                                        <Input
                                            type="text"
                                            name="processed_by"
                                            value={form.processed_by || ""}
                                            onChange={handleInputChange}
                                            className="border-none shadow-none p-0"
                                        />
                                    </div>

                                    {/* Technician Name */}
                                    <div className="flex items-center gap-x-2 text-indigo-900">
                                        <div className="font-semibold whitespace-nowrap">
                                            Technician Name:
                                        </div>
                                        <Input
                                            type="text"
                                            name="technician_name"
                                            value={form.technician_name || ""}
                                            onChange={handleInputChange}
                                            className="border-none shadow-none p-0"
                                        />
                                    </div>

                                    {/* Closed By */}
                                    {form.status === "Resolved" && (
                                        <div className="flex items-center gap-x-2 text-indigo-900">
                                            <div className="font-semibold whitespace-nowrap">
                                                Closed By:
                                            </div>
                                            <Input
                                                type="text"
                                                name="closed_by"
                                                value={form.closed_by || ""}
                                                onChange={handleInputChange}
                                                className="border-none shadow-none p-0"
                                            />
                                        </div>
                                    )}

                                </AlertDescription>
                            </Alert>
                        </div>

                        {/* Full Name (Requestor) */}
                        <div className="flex flex-col relative">
                            <label className="mb-1 text-xs font-medium">Requestor Name</label>

                            {loadingUsers ? (
                                <div>Loading users...</div>
                            ) : errorUsers ? (
                                <div className="text-red-600 text-sm">{errorUsers}</div>
                            ) : (
                                <>
                                    <Input
                                        type="text"
                                        placeholder="Search requestor..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setIsDropdownOpen(true); // open dropdown when typing
                                        }}
                                        className="mb-1"
                                        onFocus={() => setIsDropdownOpen(true)} // open on focus
                                    />

                                    {isDropdownOpen && searchQuery && (
                                        <div
                                            ref={dropdownRef}
                                            className="absolute z-50 w-full max-h-60 overflow-auto rounded-md border bg-white shadow-md"
                                        >
                                            {users
                                                .filter((u) =>
                                                    `${u.Lastname}, ${u.Firstname}`
                                                        .toLowerCase()
                                                        .includes(searchQuery.toLowerCase())
                                                )
                                                .map((user) => (
                                                    <div
                                                        key={user.ReferenceID}
                                                        className="px-3 py-2 hover:bg-indigo-100 cursor-pointer"
                                                        onClick={() => {
                                                            const fullName = `${user.Lastname}, ${user.Firstname}`;
                                                            handleSelectChange("requestor_name", fullName);
                                                            setSearchQuery(fullName);
                                                            setIsDropdownOpen(false); // close dropdown on select
                                                        }}
                                                    >
                                                        {user.Lastname}, {user.Firstname}
                                                    </div>
                                                ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Concern Type */}
                        <div className="flex flex-col w-full">
                            <label className="mb-1 text-xs font-medium">Ticket Subject</label>
                            <Input
                                name="ticket_subject"
                                value={form.ticket_subject || ""}
                                onChange={handleInputChange}
                                placeholder="Ticket Subject"
                                className="capitalize"
                            />
                        </div>

                        {/* Department (SELECT) */}
                        <div className="flex flex-col w-full">
                            <label className="mb-1 text-xs font-medium">Department</label>

                            <Select
                                value={form.department || ""}
                                onValueChange={(value) =>
                                    handleSelectChange("department", value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>

                                <SelectContent className="w-full">
                                    <SelectItem value="Admin">Admin</SelectItem>
                                    <SelectItem value="Accounting">Accounting</SelectItem>
                                    <SelectItem value="Business Development">Business Development</SelectItem>
                                    <SelectItem value="Customer Service Representative">Customer Service Representative</SelectItem>
                                    <SelectItem value="Engineering">Engineering</SelectItem>
                                    <SelectItem value="E-Commerce">E-Commerce</SelectItem>
                                    <SelectItem value="Human Resources">Human Resources</SelectItem>
                                    <SelectItem value="Information Technology">Information Technology</SelectItem>
                                    <SelectItem value="Marketing">Marketing</SelectItem>
                                    <SelectItem value="Procurement">Procurement</SelectItem>
                                    <SelectItem value="Product Development">Product Development</SelectItem>
                                    <SelectItem value="Sales">Sales</SelectItem>
                                    <SelectItem value="Warehouse Operations">Warehouse Operations</SelectItem>
                                    <SelectItem value="Management">Management / Director</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Request Type */}
                        <div className="flex flex-col w-full">
                            <label className="mb-1 text-xs font-medium">Request Type</label>
                            <Select
                                value={form.request_type || ""}
                                onValueChange={(value) =>
                                    handleSelectChange("request_type", value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Type" />
                                </SelectTrigger>
                                <SelectContent className="w-full">
                                    <SelectItem value="Advisory">Advisory</SelectItem>
                                    <SelectItem value="Incident">Incident</SelectItem>
                                    <SelectItem value="Maintenance">Maintenance Request</SelectItem>
                                    <SelectItem value="Major Incident">Major Incident</SelectItem>
                                    <SelectItem value="Incident / Service Request">Incident / Service Request</SelectItem>
                                    <SelectItem value="Request">Request</SelectItem>
                                    <SelectItem value="Service Request">Service Request</SelectItem>
                                    <SelectItem value="Service Request / Incident">Service Request / Incident</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Concern Type */}
                        <div className="flex flex-col w-full">
                            <label className="mb-1 text-xs font-medium">Type of Concern</label>
                            <Select
                                value={form.type_concern || ""}
                                onValueChange={(value) =>
                                    handleSelectChange("type_concern", value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Concern" />
                                </SelectTrigger>
                                <SelectContent className="w-full">
                                    <SelectItem value="Incident">Incident</SelectItem>
                                    <SelectItem value="Request">Request</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Mode */}
                        <div className="flex flex-col w-full">
                            <label className="mb-1 text-xs font-medium">Mode</label>
                            <Select
                                value={form.mode || ""}
                                onValueChange={(value) =>
                                    handleSelectChange("mode", value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Mode" />
                                </SelectTrigger>
                                <SelectContent className="w-full">
                                    <SelectItem value="Chat">Chat</SelectItem>
                                    <SelectItem value="Email">Email</SelectItem>
                                    <SelectItem value="Phone Call">Phone Call</SelectItem>
                                    <SelectItem value="System Directory">System Directory ( Ecodesk, Taskflow, Acculog Etc.)</SelectItem>
                                    <SelectItem value="Walk In">Walk In</SelectItem>
                                    <SelectItem value="Web Form">Web Form</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Group */}
                        <div className="flex flex-col w-full">
                            <label className="mb-1 text-xs font-medium">Services Group</label>
                            <Select
                                value={form.group_services || ""}
                                onValueChange={(value) =>
                                    handleSelectChange("group_services", value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Service Group" />
                                </SelectTrigger>
                                <SelectContent className="w-full">
                                    <SelectItem value="Service Desk">Service Desk</SelectItem>
                                    <SelectItem value="System and Website Services">System and Website Services</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Site */}
                        <div className="flex flex-col w-full">
                            <label className="mb-1 text-xs font-medium">Site</label>
                            <Select
                                value={form.site || ""}
                                onValueChange={(value) =>
                                    handleSelectChange("site", value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Site" />
                                </SelectTrigger>
                                <SelectContent className="w-full">
                                    <SelectItem value="Disruptive - Primex">Disruptive - Primex</SelectItem>
                                    <SelectItem value="Disruptive - J&L">Disruptive - J&L</SelectItem>
                                    <SelectItem value="Buildchem - Carmona">Buildchem - Carmona</SelectItem>
                                    <SelectItem value="Disruptive - Pasig">Disruptive - Pasig</SelectItem>
                                    <SelectItem value="Disruptive - CDO">Disruptive - CDO</SelectItem>
                                    <SelectItem value="Disruptive - Cebu">Disruptive - Cebu</SelectItem>
                                    <SelectItem value="Disruptive - Davao">Disruptive - Davao</SelectItem>
                                    <SelectItem value="Disruptive - Granville">Disruptive - Granville</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Priority */}
                        <div className="flex flex-col w-full">
                            <label className="mb-1 text-xs font-medium">Priority</label>
                            <Select
                                value={form.priority || ""}
                                onValueChange={(value) =>
                                    handleSelectChange("priority", value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Site" />
                                </SelectTrigger>
                                <SelectContent className="w-full">
                                    <SelectItem value="Critical">P-1 - Critical (Response Time 15 Mins Max | Resolved Time 4 Hours Max) </SelectItem>
                                    <SelectItem value="High">P-2 - High (Response Time 1 Hour Max | Resolved Time 8 Hours Max) </SelectItem>
                                    <SelectItem value="Medium">P-3 - Medium (Response Time 4 Hour Max | Resolved Time 1-2 Days Max) </SelectItem>
                                    <SelectItem value="Low">P-4 - Low (Response Time 8 Hour Max | Resolved Time 3-4 Days Max) </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Status */}
                        <div className="flex flex-col w-full">
                            <label className="mb-1 text-xs font-medium">Status</label>
                            <Select
                                value={form.status || ""}
                                onValueChange={(value) =>
                                    handleSelectChange("status", value)
                                }
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Select Status" />
                                </SelectTrigger>
                                <SelectContent className="w-full">
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                                    <SelectItem value="Ongoing">Ongoing</SelectItem>
                                    <SelectItem value="Resolved">Resolved</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Remarks */}
                        <div className="flex flex-col">
                            <label className="mb-1 text-xs font-medium">Actions</label>
                            <textarea
                                name="remarks"
                                value={form.remarks || ""}
                                onChange={(e) =>
                                    handleSelectChange("remarks", e.target.value)
                                }
                                rows={5}
                                placeholder="Actions"
                                className="rounded-md border border-input bg-background p-2 text-sm resize-none"
                            />
                        </div>

                        {/* Date Scheduled */}
                        {form.status === "Scheduled" && (
                            <div className="flex flex-col w-full mt-2">
                                <label className="mb-1 text-xs font-medium">Date Scheduled</label>
                                <Input
                                    type="date"
                                    name="date_scheduled"
                                    value={form.date_scheduled || ""}
                                    onChange={handleInputChange}
                                />
                            </div>
                        )}

                        {/* Date Created */}
                        {form.status !== "Scheduled" && (
                            <div className="flex flex-col w-full mt-2">
                                <label className="mb-1 text-xs font-medium">Date Created</label>
                                <Input
                                    type="datetime-local"
                                    name="date_created"
                                    value={toDateTimeLocalString(form.date_created)}
                                    onChange={onDateCreatedChange}
                                />
                            </div>
                        )}

                        {form.status === "Resolved" && (
                            <div className="flex flex-col w-full mt-2">
                                <label className="mb-1 text-xs font-medium">Date Closed</label>
                                <Input
                                    type="datetime-local"
                                    name="date_closed"
                                    value={toDateTimeLocalString(form.date_closed)}
                                    onChange={onDateClosedChange}
                                />
                            </div>
                        )}

                        {form.status === "Resolved" && (
                            <div
                                className="flex flex-col w-full mt-2"
                                onPaste={async (e: React.ClipboardEvent<HTMLDivElement>) => {
                                    const items = e.clipboardData.items;
                                    for (const item of items) {
                                        if (item.type.startsWith("image/")) {
                                            const file = item.getAsFile();
                                            if (!file) return;

                                            try {
                                                const data = new FormData();
                                                data.append("file", file);
                                                data.append("upload_preset", "Xchire");
                                                data.append("folder", "proof_of_completion");

                                                const res = await fetch(
                                                    "https://api.cloudinary.com/v1_1/dhczsyzcz/auto/upload",
                                                    { method: "POST", body: data }
                                                );

                                                const uploaded = await res.json();
                                                const url = uploaded.secure_url;

                                                handleSelectChange("proof_of_completion", url);

                                            } catch (err) {
                                                console.error("Upload failed", err);

                                            }
                                        }
                                    }
                                }}
                            >
                                <label className="mb-1 text-xs font-medium">Proof of Completion</label>

                                {/* Existing uploaded proof as a link */}
                                {form.proof_of_completion && (
                                    <div className="flex items-center gap-2 mb-2">
                                        <a
                                            href={form.proof_of_completion}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-600 underline text-sm"
                                        >
                                            View Proof
                                        </a>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectChange("proof_of_completion", "")}
                                            className="bg-red-500 text-white rounded px-1 text-xs"
                                        >
                                            ×
                                        </button>
                                    </div>
                                )}

                                {/* Upload button */}
                                <Input
                                    type="file"
                                    accept="image/*"
                                    onChange={async (e) => {
                                        if (!e.target.files || !e.target.files[0]) return;

                                        const file = e.target.files[0];
                                        try {
                                            const data = new FormData();
                                            data.append("file", file);
                                            data.append("upload_preset", "Xchire");
                                            data.append("folder", "proof_of_completion");

                                            const res = await fetch(
                                                "https://api.cloudinary.com/v1_1/dhczsyzcz/auto/upload",
                                                { method: "POST", body: data }
                                            );

                                            const uploaded = await res.json();
                                            const url = uploaded.secure_url;

                                            handleSelectChange("proof_of_completion", url);

                                        } catch (err) {
                                            console.error("Upload failed", err);

                                        } finally {
                                            e.target.value = ""; // reset input
                                        }
                                    }}
                                />

                                <p className="text-xs text-gray-500 mt-1 border p-2 border-red-500">
                                    Click This and paste an image from clipboard or upload a file.
                                </p>
                            </div>
                        )}

                    </div>

                    <SheetFooter className="mt-6 flex justify-end gap-2">
                        <Button onClick={handleAttemptClose} variant="outline">
                            Cancel
                        </Button>
                        <Button onClick={editingId ? handleUpdate : handleSubmit}>
                            {editingId ? "Update" : "Create"}
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <Dialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
                <DialogContent className="sm:max-w-[400px] w-full p-6">
                    <DialogHeader>
                        <DialogTitle>Discard changes?</DialogTitle>
                        <DialogDescription>
                            You have unsaved changes. Are you sure you want to close and reset the form?
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-6 flex justify-end gap-2">
                        <Button variant="outline" onClick={cancelClose}>
                            Cancel
                        </Button>
                        <Button onClick={confirmClose}>Discard</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
};
