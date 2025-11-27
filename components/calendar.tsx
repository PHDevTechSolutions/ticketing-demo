"use client";

import * as React from "react";

import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, Timestamp } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface EventItem {
    id: string;
    date: string; // "YYYY-MM-DD" in local time
    title: string;
    description: string;
}

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate();
}

function getWeekdayOfFirstDay(year: number, month: number) {
    return new Date(year, month, 1).getDay();
}

function formatDateLocal(date: Date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    return `${year}-${month}-${day}`;
}

export function SimpleCalendar() {
    const now = React.useMemo(() => new Date(), []);
    const [currentYear, setCurrentYear] = React.useState(now.getFullYear());
    const [currentMonth, setCurrentMonth] = React.useState(now.getMonth()); // 0-indexed
    const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
    const [events, setEvents] = React.useState<EventItem[]>([]);

    React.useEffect(() => {
        async function fetchEvents() {
            try {
                const q = query(collection(db, "meetings"), orderBy("start_date"));
                const snapshot = await getDocs(q);

                const fetchedEvents = snapshot.docs.map((doc) => {
                    const data = doc.data();
                    let dateStr = data.start_date;
                    if (data.start_date instanceof Timestamp) {
                        dateStr = formatDateLocal(data.start_date.toDate());
                    }
                    return {
                        id: doc.id,
                        date: dateStr,
                        title: data.type_activity || "No title",
                        description: data.remarks || "",
                    };
                });

                setEvents(fetchedEvents);
            } catch (err) {
                console.error("Failed to fetch events", err);
            }
        }
        fetchEvents();
    }, []);

    const eventsByDate = React.useMemo(() => {
        const map: Record<string, EventItem[]> = {};
        for (const ev of events) {
            if (!map[ev.date]) map[ev.date] = [];
            map[ev.date].push(ev);
        }
        return map;
    }, [events]);

    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const firstWeekday = getWeekdayOfFirstDay(currentYear, currentMonth);

    const daysArray = [];

    for (let i = 0; i < firstWeekday; i++) {
        daysArray.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
        daysArray.push(day);
    }

    const handleDayClick = (day: number) => {
        const date = new Date(currentYear, currentMonth, day);
        setSelectedDate(date);
    };

    const selectedDateStr = selectedDate ? formatDateLocal(selectedDate) : null;

    const selectedEvents = selectedDateStr ? eventsByDate[selectedDateStr] || [] : [];

    return (
        <div className="flex flex-col md:flex-row max-w-7xl mx-auto gap-6 min-h-[700px]">
            {/* Calendar on left */}
            <Card className="flex-shrink-0 w-full md:w-2/3">
                <CardHeader className="flex justify-between items-center mb-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (currentMonth === 0) {
                                setCurrentYear((y) => y - 1);
                                setCurrentMonth(11);
                            } else {
                                setCurrentMonth((m) => m - 1);
                            }
                            setSelectedDate(null);
                        }}
                    >
                        Prev
                    </Button>
                    <CardTitle className="text-lg font-semibold">
                        {new Date(currentYear, currentMonth).toLocaleString("default", {
                            month: "long",
                            year: "numeric",
                        })}
                    </CardTitle>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (currentMonth === 11) {
                                setCurrentYear((y) => y + 1);
                                setCurrentMonth(0);
                            } else {
                                setCurrentMonth((m) => m + 1);
                            }
                            setSelectedDate(null);
                        }}
                    >
                        Next
                    </Button>
                </CardHeader>

                {/* Weekday labels */}
                <div className="grid grid-cols-7 text-center font-semibold text-gray-600 mb-2 select-none">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((wd) => (
                        <div key={wd} className="text-sm">
                            {wd}
                        </div>
                    ))}
                </div>

                {/* Days grid */}
                <div
                    className="grid grid-cols-7 gap-1"
                    style={{ "--cell-size": "6rem" } as React.CSSProperties}
                >
                    {daysArray.map((day, i) =>
                        day ? (
                            <button
                                key={i}
                                type="button"
                                onClick={() => handleDayClick(day)}
                                className={`relative flex items-center justify-center rounded-md text-lg font-semibold cursor-pointer
                  ${selectedDate?.getDate() === day &&
                                        selectedDate.getMonth() === currentMonth &&
                                        selectedDate.getFullYear() === currentYear
                                        ? "bg-primary text-primary-foreground"
                                        : "hover:bg-primary/20"
                                    }
                `}
                                style={{
                                    height: "var(--cell-size)",
                                    minWidth: "var(--cell-size)",
                                    aspectRatio: "1 / 1",
                                }}
                            >
                                {day}
                                {eventsByDate[
                                    `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(
                                        day
                                    ).padStart(2, "0")}`
                                ] && (
                                        <Badge
                                            variant="secondary"
                                            className="absolute bottom-2 right-2 rounded-full h-3 w-3 p-0"
                                        />
                                    )}
                            </button>
                        ) : (
                            <div
                                key={i}
                                className="h-[6rem]"
                                style={{ minWidth: "var(--cell-size)" }}
                            />
                        )
                    )}
                </div>
            </Card>

            {/* Events panel on right */}
            <Card className="w-full md:w-1/3 gap-2 overflow-auto shadow-none border-0">

                {selectedEvents.length === 0 && selectedDate && (
                    <p className="text-xs text-muted-foreground">
                        No events for this date.
                    </p>
                )}

                {selectedEvents.map((ev) => (
                    <CardContent
                        key={ev.id}
                        className="border rounded-md p-2 bg-muted hover:shadow-lg transition-shadow cursor-pointer"
                    >
                        <p className="font-semibold text-xs">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">{ev.description}</p>
                    </CardContent>
                ))}
            </Card>
        </div>
    );
}
