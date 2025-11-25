"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import type { CityComparisonInput, Message, Mode } from "../../../lib/types";

export default function SharedChatPage() {
  const params = useParams();
  const chatId = params.id as string;

  const [mode, setMode] = useState<Mode>("live-prices");
  const [trip, setTrip] = useState<CityComparisonInput | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSharedChat() {
      try {
        const res = await fetch(`/api/shared/${chatId}`);
        
        if (!res.ok) {
          throw new Error("Chat not found");
        }

        const data = await res.json();
        setMode(data.mode);
        setTrip(data.trip);
        setMessages(data.messages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load chat");
      } finally {
        setLoading(false);
      }
    }

    if (chatId) {
      loadSharedChat();
    }
  }, [chatId]);

  const conversationBlocks = (() => {
    const blocks: { id: string; question?: Message; answer?: Message }[] = [];
    let pendingUser: Message | null = null;

    for (const m of messages) {
      if (m.role === "user") {
        pendingUser = m;
      } else if (m.role === "assistant") {
        if (pendingUser) {
          blocks.push({
            id: `${pendingUser.id}-${m.id}`,
            question: pendingUser,
            answer: m
          });
          pendingUser = null;
        } else {
          blocks.push({
            id: m.id,
            answer: m
          });
        }
      }
    }

    if (pendingUser) {
      blocks.push({
        id: pendingUser.id,
        question: pendingUser
      });
    }

    return blocks;
  })();

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-sky-50 to-slate-50">
        <div className="text-center">
          <div className="mb-4 inline-flex h-12 w-12 animate-spin rounded-full border-4 border-hippo-accentBlue border-t-transparent"></div>
          <p className="text-slate-600">Loading shared chat...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 via-sky-50 to-slate-50">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-semibold text-slate-900">Chat Not Found</h1>
          <p className="mb-4 text-slate-600">{error}</p>
          <a
            href="/"
            className="inline-flex items-center rounded-xl bg-hippo-accentBlue px-4 py-2 text-sm font-medium text-white hover:bg-hippo-accentPurple"
          >
            Start a New Chat
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-sky-50 to-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="mb-2 text-2xl sm:text-3xl font-semibold tracking-tight text-hippo-accentBlue">
              Hippo AI 🦛
            </h1>
            <p className="text-sm text-slate-600">
              Shared conversation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/"
              className="rounded-full bg-hippo-accentBlue px-4 py-2 text-xs text-white hover:bg-hippo-accentPurple"
            >
              Start Your Own Chat
            </a>
          </div>
        </div>
      </header>

      <div className="flex flex-1 justify-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-50">
        <div className="flex w-full max-w-5xl flex-col px-4 pb-6 pt-4">
          {trip && (
            <div className="mb-3 grid gap-2 rounded-2xl border border-hippo-border bg-white/80 p-3 text-[11px] text-slate-700 sm:grid-cols-5">
              <div className="sm:col-span-1">
                <label className="mb-1 block font-medium">From</label>
                <div className="rounded-md border border-hippo-border bg-slate-50 px-2 py-1">
                  {trip.origin || "—"}
                </div>
              </div>
              <div>
                <label className="mb-1 block font-medium">City A</label>
                <div className="rounded-md border border-hippo-border bg-slate-50 px-2 py-1">
                  {trip.cityA || "—"}
                </div>
              </div>
              <div>
                <label className="mb-1 block font-medium">City B</label>
                <div className="rounded-md border border-hippo-border bg-slate-50 px-2 py-1">
                  {trip.cityB || "—"}
                </div>
              </div>
              <div>
                <label className="mb-1 block font-medium">Leave</label>
                <div className="rounded-md border border-hippo-border bg-slate-50 px-2 py-1">
                  {trip.startDate || "—"}
                </div>
              </div>
              <div>
                <label className="mb-1 block font-medium">Return</label>
                <div className="rounded-md border border-hippo-border bg-slate-50 px-2 py-1">
                  {trip.endDate || "—"}
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 space-y-6 overflow-y-auto rounded-3xl border border-hippo-border border-t-4 border-t-hippo-accentBlue bg-white pt-6 pr-5 pl-6 pb-6 shadow-[0_20px_55px_rgba(15,23,42,0.12)]">
            {conversationBlocks.map((block) => (
              <div key={block.id} className="flex justify-start">
                <div className="w-full rounded-2xl border border-hippo-border bg-white px-4 pt-3 pb-4 text-sm leading-relaxed shadow-sm shadow-slate-200/60">
                  {block.question && (
                    <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-slate-900">
                      <div className="mb-0.5 text-[10px] uppercase tracking-wide text-sky-700">
                        User
                      </div>
                      <div className="chat-markdown">
                        <ReactMarkdown>{block.question.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  {block.answer && (
                    <div className="text-hippo-ink">
                      <div className="mb-1 text-[10px] uppercase tracking-wide text-hippo-accentPurple">
                        Hippo
                        {block.answer.mode === "web-assisted" && " · Web-assisted"}
                        {block.answer.mode === "live-prices" && " · Live price AI"}
                      </div>
                      <div className="chat-markdown">
                        <ReactMarkdown>{block.answer.content}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl border border-hippo-border bg-white/60 px-6 py-4 text-center text-sm text-slate-600">
            This is a read-only shared conversation.{" "}
            <a href="/" className="font-medium text-hippo-accentBlue hover:underline">
              Start your own chat with Hippo
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}

