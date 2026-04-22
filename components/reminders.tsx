"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
} from "firebase/firestore";
import { supabase } from "@/utils/supabase";
import { Bell, Calendar, Clock, AlertCircle, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Meeting {
  id: string;
  title: string;
  start_date: Timestamp | Date | string | number;
}

interface TicketNotification {
  id: string;
  ticket_id: string;
  ticket_subject: string;
  status: string;
  priority: string;
  date_scheduled?: string;
  date_created?: string;
  requestor_name?: string;
  technician_name?: string;
  type: "pending" | "scheduled";
}

function formatTime(date: Date) {
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
}

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function toDate(date: Timestamp | Date | string | number): Date {
  if (
    date &&
    typeof date === "object" &&
    "toDate" in date &&
    typeof (date as any).toDate === "function"
  ) {
    return (date as Timestamp).toDate();
  }
  if (date instanceof Date) {
    return date;
  }
  return new Date(date as any);
}

const LOCAL_STORAGE_MEETINGS_KEY = "dismissedMeetings";
const LOCAL_STORAGE_LOGOUT_KEY = "dismissedLogoutReminders";

function getTodayKey() {
  const now = new Date();
  return now.toISOString().split("T")[0]; // yyyy-mm-dd
}

function getDismissedMeetingsFromStorage(): { [date: string]: string[] } {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_MEETINGS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveDismissedMeetingsToStorage(data: { [date: string]: string[] }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_MEETINGS_KEY, JSON.stringify(data));
  } catch {}
}

function getDismissedLogoutFromStorage(): { [date: string]: boolean } {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_LOGOUT_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveDismissedLogoutToStorage(data: { [date: string]: boolean }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_LOGOUT_KEY, JSON.stringify(data));
  } catch {}
}

const LOCAL_STORAGE_TICKET_NOTIFICATIONS_KEY = "dismissedTicketNotifications";

function getDismissedTicketNotificationsFromStorage(): { [date: string]: string[] } {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_TICKET_NOTIFICATIONS_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function saveDismissedTicketNotificationsToStorage(data: { [date: string]: string[] }) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_TICKET_NOTIFICATIONS_KEY, JSON.stringify(data));
  } catch {}
}

