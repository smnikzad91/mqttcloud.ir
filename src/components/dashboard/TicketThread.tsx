"use client";

// Ticket conversation shared by /dashboard/support/[id] and /admin/tickets/[id].
// `viewer` decides which side is "me": the viewer's own messages sit on the
// end side in brand color, the other party's on the start side.

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Send, Headset, User, Lock } from "lucide-react";
import { useT } from "@/i18n/useT";
import { useLanguage } from "@/context/LanguageContext";
import ImageUploader from "./ImageUploader";
import { StatusBadge, Panel, buttonClass, inputClass, cn } from "./ui";

export type TicketReply = { _id: string; sender: "user" | "admin"; message: string; images?: string[]; createdAt: string };
export type TicketData = {
  _id: string;
  subject: string;
  message: string;
  images?: string[];
  status: "open" | "answered" | "closed";
  replies: TicketReply[];
  createdAt: string;
  updatedAt?: string;
};

const REPLY_MIN = 5;
const REPLY_MAX = 3000;

export function useTicketStatusLabels() {
  const t = useT();
  return useMemo<Record<string, string>>(() => ({ open: t("statusOpen"), answered: t("statusAnswered"), closed: t("statusClosed") }), [t]);
}

export default function TicketThread({
  ticket,
  viewer,
  backHref,
  onReply,
  headerActions,
  aside,
  customerName,
}: {
  ticket: TicketData;
  viewer: "user" | "admin";
  backHref: string;
  /** Sends a reply; resolve true on success so the composer clears. */
  onReply: (message: string, images: string[]) => Promise<boolean>;
  headerActions?: React.ReactNode;
  /** Optional side panel (the admin view shows the requester here). */
  aside?: React.ReactNode;
  customerName?: string;
}) {
  const t = useT();
  const { lang } = useLanguage();
  const isRTL = lang === "fa";
  const statusLabels = useTicketStatusLabels();
  const Back = isRTL ? ArrowRight : ArrowLeft;
  const bottomRef = useRef<HTMLLIElement>(null);

  const [reply, setReply] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [ticket.replies.length]);

  const when = (iso: string) => new Date(iso).toLocaleString(isRTL ? "fa-IR" : "en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const msg = reply.trim();
    if (msg.length < REPLY_MIN) return toast.error(t("ticketReplyTooShort"));
    if (msg.length > REPLY_MAX) return toast.error(t("ticketReplyTooLong"));
    setSending(true);
    const ok = await onReply(msg, images);
    setSending(false);
    if (ok) { setReply(""); setImages([]); }
  };

  const messages: { key: string; sender: "user" | "admin"; message: string; images?: string[]; createdAt: string }[] = [
    { key: "first", sender: "user", message: ticket.message, images: ticket.images, createdAt: ticket.createdAt },
    ...ticket.replies.map((r) => ({ key: r._id, ...r })),
  ];

  const nameFor = (sender: "user" | "admin") =>
    sender === viewer ? t("tkYou") : sender === "admin" ? t("tkSupportTeam") : customerName || t("tkCustomer");

  const closed = ticket.status === "closed";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
          <Back className="h-4 w-4" />{t("backToTickets")}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 dir="auto" className="text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-white">{ticket.subject}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <StatusBadge status={ticket.status} label={statusLabels[ticket.status]} />
              <span>{t("tkOpened")}: {when(ticket.createdAt)}</span>
            </div>
          </div>
          {headerActions && <div className="flex flex-wrap gap-2">{headerActions}</div>}
        </div>
      </div>

      <div className={cn("grid gap-6", !!aside && "xl:grid-cols-[1fr_300px]")}>
        <div className="min-w-0 space-y-4">
          <Panel bodyClassName="p-0">
            <ol className="max-h-[60vh] space-y-5 overflow-y-auto p-5">
              {messages.map((m) => {
                const mine = m.sender === viewer;
                return (
                  <li key={m.key} className={cn("flex gap-3", mine && "flex-row-reverse")}>
                    <span className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                      m.sender === "admin" ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-300" : "bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400",
                    )}>
                      {m.sender === "admin" ? <Headset className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </span>
                    <div className={cn("min-w-0 max-w-[85%] sm:max-w-[75%]", mine && "text-end")}>
                      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                        <span className="font-semibold text-gray-700 dark:text-gray-200">{nameFor(m.sender)}</span> · {when(m.createdAt)}
                      </p>
                      <div className={cn(
                        "inline-block rounded-2xl px-4 py-3 text-start text-sm leading-relaxed",
                        mine ? "rounded-se-sm bg-brand-500 text-white" : "rounded-ss-sm bg-gray-100 text-gray-800 dark:bg-white/5 dark:text-gray-100",
                      )}>
                        <p dir="auto" className="whitespace-pre-wrap break-words">{m.message}</p>
                        {m.images && m.images.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {m.images.map((url) => (
                              <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="block h-20 w-20 overflow-hidden rounded-lg ring-1 ring-black/10 transition hover:opacity-90 dark:ring-white/10">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={url} alt="" className="h-full w-full object-cover" />
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
              <li ref={bottomRef} aria-hidden />
            </ol>
          </Panel>

          {closed ? (
            <p className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-5 py-4 text-sm text-gray-500 dark:border-gray-800 dark:bg-white/[0.03] dark:text-gray-400">
              <Lock className="h-4 w-4 shrink-0" />{t("ticketClosed")}{viewer === "admin" && <> {t("tkReopenHint")}</>}
            </p>
          ) : (
            <Panel>
              <form onSubmit={submit} className="space-y-3">
                <label htmlFor="ticket-reply" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t("yourReply")}</label>
                <textarea
                  id="ticket-reply"
                  dir="auto"
                  rows={4}
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) (e.currentTarget.form as HTMLFormElement).requestSubmit(); }}
                  placeholder={t("replyPlaceholder")}
                  maxLength={REPLY_MAX}
                  className={cn(inputClass, "h-auto resize-y py-3")}
                />
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <ImageUploader value={images} onChange={setImages} onBusyChange={setUploading} />
                  <button type="submit" disabled={sending || uploading || reply.trim().length < REPLY_MIN} className={buttonClass("primary")}>
                    <Send className="h-4 w-4 rtl:-scale-x-100" />{sending ? t("sending") : t("sendReply")}
                  </button>
                </div>
              </form>
            </Panel>
          )}
        </div>
        {aside}
      </div>
    </div>
  );
}
