"use client";

import React, { useEffect, useRef } from "react";
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

interface TicketDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    editingId?: string | null;
    form: Record<string, any>;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSelectChange: (name: string, value: string) => void;
    handleSubmit: () => void;
    handleUpdate: () => void;
    resetForm: () => void;
}

export const ServiceDialog: React.FC<TicketDialogProps> = ({
    open,
    setOpen,
    editingId,
    form,
    handleInputChange,
    handleSelectChange,
    handleSubmit,
    handleUpdate,
    resetForm,
}) => {

    return (
        <Sheet
            open={open}
            onOpenChange={(open) => {
                setOpen(open);
                if (!open) resetForm();
            }}
        >
            <SheetContent side="right" className="w-[420px] sm:w-[540px]">
                <SheetHeader>
                    <SheetTitle>
                        {editingId ? "Edit Catalogue" : "Add New Catalogue"}
                    </SheetTitle>
                    <SheetDescription>
                        Fill out the form below to {editingId ? "update" : "add"} a service catalogue.
                    </SheetDescription>
                </SheetHeader>

                <div className="mt-6 grid grid-cols-1 gap-4 max-h-[70vh] overflow-auto p-4">

                    <div className="flex flex-col w-full">
                        <label className="mb-1 text-xs font-medium">Category</label>
                        <Select
                            value={form.category || ""}
                            onValueChange={(value) =>
                                handleSelectChange("category", value)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select category" />
                            </SelectTrigger>

                            <SelectContent className="w-full">
                                <SelectItem value="Account Management">Account Management</SelectItem>
                                <SelectItem value="Application">Application</SelectItem>
                                <SelectItem value="Asset Management">Asset Management</SelectItem>
                                <SelectItem value="Backup">Backup</SelectItem>
                                <SelectItem value="Desktop/Laptop">Desktop/Laptop</SelectItem>
                                <SelectItem value="Downtime">Downtime</SelectItem>
                                <SelectItem value="Email">Email</SelectItem>
                                <SelectItem value="Firewall">Email</SelectItem>
                                <SelectItem value="Hardware">Hardware</SelectItem>
                                <SelectItem value="IT Advisory">IT Advisory</SelectItem>
                                <SelectItem value="IT Policy">IT Policy</SelectItem>
                                <SelectItem value="IT Preventive Maintenance">IT Preventive Maintenance</SelectItem>
                                <SelectItem value="Mobile Device">Mobile Device</SelectItem>
                                <SelectItem value="Network">Network</SelectItem>
                                <SelectItem value="Network Device">Network Device</SelectItem>
                                <SelectItem value="Printer">Printer</SelectItem>
                                <SelectItem value="Security">Security</SelectItem>
                                <SelectItem value="Server">Server</SelectItem>
                                <SelectItem value="System">System</SelectItem>
                                <SelectItem value="Telephony/Printing">Telephony/Printing</SelectItem>
                                <SelectItem value="Website">Website</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col w-full">
                        <label className="mb-1 text-xs font-medium">Sub Category</label>
                        <Select
                            value={form.sub_category || ""}
                            onValueChange={(value) => handleSelectChange("sub_category", value)}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select sub category" />
                            </SelectTrigger>
                            <SelectContent className="w-full">
                                {form.category === "Account Management" ? (
                                    <SelectItem value="System Access">System Access</SelectItem>
                                ) : form.category === "Application" ? (
                                    <>
                                        <SelectItem value="System Access">System Access</SelectItem>
                                        <SelectItem value="Acculog">Acculog</SelectItem>
                                        <SelectItem value="Taskflow">Taskflow</SelectItem>
                                        <SelectItem value="Ecodesk">Ecodesk</SelectItem>
                                        <SelectItem value="User Account">User Account</SelectItem>
                                        <SelectItem value="Shared Folder">Shared Folder</SelectItem>
                                        <SelectItem value="VPN">VPN</SelectItem>
                                        <SelectItem value="Creation of Account">Creation of Account</SelectItem>
                                    </>
                                ) : form.category === "Asset Management" ? (
                                    <>
                                        <SelectItem value="IT Asset Tagging">IT Asset Tagging</SelectItem>
                                        <SelectItem value="Asset Disposal">Asset Disposal</SelectItem>
                                    </>

                                ) : form.category === "Backup" ? (
                                    <>
                                        <SelectItem value="Server Backup">Server Backup</SelectItem>
                                    </>

                                ) : form.category === "Desktop/Laptop" ? (
                                    <>
                                        <SelectItem value="Hardware">Hardware</SelectItem>
                                        <SelectItem value="Software">Software</SelectItem>
                                        <SelectItem value="Preventive Maintenance">Preventive Maintenance</SelectItem>
                                    </>

                                ) : form.category === "Downtime" ? (
                                    <>
                                        <SelectItem value="SAP B1">SAP B1</SelectItem>
                                        <SelectItem value="Internet">Internet</SelectItem>
                                        <SelectItem value="Acculog">Acculog</SelectItem>
                                        <SelectItem value="TaskFlow">TaskFlow</SelectItem>
                                    </>

                                ) : form.category === "Email" ? (
                                    <>
                                        <SelectItem value="Account Creation">Account Creation</SelectItem>
                                        <SelectItem value="Access Issue">Access Issue</SelectItem>
                                        <SelectItem value="Security">Security</SelectItem>
                                        <SelectItem value="Account Status">Account Status</SelectItem>
                                        <SelectItem value="Backup">Backup</SelectItem>
                                        <SelectItem value="Distribution List">Distribution List</SelectItem>
                                        <SelectItem value="Mailbox Size">Mailbox Size</SelectItem>
                                    </>

                                ) : form.category === "Firewall" ? (
                                    <>
                                        <SelectItem value="Security">Security</SelectItem>
                                        <SelectItem value="DHCP">DHCP</SelectItem>
                                    </>

                                ) : form.category === "Hardware" ? (
                                    <>
                                        <SelectItem value="Monitor">Monitor</SelectItem>
                                        <SelectItem value="Keyboard/Mouse">Keyboard/Mouse</SelectItem>
                                        <SelectItem value="CCTV">CCTV</SelectItem>
                                        <SelectItem value="Mesh">Mesh</SelectItem>
                                        <SelectItem value="Access Point">Access Point</SelectItem>
                                        <SelectItem value="Router">Router</SelectItem>

                                    </>

                                ) : form.category === "IT Advisory" ? (
                                    <>
                                        <SelectItem value="TaskFlow">Downtime/Threat</SelectItem>

                                    </>

                                ) : form.category === "IT Policy" ? (
                                    <>
                                        <SelectItem value="Restrictions/Memo">Restrictions/Memo</SelectItem>

                                    </>

                                ) : form.category === "IT Preventive Maintenance" ? (
                                    <>
                                        <SelectItem value="Hardware">Hardware</SelectItem>

                                    </>

                                ) : form.category === "Mobile Device" ? (
                                    <>
                                        <SelectItem value="MDM Registration">MDM Registration</SelectItem>

                                    </>

                                ) : form.category === "Network" ? (
                                    <>
                                        <SelectItem value="Connectivity">Connectivity</SelectItem>
                                        <SelectItem value="Cabling">Cabling</SelectItem>

                                    </>

                                ) : form.category === "Network Device" ? (
                                    <>
                                        <SelectItem value="Router">Router</SelectItem>
                                        <SelectItem value="Modem">Modem</SelectItem>
                                        <SelectItem value="Mesh Wi-Fi">Mesh Wi-Fi</SelectItem>

                                    </>

                                ) : form.category === "Printer" ? (
                                    <>
                                        <SelectItem value="Printer Toner">Printer Toner</SelectItem>
                                        <SelectItem value="Replacement / Repair">Replacement / Repair</SelectItem>

                                    </>

                                ) : form.category === "Security" ? (
                                    <>
                                        <SelectItem value="Antivirus">Antivirus</SelectItem>

                                    </>

                                ) : form.category === "Server" ? (
                                    <>
                                        <SelectItem value="SAP B1">SAP B1</SelectItem>
                                        <SelectItem value="Email Server">Email Server</SelectItem>
                                        <SelectItem value="Web Server">Web Server</SelectItem>
                                    </>

                                ) : form.category === "System" ? (
                                    <>
                                        <SelectItem value="Windows Update">Windows Update</SelectItem>
                                        <SelectItem value="Credentials">Credentials</SelectItem>
                                        <SelectItem value="Account">Account</SelectItem>

                                    </>

                                ) : form.category === "Telephony/Printing" ? (
                                    <>
                                        <SelectItem value="IP Phone / Printer">IP Phone / Printer</SelectItem>

                                    </>

                                ) : form.category === "Website" ? (
                                    <>
                                        <SelectItem value="Downtime/Threat">Downtime/Threat</SelectItem>
                                        <SelectItem value="Update/Delete">Update/Delete</SelectItem>

                                    </>

                                ) : (

                                    <>
                                        {/* Optional: other subcategories or empty */}
                                    </>

                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col">
                        <label className="mb-1 text-xs font-medium">System (Incident) or Action (Request/Maintenance)</label>
                        <Input
                            name="system"
                            value={form.system || ""}
                            onChange={handleInputChange}
                            placeholder="System (Incident) or Action (Request/Maintenance)"
                            className="capitalize"
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="mb-1 text-xs font-medium">Description or Sample Case</label>
                        <textarea
                            name="description"
                            value={form.description || ""}
                            onChange={(e) =>
                                handleSelectChange("description", e.target.value)
                            }
                            rows={5}
                            placeholder="description"
                            className="rounded-md border border-input bg-background p-2 text-sm resize-none"
                        />
                    </div>

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
                                <SelectItem value="Maintenance">Maintenance</SelectItem>
                                <SelectItem value="Major Incident">Major Incident</SelectItem>
                                <SelectItem value="Incident / Service Request">Incident / Service Request</SelectItem>
                                <SelectItem value="Request">Request</SelectItem>
                                <SelectItem value="Service Request">Service Request</SelectItem>
                                <SelectItem value="Service Request / Incident">Service Request / Incident</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col w-full">
                        <label className="mb-1 text-xs font-medium">Impact</label>
                        <Select
                            value={form.impact || ""}
                            onValueChange={(value) =>
                                handleSelectChange("impact", value)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Impact" />
                            </SelectTrigger>
                            <SelectContent className="w-full">
                                <SelectItem value="Department">Department</SelectItem>
                                <SelectItem value="User">User</SelectItem>
                                <SelectItem value="Major Incident">Major Incident</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Organization">Organization</SelectItem>
                                <SelectItem value="Medium Incident">Medium Incident</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col w-full">
                        <label className="mb-1 text-xs font-medium">Urgency</label>
                        <Select
                            value={form.urgency || ""}
                            onValueChange={(value) =>
                                handleSelectChange("urgency", value)
                            }
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select Urgency" />
                            </SelectTrigger>
                            <SelectContent className="w-full">
                                <SelectItem value="Critical">Critical</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex flex-col">
                        <label className="mb-1 text-xs font-medium">Asset</label>
                        <Input
                            name="asset"
                            value={form.asset || ""}
                            onChange={handleInputChange}
                            className="capitalize"
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="mb-1 text-xs font-medium">Estimate Resolution Time</label>
                        <Input
                            name="estimate_resolution_time"
                            value={form.estimate_resolution_time || ""}
                            onChange={handleInputChange}
                            className="capitalize"
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="mb-1 text-xs font-medium">DSI Resolution Time</label>
                        <Input
                            name="dsi_resolution_time"
                            value={form.dsi_resolution_time || ""}
                            onChange={handleInputChange}
                            className="capitalize"
                        />
                    </div>

                    <div className="flex flex-col">
                        <label className="mb-1 text-xs font-medium">Priority</label>
                        <Input
                            name="priority"
                            value={form.priority || ""}
                            onChange={handleInputChange}
                            className="capitalize"
                        />
                    </div>
                </div>

                <SheetFooter className="mt-6 flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setOpen(false);
                            resetForm();
                        }}
                    >
                        Cancel
                    </Button>
                    <Button onClick={editingId ? handleUpdate : handleSubmit}>
                        {editingId ? "Update" : "Create"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet >
    );
};
