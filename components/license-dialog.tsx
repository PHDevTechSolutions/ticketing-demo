"use client";

import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LicenseDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    editingId?: string | null;
    form: Record<string, any>;
    handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSelectChange: (name: string, value: string) => void;
    handleSetAssetTag: (value: string) => void;
    handleSubmit: () => void;
    handleUpdate: () => void;
    resetForm: () => void;
}

export const LicenseDialog: React.FC<LicenseDialogProps> = ({
    open,
    setOpen,
    editingId,
    form,
    handleInputChange,
    handleSelectChange,
    handleSetAssetTag,
    handleSubmit,
    handleUpdate,
    resetForm,
}) => {

    useEffect(() => {
        // Use correct key 'purchase_date' to match input name
        if (!form.purchase_date) {
            if (form.asset_age !== "") {
                handleInputChange({
                    target: { name: "asset_age", value: "" },
                } as React.ChangeEvent<HTMLInputElement>);
            }
            return;
        }

        const purchaseDate = new Date(form.purchase_date);
        const now = new Date();

        if (purchaseDate > now) {
            if (form.asset_age !== "0y, 0m, 0d") {
                handleInputChange({
                    target: { name: "asset_age", value: "0y, 0m, 0d" },
                } as React.ChangeEvent<HTMLInputElement>);
            }
            return;
        }

        let years = now.getFullYear() - purchaseDate.getFullYear();
        let months = now.getMonth() - purchaseDate.getMonth();
        let days = now.getDate() - purchaseDate.getDate();

        if (days < 0) {
            months -= 1;
            const prevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
            days += prevMonth.getDate();
        }

        if (months < 0) {
            years -= 1;
            months += 12;
        }

        const assetAgeString = `${years}y, ${months}m, ${days}d`;

        if (form.asset_age !== assetAgeString) {
            handleInputChange({
                target: { name: "asset_age", value: assetAgeString },
            } as React.ChangeEvent<HTMLInputElement>);
        }
    }, [form.purchase_date, form.asset_age, handleInputChange]);

    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                setOpen(open);
                if (!open) resetForm();
            }}
        >
            <DialogContent className="max-w-3xl">
                <DialogHeader>
                    <DialogTitle>{editingId ? "Edit License" : "Add New License"}</DialogTitle>
                    <DialogDescription>
                        Fill out the form below to {editingId ? "update" : "add"} an license item.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-auto pr-2">
                    {/* Sofware Name */}
                    <div className="flex flex-col">
                        <label htmlFor="software_name" className="mb-1 text-xs font-medium">
                            Software Name
                        </label>
                        <Input
                            id="software_name"
                            name="software_name"
                            value={form.software_name || ""}
                            onChange={handleInputChange}
                            placeholder="Enter Software Name"
                            type="text"
                        />
                    </div>

                    {/* Software Version */}
                    <div className="flex flex-col">
                        <label htmlFor="software_version" className="mb-1 text-xs font-medium">
                            Software Version
                        </label>
                        <Input
                            id="software_version"
                            name="software_version"
                            value={form.software_version || ""}
                            onChange={handleInputChange}
                            placeholder="Enter Software Version"
                            type="text"
                        />
                    </div>

                    {/* Total Purchase */}
                    <div className="flex flex-col">
                        <label htmlFor="total_purchased" className="mb-1 text-xs font-medium">
                            Total Purchase
                        </label>
                        <Input
                            id="total_purchased"
                            name="total_purchased"
                            value={form.total_purchased || ""}
                            onChange={handleInputChange}
                            type="number"
                        />
                    </div>

                    {/* Managed Installations */}
                    <div className="flex flex-col">
                        <label htmlFor="managed_installation" className="mb-1 text-xs font-medium">
                            Managed Installation
                        </label>
                        <Input
                            id="managed_installation"
                            name="managed_installation"
                            value={form.managed_installation || ""}
                            onChange={handleInputChange}
                            type="text"
                        />
                    </div>

                    {/* Remaining */}
                    <div className="flex flex-col">
                        <label htmlFor="remaining" className="mb-1 text-xs font-medium">
                            Remaining
                        </label>
                        <Input
                            id="remaining"
                            name="remaining"
                            value={form.remaining || ""}
                            onChange={handleInputChange}
                            type="number"
                        />
                    </div>

                    {/* Compliance Status */}
                    <div className="flex flex-col">
                        <label htmlFor="compliance_status" className="mb-1 text-xs font-medium">
                            Compliance Status
                        </label>
                        <Input
                            id="compliance_status"
                            name="compliance_status"
                            value={form.compliance_status || ""}
                            onChange={handleInputChange}
                            type="text"
                        />
                    </div>

                    {/* Action */}
                    <div className="flex flex-col">
                        <label htmlFor="action" className="mb-1 text-xs font-medium">
                            Action
                        </label>
                        <Input
                            id="action"
                            name="action"
                            value={form.action || ""}
                            onChange={handleInputChange}
                            type="text"
                        />
                    </div>

                    {/* Purchased Date */}
                    <div className="flex flex-col">
                        <label htmlFor="purchase_date" className="mb-1 text-xs font-medium">
                            Purchased Date
                        </label>
                        <Input
                            id="purchase_date"
                            name="purchase_date"
                            value={form.purchase_date || ""}
                            onChange={handleInputChange}
                            type="date"
                        />
                    </div>

                    {/* Asset Age */}
                    <div className="flex flex-col">
                        <label htmlFor="asset_age" className="mb-1 text-xs font-medium">
                            Asset Age
                        </label>
                        <Input
                            id="asset_age"
                            name="asset_age"
                            value={form.asset_age || ""}
                            type="text"
                            readOnly
                        />

                    </div>

                    {/* Remarks textarea full width, single row, no resize */}
                    <div className="col-span-2 flex flex-col">
                        <label htmlFor="remarks" className="mb-1 text-xs font-medium">
                            Remarks
                        </label>
                        <textarea
                            id="remarks"
                            name="remarks"
                            value={form.remarks || ""}
                            onChange={(e) => handleInputChange(e as any)}
                            placeholder="Remarks"
                            rows={5}
                            className="rounded-md border border-gray-300 p-2 text-sm resize-none w-full"
                        />
                    </div>
                </div>

                <DialogFooter className="mt-4 flex justify-end space-x-2">
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
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
