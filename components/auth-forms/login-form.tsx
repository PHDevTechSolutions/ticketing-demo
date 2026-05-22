"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/contexts/UserContext";
import Link from "next/link";
import { v4 as uuidv4 } from "uuid";

import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
    const [Email, setEmail] = useState("");
    const [Password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [lockUntil, setLockUntil] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState("");

    const { setUserId } = useUser();
    const router = useRouter();

    useEffect(() => {
        const tick = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
                timeZone: "Asia/Manila",
            }));
        };
        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, []);

    const playSound = (file: string) => {
        const audio = new Audio(file);
        audio.play().catch(() => { });
    };

    const getDeviceId = () => {
        let deviceId = localStorage.getItem("deviceId");
        if (!deviceId) {
            deviceId = uuidv4();
            localStorage.setItem("deviceId", deviceId);
        }
        return deviceId;
    };

    const getLocation = async () => {
        if (!navigator.geolocation) return null;
        try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) =>
                navigator.geolocation.getCurrentPosition(resolve, reject)
            );
            return {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
            };
        } catch {
            console.warn("User denied location access");
            return null;
        }
    };

    const isLoginAllowed = () => {
        const now = new Date();
        const phTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
        const hour = phTime.getHours();
        return hour >= 7 && hour < 19;
    };

    const handleSubmit = useCallback(
        async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();

            if (!Email || !Password) {
                toast.error("All fields are required!");
                return;
            }

            if (!isLoginAllowed()) {
                toast.error("⏰ Login is only allowed between 7:00 AM and 7:00 PM (Philippine time).");
                return;
            }

            setLoading(true);
            try {
                const response = await fetch("/api/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ Email, Password }),
                });

                const text = await response.text();
                let result;

                try {
                    result = JSON.parse(text);
                } catch {
                    toast.error("Invalid server response.");
                    playSound("/login-failed.mp3");
                    setLoading(false);
                    return;
                }

                if (!response.ok) {
                    if (result.lockUntil) {
                        setLockUntil(result.lockUntil);
                        toast.error(
                            `Account locked! Try again after ${new Date(result.lockUntil).toLocaleString()}.`
                        );
                    } else {
                        toast.error(result.message || "Login failed!");
                    }
                    playSound("/reset.mp3");
                    setLoading(false);
                    return;
                }

                // ✅ SUCCESS — log activity
                const deviceId = getDeviceId();
                const location = await getLocation();

                await addDoc(collection(db, "activity_logs"), {
                    email: Email,
                    status: "login",
                    timestamp: new Date().toISOString(),
                    deviceId,
                    location,
                    userId: result.userId,
                    browser: navigator.userAgent,
                    os: navigator.platform,
                    date_created: serverTimestamp(),
                });

                toast.success("Login successful!");
                playSound("/login.mp3");

                setUserId(result.userId);
                router.push(`/dashboard?id=${encodeURIComponent(result.userId)}`);

                setLoading(false);
            } catch (error) {
                console.error("Login error:", error);
                toast.error("An error occurred during login.");
                playSound("/login-failed.mp3");
                setLoading(false);
            }
        },
        [Email, Password, router, setUserId]
    );

    return (
        <div className={cn("w-full max-w-md", className)} {...props}>
            {/* Terminal window */}
            <div className="rounded-lg overflow-hidden border border-[#8b5cf6]/30 shadow-[0_0_40px_rgba(139,92,246,0.15)]">

                {/* Title bar */}
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#0d0d14] border-b border-[#8b5cf6]/20">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-[#ef4444] shadow-[0_0_6px_#ef4444]" />
                        <span className="w-3 h-3 rounded-full bg-[#eab308] shadow-[0_0_6px_#eab308]" />
                        <span className="w-3 h-3 rounded-full bg-[#22c55e] shadow-[0_0_6px_#22c55e]" />
                    </div>
                    <span className="text-xs font-mono text-[#8b5cf6]/70 tracking-widest uppercase">
                        helpdesk.auth — bash
                    </span>
                    <span className="text-xs font-mono text-[#22c55e]/60 tabular-nums">
                        {currentTime}
                    </span>
                </div>

                {/* Terminal body */}
                <div className="bg-[#080810] px-6 py-6 font-mono">

                    {/* Boot lines */}
                    <div className="mb-5 space-y-0.5 text-xs">
                        <p className="text-[#22c55e]/50">
                            <span className="text-[#8b5cf6]/60">$</span> ./helpdesk --init
                        </p>
                        <p className="text-[#a1a1aa]/40">
                            [  OK  ] Loaded authentication module
                        </p>
                        <p className="text-[#a1a1aa]/40">
                            [  OK  ] Secure session established
                        </p>
                        <p className="text-[#22c55e]/60">
                            ● STATUS: <span className="text-[#22c55e]">ONLINE</span>
                            <span className="ml-3 text-[#a1a1aa]/40">· PH/Manila · 7AM–7PM window</span>
                        </p>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-[#8b5cf6]/10 mb-5" />

                    {/* Header */}
                    <div className="mb-6">
                        <h1 className="text-lg font-bold text-white tracking-tight">
                            <span className="text-[#8b5cf6]">▸</span> AUTHENTICATE
                        </h1>
                        <p className="text-xs text-[#a1a1aa]/60 mt-0.5">
                            Enter credentials to access the Help Desk system
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Email field */}
                        <div className="space-y-1.5">
                            <label
                                htmlFor="email"
                                className="block text-xs text-[#8b5cf6] uppercase tracking-widest"
                            >
                                <span className="text-[#a1a1aa]/50 mr-1">01</span> Email
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b5cf6]/50 text-xs font-mono select-none">
                                    &gt;_
                                </span>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="user@helpdesk.com"
                                    required
                                    value={Email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="pl-9 bg-[#0d0d14] border-[#8b5cf6]/20 text-white placeholder:text-[#a1a1aa]/30 font-mono text-sm focus-visible:border-[#8b5cf6]/60 focus-visible:ring-[#8b5cf6]/20 focus-visible:ring-2 rounded-md"
                                />
                            </div>
                        </div>

                        {/* Password field */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label
                                    htmlFor="password"
                                    className="block text-xs text-[#8b5cf6] uppercase tracking-widest"
                                >
                                    <span className="text-[#a1a1aa]/50 mr-1">02</span> Password
                                </label>
                                <a
                                    href="/reset-password"
                                    className="text-[10px] text-[#a1a1aa]/40 hover:text-[#8b5cf6] transition-colors tracking-wide"
                                >
                                    [forgot?]
                                </a>
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8b5cf6]/50 text-xs font-mono select-none">
                                    &gt;_
                                </span>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••••••"
                                    required
                                    value={Password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="pl-9 bg-[#0d0d14] border-[#8b5cf6]/20 text-white placeholder:text-[#a1a1aa]/30 font-mono text-sm focus-visible:border-[#8b5cf6]/60 focus-visible:ring-[#8b5cf6]/20 focus-visible:ring-2 rounded-md"
                                />
                            </div>
                        </div>

                        {/* Lock warning */}
                        {lockUntil && (
                            <div className="flex items-start gap-2 rounded-md border border-[#ef4444]/30 bg-[#ef4444]/5 px-3 py-2">
                                <span className="text-[#ef4444] text-xs mt-0.5">✕</span>
                                <p className="text-xs text-[#ef4444]/80 font-mono">
                                    LOCKED until {new Date(lockUntil).toLocaleString()}
                                </p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "w-full mt-2 py-2.5 rounded-md font-mono text-sm font-semibold tracking-widest uppercase transition-all duration-200",
                                "border border-[#8b5cf6]/40 text-[#8b5cf6]",
                                "hover:bg-[#8b5cf6]/10 hover:border-[#8b5cf6]/70 hover:shadow-[0_0_20px_rgba(139,92,246,0.2)]",
                                "disabled:opacity-40 disabled:cursor-not-allowed",
                                loading && "animate-pulse"
                            )}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce [animation-delay:0ms]" />
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce [animation-delay:150ms]" />
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#8b5cf6] animate-bounce [animation-delay:300ms]" />
                                    <span className="ml-1">Authenticating</span>
                                </span>
                            ) : (
                                "[ Execute Login ]"
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t border-[#8b5cf6]/10 flex items-center justify-between">
                        <p className="text-[10px] text-[#a1a1aa]/30 font-mono">
                            No account?{" "}
                            <Link
                                href="/auth/signup"
                                className="text-[#8b5cf6]/60 hover:text-[#8b5cf6] transition-colors"
                            >
                                ./signup
                            </Link>
                        </p>
                        <p className="text-[10px] text-[#a1a1aa]/20 font-mono">
                            v2.0.0 · secure
                        </p>
                    </div>
                </div>
            </div>

            {/* Bottom note */}
            <p className="mt-4 text-center text-[10px] text-[#a1a1aa]/25 font-mono">
                By authenticating, you agree to our{" "}
                <a href="#" className="hover:text-[#8b5cf6]/50 transition-colors">Terms</a>
                {" "}and{" "}
                <a href="#" className="hover:text-[#8b5cf6]/50 transition-colors">Privacy Policy</a>
            </p>
        </div>
    );
}
