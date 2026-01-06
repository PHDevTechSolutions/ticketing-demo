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

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Meeting {
  id: string;
  title: string;
  start_date: Timestamp | Date | string | number;
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

export function Reminders() {
  const [now, setNow] = useState(new Date());
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const [showMeetingReminder, setShowMeetingReminder] = useState(false);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);

  const [showLogoutReminder, setShowLogoutReminder] = useState(false);

  // Dismissed meetings for today
  const [dismissedMeetings, setDismissedMeetings] = useState<string[]>([]);
  // Dismissed logout reminder today
  const [dismissedLogoutToday, setDismissedLogoutToday] = useState(false);

  useEffect(() => {
    const dismissedData = getDismissedMeetingsFromStorage();
    const todayKey = getTodayKey();
    setDismissedMeetings(dismissedData[todayKey] || []);

    const dismissedLogoutData = getDismissedLogoutFromStorage();
    setDismissedLogoutToday(!!dismissedLogoutData[todayKey]);
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
    </>
  );
}