export function Reminders() {
  const router = useRouter();
  const [now, setNow] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const [showMeetingReminder, setShowMeetingReminder] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);

  const [showLogoutReminder, setShowLogoutReminder] = useState(false);

  // Dismissed meetings for today
  const [dismissedMeetings, setDismissedMeetings] = useState<string[]>([]);
  // Dismissed logout reminder today
  const [dismissedLogoutToday, setDismissedLogoutToday] = useState(false);

  // Ticket Notifications State
  const [ticketNotifications, setTicketNotifications] = useState<TicketNotification[]>([]);
  const [dismissedTicketNotifications, setDismissedTicketNotifications] = useState<string[]>([]);
  const [showNotificationSheet, setShowNotificationSheet] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const dismissedData = getDismissedMeetingsFromStorage();
    const todayKey = getTodayKey();
    setDismissedMeetings(dismissedData[todayKey] || []);

    const dismissedLogoutData = getDismissedLogoutFromStorage();
    setDismissedLogoutToday(!!dismissedLogoutData[todayKey]);

    // Load dismissed ticket notifications
    const dismissedTicketData = getDismissedTicketNotificationsFromStorage();
    setDismissedTicketNotifications(dismissedTicketData[todayKey] || []);
  }, []);

  useEffect(() => {
    const q = query(collection(db, "meetings"), orderBy("start_date"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedMeetings: Meeting[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.start_date && data.type_activity) {
          loadedMeetings.push({
            id: doc.id,
            title: data.type_activity,
            start_date: data.start_date,
          });
        }
      });
      setMeetings(loadedMeetings);
    });

    return () => unsubscribe();
  }, []);

  // Fetch Pending and Scheduled tickets from Supabase
  useEffect(() => {
    const fetchTicketNotifications = async () => {
      try {
        // Fetch pending tickets
        const { data: pendingData, error: pendingError } = await supabase
          .from("tickets")
          .select("id, ticket_id, ticket_subject, status, priority, date_created, requestor_name, technician_name")
          .eq("status", "Pending")
          .order("date_created", { ascending: false });

        // Fetch scheduled tickets
        const { data: scheduledData, error: scheduledError } = await supabase
          .from("tickets")
          .select("id, ticket_id, ticket_subject, status, priority, date_scheduled, date_created, requestor_name, technician_name")
          .eq("status", "Scheduled")
          .order("date_scheduled", { ascending: true });

        if (pendingError || scheduledError) {
          console.error("Error fetching ticket notifications:", pendingError || scheduledError);
          return;
        }

        const notifications: TicketNotification[] = [];

        if (pendingData) {
          pendingData.forEach((ticket) => {
            notifications.push({
              ...ticket,
              type: "pending",
            });
          });
        }

        if (scheduledData) {
          scheduledData.forEach((ticket) => {
            notifications.push({
              ...ticket,
              type: "scheduled",
            });
          });
        }

        setTicketNotifications(notifications);

        // Calculate unread count (exclude dismissed)
        const todayKey = getTodayKey();
        const dismissedData = getDismissedTicketNotificationsFromStorage();
        const todayDismissed = dismissedData[todayKey] || [];
        const unread = notifications.filter(n => !todayDismissed.includes(n.id)).length;
        setUnreadCount(unread);
      } catch (error) {
        console.error("Error in fetchTicketNotifications:", error);
      }
    };

    fetchTicketNotifications();

    // Set up real-time subscription for tickets
    const subscription = supabase
      .channel("ticket-notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, () => {
        fetchTicketNotifications();
      })
      .subscribe();

    // Refresh every 5 minutes
    const interval = setInterval(fetchTicketNotifications, 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const windowMs = 5 * 60 * 1000; // 5 minutes window
    let matchedMeeting: Meeting | null = null;

    for (const meeting of meetings) {
      if (dismissedMeetings.includes(meeting.id)) continue; // skip dismissed
      const meetingDate = toDate(meeting.start_date);

      if (!isSameDay(now, meetingDate)) continue;

      const diff = Math.abs(now.getTime() - meetingDate.getTime());
      if (diff <= windowMs) {
        matchedMeeting = meeting;
        break;
      }
    }

    if (matchedMeeting) {
      setCurrentMeeting(matchedMeeting);
      setShowMeetingReminder(true);
    } else {
      setShowMeetingReminder(false);
      setCurrentMeeting(null);
    }

    // Show logout reminder only if not dismissed today
    const todayKey = getTodayKey();
    const dismissedLogoutData = getDismissedLogoutFromStorage();

    if (
      now.getHours() === 16 &&
      now.getMinutes() === 30 &&
      !dismissedLogoutData[todayKey] &&
      !showLogoutReminder
    ) {
      setShowLogoutReminder(true);
    }
  }, [now, meetings, dismissedMeetings, showLogoutReminder]);

  function dismissMeeting() {
    if (!currentMeeting) return;

    const todayKey = getTodayKey();
    const dismissedData = getDismissedMeetingsFromStorage();

    const todayDismissed = new Set(dismissedData[todayKey] || []);
    todayDismissed.add(currentMeeting.id);

    dismissedData[todayKey] = Array.from(todayDismissed);
    saveDismissedMeetingsToStorage(dismissedData);
    setDismissedMeetings(dismissedData[todayKey]);

    setShowMeetingReminder(false);
    setCurrentMeeting(null);
  }

  function dismissLogoutReminder() {
    const todayKey = getTodayKey();
    const dismissedLogoutData = getDismissedLogoutFromStorage();
    dismissedLogoutData[todayKey] = true;
    saveDismissedLogoutToStorage(dismissedLogoutData);
    setDismissedLogoutToday(true);
    setShowLogoutReminder(false);
  }

  function dismissTicketNotification(id: string) {
    const todayKey = getTodayKey();
    const dismissedData = getDismissedTicketNotificationsFromStorage();

    const todayDismissed = new Set(dismissedData[todayKey] || []);
    todayDismissed.add(id);

    dismissedData[todayKey] = Array.from(todayDismissed);
    saveDismissedTicketNotificationsToStorage(dismissedData);
    setDismissedTicketNotifications(dismissedData[todayKey]);

    // Update unread count
    const newUnread = ticketNotifications.filter(n => !todayDismissed.has(n.id)).length;
    setUnreadCount(newUnread);
  }

  function dismissAllTicketNotifications() {
    const todayKey = getTodayKey();
    const dismissedData = getDismissedTicketNotificationsFromStorage();

    const allIds = ticketNotifications.map(n => n.id);
    dismissedData[todayKey] = allIds;

    saveDismissedTicketNotificationsToStorage(dismissedData);
    setDismissedTicketNotifications(allIds);
    setUnreadCount(0);
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getPriorityColor(priority?: string) {
    switch (priority) {
      case "Critical": return "text-red-400 border-red-400/30 bg-red-400/10";
      case "High": return "text-orange-400 border-orange-400/30 bg-orange-400/10";
      case "Medium": return "text-yellow-400 border-yellow-400/30 bg-yellow-400/10";
      case "Low": return "text-emerald-400 border-emerald-400/30 bg-emerald-400/10";
      default: return "text-white/60 border-white/10 bg-white/5";
    }
  }

  function navigateToTicket(ticketId: string, ticketStatus: string) {
    // Close notification sheet
    setShowNotificationSheet(false);

    // Navigate to tickets page with query params for filtering
    const params = new URLSearchParams();
    params.set("ticket", ticketId);
    params.set("status", ticketStatus);

    router.push(`/tickets/received?${params.toString()}`);
  }

  return (
    <>
      {/* Floating Meeting Reminder (top-right) */}
      {showMeetingReminder && currentMeeting && (
        <div
          className="fixed top-4 right-4 bg-white shadow-lg rounded-lg p-4 z-50 max-w-xs"
          role="alert"
          aria-live="assertive"
        >
          <strong className="block font-semibold mb-1">Meeting Reminder</strong>
          <p>
            You have a <em>{currentMeeting.title}</em> at{" "}
            {formatTime(toDate(currentMeeting.start_date))}.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={dismissMeeting}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Logout Reminder Dialog (center modal) */}
      <Dialog open={showLogoutReminder} onOpenChange={setShowLogoutReminder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Logout Reminder</DialogTitle>
            <DialogDescription>
              Don't forget to logout the stash.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={dismissLogoutReminder}>Dismiss</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Notifications Bell - Fixed Top Right */}
      <Sheet open={showNotificationSheet} onOpenChange={setShowNotificationSheet}>
        <SheetTrigger asChild>
          <button
            className="fixed top-4 right-4 z-50 flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] transition-all duration-300 hover:scale-110"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold bg-red-500 text-white rounded-full shadow-lg">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:w-[450px] p-0 bg-[#0a0a0f] border-l border-[rgba(139,92,246,0.3)]">
          <SheetHeader className="px-6 py-5 border-b border-white/10 bg-gradient-to-r from-[#0a0a0f] to-[#111118]">
            <SheetTitle className="text-white text-lg font-bold flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
              {unreadCount > 0 && (
                <Badge variant="neon" className="ml-2 text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </SheetTitle>
            <p className="text-white/50 text-sm mt-1">
              Pending and Scheduled Tickets
            </p>
          </SheetHeader>

          <div className="flex flex-col h-[calc(100vh-140px)]">
            {/* Action Bar */}
            {ticketNotifications.length > 0 && (
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-black/20">
                <span className="text-xs text-white/50">
                  {ticketNotifications.length} notification{ticketNotifications.length !== 1 ? "s" : ""}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={dismissAllTicketNotifications}
                  className="text-xs border-white/10 text-white/70 hover:bg-white/5 hover:text-white"
                >
                  Mark all read
                </Button>
              </div>
            )}

            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {ticketNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-white/30" />
                  </div>
                  <p className="text-white/50 text-sm">No notifications</p>
                  <p className="text-white/30 text-xs mt-1">
                    Pending and scheduled tickets will appear here
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {ticketNotifications.map((notification) => {
                    const isDismissed = dismissedTicketNotifications.includes(notification.id);
                    return (
                      <div
                        key={notification.id}
                        onClick={() => !isDismissed && navigateToTicket(notification.ticket_id, notification.status)}
                        className={`p-4 transition-all cursor-pointer ${
                          isDismissed
                            ? "opacity-50 bg-white/[0.02] cursor-default"
                            : "bg-transparent hover:bg-white/5 hover:border-l-2 hover:border-l-primary"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Icon */}
                          <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
                            notification.type === "pending"
                              ? "bg-yellow-500/10 text-yellow-400"
                              : "bg-cyan-500/10 text-cyan-400"
                          }`}>
                            {notification.type === "pending" ? (
                              <AlertCircle className="w-5 h-5" />
                            ) : (
                              <Calendar className="w-5 h-5" />
                            )}
                          </div>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-xs font-semibold uppercase tracking-wider ${
                                notification.type === "pending" ? "text-yellow-400" : "text-cyan-400"
                              }`}>
                                {notification.type}
                              </span>
                              <span className="text-white/30">•</span>
                              <span className="text-xs text-white/50 font-mono">
                                {notification.ticket_id}
                              </span>
                            </div>

                            <h4 className="text-sm font-medium text-white/90 truncate mb-1">
                              {notification.ticket_subject || "No Subject"}
                            </h4>

                            <div className="flex items-center gap-2 text-xs text-white/50 mb-2">
                              <span className="truncate">{notification.requestor_name || "Unknown"}</span>
                              {notification.technician_name && (
                                <>
                                  <span>→</span>
                                  <span className="truncate">{notification.technician_name}</span>
                                </>
                              )}
                            </div>

                            {/* Priority Badge & View Button */}
                            <div className="flex items-center justify-between">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getPriorityColor(notification.priority)}`}>
                                {notification.priority}
                              </span>
                              {!isDismissed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigateToTicket(notification.ticket_id, notification.status);
                                  }}
                                  className="text-[10px] px-2 py-1 rounded-md bg-primary/20 text-primary hover:bg-primary hover:text-white transition-colors flex items-center gap-1"
                                >
                                  <Search className="w-3 h-3" />
                                  View
                                </button>
                              )}
                            </div>

                            {/* Date Info */}
                            <div className="flex items-center gap-1.5 text-xs text-white/40 mt-2">
                              <Clock className="w-3 h-3" />
                              {notification.type === "scheduled" && notification.date_scheduled ? (
                                <span>Scheduled: {formatDate(notification.date_scheduled)}</span>
                              ) : (
                                <span>Created: {formatDate(notification.date_created)}</span>
                              )}
                            </div>
                          </div>

                          {/* Dismiss Button */}
                          {!isDismissed && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                dismissTicketNotification(notification.id);
                              }}
                              className="flex-shrink-0 p-1.5 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/10 transition-colors"
                              aria-label="Dismiss notification"
                            >
                              <span className="text-lg leading-none">×</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
