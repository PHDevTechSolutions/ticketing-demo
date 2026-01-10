"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue, } from "@/components/ui/select";

interface InventoryDialogProps {
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

export const InventoryDialog: React.FC<InventoryDialogProps> = ({
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
    // Options arrays
    const assetTypeOptions = ["LAPTOP", "MONITOR", "DESKTOP"];
    const statusOptions = [
        "SPARE",
        "DEPLOYED",
        "LEND",
        "MISSING",
        "DEFECTIVE",
        "DISPOSE",
    ];
    const locationOptions = [
        "J&L",
        "PRIMEX",
        "PASIG WH",
        "CDO",
        "CEBU",
        "DAVAO",
        "BUILDCHEM",
        "DISRUPTIVE",
    ];
    const departmentOptions = [
        "HUMAN RESOURCES",
        "INFORMATION TECHNOLOGY",
        "MARKETING",
        "SALES",
        "ACCOUNTING",
        "PROCUREMENT",
        "ADMIN",
        "WAREHOUSE OPERATIONS",
        "ENGINEERING",
        "CUSTOMER SERVICE",
        "ECOMMERCE",
        "PRODUCT DEVELOPMENT"
    ];

    const [isLoadingAssetTag, setIsLoadingAssetTag] = useState(false);

    useEffect(() => {
        async function fetchNextAssetTag() {
            if (!form.asset_type) return;

            setIsLoadingAssetTag(true);
            handleSetAssetTag(""); // Clear previous asset tag while loading

            try {
                const res = await fetch(`/api/get-next-asset-tag?asset_type=${encodeURIComponent(form.asset_type)}`);
                if (!res.ok) throw new Error("Failed to fetch asset tag");

                const data = await res.json();
                if (data.asset_tag) {
                    handleSetAssetTag(data.asset_tag);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoadingAssetTag(false);
            }
        }

        fetchNextAssetTag();
    }, [form.asset_type]);

    useEffect(() => {
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

        // Only update if value changed to avoid infinite loop
        if (form.asset_age !== assetAgeString) {
            handleInputChange({
                target: { name: "asset_age", value: assetAgeString },
            } as React.ChangeEvent<HTMLInputElement>);
        }
    }, [form.purchase_date, form.asset_age, handleInputChange]);

    // Auto-set warranty_date = purchase_date + 1 year
    useEffect(() => {
        if (!form.purchase_date) {
            if (form.warranty_date !== "") {
                handleInputChange({
                    target: { name: "warranty_date", value: "" },
                } as React.ChangeEvent<HTMLInputElement>);
            }
            return;
        }

        const purchaseDate = new Date(form.purchase_date);

        // Add 1 year
        const warranty = new Date(
            purchaseDate.getFullYear() + 1,
            purchaseDate.getMonth(),
            purchaseDate.getDate()
        );

        // Format to YYYY-MM-DD for input field
        const formatted = warranty.toISOString().split("T")[0];

        if (form.warranty_date !== formatted) {
            handleInputChange({
                target: { name: "warranty_date", value: formatted },
            } as React.ChangeEvent<HTMLInputElement>);
        }
    }, [form.purchase_date, form.warranty_date, handleInputChange]);


    return (
        <Dialog
            open={open}
            onOpenChange={(open) => {
                setOpen(open);
                if (!open) resetForm();
            }}
        >
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>{editingId ? "Edit Inventory" : "Add New Inventory"}</DialogTitle>
                    <DialogDescription>
                        Fill out the form below to {editingId ? "update" : "add"} an inventory item.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-auto pr-2">
                    {/* Asset Tag */}
                    {!editingId && (
                        <>
                            {/* Asset Tag */}
                            <div className="flex flex-col">
                                <label htmlFor="asset_tag" className="mb-1 text-xs font-medium">
                                    Asset Tag <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    id="asset_tag"
                                    name="asset_tag"
                                    value={isLoadingAssetTag ? "Generating..." : form.asset_tag || ""}
                                    onChange={handleInputChange}
                                    placeholder="Asset Tag"
                                    type="text"
                                    disabled
                                />
                            </div>

                            {/* Asset Type (Select) */}
                            <div className="flex flex-col">
                                <label htmlFor="asset_type" className="mb-1 text-xs font-medium">
                                    Asset Type
                                </label>
                                <Select
                                    value={form.asset_type || ""}
                                    onValueChange={(value) => handleSelectChange("asset_type", value)}
                                >
                                    <SelectTrigger id="asset_type" className="w-full">
                                        <SelectValue placeholder="Select asset type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Asset Type</SelectLabel>
                                            {assetTypeOptions.map((option) => (
                                                <SelectItem key={option} value={option}>
                                                    {option}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>
                        </>
                    )}

                    {/* Status (Select, required) */}
                    <div className="flex flex-col">
                        <label htmlFor="status" className="mb-1 text-xs font-medium">
                            Status <span className="text-red-500">*</span>
                        </label>
                        <Select
                            value={form.status || ""}
                            onValueChange={(value) => handleSelectChange("status", value)}
                        >
                            <SelectTrigger id="status" className="w-full">
                                <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Status</SelectLabel>
                                    {statusOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Location (Select) */}
                    <div className="flex flex-col">
                        <label htmlFor="location" className="mb-1 text-xs font-medium">
                            Location
                        </label>
                        <Select
                            value={form.location || ""}
                            onValueChange={(value) => handleSelectChange("location", value)}
                        >
                            <SelectTrigger id="location" className="w-full">
                                <SelectValue placeholder="Select location" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Location</SelectLabel>
                                    {locationOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* New User */}
                    <div className="flex flex-col">
                        <label htmlFor="new_user" className="mb-1 text-xs font-medium">
                            New User
                        </label>
                        <Input
                            id="new_user"
                            name="new_user"
                            value={form.new_user || ""}
                            onChange={handleInputChange}
                            placeholder="New User"
                            type="text"
                        />
                    </div>

                    {/* Old User */}
                    <div className="flex flex-col">
                        <label htmlFor="old_user" className="mb-1 text-xs font-medium">
                            Old User
                        </label>
                        <Input
                            id="old_user"
                            name="old_user"
                            value={form.old_user || ""}
                            onChange={handleInputChange}
                            placeholder="Old User"
                            type="text"
                        />
                    </div>

                    {/* Department (Select) */}
                    <div className="flex flex-col">
                        <label htmlFor="department" className="mb-1 text-xs font-medium">
                            Department
                        </label>
                        <Select
                            value={form.department || ""}
                            onValueChange={(value) => handleSelectChange("department", value)}
                        >
                            <SelectTrigger id="department" className="w-full">
                                <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectLabel>Department</SelectLabel>
                                    {departmentOptions.map((option) => (
                                        <SelectItem key={option} value={option}>
                                            {option}
                                        </SelectItem>
                                    ))}
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Position, Brand, Model, Processor, RAM, Storage, Serial Number, Purchase Date, Asset Age */}
                    {[
                        { label: "Position", name: "position" },
                        { label: "Brand", name: "brand" },
                        { label: "Model", name: "model" },
                        { label: "Processor", name: "processor" },
                        { label: "RAM", name: "ram" },
                        { label: "Storage", name: "storage" },
                        { label: "Serial Number", name: "serial_number" },
                        { label: "Purchase Date", name: "purchase_date", type: "date" },
                        { label: "Asset Age", name: "asset_age" },
                    ].map(({ label, name, type }) => (
                        <div key={name} className="flex flex-col">
                            <label htmlFor={name} className="mb-1 text-xs font-medium">
                                {label}
                            </label>
                            <Input
                                id={name}
                                name={name}
                                value={form[name as keyof typeof form] || ""}
                                onChange={handleInputChange}
                                placeholder={label}
                                type={type || "text"}
                            />
                        </div>
                    ))}

                    <Input
                        id="warranty_date"
                        name="warranty_date"
                        value={form.warranty_date || ""}
                        onChange={handleInputChange}
                        type="hidden"
                    />

                    {/* Amount and MAC Address side by side */}
                    <div className="col-span-2 grid grid-cols-2 gap-4">
                        {/* Amount */}
                        <div className="flex flex-col">
                            <label htmlFor="amount" className="mb-1 text-xs font-medium">
                                Amount
                            </label>
                            <Input
                                id="amount"
                                name="amount"
                                value={form.amount || ""}
                                onChange={handleInputChange}
                                placeholder="Amount"
                                type="number"
                            />
                        </div>

                        {/* MAC Address */}
                        <div className="flex flex-col">
                            <label htmlFor="mac_address" className="mb-1 text-xs font-medium">
                                MAC Address
                            </label>
                            <Input
                                id="mac_address"
                                name="mac_address"
                                value={form.mac_address || ""}
                                onChange={handleInputChange}
                                placeholder="MAC Address"
                                type="text"
                            />
                        </div>
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
