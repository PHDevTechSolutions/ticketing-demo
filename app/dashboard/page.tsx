"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { FormatProvider } from "@/contexts/FormatContext";
import { SidebarLeft } from "@/components/sidebar-left";
import { SidebarRight } from "@/components/sidebar-right";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from "@/components/ui/breadcrumb";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { type DateRange } from "react-day-picker";
import { toast } from "sonner";
import { supabase } from "@/utils/supabase";

import { StatusCard } from "@/components/dashboard/dashboard-card-status";

interface RequestItem {
  id: string; // supabase id
  status: string;
  request_type: string;
  type_concern: string;
  technician_name: string;
  site: string;
  ticket_id: string;
  ticket_subject: string;
  remarks: string;
  priority: string;
  date_created?: string;
}

interface UserDetails {
  referenceid: string;
}

function DashboardContent() {
  const [dateCreatedFilterRange, setDateCreatedFilterRangeAction] = React.useState<
    DateRange | undefined
  >(undefined);

  const searchParams = useSearchParams();
  const { userId, setUserId } = useUser();

  const [activities, setActivities] = useState<RequestItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);
  const [errorActivities, setErrorActivities] = useState<string | null>(null);

  const [loadingUser, setLoadingUser] = useState(true);
  const [errorUser, setErrorUser] = useState<string | null>(null);

  const [userDetails, setUserDetails] = useState<UserDetails>({
    referenceid: "",
  });

  // Get userId from URL query param
  const queryUserId = searchParams?.get("id") ?? "";

  // Sync context with URL param on mount or param change
  useEffect(() => {
    if (queryUserId && queryUserId !== userId) {
      setUserId(queryUserId);
    }
  }, [queryUserId, userId, setUserId]);

  // Fetch user details when userId changes
  useEffect(() => {
    if (!userId) {
      setErrorUser("User ID is missing.");
      setLoadingUser(false);
      return;
    }

    const fetchUserData = async () => {
      setErrorUser(null);
      setLoadingUser(true);
      try {
        const response = await fetch(`/api/user?id=${encodeURIComponent(userId)}`);
        if (!response.ok) throw new Error("Failed to fetch user data");
        const data = await response.json();

        setUserDetails({
          referenceid: data.ReferenceID || "",
        });

        toast.success("User data loaded successfully!");
      } catch (err) {
        console.error("Error fetching user data:", err);
        setErrorUser(
          "Failed to connect to server. Please try again later or check your network connection."
        );
        toast.error(
          "Failed to connect to server. Please try again later or refresh your network connection"
        );
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUserData();
  }, [userId]);

  // Fetch all tickets without referenceid filter
  const fetchActivities = useCallback(async () => {
    setLoadingActivities(true);
    setErrorActivities(null);

    try {
      const { data, error } = await supabase
        .from("tickets")
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
  }, []);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  // Subscribe to all tickets changes (no referenceid filter)
  useEffect(() => {
    const channel = supabase
      .channel(`public:tickets`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tickets",
        },
        (payload) => {
          const newRecord = payload.new as RequestItem;
          const oldRecord = payload.old as RequestItem;

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
  }, []);

  // Helper: safely parse date string
  function parseDate(dateStr?: string) {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d;
  }

  // Filter activities based on dateCreatedFilterRange
  const filteredActivities = React.useMemo(() => {
    if (
      !dateCreatedFilterRange ||
      (!dateCreatedFilterRange.from && !dateCreatedFilterRange.to)
    ) {
      return activities;
    }

    const fromTime = dateCreatedFilterRange.from
      ? dateCreatedFilterRange.from.getTime()
      : -Infinity;

    const toTime = dateCreatedFilterRange.to
      ? new Date(
        dateCreatedFilterRange.to.getFullYear(),
        dateCreatedFilterRange.to.getMonth(),
        dateCreatedFilterRange.to.getDate(),
        23,
        59,
        59,
        999
      ).getTime()
      : Infinity;

    return activities.filter((item) => {
      const date = parseDate(item.date_created);
      if (!date) return false;
      const time = date.getTime();
      return time >= fromTime && time <= toTime;
    });
  }, [activities, dateCreatedFilterRange]);

  // Count items by status using filteredActivities
  const counts = React.useMemo(() => {
    const normalize = (status?: string) => status?.toLowerCase() ?? "";

    return {
      resolved: filteredActivities.filter(
        (item) => normalize(item.status) === "resolved"
      ).length,
      ongoing: filteredActivities.filter(
        (item) => normalize(item.status) === "ongoing"
      ).length,
      pending: filteredActivities.filter(
        (item) => normalize(item.status) === "pending"
      ).length,
      scheduled: filteredActivities.filter(
        (item) => normalize(item.status) === "scheduled"
      ).length,
    };
  }, [filteredActivities]);

  const advisoryTickets = React.useMemo(() => {
    return filteredActivities.filter(
      (item) =>
        item.request_type === "Advisory" &&
        item.status.toLowerCase() !== "resolved"
    );
  }, [filteredActivities]);

  const criticalTickets = React.useMemo(() => {
    return filteredActivities.filter(
      (item) =>
        item.priority?.toLowerCase() === "critical" &&
        item.status.toLowerCase() !== "resolved"
    );
  }, [filteredActivities]);


  return (
    <>
      <SidebarLeft />
      <SidebarInset>
        <header className="bg-background sticky top-0 flex h-14 shrink-0 items-center gap-2">
          <div className="flex flex-1 items-center gap-2 px-3">
            <SidebarTrigger />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbPage className="line-clamp-1">
                    Dashboard
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
        </header>
        <main className="flex flex-col gap-4 p-4 overflow-auto">
          {loadingUser ? (
            <p>Loading user data...</p>
          ) : errorUser ? (
            <p className="text-red-600 font-semibold">{errorUser}</p>
          ) : (
            <>
              {loadingActivities && <p>Loading activities...</p>}
              {errorActivities && (
                <p className="text-red-600 font-semibold">{errorActivities}</p>
              )}

              {advisoryTickets.length > 0 && (
                <div className="w-full">
                  <Alert className="w-full border-orange-500 bg-orange-50">
                    <AlertTitle className="font-semibold text-orange-700">
                      Advisory Notice
                    </AlertTitle>

                    <AlertDescription className="space-y-4 text-sm leading-relaxed">
                      {advisoryTickets.map((item) => (
                        <div
                          key={item.id}
                          className="w-full rounded-md border bg-white p-4"
                        >
                          <p>
                            This ticket is classified as an <strong>{item.request_type}</strong> request
                            concerning <strong>{item.type_concern}</strong>.
                          </p>

                          <p className="mt-1">
                            The issue is logged under <strong>Ticket ID {item.ticket_id}</strong> with the
                            subject <strong>“{item.ticket_subject}”</strong>.
                          </p>

                          <p className="mt-1">
                            It is currently being handled by <strong>{item.technician_name}</strong> at
                            the <strong>{item.site}</strong> site.
                          </p>

                          <p className="mt-1">
                            <strong>Remarks:</strong> {item.remarks || "No additional remarks provided."}
                          </p>
                        </div>
                      ))}
                    </AlertDescription>

                  </Alert>
                </div>
              )}

              {criticalTickets.length > 0 && (
                <div className="w-full">
                  <Alert className="w-full border-red-600 bg-red-50">
                    <AlertTitle className="font-semibold text-red-700">
                      🚨 Critical Priority Alert
                    </AlertTitle>

                    <AlertDescription className="space-y-4 text-sm leading-relaxed">
                      {criticalTickets.map((item) => (
                        <div
                          key={item.id}
                          className="w-full rounded-md border border-red-200 bg-white p-4"
                        >
                          <p>
                            This ticket is marked as <strong>CRITICAL PRIORITY</strong> and
                            requires immediate attention regarding{" "}
                            <strong>{item.type_concern}</strong>.
                          </p>

                          <p className="mt-1">
                            The issue is logged under <strong>Ticket ID {item.ticket_id}</strong>{" "}
                            with the subject <strong>“{item.ticket_subject}”</strong>.
                          </p>

                          <p className="mt-1">
                            It is currently being handled by{" "}
                            <strong>{item.technician_name}</strong> at the{" "}
                            <strong>{item.site}</strong> site.
                          </p>

                          <p className="mt-1">
                            <strong>Remarks:</strong>{" "}
                            {item.remarks || "No additional remarks provided."}
                          </p>
                        </div>
                      ))}
                    </AlertDescription>
                  </Alert>
                </div>
              )}


              <div className="flex flex-col gap-4">
                <StatusCard counts={counts} userId={userId ?? undefined} />
              </div>
            </>
          )}
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
