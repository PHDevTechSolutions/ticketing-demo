"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { supabase } from "@/utils/supabase";
import { Bell, Calendar, Clock, AlertCircle, Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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

// ─── utils ────────────────────────────────────────────────────────────────────

function formatTime(date: Date) {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
}

function isSameDay(d1: Date, d2: Date) {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function toDate(date: Timestamp | Date | string | number): Date {
    if (date && typeof date === "object" && "toDate" in date && typeof (date as any).toDate === "function") return (date as Timestamp).toDate();
    if (date instanceof Date) return date;
    return new Date(date as any);
}

function formatDate(dateStr?: string) {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function getPriorityStyle(priority?: string): string {
    switch (priority) {
        case "Critical": return "text-red-500 border-red-500/30";
        case "High":     return "text-orange-500 border-orange-500/30";
        case "Medium":   return "text-yellow-500 border-yellow-500/30";
        case "Low":      return "text-green-500 border-green-500/30";
        default:         return "text-muted-foreground/40 border-muted/10";
    }
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

const KEYS = { meetings: "dismissedMeetings", logout: "dismissedLogoutReminders", tickets: "dismissedTicketNotifications" };

function getTodayKey() { return new Date().toISOString().split("T")[0]; }

function getLS<T>(key: string): T {
    if (typeof window === "undefined") return {} as unknown as T;
    try { const s = localStorage.getItem(key); return (s ? JSON.parse(s) : {}) as unknown as T; } catch { return {} as unknown as T; }
}

function setLS(key: string, data: unknown) {
    if (typeof window === "undefined") return;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch {}
}

// ─── component ────────────────────────────────────────────────────────────────

export function Reminders() {
    const router = useRouter();
    const [now, setNow] = useState(new Date());
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [showMeetingReminder, setShowMeetingReminder] = useState(false);
    const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
    const [showLogoutReminder, setShowLogoutReminder] = useState(false);
    const [dismissedMeetings, setDismissedMeetings] = useState<string[]>([]);
    const [dismissedLogoutToday, setDismissedLogoutToday] = useState(false);
    const [ticketNotifications, setTicketNotifications] = useState<TicketNotification[]>([]);
    const [dismissedTickets, setDismissedTickets] = useState<string[]>([]);
    const [showPanel, setShowPanel] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const [search, setSearch] = useState("");

    // ── init from localStorage ────────────────────────────────────────────────
    useEffect(() => {
        const todayKey = getTodayKey();
        const dm = getLS<Record<string, string[]>>(KEYS.meetings);
        setDismissedMeetings(dm[todayKey] || []);
        const dl = getLS<Record<string, boolean>>(KEYS.logout);
        setDismissedLogoutToday(!!dl[todayKey]);
        const dt = getLS<Record<string, string[]>>(KEYS.tickets);
        setDismissedTickets(dt[todayKey] || []);
    }, []);

    // ── meetings ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const q = query(collection(db, "meetings"), orderBy("start_date"));
        return onSnapshot(q, (snapshot) => {
            const loaded: Meeting[] = [];
            snapshot.forEach((doc) => {
                const d = doc.data();
                if (d.start_date && d.type_activity) loaded.push({ id: doc.id, title: d.type_activity, start_date: d.start_date });
            });
            setMeetings(loaded);
        });
    }, []);

    // ── ticket notifications ──────────────────────────────────────────────────
    useEffect(() => {
        const fetch = async () => {
            try {
                const [{ data: pending }, { data: scheduled }] = await Promise.all([
                    supabase.from("tickets").select("id,ticket_id,ticket_subject,status,priority,date_created,requestor_name,technician_name").eq("status", "Pending").order("date_created", { ascending: false }),
                    supabase.from("tickets").select("id,ticket_id,ticket_subject,status,priority,date_scheduled,date_created,requestor_name,technician_name").eq("status", "Scheduled").order("date_scheduled", { ascending: true }),
                ]);
                const notifications: TicketNotification[] = [
                    ...(pending || []).map((t) => ({ ...t, type: "pending" as const })),
                    ...(scheduled || []).map((t) => ({ ...t, type: "scheduled" as const })),
                ];
                setTicketNotifications(notifications);
                const todayKey = getTodayKey();
                const dt = getLS<Record<string, string[]>>(KEYS.tickets);
                const dismissed = dt[todayKey] || [];
                setUnreadCount(notifications.filter((n) => !dismissed.includes(n.id)).length);
            } catch (err) { console.error(err); }
        };
        fetch();
        const sub = supabase.channel("ticket-notifications").on("postgres_changes", { event: "*", schema: "public", table: "tickets" }, fetch).subscribe();
        const interval = setInterval(fetch, 5 * 60 * 1000);
        return () => { sub.unsubscribe(); clearInterval(interval); };
    }, []);

    // ── clock + meeting trigger ───────────────────────────────────────────────
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 30000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        const windowMs = 5 * 60 * 1000;
        let matched: Meeting | null = null;
        for (const m of meetings) {
            if (dismissedMeetings.includes(m.id)) continue;
            const md = toDate(m.start_date);
            if (!isSameDay(now, md)) continue;
            if (Math.abs(now.getTime() - md.getTime()) <= windowMs) { matched = m; break; }
        }
        setCurrentMeeting(matched);
        setShowMeetingReminder(!!matched);

        const todayKey = getTodayKey();
        const dl = getLS<Record<string, boolean>>(KEYS.logout);
        if (now.getHours() === 16 && now.getMinutes() === 30 && !dl[todayKey] && !showLogoutReminder) {
            setShowLogoutReminder(true);
        }
    }, [now, meetings, dismissedMeetings, showLogoutReminder]);

    // ── handlers ──────────────────────────────────────────────────────────────
    function dismissMeeting() {
        if (!currentMeeting) return;
        const todayKey = getTodayKey();
        const data = getLS<Record<string, string[]>>(KEYS.meetings);
        const set = new Set(data[todayKey] || []);
        set.add(currentMeeting.id);
        data[todayKey] = Array.from(set);
        setLS(KEYS.meetings, data);
        setDismissedMeetings(data[todayKey]);
        setShowMeetingReminder(false);
        setCurrentMeeting(null);
    }

    function dismissLogout() {
        const todayKey = getTodayKey();
        const data = getLS<Record<string, boolean>>(KEYS.logout);
        data[todayKey] = true;
        setLS(KEYS.logout, data);
        setDismissedLogoutToday(true);
        setShowLogoutReminder(false);
    }

    function dismissTicket(id: string) {
        const todayKey = getTodayKey();
        const data = getLS<Record<string, string[]>>(KEYS.tickets);
        const set = new Set(data[todayKey] || []);
        set.add(id);
        data[todayKey] = Array.from(set);
        setLS(KEYS.tickets, data);
        setDismissedTickets(data[todayKey]);
        setUnreadCount(ticketNotifications.filter((n) => !set.has(n.id)).length);
    }

    function dismissAll() {
        const todayKey = getTodayKey();
        const data = getLS<Record<string, string[]>>(KEYS.tickets);
        data[todayKey] = ticketNotifications.map((n) => n.id);
        setLS(KEYS.tickets, data);
        setDismissedTickets(data[todayKey]);
        setUnreadCount(0);
    }

    function navigateToTicket(ticketId: string, status: string) {
        setShowPanel(false);
        router.push(`/tickets/received?ticket=${ticketId}&status=${status}`);
    }

    const filtered = ticketNotifications.filter((n) =>
        search.trim() === "" ||
        n.ticket_id.toLowerCase().includes(search.toLowerCase()) ||
        n.ticket_subject?.toLowerCase().includes(search.toLowerCase()) ||
        n.requestor_name?.toLowerCase().includes(search.toLowerCase())
    );

    const pending = filtered.filter((n) => n.type === "pending");
    const scheduled = filtered.filter((n) => n.type === "scheduled");

    return (
        <>
            {/* ── Meeting reminder toast ── */}
            {showMeetingReminder && currentMeeting && (
                <div className="fixed top-4 right-16 z-50 max-w-xs font-mono bg-background border border-orange-500/40 dark:bg-[#080c10] dark:border-orange-500/40">
                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-orange-500/20 dark:border-orange-500/20">
                        <span className="w-1.5 h-1.5 bg-orange-500" />
                        <span className="text-[9px] font-mono font-bold text-orange-500 uppercase tracking-[0.2em]">Meeting Reminder</span>
                    </div>
                    <div className="px-4 py-3 space-y-1">
                        <p className="text-[11px] text-foreground/80 dark:text-white/80">{currentMeeting.title}</p>
                        <p className="text-[10px] text-muted-foreground/40 dark:text-white/40">{formatTime(toDate(currentMeeting.start_date))}</p>
                    </div>
                    <div className="px-4 py-2.5 border-t border-border dark:border-white/06">
                        <button onClick={dismissMeeting} className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40 hover:text-orange-500 transition-colors dark:text-white/40 dark:hover:text-orange-500">
                            [ Dismiss ]
                        </button>
                    </div>
                </div>
            )}

            {/* ── Logout reminder dialog ── */}
            <Dialog open={showLogoutReminder} onOpenChange={setShowLogoutReminder}>
                <DialogContent className="max-w-sm rounded-none p-0 font-mono bg-background dark:bg-[#080c10] border-border dark:border-white/10">
                    <DialogHeader className="px-5 py-4 border-b border-border dark:border-white/07">
                        <DialogTitle className="text-[11px] font-mono font-bold text-yellow-500 uppercase tracking-[0.2em]">⚠ Logout Reminder</DialogTitle>
                        <DialogDescription className="text-[10px] font-mono text-muted-foreground/30 dark:text-white/30 mt-1">Don't forget to logout the stash.</DialogDescription>
                    </DialogHeader>
                    <div className="flex justify-end px-5 py-4">
                        <button onClick={dismissLogout} className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-orange-500 hover:bg-orange-500/10 transition-colors border border-orange-500/40">
                            [ Dismiss ]
                        </button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Bell button ── */}
            <button
                onClick={() => setShowPanel(true)}
                className="fixed top-3 right-4 z-50 flex items-center justify-center w-9 h-9 transition-colors bg-muted/50 dark:bg-white/04 border border-border dark:border-white/10"
                aria-label="Notifications"
            >
                <Bell className="w-4 h-4 text-muted-foreground/50 dark:text-white/50" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-mono font-bold bg-orange-500 text-black">
                        {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                )}
            </button>

            {/* ── Full-page notification panel ── */}
            {showPanel && (
                <div className="fixed inset-0 z-50 flex flex-col font-mono bg-background dark:bg-[#080c10]">

                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-border dark:border-white/07 bg-muted/50 dark:bg-white/02">
                        <div className="flex items-center gap-3">
                            <Bell className="w-4 h-4 text-orange-500" />
                            <span className="text-[11px] font-mono font-bold text-orange-500 uppercase tracking-[0.2em]">Notifications</span>
                            {unreadCount > 0 && (
                                <span className="text-[9px] font-mono px-2 py-0.5 text-orange-500 border border-orange-500/30">
                                    {unreadCount} unread
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            {ticketNotifications.length > 0 && (
                                <button onClick={dismissAll} className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-muted-foreground/40 hover:text-orange-500 transition-colors border border-border dark:text-white/40 dark:border-white/07">
                                    Mark all read
                                </button>
                            )}
                            <button onClick={() => setShowPanel(false)} className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-muted-foreground/40 hover:text-foreground transition-colors border border-border dark:text-white/40 dark:border-white/07">
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="px-6 py-3 shrink-0 border-b border-border dark:border-white/06">
                        <input
                            type="text"
                            placeholder="> search notifications..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full max-w-md text-[11px] font-mono text-foreground/70 dark:text-white/70 placeholder:text-muted-foreground/20 dark:placeholder:text-white/20 px-3 py-1.5 focus:outline-none bg-background dark:bg-[#080c10] border border-border dark:border-white/08"
                        />
                    </div>

                    {/* Body — two columns */}
                    <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-2">

                        {/* Pending */}
                        <div className="flex flex-col overflow-hidden border-r border-border dark:border-white/06">
                            <div className="flex items-center gap-2 px-6 py-2.5 shrink-0 border-b border-border dark:border-white/06 bg-muted/30 dark:bg-white/01">
                                <AlertCircle className="w-3.5 h-3.5 text-yellow-500" />
                                <span className="text-[9px] font-mono font-bold text-yellow-500 uppercase tracking-[0.2em]">Pending</span>
                                <span className="text-[9px] font-mono text-muted-foreground/25 dark:text-white/25 ml-1">· {pending.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {pending.length === 0 ? (
                                    <div className="flex items-center justify-center h-32">
                                        <span className="text-[10px] font-mono text-muted-foreground/20 dark:text-white/20 uppercase tracking-widest">no pending tickets</span>
                                    </div>
                                ) : pending.map((n) => {
                                    const isDismissed = dismissedTickets.includes(n.id);
                                    return (
                                        <div
                                            key={n.id}
                                            className={`px-6 py-4 transition-colors border-b border-border dark:border-white/05 cursor-pointer hover:bg-accent dark:hover:bg-white/03 ${isDismissed ? "opacity-40 pointer-events-none" : "opacity-100"}`}
                                            onClick={() => !isDismissed && navigateToTicket(n.ticket_id, n.status)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[9px] font-mono text-orange-500/70">{n.ticket_id}</span>
                                                        <span className={`text-[9px] font-mono px-1.5 py-0.5 border ${getPriorityStyle(n.priority)}`}>{n.priority}</span>
                                                    </div>
                                                    <p className="text-[11px] font-mono text-foreground/80 dark:text-white/80 truncate mb-1">{n.ticket_subject || "No Subject"}</p>
                                                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground/30 dark:text-white/30">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        <span>Created: {formatDate(n.date_created)}</span>
                                                    </div>
                                                    {n.requestor_name && (
                                                        <p className="text-[9px] font-mono text-muted-foreground/25 dark:text-white/25 mt-0.5 truncate">{n.requestor_name}</p>
                                                    )}
                                                </div>
                                                {!isDismissed && (
                                                    <button onClick={(e) => { e.stopPropagation(); dismissTicket(n.id); }} className="shrink-0 text-muted-foreground/20 hover:text-muted-foreground/60 transition-colors text-sm font-mono dark:text-white/20 dark:hover:text-white/60">×</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Scheduled */}
                        <div className="flex flex-col overflow-hidden">
                            <div className="flex items-center gap-2 px-6 py-2.5 shrink-0 border-b border-border dark:border-white/06 bg-muted/30 dark:bg-white/01">
                                <Calendar className="w-3.5 h-3.5 text-cyan-500" />
                                <span className="text-[9px] font-mono font-bold text-cyan-500 uppercase tracking-[0.2em]">Scheduled</span>
                                <span className="text-[9px] font-mono text-muted-foreground/25 dark:text-white/25 ml-1">· {scheduled.length}</span>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                {scheduled.length === 0 ? (
                                    <div className="flex items-center justify-center h-32">
                                        <span className="text-[10px] font-mono text-muted-foreground/20 dark:text-white/20 uppercase tracking-widest">no scheduled tickets</span>
                                    </div>
                                ) : scheduled.map((n) => {
                                    const isDismissed = dismissedTickets.includes(n.id);
                                    return (
                                        <div
                                            key={n.id}
                                            className={`px-6 py-4 transition-colors border-b border-border dark:border-white/05 cursor-pointer hover:bg-accent dark:hover:bg-white/03 ${isDismissed ? "opacity-40 pointer-events-none" : "opacity-100"}`}
                                            onClick={() => !isDismissed && navigateToTicket(n.ticket_id, n.status)}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[9px] font-mono text-cyan-500/70">{n.ticket_id}</span>
                                                        <span className={`text-[9px] font-mono px-1.5 py-0.5 border ${getPriorityStyle(n.priority)}`}>{n.priority}</span>
                                                    </div>
                                                    <p className="text-[11px] font-mono text-foreground/80 dark:text-white/80 truncate mb-1">{n.ticket_subject || "No Subject"}</p>
                                                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-muted-foreground/30 dark:text-white/30">
                                                        <Clock className="w-2.5 h-2.5" />
                                                        <span>Scheduled: {formatDate(n.date_scheduled)}</span>
                                                    </div>
                                                    {n.requestor_name && (
                                                        <p className="text-[9px] font-mono text-muted-foreground/25 dark:text-white/25 mt-0.5 truncate">{n.requestor_name}</p>
                                                    )}
                                                </div>
                                                {!isDismissed && (
                                                    <button onClick={(e) => { e.stopPropagation(); dismissTicket(n.id); }} className="shrink-0 text-muted-foreground/20 hover:text-muted-foreground/60 transition-colors text-sm font-mono dark:text-white/20 dark:hover:text-white/60">×</button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
