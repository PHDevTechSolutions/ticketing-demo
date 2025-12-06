"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent, } from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon, CheckCircle2Icon } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DoneDialog } from "./activity-done-dialog";
import { UpdateTicketDialog } from "./ticket-update-dialog";
import { ActDeleteDialog } from "./act-delete-dialog";
import { ActFilterDialog } from "./act-filter-dialog";
import { type DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, } from "@/components/ui/card";
import { Item, ItemActions, ItemContent, ItemDescription, ItemFooter, ItemMedia, ItemTitle, } from "@/components/ui/item";
import { Progress } from "@/components/ui/progress";

interface Company {
    id: string;
    account_reference_number: string;
    company_name: string;
    contact_number?: string;
    type_client?: string;
    email_address: string;
    contact_person: string;
    address: string;
    status: string;
}

interface MergedActivity extends Ticket {
    company_name: string;
    contact_number: string;
    type_client: string;
    contact_person: string;
    email_address: string;
    address: string;
}

interface Ticket {
    _id: string;
    ticket_reference_number: string;
    ticket_received?: string;
    ticket_endorsed?: string;
    traffic?: string;
    source_company?: string;
    channel?: string;
    wrap_up?: string;
    source?: string;
    customer_type?: string;
    customer_status?: string;
    status: string;
    department?: string;
    manager?: string;
    agent?: string;
    remarks?: string;
    inquiry?: string;
    item_code?: string;
    item_description?: string;
    po_number?: string;
    so_date?: string;
    so_number?: string;
    so_amount?: string;
    qty_sold?: string;
    quotation_number?: string;
    quotation_amount?: string;
    payment_terms?: string;
    po_source?: string;
    payment_date?: string;
    delivery_date?: string;

    referenceid: string;
    activity_reference_number: string;
    account_reference_number: string;
    date_updated: string;
    date_created: string;
}

interface TicketProps {
    referenceid: string;
    dateCreatedFilterRange: DateRange | undefined;
    setDateCreatedFilterRangeAction: React.Dispatch<
        React.SetStateAction<DateRange | undefined>
    >;
}

