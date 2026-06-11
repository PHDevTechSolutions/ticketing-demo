"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { SendHorizonal, X, MessageSquare, Paperclip, FileText, Download } from "lucide-react";
import { supabase } from "@/utils/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ConversationMessage {
    id: number;
    ticket_id: string;
    sender: "bot" | "user";
    message: string;
    date_created: string;
    is_seen: boolean;
    file_url: string | null;
    file_type: string | null;
    file_name: string | null;
}

export interface TicketConversationDialogProps {
    open: boolean;
    onClose: () => void;
    ticketId: string;
    ticketSubject: string;
    requestorName: string;
    fullname: string;
}

// ─── Sound ────────────────────────────────────────────────────────────────────

function playNotifSound() {
    try {
        const audio = new Audio("/notif-sound.mp3");
        audio.volume = 0.7;
        audio.play().catch(() => {});
    } catch { /* ignore */ }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTs(dateStr: string): string {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
        month: "short", day: "numeric",
        hour: "2-digit", minute: "2-digit", hour12: true,
    });
}

function isImageType(fileType: string | null, fileName: string | null): boolean {
    if (fileType && fileType.startsWith("image/")) return true;
    if (fileName) {
        const ext = fileName.split(".").pop()?.toLowerCase();
        return ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "avif"].includes(ext ?? "");
    }
    return false;
}

async function uploadToCloudinary(file: File): Promise<{ url: string; type: string; name: string }> {
    const data = new FormData();
    data.append("file", file);
    data.append("upload_preset", "Xchire");
    data.append("folder", "ticket_conversations");
    const res = await fetch("https://api.cloudinary.com/v1_1/dhczsyzcz/auto/upload", {
        method: "POST",
        body: data,
    });
    const json = await res.json();
    if (!json.secure_url) throw new Error("Upload failed");
    return { url: json.secure_url as string, type: file.type, name: file.name };
}

// ─── Unread badge hook ────────────────────────────────────────────────────────

