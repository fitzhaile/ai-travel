"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { CityComparisonInput, Message, Mode } from "../lib/types";

const defaultTrip: CityComparisonInput = {
  origin: "",
  cityA: "",
  cityB: "",
  startDate: "",
  endDate: "",
  theme: "balanced-fun",
  budget: ""
};

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("live-prices");
  const [trip, setTrip] = useState<CityComparisonInput>(defaultTrip);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      createdAt: Date.now(),
      content:
        "Hippo here! Tell me the kind of trip you want and any places you are considering. I can suggest or compare destinations based on cost, weather, and the type of fun you care about."
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const hasUserMessage = messages.some((m) => m.role === "user");

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

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      createdAt: Date.now(),
      mode
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mode,
          trip,
          messages: [...messages, userMessage]
        })
      });

      if (!res.ok) {
        throw new Error("Failed to fetch response");
      }

      const data = (await res.json()) as { content?: string; error?: string };
      const content =
        data.content ??
        data.error ??
        "Hippo ran into a wave while answering. Please try again.";

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content,
        createdAt: Date.now(),
        mode
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const fallback: Message = {
        id: `assistant-error-${Date.now()}`,
        role: "assistant",
        createdAt: Date.now(),
        mode,
        content:
          "I had a problem reaching my travel-brain on the server. Double-check your internet and that the backend is running with a valid OPENAI_API_KEY."
      };
      setMessages((prev) => [...prev, fallback]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (
    event
  ) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-slate-50 via-sky-50 to-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <h1 className="mb-2 text-2xl sm:text-3xl font-semibold tracking-tight text-hippo-accentBlue">
              Hippo AI 🦛
            </h1>
            <p className="text-sm text-slate-600">
              Chat with Hippo about where to go, what it should feel like, and how far your budget can stretch. Just describe what you want or name a couple of places.
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="hidden text-slate-500 sm:inline">Mode</span>
            <div className="flex gap-1.5 rounded-full bg-slate-100 px-1.5 py-1">
              <button
                type="button"
                onClick={() => setMode("live-prices")}
                className={`rounded-full px-2 py-1 transition text-xs ${
                  mode === "live-prices"
                    ? "bg-hippo-accentTeal text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Live price AI
              </button>
              <button
                type="button"
                onClick={() => setMode("web-assisted")}
                className={`rounded-full px-2 py-1 transition text-xs ${
                  mode === "web-assisted"
                    ? "bg-hippo-accentPurple text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Web-assisted
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 justify-center bg-gradient-to-b from-slate-50 via-slate-100 to-slate-50">
        <div className="flex w-full max-w-5xl flex-col px-4 pb-6 pt-4">
          <div className="mb-3 grid gap-2 rounded-2xl border border-hippo-border bg-white/80 p-3 text-[11px] text-slate-700 sm:grid-cols-5">
            <div className="sm:col-span-1">
              <label className="mb-1 block font-medium">From</label>
              <input
                className="w-full rounded-md border border-hippo-border bg-slate-50 px-2 py-1 outline-none focus:border-hippo-accentPurple/70 focus:ring-1 focus:ring-hippo-accentPurple/60"
                placeholder="City or airport"
                value={trip.origin}
                onChange={(e) =>
                  setTrip((t) => ({
                    ...t,
                    origin: e.target.value
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">City A</label>
              <input
                className="w-full rounded-md border border-hippo-border bg-slate-50 px-2 py-1 outline-none focus:border-hippo-accentPurple/70 focus:ring-1 focus:ring-hippo-accentPurple/60"
                placeholder="First option"
                value={trip.cityA}
                onChange={(e) =>
                  setTrip((t) => ({
                    ...t,
                    cityA: e.target.value
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">City B</label>
              <input
                className="w-full rounded-md border border-hippo-border bg-slate-50 px-2 py-1 outline-none focus:border-hippo-accentPurple/70 focus:ring-1 focus:ring-hippo-accentPurple/60"
                placeholder="Second option"
                value={trip.cityB}
                onChange={(e) =>
                  setTrip((t) => ({
                    ...t,
                    cityB: e.target.value
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">Leave</label>
              <input
                type="date"
                className="w-full rounded-md border border-hippo-border bg-slate-50 px-2 py-1 text-[11px] outline-none focus:border-hippo-accentPurple/70 focus:ring-1 focus:ring-hippo-accentPurple/60"
                value={trip.startDate}
                onChange={(e) =>
                  setTrip((t) => ({
                    ...t,
                    startDate: e.target.value
                  }))
                }
              />
            </div>
            <div>
              <label className="mb-1 block font-medium">Return</label>
              <input
                type="date"
                className="w-full rounded-md border border-hippo-border bg-slate-50 px-2 py-1 text-[11px] outline-none focus:border-hippo-accentPurple/70 focus:ring-1 focus:ring-hippo-accentPurple/60"
                value={trip.endDate}
                onChange={(e) =>
                  setTrip((t) => ({
                    ...t,
                    endDate: e.target.value
                  }))
                }
              />
            </div>
          </div>
          <div
            className={`${hasUserMessage ? "flex-1" : "flex-none"} space-y-6 overflow-y-auto rounded-3xl border border-hippo-border border-t-4 border-t-hippo-accentBlue bg-white pt-6 pr-5 pl-6 pb-6 shadow-[0_20px_55px_rgba(15,23,42,0.12)]`}
          >
            {conversationBlocks.map((block) => (
              <div key={block.id} className="flex justify-start">
                <div className="w-full rounded-2xl border border-hippo-border bg-white px-4 pt-3 pb-4 text-sm leading-relaxed shadow-sm shadow-slate-200/60">
                  {block.question && (
                    <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-slate-900">
                      <div className="mb-0.5 text-[10px] uppercase tracking-wide text-sky-700">
                        You
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
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-hippo-accentBlue/60 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-hippo-accentBlue"></span>
                  </span>
                  Hippo is thinking about your trip…
                </div>
              </div>
            )}
          </div>

          <div className="mt-4 rounded-2xl border border-hippo-border bg-white pt-6 pr-6 pl-6 pb-3 shadow-[0_18px_40px_rgba(15,23,42,0.15)]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                className="flex-1 rounded-xl border border-hippo-border bg-slate-50 px-3 py-3 text-sm text-hippo-ink outline-none ring-0 placeholder:text-slate-400 focus:border-hippo-accentPurple/70 focus:ring-1 focus:ring-hippo-accentPurple/60"
                placeholder="Ask Hippo to compare your two destinations or dream up a trip."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="inline-flex items-center justify-center rounded-xl bg-hippo-accentBlue px-4 py-3 text-sm font-medium text-white shadow-md shadow-hippo-accentBlue/40 transition hover:bg-hippo-accentPurple disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[6rem] sm:-mt-0.5"
              >
                {isLoading ? "Sending…" : "Send"}
              </button>
            </div>
            <p className="mt-1.5 ml-0.5 text-[10px] text-slate-500">Press Enter to send.</p>
          </div>
        </div>
      </div>
    </main>
  );
}