export const Ticket: React.FC<TicketProps> = ({
    referenceid,
    dateCreatedFilterRange,
    setDateCreatedFilterRangeAction,
}) => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [activities, setActivities] = useState<Ticket[]>([]);
    const [loadingCompanies, setLoadingCompanies] = useState(false);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [errorCompanies, setErrorCompanies] = useState<string | null>(null);
    const [errorActivities, setErrorActivities] = useState<string | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);

    const [addingAccount, setAddingAccount] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // For activities right side search and pagination
    const [activitySearchTerm, setActivitySearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const [showCheckboxes, setShowCheckboxes] = useState(false);
    const [selectedToDelete, setSelectedToDelete] = useState<string[]>([]);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [filterDialogOpen, setFilterDialogOpen] = useState(false);

    const [filters, setFilters] = useState<{
        source_company?: string;
        source?: string;
        wrap_up?: string;
        traffic?: string;
        department?: string;
        channel?: string;
        customer_status?: string;
        customer_type?: string;
        remarks?: string;
        status?: string;
    }>({});

    // Sorting field and order
    const sortableFields = [
        "source_company",
        "source",
        "wrap_up",
        "traffic",
        "department",
        "channel",
        "customer_status",
        "customer_type",
        "remarks",
        "status",
        "date_created",
        "date_updated",
    ];
    const [sortField, setSortField] = useState<string>("date_updated");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

    const [exporting, setExporting] = useState(false);
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        if (!exporting) {
            setProgress(0);
            return;
        }

        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 1; // increase 1% every interval
            });
        }, 10); // every 50ms, so ~5 seconds to reach 100%

        return () => clearInterval(interval);
    }, [exporting]);

    const handleFilterChange = (field: keyof typeof filters, value: string) => {
        setFilters((prev) => ({
            ...prev,
            [field]: value || undefined, // clear filter if empty string
        }));
    };

    // Fetch companies on mount
    useEffect(() => {
        setLoadingCompanies(true);
        setErrorCompanies(null);

        fetch(`/api/com-fetch-account`, {
            cache: "no-store",
            headers: {
                "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
                Pragma: "no-cache",
                Expires: "0",
            },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Failed to fetch company data");
                return res.json();
            })
            .then((data) => {
                setCompanies(data.data || []);
            })
            .catch((err) => {
                setErrorCompanies(err.message || "Error fetching company data");
            })
            .finally(() => {
                setLoadingCompanies(false);
            });
    }, []);

    // Fetch activities when referenceid changes
    const fetchActivities = useCallback(async () => {
        if (!referenceid) {
            setActivities([]);
            return;
        }
        setLoadingActivities(true);
        setErrorActivities(null);

        try {
            const res = await fetch(
                `/api/act-fetch-activity?referenceid=${encodeURIComponent(referenceid)}`,
                {
                    cache: "no-store",
                    headers: {
                        "Cache-Control":
                            "no-store, no-cache, must-revalidate, proxy-revalidate",
                        Pragma: "no-cache",
                        Expires: "0",
                    },
                }
            );

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || "Failed to fetch activities");
            }

            const json = await res.json();
            setActivities(json.data || []);
        } catch (error: any) {
            setErrorActivities(error.message || "Error fetching activities");
        } finally {
            setLoadingActivities(false);
        }
    }, [referenceid]);

    useEffect(() => {
        fetchActivities();
    }, [referenceid, fetchActivities]);

    const isDateInRange = (dateStr: string, range: DateRange | undefined): boolean => {
        if (!range) return true;
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return false;
        const { from, to } = range;
        if (from && date < from) return false;
        if (to && date > to) return false;
        return true;
    };

    const allowedStatuses = ["On-Progress", "Closed", "Endorsed", "Converted into Sales"];

    // Merge activity with company info, filter by status and date range
    const mergedData = React.useMemo(() => {
        if (companies.length === 0) return [];

        return activities
            .filter((a) => allowedStatuses.includes(a.status))
            .filter((a) => isDateInRange(a.date_created, dateCreatedFilterRange))
            .map((activity) => {
                const company = companies.find(
                    (c) => c.account_reference_number === activity.account_reference_number
                );
                return {
                    ...activity,
                    company_name: company?.company_name ?? "Unknown Company",
                    contact_number: company?.contact_number ?? "-",
                    type_client: company?.type_client ?? "",
                    contact_person: company?.contact_person ?? "",
                    email_address: company?.email_address ?? "",
                    address: company?.address ?? "",
                };
            })
            .sort(
                (a, b) =>
                    new Date(b.date_updated).getTime() - new Date(a.date_updated).getTime()
            );
    }, [activities, companies, dateCreatedFilterRange]);

    const filteredAndSortedData = useMemo(() => {
        let data = mergedData;

        // Step 1: Search bar filter (activitySearchTerm)
        if (activitySearchTerm.trim() !== "") {
            const term = activitySearchTerm.toLowerCase();
            data = data.filter((item) => {
                return (
                    item.company_name.toLowerCase().includes(term) ||
                    item.status.toLowerCase().includes(term) ||
                    item.activity_reference_number.toLowerCase().includes(term) ||
                    item.account_reference_number.toLowerCase().includes(term)
                );
            });
        }

        // Step 2: UI filters from filters object
        Object.entries(filters).forEach(([key, val]) => {
            if (val && val.trim() !== "") {
                data = data.filter((item) => {
                    const itemValue = (item as any)[key];
                    return itemValue?.toString().toLowerCase().includes(val.toLowerCase());
                });
            }
        });

        // Step 3: Sort the filtered data
        data = data.slice().sort((a, b) => {
            let aVal = (a as any)[sortField];
            let bVal = (b as any)[sortField];

            if (sortField === "date_created" || sortField === "date_updated") {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            } else {
                aVal = aVal ? aVal.toString().toLowerCase() : "";
                bVal = bVal ? bVal.toString().toLowerCase() : "";
            }

            if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
            if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
            return 0;
        });

        return data;
    }, [mergedData, activitySearchTerm, filters, sortField, sortOrder]);

    const isLoading = loadingCompanies || loadingActivities;
    const error = errorCompanies || errorActivities;

    const excludedCompanyStatuses = ["Pending", "Transferred", "Remove"];

    const filteredCompanies = companies.filter((c) => {
        if (excludedCompanyStatuses.includes(c.status)) return false;

        // Filter only companies with type_client === "CSR Client"
        if (c.type_client !== "CSR Client") return false;

        const term = searchTerm.toLowerCase();
        return (
            (c.company_name?.toLowerCase().includes(term) ?? false) ||
            (c.email_address?.toLowerCase().includes(term) ?? false) ||
            (c.contact_number?.toLowerCase().includes(term) ?? false) ||
            (c.contact_person?.toLowerCase().includes(term) ?? false)
        );
    });

    const MAX_DISPLAY = 20;

    const displayedCompanies = searchTerm
        ? filteredCompanies
        : filteredCompanies.slice(0, MAX_DISPLAY);

    // Filter activities by search term (right side)
    const filteredActivities = useMemo(() => {
        if (!activitySearchTerm.trim()) return mergedData;

        const term = activitySearchTerm.toLowerCase();
        return mergedData.filter((item) => {
            return (
                item.company_name.toLowerCase().includes(term) ||
                item.status.toLowerCase().includes(term) ||
                item.activity_reference_number.toLowerCase().includes(term) ||
                item.account_reference_number.toLowerCase().includes(term)
            );
        });
    }, [activitySearchTerm, mergedData]);

    const totalPages = Math.ceil(filteredAndSortedData.length / ITEMS_PER_PAGE);

    const paginatedActivities = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredAndSortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [currentPage, filteredAndSortedData]);

    const goToPage = (page: number) => {
        if (page < 1) page = 1;
        else if (page > totalPages) page = totalPages;
        setCurrentPage(page);
    };

    // Generates activity reference number from company initials + region + timestamp
    function generateActivityReferenceNumber(companyName: string): string {
        const initials = companyName
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
        const region = "REG"; // TODO: replace with real region logic if needed
        const timestamp = Date.now();
        return `${initials}-${region}-${timestamp}`;
    }

    const openDoneDialog = (_id: string) => {
        // Make sure id is defined and non-empty
        if (!_id) {
            toast.error("Invalid activity ID");
            return;
        }
        setSelectedActivityId(_id);
        setDialogOpen(true);
    };

    const handleConfirmDone = async () => {
        if (!selectedActivityId) return;

        try {
            setUpdatingId(selectedActivityId);
            setDialogOpen(false);

            // Find the activity to update in your current state (activities or mergedData)
            const activityToUpdate = activities.find(a => a._id === selectedActivityId);
            if (!activityToUpdate) {
                toast.error("Activity not found in current data.");
                setUpdatingId(null);
                return;
            }

            // Prepare updated activity data
            const updatedActivity = {
                ...activityToUpdate,
                status: "Closed", // or your desired final status
                date_updated: new Date().toISOString(),
                // Add or modify other fields if needed
            };

            const res = await fetch("/api/act-update-status", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedActivity),
                cache: "no-store",
            });

            const result = await res.json();

            if (!res.ok) {
                toast.error(`Failed to update status: ${result.error || "Unknown error"}`);
                setUpdatingId(null);
                return;
            }

            await fetchActivities();

            toast.success("Transaction marked as Done.");
        } catch {
            toast.error("An error occurred while updating status.");
        } finally {
            setUpdatingId(null);
            setSelectedActivityId(null);
        }
    };



    const handleAddActivity = async (company: Company) => {
        if (!referenceid) {
            toast.error("Missing reference ID");
            return;
        }

        setAddingAccount(company.account_reference_number);

        const newActivityReferenceNumber = generateActivityReferenceNumber(company.company_name);

        const payload = {
            referenceid, // <-- from props, NOT company
            account_reference_number: company.account_reference_number,
            status: "On-Progress",
            activity_reference_number: newActivityReferenceNumber,
        };

        try {
            const res = await fetch("/api/act-save-account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
                cache: "no-store",
            });

            const json = await res.json();

            if (!res.ok) {
                toast.error(`Failed to save activity: ${json.error || "Unknown error"}`);
                setAddingAccount(null);
                return;
            }

            toast.success("Activity added.");
            await fetchActivities();
        } catch (error) {
            toast.error("Error saving activity");
        } finally {
            setAddingAccount(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-40">
                <Spinner className="size-8" />
            </div>
        );
    }

    if (error) {
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

    const toggleSelect = (id: string) => {
        setSelectedToDelete((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    // Delete selected activities handler
    const handleDeleteConfirm = async () => {
        if (selectedToDelete.length === 0) {
            toast.error("No activity selected.");
            return;
        }

        try {
            setDeleting(true);
            // Example delete API, adjust path & method as needed
            const res = await fetch("/api/act-delete-activity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedToDelete }),
            });
            const result = await res.json();

            if (!res.ok) {
                toast.error(result.error || "Failed to delete activities.");
                setDeleting(false);
                return;
            }

            toast.success("Selected activities deleted.");
            setSelectedToDelete([]);
            setShowCheckboxes(false);
            await fetchActivities();
        } catch (err) {
            toast.error("Error deleting activities.");
        } finally {
            setDeleting(false);
            setShowDeleteConfirm(false);
        }
    };

    async function handleExportCsv(data: MergedActivity[]) {
        if (!data.length) {
            toast.error("No data to export.");
            return;
        }

        try {
            setExporting(true);

            await new Promise((r) => setTimeout(r, 1000));

            const headers = [
                "Activity Reference Number",
                "Company Name",
                "Status",
                "Date Created",
                "Date Updated",
                "Contact Person",
                "Contact Number",
                "Email Address",
                "Ticket Received",
                "Ticket Endorsed",
                "Traffic",
                "Source Company",
                "Channel",
                "Wrap Up",
                "Source",
                "Customer Type",
                "Customer Status",
                "Department",
                "Manager",
                "Agent",
                "Remarks",
                "Inquiry",
                "Item Code",
                "Item Description",
                "PO Number",
                "SO Date",
                "SO Number",
                "SO Amount",
                "Qty Sold",
                "Quotation Number",
                "Quotation Amount",
                "Payment Terms",
                "PO Source",
                "Payment Date",
                "Delivery Date",
            ];

            const formatDate = (dateStr?: string) => {
                if (!dateStr) return "-";
                const d = new Date(dateStr);
                return isNaN(d.getTime()) ? "-" : d.toLocaleString();
            };

            const rows = data.map((item: MergedActivity) => [
                item.activity_reference_number,
                item.company_name,
                item.status,
                formatDate(item.date_created),
                formatDate(item.date_updated),
                item.contact_person || "-",
                item.contact_number || "-",
                item.email_address || "-",
                item.ticket_received || "-",
                item.ticket_endorsed || "-",
                item.traffic || "-",
                item.source_company || "-",
                item.channel || "-",
                item.wrap_up || "-",
                item.source || "-",
                item.customer_type || "-",
                item.customer_status || "-",
                item.department || "-",
                item.manager || "-",
                item.agent || "-",
                item.remarks || "-",
                item.inquiry || "-",
                item.item_code || "-",
                item.item_description || "-",
                item.po_number || "-",
                formatDate(item.so_date),
                item.so_number || "-",
                item.so_amount || "-",
                item.qty_sold || "-",
                item.quotation_number || "-",
                item.quotation_amount || "-",
                item.payment_terms || "-",
                item.po_source || "-",
                formatDate(item.payment_date),
                formatDate(item.delivery_date),
            ]);


            const csvContent =
                [
                    headers.join(","),
                    ...rows.map((row) =>
                        row
                            .map((field) => `"${String(field).replace(/"/g, '""')}"`)
                            .join(",")
                    ),
                ].join("\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `activities_${Date.now()}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            toast.success("CSV file downloaded.");
        } catch (error) {
            toast.error("Failed to export CSV.");
            console.error(error);
        } finally {
            setExporting(false);
        }
    }

    return (
        <div className="flex flex-col md:flex-row gap-4">
            {/* LEFT SIDE — COMPANIES */}
            <Card className="w-full md:w-1/3 p-3 rounded-lg">
                <CardHeader className="p-0">
                    <CardTitle className="text-sm font-semibold">Companies</CardTitle>
                </CardHeader>

                <CardContent className="p-0 flex flex-col">
                    <input
                        type="search"
                        placeholder="Search company, email, contact, person..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mb-3 px-3 py-2 border rounded-md text-sm"
                    />

                    {displayedCompanies.length === 0 ? (
                        <div className="text-muted-foreground text-sm p-3 border rounded-lg">
                            No company info available.
                        </div>
                    ) : (
                        <Accordion
                            type="multiple"
                            className="overflow-auto space-y-2 p-2 max-h-[500px]"
                        >
                            {displayedCompanies.map((c) => (
                                <AccordionItem
                                    key={c.account_reference_number}
                                    value={c.account_reference_number}
                                >
                                    <div className="flex items-center justify-between text-xs font-semibold gap-2 px-4 py-2">
                                        <AccordionTrigger className="text-xs font-semibold flex-1 text-left">
                                            <span
                                                className="flex-1 text-left break-words whitespace-normal"
                                                style={{ minWidth: 0 }}
                                            >
                                                {c.company_name}
                                            </span>
                                        </AccordionTrigger>

                                        <Button
                                            variant="outline"
                                            disabled={addingAccount === c.account_reference_number}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddActivity(c);
                                            }}
                                            className="text-xs px-3 py-1"
                                        >
                                            {addingAccount === c.account_reference_number
                                                ? "Adding..."
                                                : "Add"}
                                        </Button>
                                    </div>

                                    <AccordionContent className="text-xs px-4 pb-2 pt-0">
                                        <p>
                                            <strong>Contact Number:</strong> {c.contact_number || "-"}
                                        </p>
                                        <p>
                                            <strong>Email Address:</strong> {c.email_address || "-"}
                                        </p>
                                        <p>
                                            <strong>Contact Person:</strong> {c.contact_person || "-"}
                                        </p>
                                        <p>
                                            <strong>Type Client:</strong> {c.type_client || "-"}
                                        </p>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </CardContent>
            </Card>

            {/* RIGHT SIDE — ACTIVITIES */}
            <Card className="w-full md:w-2/3 p-4 rounded-xl flex flex-col">
                <div className="mb-2 text-xs font-bold">
                    Total On-Progress Activities: {filteredActivities.length}
                </div>

                <div className="flex mb-3 space-x-2 items-center">
                    <input
                        type="search"
                        placeholder="Search activities by company, status, reference number..."
                        value={activitySearchTerm}
                        onChange={(e) => {
                            setActivitySearchTerm(e.target.value);
                            setCurrentPage(1);
                        }}
                        className="flex-grow px-3 py-2 border rounded-md text-sm"
                    />

                    <Button onClick={() => setFilterDialogOpen(true)}>Filter</Button>

                    <Button
                        variant="outline"
                        disabled={filteredActivities.length === 0}
                        onClick={() => handleExportCsv(filteredActivities)}
                    >
                        Export CSV
                    </Button>

                    <Button
                        variant={showCheckboxes ? "secondary" : "outline"}
                        disabled={filteredActivities.length === 0}
                        onClick={() => {
                            if (showCheckboxes) {
                                // Cancel delete mode
                                setShowCheckboxes(false);
                                setSelectedToDelete([]);
                            } else {
                                setShowCheckboxes(true);
                            }
                        }}
                        className="whitespace-nowrap"
                    >
                        {showCheckboxes ? "Cancel" : "Delete"}
                    </Button>

                    {showCheckboxes && selectedToDelete.length > 0 && (
                        <Button
                            variant="destructive"
                            onClick={() => setShowDeleteConfirm(true)}
                        >
                            Delete Selected ({selectedToDelete.length})
                        </Button>
                    )}
                </div>

                {/* ACTIVITIES LIST */}
                <div className="max-h-[400px] overflow-auto space-y-4 custom-scrollbar flex-grow">
                    <Accordion type="single" collapsible className="w-full">
                        {paginatedActivities.map((item, index) => {
                            let badgeColor: "default" | "secondary" | "outline" = "default";

                            if (item.status === "Assisted" || item.status === "SO-Done") {
                                badgeColor = "secondary";
                            } else if (item.status === "Quote-Done") {
                                badgeColor = "outline";
                            }

                            const isChecked = selectedToDelete.includes(item._id);

                            return (
                                <AccordionItem key={`${item._id}-${index}`} value={String(item._id)}>
                                    <div className="p-2 flex items-center space-x-2">
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <AccordionTrigger className="flex-1 text-xs font-semibold cursor-pointer">
                                                    {showCheckboxes && (
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => toggleSelect(item._id)}
                                                            className="ml-1 w-5 h-5 cursor-pointer"
                                                            onClick={(e) => e.stopPropagation()} // prevent accordion toggle
                                                        />
                                                    )}
                                                    {new Date(item.date_updated ?? item.date_created).toLocaleDateString()}{" "}
                                                    <span className="text-[10px] text-muted-foreground mx-1">|</span>{" "}
                                                    {new Date(item.date_updated ?? item.date_created).toLocaleTimeString([], {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                    })}{" "}
                                                    <span className="mx-1">-</span> {item.company_name}
                                                </AccordionTrigger>

                                                {!showCheckboxes && (
                                                    <div className="flex gap-2 ml-4">
                                                        <UpdateTicketDialog
                                                            {...{
                                                                _id: item._id,
                                                                ticket_reference_number: item.ticket_reference_number,
                                                                ticket_received: item.ticket_received,
                                                                ticket_endorsed: item.ticket_endorsed,
                                                                traffic: item.traffic,
                                                                source_company: item.source_company,
                                                                channel: item.channel,
                                                                wrap_up: item.wrap_up,
                                                                source: item.source,
                                                                customer_type: item.customer_type,
                                                                customer_status: item.customer_status,
                                                                status: item.status,
                                                                department: item.department,
                                                                manager: item.manager,
                                                                agent: item.agent,
                                                                remarks: item.remarks,
                                                                inquiry: item.inquiry,
                                                                item_code: item.item_code,
                                                                item_description: item.item_description,
                                                                po_number: item.po_number,
                                                                so_date: item.so_date,
                                                                so_number: item.so_number,
                                                                so_amount: item.so_amount,
                                                                qty_sold: item.qty_sold,
                                                                quotation_number: item.quotation_number,
                                                                quotation_amount: item.quotation_amount,
                                                                payment_terms: item.payment_terms,
                                                                po_source: item.po_source,
                                                                payment_date: item.payment_date,
                                                                delivery_date: item.delivery_date,
                                                                referenceid: item.referenceid,
                                                                type_client: item.type_client,
                                                                contact_number: item.contact_number,
                                                                email_address: item.email_address,
                                                                company_name: item.company_name,
                                                                contact_person: item.contact_person,
                                                                address: item.address,
                                                            }}
                                                            onCreated={() => fetchActivities()}
                                                        />

                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            disabled={updatingId === item._id}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                openDoneDialog(item._id);
                                                            }}
                                                        >
                                                            {updatingId === item._id ? "Updating..." : "Closed"}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="ml-1">
                                                <Badge variant={badgeColor} className="text-[8px]">
                                                    {item.status.replace("-", " ")}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <AccordionContent className="text-xs px-4 py-2">
                                        {/* Always show contact info */}
                                        <p><strong>Contact Person:</strong> {item.contact_person || "-"}</p>
                                        <p><strong>Contact Number:</strong> {item.contact_number || "-"}</p>
                                        <p><strong>Email Address:</strong> {item.email_address || "-"}</p>
                                        <p><strong>Date Created:</strong> {new Date(item.date_created).toLocaleDateString()}</p>

                                        {/* Define the ticket fields to display */}
                                        {[
                                            { label: "Ticket Received", value: item.ticket_received },
                                            { label: "Ticket Endorsed", value: item.ticket_endorsed },
                                            { label: "Traffic", value: item.traffic },
                                            { label: "Source Company", value: item.source_company },
                                            { label: "Channel", value: item.channel },
                                            { label: "Wrap Up", value: item.wrap_up },
                                            { label: "Source", value: item.source },
                                            { label: "Customer Type", value: item.customer_type },
                                            { label: "Customer Status", value: item.customer_status },
                                            { label: "Status", value: item.status },  // status is mandatory so will always show
                                            { label: "Department", value: item.department },
                                            { label: "Manager", value: item.manager },
                                            { label: "Agent", value: item.agent },
                                            { label: "Remarks", value: item.remarks },
                                            { label: "Inquiry", value: item.inquiry },
                                            { label: "Item Code", value: item.item_code },
                                            { label: "Item Description", value: item.item_description },
                                            { label: "PO Number", value: item.po_number },
                                            { label: "SO Date", value: item.so_date },
                                            { label: "SO Number", value: item.so_number },
                                            { label: "SO Amount", value: item.so_amount },
                                            { label: "Quantity Sold", value: item.qty_sold },
                                            { label: "Quotation Number", value: item.quotation_number },
                                            { label: "Quotation Amount", value: item.quotation_amount },
                                            { label: "Payment Terms", value: item.payment_terms },
                                            { label: "PO Source", value: item.po_source },
                                            { label: "Payment Date", value: item.payment_date },
                                            { label: "Delivery Date", value: item.delivery_date },
                                        ].map(({ label, value }) =>
                                            value ? (
                                                <p key={label}>
                                                    <strong>{label}:</strong> {value}
                                                </p>
                                            ) : null
                                        )}
                                    </AccordionContent>

                                </AccordionItem>
                            );
                        })}
                    </Accordion>
                </div>

                {/* PAGINATION CONTROLS */}
                <div className="mt-4 flex justify-center items-center space-x-2 text-xs">
                    <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage <= 1}
                        onClick={() => goToPage(currentPage - 1)}
                    >
                        Prev
                    </Button>

                    <span>
                        Page {currentPage} / {totalPages || 1}
                    </span>

                    <Button
                        size="sm"
                        variant="outline"
                        disabled={currentPage >= totalPages}
                        onClick={() => goToPage(currentPage + 1)}
                    >
                        Next
                    </Button>
                </div>

                {/* CONFIRM DELETE DIALOG */}
                <ActDeleteDialog
                    open={showDeleteConfirm}
                    onOpenChange={setShowDeleteConfirm}
                    selectedToDeleteCount={selectedToDelete.length}
                    deleting={deleting}
                    onConfirm={handleDeleteConfirm}
                />

                <ActFilterDialog
                    filterDialogOpen={filterDialogOpen}
                    setFilterDialogOpen={setFilterDialogOpen}
                    filters={filters}
                    handleFilterChange={handleFilterChange}
                    sortField={sortField}
                    setSortField={setSortField}
                    sortOrder={sortOrder}
                    setSortOrder={setSortOrder}
                    mergedData={mergedData}
                    sortableFields={sortableFields}
                />

            </Card>

            <DoneDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onConfirm={handleConfirmDone}
            />

            {exporting && (
                <div
                    className="fixed top-4 right-4 z-50 w-full max-w-md flex flex-col gap-4 rounded-xl shadow-lg bg-white p-4"
                    style={{ borderRadius: "1rem" }}
                >
                    <Item variant="outline">
                        <ItemMedia variant="icon">
                            <Spinner />
                        </ItemMedia>
                        <ItemContent>
                            <ItemTitle>Downloading...</ItemTitle>
                            <ItemDescription>{`${filteredAndSortedData.length} records`}</ItemDescription>
                        </ItemContent>
                        <ItemActions className="hidden sm:flex">
                            <Button variant="outline" size="sm" disabled>
                                Cancel
                            </Button>
                        </ItemActions>
                        <ItemFooter>
                            <Progress value={progress} />
                        </ItemFooter>
                    </Item>
                </div>
            )}

        </div>

    );
};
