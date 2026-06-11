"use client";

import * as React from "react";
import { DatePicker } from "@/components/date-picker";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader } from "@/components/ui/sidebar";
import { useFormat } from "@/contexts/FormatContext";
import { type DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type SidebarRightProps = React.ComponentProps<typeof Sidebar> & {
  userId?: string;
  dateCreatedFilterRange: DateRange | undefined;
  setDateCreatedFilterRangeAction: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
};

const G = {
  accent:  "#34d399",
};

export function SidebarRight({
  userId,
  dateCreatedFilterRange,
  setDateCreatedFilterRangeAction,
  ...props
}: SidebarRightProps) {
  const { timeFormat, dateFormat } = useFormat();
  const router = useRouter();

  const [time, setTime] = React.useState("");
  const [date, setDate] = React.useState("");
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const [confirmLogout, setConfirmLogout] = React.useState(false);

  const [userDetails, setUserDetails] = React.useState({
    ReferenceID:    "",
    Firstname:      "",
    Lastname:       "",
    Position:       "",
    Email:          "",
    profilePicture: "",
  });

  // ── Clock ─────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("en-US", {
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: timeFormat === "12h",
      }));
      if (dateFormat === "short") {
        setDate(now.toLocaleDateString("en-US"));
      } else if (dateFormat === "iso") {
        setDate(now.toISOString().split("T")[0]);
      } else {
        setDate(now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }));
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [timeFormat, dateFormat]);

  // ── User fetch ────────────────────────────────────────────────────────────
  React.useEffect(() => {
    if (!userId) return;
    fetch(`/api/user?id=${encodeURIComponent(userId)}`)
      .then((r) => r.json())
      .then((d) => setUserDetails({
        ReferenceID:    d.ReferenceID    || "",
        Firstname:      d.Firstname      || "",
        Lastname:       d.Lastname       || "",
        Position:       d.Position       || "",
        Email:          d.Email          || "",
        profilePicture: d.profilePicture || "",
      }))
      .catch(console.error);
  }, [userId]);

  // ── Logout ────────────────────────────────────────────────────────────────
  const doLogout = async () => {
    setIsLoggingOut(true);
    try {
      const deviceId = localStorage.getItem("deviceId") || "unknown-device";
      await addDoc(collection(db, "activity_logs"), {
        userId,
        email: userDetails.Email,
        status: "logout",
        timestamp: new Date().toISOString(),
        deviceId,
        location: null,
        browser: navigator.userAgent,
        date_created: serverTimestamp(),
      });
      localStorage.removeItem("userId");
      router.replace("/auth/login");
    } finally {
      setIsLoggingOut(false);
      setConfirmLogout(false);
    }
  };

  return (
    <>
      <Sidebar
        collapsible="none"
        className="sticky top-0 hidden h-svh lg:flex border-l-0 font-mono bg-background border-border dark:bg-[#0a0f0a] dark:border-[rgba(52,211,153,0.1)]"
        {...props}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(52,211,153,0.04) 1px, transparent 1px)",
            backgroundSize: "20px 20px",
            zIndex: 0,
          }}
        />

        {/* ── Header: user info ── */}
        <SidebarHeader
          className="relative z-10 border-b border-border dark:border-[rgba(52,211,153,0.1)] px-4 py-3 bg-muted/50 dark:bg-[#0a0f0a]"
        >
          {userDetails.Firstname ? (
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="flex items-center justify-center w-7 h-7 shrink-0 border text-[10px] font-bold uppercase bg-emerald-50 dark:bg-[rgba(52,211,153,0.08)] border-emerald-200 dark:border-[rgba(52,211,153,0.25)] text-emerald-600 dark:text-[#34d399]"
              >
                {userDetails.Firstname.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-widest truncate font-bold text-emerald-600 dark:text-[#34d399]">
                  {userDetails.Firstname} {userDetails.Lastname}
                </span>
                {userDetails.Position && (
                  <span className="text-[9px] uppercase tracking-widest truncate text-emerald-500/60 dark:text-[rgba(52,211,153,0.35)]">
                    {userDetails.Position}
                  </span>
                )}
              </div>
              {/* Online dot */}
              <span
                className="ml-auto inline-flex w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500 dark:bg-[#34d399]"
                style={{ boxShadow: `0 0 5px ${G.accent}` }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-500/60 dark:text-[rgba(52,211,153,0.35)]">
              <div className="w-3 h-3 border-t border-current rounded-full animate-spin" />
              <span className="text-[9px] uppercase tracking-widest">LOADING...</span>
            </div>
          )}

          {/* Profile + Logout links */}
          {userDetails.Firstname && (
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border dark:border-[rgba(52,211,153,0.1)]">
              <a
                href={`/profile?id=${encodeURIComponent(userId ?? "")}`}
                className="text-[9px] uppercase tracking-widest transition-opacity hover:opacity-70 text-emerald-500/60 dark:text-[rgba(52,211,153,0.35)]"
              >
                [ profile ]
              </a>
              <button
                onClick={() => setConfirmLogout(true)}
                className="text-[9px] uppercase tracking-widest transition-opacity hover:opacity-70 text-red-500/60"
              >
                [ logout ]
              </button>
            </div>
          )}
        </SidebarHeader>

        {/* ── Content ── */}
        <SidebarContent
          className="relative z-10 overflow-y-auto custom-scrollbar"
        >
          {/* Calendar section */}
          <div className="border-b border-emerald-100 dark:border-[rgba(52,211,153,0.08)]">
            <div
              className="flex items-center gap-2 px-4 py-2 border-b border-emerald-100 dark:border-[rgba(52,211,153,0.06)]"
            >
              <span
                className="inline-flex w-1.5 h-1.5 rounded-full shrink-0 bg-emerald-500 dark:bg-[#34d399]"
                style={{ boxShadow: `0 0 4px ${G.accent}` }}
              />
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-emerald-600 dark:text-[#34d399]">
                CALENDAR
              </span>
              {dateCreatedFilterRange?.from && (
                <button
                  onClick={() => setDateCreatedFilterRangeAction(undefined)}
                  className="ml-auto text-[8px] uppercase tracking-widest transition-opacity hover:opacity-70 text-emerald-500/60 dark:text-[rgba(52,211,153,0.35)]"
                >
                  CLEAR
                </button>
              )}
            </div>

            {/* Calendar with green overrides */}
            <div className="[&_.rdp-day_button:hover]:bg-emerald-100 dark:[&_.rdp-day_button:hover]:bg-[rgba(52,211,153,0.15)] [&_.rdp-day_button.rdp-day_selected]:bg-emerald-100 dark:[&_.rdp-day_button.rdp-day_selected]:bg-[rgba(52,211,153,0.2)] [&_.rdp-day_button.rdp-day_selected]:text-[#34d399] [&_.rdp-caption_label]:text-[#34d399] [&_.rdp-nav_button]:text-[#34d399]">
              <DatePicker
                selectedDateRange={dateCreatedFilterRange}
                onDateSelectAction={setDateCreatedFilterRangeAction}
              />
            </div>

            {/* Selected range display */}
            {dateCreatedFilterRange?.from && (
              <div
                className="mx-4 mb-3 px-3 py-2 border border-emerald-200 dark:border-[rgba(52,211,153,0.2)] bg-emerald-50 dark:bg-[rgba(52,211,153,0.04)] text-emerald-600 dark:text-[#34d399] text-[9px] font-mono uppercase tracking-widest"
              >
                {dateCreatedFilterRange.from.toLocaleDateString()}
                {dateCreatedFilterRange.to && dateCreatedFilterRange.to !== dateCreatedFilterRange.from
                  ? ` → ${dateCreatedFilterRange.to.toLocaleDateString()}`
                  : ""}
              </div>
            )}
          </div>
        </SidebarContent>

        {/* ── Footer: clock ── */}
        <SidebarFooter
          className="relative z-10 border-t border-border dark:border-[rgba(52,211,153,0.1)] px-4 py-3 bg-muted/50 dark:bg-[#0a0f0a]"
        >
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="text-[13px] font-mono font-bold tracking-widest text-emerald-600 dark:text-[#34d399]"
              style={{ textShadow: "0 0 8px rgba(52,211,153,0.4)" }}
            >
              {time}
            </span>
            <span className="text-[8px] uppercase tracking-[0.15em] font-mono text-emerald-500/60 dark:text-[rgba(52,211,153,0.35)]">
              {date}
            </span>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Logout confirm dialog */}
      <Dialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <DialogContent
          className="max-w-sm rounded-none p-0 font-mono bg-background dark:bg-[#0a0f0a] border-emerald-200 dark:border-[rgba(52,211,153,0.2)]"
        >
          <DialogHeader className="px-5 py-4 border-b border-border dark:border-[rgba(52,211,153,0.1)]">
            <DialogTitle className="text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-emerald-600 dark:text-[#34d399]">
              ⚠ Confirm Logout
            </DialogTitle>
            <DialogDescription className="text-[10px] font-mono mt-1 text-emerald-500/60 dark:text-[rgba(52,211,153,0.35)]">
              Are you sure you want to end this session?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 px-5 py-4">
            <button
              onClick={() => setConfirmLogout(false)}
              disabled={isLoggingOut}
              className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 transition-opacity hover:opacity-70 disabled:opacity-30 border border-border dark:border-[rgba(52,211,153,0.1)] text-emerald-500/60 dark:text-[rgba(52,211,153,0.35)]"
            >
              Cancel
            </button>
            <button
              onClick={doLogout}
              disabled={isLoggingOut}
              className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 transition-opacity hover:opacity-70 disabled:opacity-30 border border-red-400/40 text-red-500"
            >
              {isLoggingOut ? "Exiting..." : "[ Exit Session ]"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
