"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

import { UserProvider, useUser } from "@/contexts/UserContext";
import { FormatProvider } from "@/contexts/FormatContext";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, } from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { toast } from "sonner";

import { Received } from "@/components/tickets/received-tickets";
import { type DateRange } from "react-day-picker";

interface UserDetails {
    referenceid: string;
    fullname: string;
    firstname?: string;
    lastname?: string;
}


function DashboardContent() {
    const searchParams = useSearchParams();
    const { userId, setUserId } = useUser();

    const [userDetails, setUserDetails] = useState<UserDetails>({
        referenceid: "",
        fullname: "",
        firstname: "",
        lastname: "",
    });

    const [loadingUser, setLoadingUser] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [dateCreatedFilterRange, setDateCreatedFilterRangeAction] = React.useState<
        DateRange | undefined
    >(undefined);

    const queryUserId = searchParams?.get("id") ?? "";

    // Sync URL query param with userId context
    useEffect(() => {
        if (queryUserId && queryUserId !== userId) {
            setUserId(queryUserId);
        }
    }, [queryUserId, userId, setUserId]);

    // Fetch user details when userId changes
    useEffect(() => {
        if (!userId) {
            setError("User ID is missing.");
            setLoadingUser(false);
            return;
        }

        const fetchUserData = async () => {
            setError(null);
            setLoadingUser(true);
            try {
                const response = await fetch(`/api/user?id=${encodeURIComponent(userId)}`);
                if (!response.ok) throw new Error("Failed to fetch user data");
                const data = await response.json();

                setUserDetails({
                    referenceid: data.ReferenceID || "",
                    firstname: data.Firstname || "",
                    lastname: data.Lastname || "",
                    fullname: `${data.Lastname || ""}, ${data.Firstname || ""}`.trim(),
                });


                toast.success("User data loaded successfully!");
            } catch (err) {
                console.error("Error fetching user data:", err);
                toast.error("Failed to connect to server. Please try again later or refresh your network connection");
            } finally {
                setLoadingUser(false);
            }
        };

        fetchUserData();
    }, [userId]);

    return (
        <>
            <SidebarLeft />
            <SidebarInset className="overflow-hidden">
                <header className="sticky top-0 z-10 flex h-12 shrink-0 items-center gap-2 border-b border-[#2a2a1a] px-4" style={{ backgroundColor: "rgba(8,12,16,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <SidebarTrigger className="text-[#6b6b4a]/60 hover:text-[#e5e5d0]/80 hover:bg-[#2a2a1a]" />
                    <Separator orientation="vertical" className="h-3.5 bg-[#2a2a1a] mx-1" />
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbPage className="font-mono text-[10px] text-[#f97316]/70 uppercase tracking-[0.2em]">
                                    ▸ received tickets
                                </BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                    <div className="ml-auto flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-[#22c55e]" />
                        <span className="text-[9px] font-mono text-[#22c55e]/60 uppercase tracking-[0.2em]">live</span>
                    </div>
                </header>

                <main className="flex flex-1 flex-col gap-0 p-6 overflow-auto" style={{ backgroundColor: "rgba(8,12,16,0.95)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <Received
                        referenceid={userDetails.referenceid}
                        fullname={userDetails.fullname}
                        dateCreatedFilterRange={dateCreatedFilterRange}
                        setDateCreatedFilterRangeAction={setDateCreatedFilterRangeAction} />
                </main>
            </SidebarInset>

            <SidebarRight
                userId={userId ?? undefined}
                dateCreatedFilterRange={dateCreatedFilterRange}
                setDateCreatedFilterRangeAction={setDateCreatedFilterRangeAction}
            />
        </>
    );
}

export default function Page() {
    return (
        <UserProvider>
            <FormatProvider>
                <SidebarProvider>
                    <Suspense fallback={<div>Loading...</div>}>
                        <DashboardContent />
                    </Suspense>
                </SidebarProvider>
            </FormatProvider>
        </UserProvider>
    );
}
