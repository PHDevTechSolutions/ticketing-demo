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

type SidebarRightProps = React.ComponentProps<typeof Sidebar> & {
  userId?: string;
  dateCreatedFilterRange: DateRange | undefined;
  setDateCreatedFilterRangeAction: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
};

const G = {
  bg:      "#0a0f0a",
  accent:  "#34d399",
  border:  "rgba(52,211,153,0.1)",
  dim:     "rgba(52,211,153,0.35)",
  faint:   "rgba(52,211,153,0.08)",
  text:    "rgba(52,211,153,0.7)",
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
        className="sticky top-0 hidden h-svh lg:flex border-l-0 font-mono"
        style={{
          "--sidebar-background": G.bg,
          "--sidebar-foreground": G.text,
          "--sidebar-border":     G.border,
        } as React.CSSProperties}
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
          className="relative z-10 border-b px-4 py-3"
          style={{ borderColor: G.border, backgroundColor: G.bg }}
        >
          {userDetails.Firstname ? (
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="flex items-center justify-center w-7 h-7 shrink-0 border text-[10px] font-bold uppercase"
                style={{ backgroundColor: G.faint, borderColor: "rgba(52,211,153,0.25)", color: G.accent }}
              >
                {userDetails.Firstname.charAt(0)}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] uppercase tracking-widest truncate font-bold" style={{ color: G.accent }}>
                  {userDetails.Firstname} {userDetails.Lastname}
                </span>
                {userDetails.Position && (
                  <span className="text-[9px] uppercase tracking-widest truncate" style={{ color: G.dim }}>
                    {userDetails.Position}
                  </span>
                )}
              </div>
              {/* Online dot */}
              <span
                className="ml-auto inline-flex w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: G.accent, boxShadow: `0 0 5px ${G.accent}` }}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2" style={{ color: G.dim }}>
              <div className="w-3 h-3 border-t border-current rounded-full animate-spin" />
              <span className="text-[9px] uppercase tracking-widest">LOADING...</span>
            </div>
          )}

          {/* Profile + Logout links */}
          {userDetails.Firstname && (
            <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: `1px solid ${G.border}` }}>
              <a
                href={`/profile?id=${encodeURIComponent(userId ?? "")}`}
                className="text-[9px] uppercase tracking-widest transition-opacity hover:opacity-70"
                style={{ color: G.dim }}
              >
                [ profile ]
              </a>
              <button
                onClick={() => setConfirmLogout(true)}
                className="text-[9px] uppercase tracking-widest transition-opacity hover:opacity-70"
                style={{ color: "rgba(239,68,68,0.5)" }}
              >
                [ logout ]
              </button>
            </div>
          )}
        </SidebarHeader>

        {/* ── Content ── */}
        <SidebarContent
          className="relative z-10 overflow-y-auto custom-scrollbar"
          style={{ backgroundColor: G.bg }}
        >
          {/* Calendar section */}
          <div className="border-b" style={{ borderColor: "rgba(52,211,153,0.08)" }}>
            <div
              className="flex items-center gap-2 px-4 py-2"
              style={{ borderBottom: "1px solid rgba(52,211,153,0.06)" }}
            >
              <span
                className="inline-flex w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: G.accent, boxShadow: `0 0 4px ${G.accent}` }}
              />
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold" style={{ color: G.accent }}>
                CALENDAR
              </span>
              {dateCreatedFilterRange?.from && (
                <button
                  onClick={() => setDateCreatedFilterRangeAction(undefined)}
                  className="ml-auto text-[8px] uppercase tracking-widest transition-opacity hover:opacity-70"
                  style={{ color: G.dim }}
                >
                  CLEAR
                </button>
              )}
            </div>

            {/* Calendar with green overrides */}
            <div className="[&_.rdp-day_button:hover]:bg-[rgba(52,211,153,0.15)] [&_.rdp-day_button.rdp-day_selected]:bg-[rgba(52,211,153,0.2)] [&_.rdp-day_button.rdp-day_selected]:text-[#34d399] [&_.rdp-caption_label]:text-[#34d399] [&_.rdp-nav_button]:text-[#34d399]">
              <DatePicker
                selectedDateRange={dateCreatedFilterRange}
                onDateSelectAction={setDateCreatedFilterRangeAction}
              />
            </div>

            {/* Selected range display */}
            {dateCreatedFilterRange?.from && (
              <div
                className="mx-4 mb-3 px-3 py-2 border text-[9px] font-mono uppercase tracking-widest"
                style={{ borderColor: "rgba(52,211,153,0.2)", backgroundColor: "rgba(52,211,153,0.04)", color: G.accent }}
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
          className="relative z-10 border-t px-4 py-3"
          style={{ borderColor: G.border, backgroundColor: G.bg }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span
              className="text-[13px] font-mono font-bold tracking-widest"
              style={{ color: G.accent, textShadow: "0 0 8px rgba(52,211,153,0.4)" }}
            >
              {time}
            </span>
            <span className="text-[8px] uppercase tracking-[0.15em] font-mono" style={{ color: G.dim }}>
              {date}
            </span>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Logout confirm dialog */}
      <Dialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <DialogContent
          className="max-w-sm rounded-none p-0 font-mono"
          style={{ backgroundColor: G.bg, border: `1px solid rgba(52,211,153,0.2)` }}
        >
          <DialogHeader className="px-5 py-4" style={{ borderBottom: `1px solid ${G.border}` }}>
            <DialogTitle className="text-[11px] font-mono font-bold uppercase tracking-[0.2em]" style={{ color: G.accent }}>
              ⚠ Confirm Logout
            </DialogTitle>
            <DialogDescription className="text-[10px] font-mono mt-1" style={{ color: G.dim }}>
              Are you sure you want to end this session?
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 px-5 py-4">
            <button
              onClick={() => setConfirmLogout(false)}
              disabled={isLoggingOut}
              className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 transition-opacity hover:opacity-70 disabled:opacity-30"
              style={{ border: `1px solid ${G.border}`, color: G.dim }}
            >
              Cancel
            </button>
            <button
              onClick={doLogout}
              disabled={isLoggingOut}
              className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 transition-opacity hover:opacity-70 disabled:opacity-30"
              style={{ border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444" }}
            >
              {isLoggingOut ? "Exiting..." : "[ Exit Session ]"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
