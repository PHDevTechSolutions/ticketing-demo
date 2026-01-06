"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableHead,
    TableHeader,
    TableRow,
    TableCell,
} from "@/components/ui/table";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";

import { type DateRange } from "react-day-picker";
import { toast } from "sonner";

import { LicenseDialog } from "@/components/license-dialog";
import { LicenseFilterDialog } from "@/components/license-filter-dialog";
import { supabase } from "@/utils/supabase"; // adjust path if needed

interface LicenseItem {
    id: string; // Supabase uses `id` not `_id`
    software_name?: string;
    software_version?: string;
    total_purchased: string;
    managed_installation?: string;
    remaining?: string;
    compliance_status?: string;
    action?: string;
    purchase_date?: string;
    asset_age?: string;
    remarks?: string;
    date_created?: string;
}

interface LicenseProps {
    referenceid: string;
    dateCreatedFilterRange: DateRange | undefined;
    setDateCreatedFilterRangeAction: React.Dispatch<
        React.SetStateAction<DateRange | undefined>
    >;
}

const PAGE_SIZE = 10;

export const License: React.FC<LicenseProps> = ({
    referenceid,
    dateCreatedFilterRange,
}) => {
    const [activities, setActivities] = useState<LicenseItem[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [errorActivities, setErrorActivities] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [form, setForm] = useState<Omit<LicenseItem, "id" | "date_created">>({
        software_name: "",
        software_version: "",
        total_purchased: "",
        managed_installation: "",
        remaining: "",
        compliance_status: "",
        action: "",
        purchase_date: "",
        asset_age: "",
        remarks: "",
    });

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);

    const [filters, setFilters] = useState({
        compliance_status: "",
        action: "",
    });

    function handleSelectChange(name: string, value: string) {
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    }

    function handleSetAssetTag(value: string) {
        setForm((prev) => ({ ...prev, asset_tag: value }));
    }


    const fetchActivities = useCallback(async () => {
        if (!referenceid) {
            setActivities([]);
            return;
        }
        setLoadingActivities(true);
        setErrorActivities(null);

        try {
            const { data, error } = await supabase
                .from("license")
                .select("*")
                .eq("referenceid", referenceid)
                .order("date_created", { ascending: false });

            if (error) throw error;

            setActivities(data ?? []);
        } catch (error: any) {
            setErrorActivities(error.message || "Error fetching activities");
            toast.error(error.message || "Error fetching activities");
        } finally {
            setLoadingActivities(false);
        }
    }, [referenceid]);

    useEffect(() => {
        fetchActivities();
    }, [referenceid, fetchActivities]);

    useEffect(() => {
        fetchActivities();

        if (!referenceid) return;

        const channel = supabase
            .channel(`public:license:referenceid=eq.${referenceid}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "license",
                    filter: `referenceid=eq.${referenceid}`,
                },
                (payload) => {
                    const newRecord = payload.new as LicenseItem;
                    const oldRecord = payload.old as LicenseItem;

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
    }, [referenceid, fetchActivities]);

    function handleFilterChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setFilters((prev) => ({ ...prev, [name]: value }));
    }

    function resetFilters() {
        setFilters({
            compliance_status: "",
            action: "",
        });
    }

    function applyFilters() {
        setPage(1);
        setFilterSheetOpen(false);
    }

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

            const matchesFilters = Object.entries(filters).every(([key, filterValue]) => {
                if (!filterValue) return true;
                const itemValue = item[key as keyof LicenseItem];
                return (
                    itemValue
                        ?.toString()
                        .toLowerCase()
                        .includes(filterValue.toLowerCase()) ?? false
                );
            });

            if (!matchesFilters) return false;

            if (startDate || endDate) {
                if (!item.purchase_date) return false;

                const itemDate = new Date(item.purchase_date);
                if (isNaN(itemDate.getTime())) return false;

                if (startDate && itemDate < startDate) return false;
                if (endDate && itemDate > endDate) return false;
            }

            return true;
        });
    }, [activities, search, filters, dateCreatedFilterRange]);

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
                .from("license")
                .insert([{ ...form, referenceid }]);

            if (error) throw error;

            toast.success("License created successfully!");
            fetchActivities();
            setOpen(false);
            resetForm();
        } catch (error: any) {
            toast.error(error.message || "Error creating license");
        }
    }

    async function handleUpdate() {
        if (!editingId) {
            alert("No item selected for update");
            return;
        }

        try {
            const { data, error } = await supabase
                .from("license")
                .update(form)
                .eq("id", editingId);

            if (error) throw error;

            toast.success("License updated successfully!");
            fetchActivities();
            setOpen(false);
            resetForm();
        } catch (error: any) {
            toast.error(error.message || "Error updating license");
        }
    }

    function resetForm() {
        setForm({
            software_name: "",
            software_version: "",
            total_purchased: "",
            managed_installation: "",
            remaining: "",
            compliance_status: "",
            action: "",
            purchase_date: "",
            asset_age: "",
            remarks: "",
        });
        setEditingId(null);
    }

    function openEditDialog(item: LicenseItem) {
        setEditingId(item.id);
        setForm({
            software_name: item.software_name ?? "",
            software_version: item.software_version ?? "",
            total_purchased: item.total_purchased,
            managed_installation: item.managed_installation ?? "",
            remaining: item.remaining ?? "",
            compliance_status: item.compliance_status ?? "",
            action: item.action ?? "",
            purchase_date: item.purchase_date ?? "",
            asset_age: item.asset_age ?? "",
            remarks: item.remarks ?? "",
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
                .from("license")
                .delete()
                .in("id", Array.from(selectedIds));

            if (error) throw error;

            toast.success(`${selectedIds.size} item(s) deleted successfully.`);
            setSelectedIds(new Set());
            setConfirmDeleteOpen(false);
            fetchActivities();
        } catch (error: any) {
            toast.error(error.message || "Error deleting license items");
            setConfirmDeleteOpen(false);
        }
    }

    if (errorActivities) {
        return (
            <Alert variant="destructive" className="flex flex-col space-y-4 p-4 text-xs">
                <div className="flex items-center space-x-3">
                    <AlertCircleIcon className="h-6 w-6 text-red-600" />
                    <div>
                        <AlertTitle>No Data Found or No Network Connection</AlertTitle>
                        <AlertDescription className="text-xs">
                            Please check your internet connection or try again later.
                        </AlertDescription>
                    </div>
                </div>

                <div className="flex items-center space-x-3">
                    <CheckCircle2Icon className="h-6 w-6 text-green-600" />
                    <div>
                        <AlertTitle className="text-black">Create New Data</AlertTitle>
                        <AlertDescription className="text-xs">
                            You can start by adding new entries to populate your database.
                        </AlertDescription>
                    </div>
                </div>
            </Alert>
        );
    }

    return (
        <Card className="w-full p-4 rounded-xl flex flex-col">
            <CardHeader className="p-0 mb-2">
                <div className="flex items-center justify-between space-x-4">
                    <Input
                        placeholder="Search license..."
                        className="text-xs flex-grow max-w-[400px]"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                            setSelectedIds(new Set());
                        }}
                    />

                    <div className="flex space-x-2 items-center">
                        {selectedIds.size > 0 && (
                            <Button variant="destructive" onClick={handleDeleteSelected}>
                                Delete Selected ({selectedIds.size})
                            </Button>
                        )}
                        <Button
                            onClick={() => {
                                resetForm();
                                setOpen(true);
                            }}
                        >
                            Add New
                        </Button>

                        <LicenseFilterDialog
                            open={filterSheetOpen}
                            setOpen={setFilterSheetOpen}
                            filters={filters}
                            handleFilterChange={handleFilterChange}
                            resetFilters={resetFilters}
                            applyFilters={applyFilters}
                        />
                    </div>
                </div>
            </CardHeader>

            {loadingActivities ? (
                <div className="flex justify-center py-10">
                    <Spinner />
                </div>
            ) : filteredActivities.length === 0 ? (
                <div className="text-muted-foreground text-sm p-3 border rounded-lg text-center">
                    No license data available.
                </div>
            ) : (
                <>
                    <Table className="text-xs">
                        <TableHeader>
                            <TableRow>
                                <TableHead>
                                    <input
                                        type="checkbox"
                                        onChange={toggleSelectAll}
                                        checked={
                                            paginatedActivities.length > 0 &&
                                            paginatedActivities.every((item) => selectedIds.has(item.id))
                                        }
                                        aria-label="Select all items on page"
                                    />
                                </TableHead>
                                <TableHead>Actions</TableHead>
                                <TableHead>Software Name</TableHead>
                                <TableHead>Software Version</TableHead>
                                <TableHead>Total Purchased</TableHead>
                                <TableHead>Managed Installations</TableHead>
                                <TableHead>Remaining</TableHead>
                                <TableHead>Compliance Status</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Purchased Date</TableHead>
                                <TableHead>Asset Age</TableHead>
                                <TableHead>Remarks</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedActivities.map((item) => (
                                <TableRow key={item.id} className="odd:bg-white even:bg-gray-50">
                                    <TableCell>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => toggleSelect(item.id)}
                                            aria-label={`Select item ${item.software_name || item.id}`}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Button size="sm" variant="outline" onClick={() => openEditDialog(item)}>
                                            Edit
                                        </Button>
                                    </TableCell>
                                    <TableCell>{item.software_name || "-"}</TableCell>
                                    <TableCell>{item.software_version || "-"}</TableCell>
                                    <TableCell>{item.total_purchased || "-"}</TableCell>
                                    <TableCell>{item.managed_installation || "-"}</TableCell>
                                    <TableCell>{item.remaining || "-"}</TableCell>
                                    <TableCell>{item.compliance_status || "-"}</TableCell>
                                    <TableCell>{item.action || "-"}</TableCell>
                                    <TableCell>
                                        {item.purchase_date
                                            ? new Date(item.purchase_date).toLocaleDateString()
                                            : "-"}
                                    </TableCell>
                                    <TableCell>{item.asset_age || "-"}</TableCell>
                                    <TableCell>{item.remarks || "-"}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    <div className="flex justify-end mt-4">
                        <Pagination>
                            <PaginationContent className="flex items-center space-x-4">
                                <PaginationItem>
                                    <PaginationPrevious
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            if (page > 1) setPage(page - 1);
                                        }}
                                        aria-disabled={page <= 1}
                                        className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                                    />
                                </PaginationItem>

                                <div className="px-4 font-medium">
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
                                        className={page >= pageCount ? "pointer-events-none opacity-50" : ""}
                                    />
                                </PaginationItem>
                            </PaginationContent>
                        </Pagination>
                    </div>
                </>
            )}

            <LicenseDialog
                open={open}
                setOpen={setOpen}
                editingId={editingId}
                form={form}
                handleInputChange={handleInputChange}
                handleSelectChange={handleSelectChange}
                handleSetAssetTag={handleSetAssetTag}
                handleSubmit={handleSubmit}
                handleUpdate={handleUpdate}
                resetForm={resetForm}
            />


            <Dialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete{" "}
                            <strong>{selectedIds.size}</strong> selected item
                            {selectedIds.size > 1 ? "s" : ""}?
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setConfirmDeleteOpen(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDeletion}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
};
