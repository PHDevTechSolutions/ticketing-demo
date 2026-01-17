"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from "@/components/ui/alert";
import {
    AlertCircleIcon,
    CheckCircle2Icon,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardHeader } from "@/components/ui/card";
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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { type DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

import { ServiceDialog } from "@/components/catalogue/services-dialog";
import { supabase } from "@/utils/supabase";

interface CatalogueItem {
    id: string;
    category: string;
    sub_category: string;
    system: string;
    description: string;
    request_type: string;
    impact: string;
    urgency: string;
    asset: string;
    estimate_resolution_time: string;
    dsi_resolution_time: string;
    priority: string;
}

interface CatalogueProps {
    referenceid: string;
    fullname: string;
    dateCreatedFilterRange: DateRange | undefined;
}

const PAGE_SIZE = 10;

export const Catalogue: React.FC<CatalogueProps> = ({
    referenceid,
    fullname,
    dateCreatedFilterRange,
}) => {
    const [activities, setActivities] = useState<CatalogueItem[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [errorActivities, setErrorActivities] = useState<string | null>(null);

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");

    const [open, setOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [, forceTick] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            forceTick((t) => t + 1);
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const [form, setForm] = useState<Omit<CatalogueItem, "id">>({
        category: "",
        sub_category: "",
        system: "",
        description: "",
        request_type: "",
        impact: "",
        urgency: "",
        asset: "",
        estimate_resolution_time: "",
        dsi_resolution_time: "",
        priority: "",
    });

    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

    const fetchActivities = useCallback(async () => {
        if (!referenceid) {
            setActivities([]);
            return;
        }
        setLoadingActivities(true);
        setErrorActivities(null);

        try {
            const { data, error } = await supabase
                .from("service_catalogue")
                .select("*")
                .order("date_created", { ascending: false });

            if (error) throw error;

            setActivities(data ?? []);
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
            .channel(`public:service_catalogue:referenceid=eq.${referenceid}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "service_catalogue",
                },
                (payload) => {
                    const newRecord = payload.new as CatalogueItem;
                    const oldRecord = payload.old as CatalogueItem;

                    setActivities((curr) => {
                        switch (payload.eventType) {
                            case "INSERT":
                                if (!curr.some((a) => a.id === newRecord.id)) {
                                    return [...curr, newRecord];
                                }
                                return curr;
                            case "UPDATE":
                                return curr.map((a) =>
                                    a.id === newRecord.id ? newRecord : a
                                );
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

        return activities.filter((item) => {
            const matchesSearch =
                search.trim() === "" ||
                Object.values(item).some((val) =>
                    val.toString().toLowerCase().includes(search.toLowerCase())
                );

            if (!matchesSearch) return false;

            return true;
        });
    }, [activities, search, dateCreatedFilterRange]);

    const groupedByCategory = useMemo(() => {
        const groups: Record<string, CatalogueItem[]> = {};

        filteredActivities.forEach((item) => {
            if (!groups[item.category]) {
                groups[item.category] = [];
            }
            groups[item.category].push(item);
        });

        return groups;
    }, [filteredActivities]);


    const pageCount = Math.ceil(filteredActivities.length / PAGE_SIZE);

    const paginatedActivities = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredActivities.slice(start, start + PAGE_SIZE);
    }, [filteredActivities, page]);

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        handleSelectChange(name as keyof Omit<CatalogueItem, "id">, value);
    }

    function handleSelectChange(name: string, value: string) {
        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    }

    async function handleSubmit() {
        try {
            const { error } = await supabase
                .from("service_catalogue")
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

        const payload = { ...form };

        const { error } = await supabase
            .from("service_catalogue")
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
            category: "",
            sub_category: "",
            system: "",
            description: "",
            request_type: "",
            impact: "",
            urgency: "",
            asset: "",
            estimate_resolution_time: "",
            dsi_resolution_time: "",
            priority: "",
        });
        setEditingId(null);
    }

    function openEditDialog(item: CatalogueItem) {
        setEditingId(item.id);
        setForm({
            category: item.category,
            sub_category: item.sub_category,
            system: item.system,
            description: item.description,
            request_type: item.request_type,
            impact: item.impact,
            urgency: item.urgency,
            asset: item.asset,
            estimate_resolution_time: item.estimate_resolution_time,
            dsi_resolution_time: item.dsi_resolution_time,
            priority: item.priority,
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
        const allSelected = paginatedActivities.every((item) =>
            selectedIds.has(item.id)
        );
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
            const { error } = await supabase
                .from("service_catalogue")
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
                        placeholder="Search Tickets..."
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
                    </div>
                </div>
            </CardHeader>

            {loadingActivities ? (
                <div className="flex justify-center py-10">
                    <Spinner />
                </div>
            ) : filteredActivities.length === 0 ? (
                <div className="text-muted-foreground text-sm p-3 border rounded-lg text-center">
                    No data available.
                </div>
            ) : (
                <>
                    <Accordion type="multiple" className="space-y-2">
                        {Object.entries(groupedByCategory).map(([category, items]) => (
                            <AccordionItem key={category} value={category}>
                                <AccordionTrigger className="font-semibold">
                                    {category} ({items.length})
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="space-y-2">
                                        {items.map((item) => (
                                            <div
                                                key={item.id}
                                                className="flex items-center justify-between p-2 rounded border hover:bg-gray-50"
                                            >
                                                <div className="flex items-center space-x-2">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(item.id)}
                                                        onChange={() => toggleSelect(item.id)}
                                                        aria-label={`Select item ${item.id}`}
                                                        className="cursor-pointer"
                                                    />
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => openEditDialog(item)}
                                                    >
                                                        Edit
                                                    </Button>
                                                    <div className="ml-2 min-w-[200px]">
                                                        <p className="font-semibold">{item.sub_category}</p>
                                                        <p className="text-sm text-muted-foreground">{item.description}</p>
                                                    </div>
                                                </div>

                                                <div className="flex space-x-4 text-xs min-w-[300px]">
                                                    <p><strong>System:</strong> {item.system}</p>
                                                    <p><strong>Request Type:</strong> {item.request_type}</p>
                                                    <p><strong>Impact:</strong> {item.impact}</p>
                                                    <p><strong>Urgency:</strong> {item.urgency}</p>
                                                    <p><strong>Asset:</strong> {item.asset}</p>
                                                    <p><strong>Est. Resolution:</strong> {item.estimate_resolution_time}</p>
                                                    <p><strong>DSI Resolution:</strong> {item.dsi_resolution_time}</p>
                                                    <Badge variant="secondary" className="capitalize">
                                                        {item.priority}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>

                    {/* Pagination */}
                    <div className="flex justify-end mt-4">
                        <Button
                            onClick={() => setPage((p) => Math.max(p - 1, 1))}
                            disabled={page <= 1}
                            className="mr-2"
                        >
                            Previous
                        </Button>
                        <div className="px-4 py-1 text-sm font-medium">
                            {pageCount === 0 ? "0 / 0" : `${page} / ${pageCount}`}
                        </div>
                        <Button
                            onClick={() => setPage((p) => Math.min(p + 1, pageCount))}
                            disabled={page >= pageCount}
                            className="ml-2"
                        >
                            Next
                        </Button>
                    </div>
                </>
            )}

            <ServiceDialog
                open={open}
                setOpen={setOpen}
                editingId={editingId}
                form={form}
                handleInputChange={handleInputChange}
                handleSelectChange={handleSelectChange}
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