export function useUnreadCounts(ticketIds: string[]) {
    const [unread, setUnread] = useState<Record<string, number>>({});
    const ticketIdsKey = ticketIds.join(",");

    const fetchUnread = useCallback(async (ids: string[]) => {
        if (!ids.length) return;
        const { data, error } = await supabase
            .from("ticket_conversations")
            .select("ticket_id")
            .in("ticket_id", ids)
            .eq("sender", "user")
            .eq("is_seen", false);
        if (error) return;
        const counts: Record<string, number> = {};
        for (const row of (data ?? [])) {
            counts[row.ticket_id] = (counts[row.ticket_id] ?? 0) + 1;
        }
        setUnread(counts);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const markSeen = useCallback(async (ticketId: string) => {
        await supabase
            .from("ticket_conversations")
            .update({ is_seen: true })
            .eq("ticket_id", ticketId)
            .eq("sender", "user")
            .eq("is_seen", false);
        setUnread((prev) => {
            const next = { ...prev };
            delete next[ticketId];
            return next;
        });
    }, []);

    useEffect(() => {
        const ids = ticketIdsKey.split(",").filter(Boolean);
        if (!ids.length) return;
        fetchUnread(ids);

        const channel = supabase
            .channel("global-unread-watcher")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_conversations" }, (payload) => {
                const row = payload.new as ConversationMessage;
                // only count new unseen messages from requestor (user)
                if (row.sender !== "user") return;
                playNotifSound();
                setUnread((prev) => ({
                    ...prev,
                    [row.ticket_id]: (prev[row.ticket_id] ?? 0) + 1,
                }));
            })
            // re-fetch when is_seen flips — but only matters for user rows
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "ticket_conversations" },
                (payload) => {
                    const row = payload.new as ConversationMessage;
                    if (row.sender !== "user") return; // ignore bot message updates
                    const ids2 = ticketIdsKey.split(",").filter(Boolean);
                    fetchUnread(ids2);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [ticketIdsKey, fetchUnread]);

    return { unread, markSeen };
}

// ─── File/Image bubble attachment ─────────────────────────────────────────────

function MessageAttachment({ fileUrl, fileType, fileName, isUser, onImageClick }: {
    fileUrl: string;
    fileType: string | null;
    fileName: string | null;
    isUser: boolean;
    onImageClick: (url: string) => void;
}) {
    if (isImageType(fileType, fileName)) {
        return (
            <div className="mt-1.5 cursor-zoom-in" onClick={() => onImageClick(fileUrl)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={fileUrl}
                    alt={fileName ?? "image"}
                    className={cn(
                        "max-w-full max-h-56 object-contain border",
                        isUser ? "border-orange-500/25" : "border-cyan-500/25"
                    )}
                />
                {fileName && (
                    <span className="block text-[8px] font-mono text-muted-foreground/25 dark:text-white/25 mt-0.5 truncate">{fileName}</span>
                )}
            </div>
        );
    }
    // non-image file
    return (
        <a
            href={fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            download={fileName ?? true}
            className={cn(
                "flex items-center gap-2 mt-1.5 px-3 py-2 transition-colors border",
                isUser 
                    ? "border-orange-500/20 bg-orange-500/5 dark:border-orange-500/20 dark:bg-orange-500/5" 
                    : "border-cyan-500/20 bg-cyan-500/5 dark:border-cyan-500/20 dark:bg-cyan-500/5"
            )}
        >
            <FileText className={cn("w-3.5 h-3.5 shrink-0", isUser ? "text-orange-500/60" : "text-cyan-500/60")} />
            <span className="text-[10px] font-mono text-foreground/70 dark:text-[#e5e5d0]/70 truncate max-w-[200px]">{fileName ?? "file"}</span>
            <Download className="w-3 h-3 ml-auto shrink-0 text-muted-foreground/30 dark:text-white/30" />
        </a>
    );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export const TicketConversationDialog: React.FC<TicketConversationDialogProps> = ({
    open, onClose, ticketId, ticketSubject, requestorName, fullname,
}) => {
    const [messages, setMessages] = useState<ConversationMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const [input, setInput] = useState("");
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [lightbox, setLightbox] = useState<string | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── mark all user messages as seen ────────────────────────────────────────
    const markAllSeen = useCallback(async () => {
        if (!ticketId) return;
        await supabase
            .from("ticket_conversations")
            .update({ is_seen: true })
            .eq("ticket_id", ticketId)
            .eq("sender", "user")
            .eq("is_seen", false);
    }, [ticketId]);

    // ── fetch ──────────────────────────────────────────────────────────────────
    const fetchMessages = useCallback(async () => {
        if (!ticketId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("ticket_conversations")
                .select("*")
                .eq("ticket_id", ticketId)
                .order("date_created", { ascending: true });
            if (error) throw error;
            setMessages((data as ConversationMessage[]) ?? []);
        } catch (err: any) {
            toast.error(err.message || "Failed to load conversation");
        } finally {
            setLoading(false);
        }
    }, [ticketId]);

    // ── realtime ───────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!open || !ticketId) return;
        fetchMessages().then(() => markAllSeen());

        const channel = supabase
            .channel(`conv-dialog:${ticketId}`)
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "ticket_conversations", filter: `ticket_id=eq.${ticketId}` },
                (payload) => {
                    const n = payload.new as ConversationMessage;
                    const o = payload.old as ConversationMessage;
                    setMessages((curr) => {
                        switch (payload.eventType) {
                            case "INSERT":
                                if (curr.some((m) => m.id === n.id)) return curr;
                                if (n.sender === "user") {
                                    // mark seen immediately
                                    supabase.from("ticket_conversations").update({ is_seen: true }).eq("id", n.id).then(() => {});
                                }
                                return [...curr, n];
                            case "UPDATE":
                                return curr.map((m) => (m.id === n.id ? n : m));
                            case "DELETE":
                                return curr.filter((m) => m.id !== o.id);
                            default:
                                return curr;
                        }
                    });
                }
            )
            .subscribe((status) => {
                if (status === "CHANNEL_ERROR") toast.error("Realtime error — messages may not update live");
            });

        return () => { supabase.removeChannel(channel); };
    }, [open, ticketId, fetchMessages, markAllSeen]);

    // ── scroll ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ── focus ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 80);
    }, [open]);

    // ── send ───────────────────────────────────────────────────────────────────
    async function handleSend() {
        const text = input.trim();
        if (!text && !attachedFile) return;
        if (sending || uploading) return;
        setSending(true);

        let fileUrl: string | null = null;
        let fileType: string | null = null;
        let fileName: string | null = null;

        if (attachedFile) {
            setUploading(true);
            try {
                const result = await uploadToCloudinary(attachedFile);
                fileUrl = result.url;
                fileType = result.type;
                fileName = result.name;
            } catch {
                toast.error("File upload failed");
                setSending(false);
                setUploading(false);
                return;
            } finally {
                setUploading(false);
            }
        }

        try {
            const { error } = await supabase.from("ticket_conversations").insert([{
                ticket_id: ticketId,
                sender: "bot",
                message: text || "",
                file_url: fileUrl,
                file_type: fileType,
                file_name: fileName,
                // is_seen is only meaningful for sender='user' messages
                // do NOT set it on bot messages
            }]);
            if (error) throw error;
            setInput("");
            setAttachedFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (err: any) {
            toast.error(err.message || "Failed to send message");
        } finally {
            setSending(false);
        }
    }

    // ── paste image from clipboard ─────────────────────────────────────────────
    function handlePaste(e: React.ClipboardEvent) {
        for (const item of e.clipboardData.items) {
            if (item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file) { setAttachedFile(file); toast.success("Image pasted — click Send"); }
            }
        }
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background dark:bg-[#080c10]">

            {/* ── Top bar ───────────────────────────────────────────────────── */}
            <div
                className="flex items-center justify-between px-6 py-3 shrink-0 border-b border-border dark:border-white/10 bg-muted/50 dark:bg-white/5"
            >
                <div className="flex items-center gap-3 min-w-0">
                    <MessageSquare className="w-3.5 h-3.5 text-cyan-500 shrink-0" />
                    <span className="text-[11px] font-mono font-bold text-cyan-500 uppercase tracking-[0.2em] shrink-0">
                        Conversation
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground/30 dark:text-white/25 truncate">· {ticketId}</span>
                </div>
                <button
                    onClick={onClose}
                    aria-label="Close conversation"
                    className="flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-muted-foreground/50 hover:text-destructive transition-colors shrink-0 border border-border dark:border-white/10"
                >
                    <X className="w-3 h-3" />
                    Close
                </button>
            </div>

            {/* ── Meta strip ────────────────────────────────────────────────── */}
            <div
                className="px-6 py-2 shrink-0 flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border dark:border-white/05 bg-muted/30 dark:bg-white/5"
            >
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-muted-foreground/30 dark:text-white/25 uppercase tracking-widest">Ticket</span>
                    <span className="text-[10px] font-mono text-orange-500/70">{ticketId}</span>
                </div>
                {ticketSubject && (
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-muted-foreground/20 dark:text-white/15">|</span>
                        <span className="text-[10px] font-mono text-muted-foreground/50 dark:text-[#e5e5d0]/40 truncate max-w-[280px]">{ticketSubject}</span>
                    </div>
                )}
                {requestorName && (
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-muted-foreground/20 dark:text-white/15">|</span>
                        <span className="text-[9px] font-mono text-orange-500/40 uppercase tracking-widest">From</span>
                        <span className="text-[10px] font-mono text-orange-500/80 uppercase font-semibold">{requestorName}</span>
                    </div>
                )}
            </div>

            {/* ── Messages ──────────────────────────────────────────────────── */}
            <div className="flex-1 overflow-y-auto px-10 py-6">
                {loading ? (
                    <div className="flex items-center gap-2 justify-center py-16">
                        <span className="w-1 h-1 bg-cyan-500 animate-bounce [animation-delay:0ms]" />
                        <span className="w-1 h-1 bg-cyan-500 animate-bounce [animation-delay:150ms]" />
                        <span className="w-1 h-1 bg-cyan-500 animate-bounce [animation-delay:300ms]" />
                        <span className="text-[10px] font-mono text-muted-foreground/30 dark:text-white/30 ml-2 uppercase tracking-widest">Loading…</span>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 py-24">
                        <MessageSquare className="w-8 h-8 text-muted-foreground/10 dark:text-white/10" />
                        <span className="text-[10px] font-mono text-muted-foreground/15 dark:text-white/15 uppercase tracking-widest">No messages yet</span>
                        <span className="text-[9px] font-mono text-muted-foreground/10 dark:text-white/10">Start the conversation below</span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        {messages.map((msg) => {
                            const isUser = msg.sender === "user";
                            const hasFile = !!msg.file_url;
                            const hasText = !!msg.message;
                            return (
                                <div key={msg.id} className={cn("flex items-end gap-2.5", isUser ? "justify-start" : "justify-end")}>

                                    {/* Avatar left */}
                                    {isUser && (
                                        <div
                                            className="shrink-0 w-7 h-7 flex items-center justify-center text-[9px] font-mono font-bold uppercase self-end border border-orange-500/35 bg-orange-500/10 text-orange-500/80 dark:bg-orange-500/08 dark:text-orange-500/80"
                                        >
                                            {(requestorName || "R").charAt(0)}
                                        </div>
                                    )}

                                    {/* Bubble column */}
                                    <div className={cn("flex flex-col gap-0.5 max-w-[58%]", isUser ? "items-start" : "items-end")}>
                                        {/* name + time */}
                                        <div className={cn("flex items-center gap-2", isUser ? "" : "flex-row-reverse")}>
                                            <span
                                                className={cn("text-[9px] font-mono font-semibold uppercase tracking-wider", isUser ? "text-orange-500/65" : "text-cyan-500/65")}
                                            >
                                                {isUser ? (requestorName || "Requestor") : (fullname || "Processor")}
                                            </span>
                                            <span className="text-[8px] font-mono text-muted-foreground/20 dark:text-white/20">{formatTs(msg.date_created)}</span>
                                        </div>

                                        {/* bubble */}
                                        <div
                                            className={cn(
                                                "px-3.5 py-2.5 text-[11px] font-mono leading-relaxed min-w-[60px] border",
                                                isUser 
                                                    ? "border-orange-500/18 bg-orange-500/5 dark:border-orange-500/18 dark:bg-orange-500/05 rounded-tr-lg rounded-br-lg rounded-bl-lg" 
                                                    : "border-cyan-500/18 bg-cyan-500/5 dark:border-cyan-500/18 dark:bg-cyan-500/05 rounded-tl-lg rounded-br-lg rounded-bl-lg",
                                                "text-foreground/90 dark:text-[#e5e5d0]/90"
                                            )}
                                        >
                                            {hasText && (
                                                <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                                            )}
                                            {hasFile && (
                                                <MessageAttachment
                                                    fileUrl={msg.file_url!}
                                                    fileType={msg.file_type}
                                                    fileName={msg.file_name}
                                                    isUser={isUser}
                                                    onImageClick={setLightbox}
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Avatar right */}
                                    {!isUser && (
                                        <div
                                            className="shrink-0 w-7 h-7 flex items-center justify-center text-[9px] font-mono font-bold uppercase self-end border border-cyan-500/35 bg-cyan-500/10 text-cyan-500/80 dark:bg-cyan-500/08 dark:text-cyan-500/80"
                                        >
                                            {(fullname || "P").charAt(0)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                        <div ref={bottomRef} />
                    </div>
                )}
            </div>

            {/* ── Attached file preview ─────────────────────────────────────── */}
            {attachedFile && (
                <div
                    className="shrink-0 px-6 py-2 flex items-center gap-3 border-t border-border dark:border-white/06 bg-muted/30 dark:bg-white/01"
                >
                    {attachedFile.type.startsWith("image/") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={URL.createObjectURL(attachedFile)}
                            alt="preview"
                            className="h-10 w-auto object-contain border border-cyan-500/20"
                        />
                    ) : (
                        <FileText className="w-4 h-4 text-cyan-500/60" />
                    )}
                    <span className="text-[10px] font-mono text-foreground/50 dark:text-[#e5e5d0]/50 truncate">{attachedFile.name}</span>
                    <button
                        onClick={() => { setAttachedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                        className="ml-auto text-[9px] font-mono text-destructive/60 hover:text-destructive transition-colors"
                    >
                        remove
                    </button>
                </div>
            )}

            {/* ── Input bar ─────────────────────────────────────────────────── */}
            <div
                className="shrink-0 px-6 py-3 border-t border-border dark:border-white/07 bg-muted/50 dark:bg-white/02"
            >
                <div className="flex items-end gap-2">
                    {/* File attach button */}
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="shrink-0 flex items-center justify-center w-9 h-9 text-muted-foreground/30 hover:text-cyan-500 transition-colors self-end border border-border dark:border-white/07 bg-background dark:bg-[#080c10]"
                        aria-label="Attach file"
                    >
                        <Paperclip className="w-3.5 h-3.5" />
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) setAttachedFile(f);
                        }}
                    />

                    {/* Text input */}
                    <textarea
                        ref={inputRef}
                        rows={2}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        onPaste={handlePaste}
                        placeholder="> type a reply… (Enter to send · Shift+Enter for newline · paste image)"
                        className="flex-1 text-[11px] font-mono text-foreground/80 dark:text-[#e5e5d0]/80 placeholder:text-muted-foreground/15 dark:placeholder:text-white/15 px-3 py-2 resize-none focus:outline-none bg-muted dark:bg-[#0d1117] border border-border dark:border-white/08"
                    />

                    {/* Send button */}
                    <button
                        onClick={handleSend}
                        disabled={(!input.trim() && !attachedFile) || sending || uploading}
                        aria-label="Send message"
                        className="flex items-center gap-2 px-4 text-[9px] font-mono uppercase tracking-widest text-cyan-500 hover:bg-cyan-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 self-stretch border border-cyan-500/35"
                    >
                        <SendHorizonal className="w-3.5 h-3.5" />
                        {uploading ? "Uploading…" : "Send"}
                    </button>
                </div>
                <p className="text-[8px] font-mono text-muted-foreground/15 dark:text-white/15 mt-1.5 uppercase tracking-widest">
                    replying as · <span className="text-cyan-500/50">{fullname || "processor"}</span>
                    <span className="text-muted-foreground/10 dark:text-white/10 mx-2">·</span>
                    Enter to send · attach file or paste image
                </p>
            </div>
            {/* ── Lightbox ──────────────────────────────────────────────────── */}
            {lightbox && (
                <div
                    className="absolute inset-0 z-10 flex items-center justify-center bg-black/90 dark:bg-black/92"
                    onClick={() => setLightbox(null)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src={lightbox}
                        alt="full view"
                        className="max-w-[90%] max-h-[90%] object-contain border border-white/10"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <div className="absolute top-4 right-4 flex items-center gap-2">
                        <a
                            href={lightbox}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-white/50 hover:text-cyan-500 transition-colors border border-white/10 dark:border-white/12"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <Download className="w-3 h-3 inline mr-1" />
                            Download
                        </a>
                        <button
                            onClick={() => setLightbox(null)}
                            className="text-[9px] font-mono uppercase tracking-widest px-3 py-1.5 text-white/50 hover:text-destructive transition-colors border border-white/10 dark:border-white/12"
                        >
                            <X className="w-3 h-3 inline mr-1" />
                            Close
                        </button>
                    </div>
                    <p className="absolute bottom-4 text-[9px] font-mono text-white/20 uppercase tracking-widest">
                        click outside to close
                    </p>
                </div>
            )}
        </div>
    );
};
