"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, Loader2, Send, Sparkles } from "lucide-react";
import {
  createH5ChatSession,
  fetchH5ChatBootstrap,
  listH5ChatMessages,
  listH5ChatSessions,
  sendH5ChatMessage,
  type H5ChatBootstrap,
  type H5ChatMessage,
  type H5ChatSession,
  type H5ChatSuggestedGenerationInput,
} from "@/lib/h5-chat";

const defaultBootstrap: H5ChatBootstrap = {
  enabled: true,
  welcomeMessage:
    "我是你的 AI 穿搭顾问，可以结合风格档案、天气和历史生成记录，帮你把想法整理成可生成的穿搭方案。",
  quickPrompts: ["明天通勤怎么穿", "按我的档案推荐", "换一套更显高的"],
  dailyLimit: 30,
};

export function H5ChatPage() {
  const router = useRouter();
  const screenRef = useRef<HTMLElement | null>(null);
  const threadRef = useRef<HTMLDivElement | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [bootstrap, setBootstrap] = useState<H5ChatBootstrap>(defaultBootstrap);
  const [session, setSession] = useState<H5ChatSession | null>(null);
  const [messages, setMessages] = useState<H5ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [typingMessageId, setTypingMessageId] = useState<number | null>(null);

  const visibleMessages = useMemo(() => {
    if (messages.length) return messages;

    return [
      {
        messageId: 0,
        sessionId: session?.sessionId || 0,
        role: "assistant" as const,
        content: bootstrap.welcomeMessage,
        quickReplies: bootstrap.quickPrompts,
        createdAt: "",
      },
    ];
  }, [bootstrap.quickPrompts, bootstrap.welcomeMessage, messages, session?.sessionId]);

  useEffect(() => {
    let cancelled = false;

    async function loadChat() {
      setLoading(true);
      setError("");
      try {
        const nextBootstrap = await fetchH5ChatBootstrap();
        if (cancelled) return;
        setBootstrap(nextBootstrap);

        const sessions = await listH5ChatSessions();
        const activeSession = sessions[0] || await createH5ChatSession();
        if (cancelled) return;
        setSession(activeSession);

        const nextMessages = await listH5ChatMessages(activeSession.sessionId);
        if (!cancelled) setMessages(nextMessages);
      } catch (caughtError) {
        if (!cancelled) {
          setError(caughtError instanceof Error ? caughtError.message : "AI 穿搭顾问暂时不可用。");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadChat();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    scrollChatToBottom("smooth");
  }, [visibleMessages.length, sending, error]);

  useEffect(() => {
    resizeInput();
    scrollChatToBottom("auto");
  }, [input]);

  useEffect(() => {
    if (loading || !bootstrap.enabled) return;
    const screen = screenRef.current;
    const composer = composerRef.current;
    if (!screen || !composer) return;

    const syncComposerSpace = () => {
      const composerHeight = composer.getBoundingClientRect().height;
      screen.style.setProperty("--h5-chat-composer-space", `${Math.ceil(composerHeight + 110)}px`);
      scrollChatToBottom("auto");
    };

    syncComposerSpace();
    const observer = new ResizeObserver(syncComposerSpace);
    observer.observe(composer);
    window.addEventListener("resize", syncComposerSpace);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncComposerSpace);
    };
  }, [bootstrap.enabled, loading]);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const handleViewportChange = () => scrollChatToBottom("auto");
    viewport.addEventListener("resize", handleViewportChange);
    viewport.addEventListener("scroll", handleViewportChange);

    return () => {
      viewport.removeEventListener("resize", handleViewportChange);
      viewport.removeEventListener("scroll", handleViewportChange);
    };
  }, []);

  function scrollChatToBottom(behavior: ScrollBehavior = "smooth") {
    window.requestAnimationFrame(() => {
      const thread = threadRef.current;
      if (!thread) return;

      thread.scrollTo({
        top: thread.scrollHeight,
        behavior,
      });
      window.setTimeout(() => {
        thread.scrollTo({
          top: thread.scrollHeight,
          behavior: "auto",
        });
      }, 80);
    });
  }

  function resizeInput() {
    const inputElement = inputRef.current;
    if (!inputElement) return;

    inputElement.style.height = "auto";
    inputElement.style.height = `${Math.min(inputElement.scrollHeight, 112)}px`;
  }

  function handleInputKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();
    void submitMessage();
  }

  async function submitMessage(event?: FormEvent<HTMLFormElement>, preset?: string) {
    event?.preventDefault();
    if (!session || sending || !bootstrap.enabled) return;
    const content = (preset || input).trim();
    if (!content) return;

    const optimisticMessage: H5ChatMessage = {
      messageId: -Date.now(),
      sessionId: session.sessionId,
      role: "user",
      content,
      quickReplies: [],
      createdAt: new Date().toISOString(),
    };

    setSending(true);
    setError("");
    setInput("");
    setMessages((current) => [...current, optimisticMessage]);
    try {
      const result = await sendH5ChatMessage(session.sessionId, content);
      setMessages((current) => [
        ...current.filter((message) => message.messageId !== optimisticMessage.messageId),
        result.userMessage,
        result.assistantMessage,
      ]);
      setTypingMessageId(result.assistantMessage.messageId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "AI 穿搭顾问回复失败。");
      setInput(content);
      setMessages((current) =>
        current.filter((message) => message.messageId !== optimisticMessage.messageId),
      );
    } finally {
      setSending(false);
    }
  }

  function openGeneration(input: H5ChatSuggestedGenerationInput) {
    router.push(buildGenerationHref(input));
  }

  return (
    <section className="h5-chat-screen" ref={screenRef}>
      <header className="h5-chat-topbar">
        <Link href="/" aria-label="返回首页">
          <ChevronLeft size={22} />
        </Link>
        <div>
          <strong>AI 穿搭顾问</strong>
          <span>先聊清楚，再一键生成</span>
        </div>
        <Link href="/profile/archive">档案</Link>
      </header>

      {loading ? (
        <div className="h5-chat-state">
          <Loader2 size={24} />
          <strong>正在同步顾问</strong>
          <span>读取你的对话和风格线索。</span>
        </div>
      ) : !bootstrap.enabled ? (
        <div className="h5-chat-state">
          <Sparkles size={25} />
          <strong>AI 顾问暂未开放</strong>
          <span>后台启用后，这里会出现专属穿搭对话。</span>
        </div>
      ) : (
        <>
          <div className="h5-chat-thread" ref={threadRef} aria-live="polite">
            {visibleMessages.map((message, index) => (
              <ChatMessageBubble
                key={message.messageId || `welcome-${index}`}
                message={message}
                typing={message.role === "assistant" && message.messageId === typingMessageId}
                onGenerationClick={openGeneration}
                onQuickReply={(reply) => void submitMessage(undefined, reply)}
                onTypingDone={() => setTypingMessageId(null)}
                onTypingTick={() => scrollChatToBottom("auto")}
              />
            ))}
            {sending ? (
              <article className="h5-chat-message is-assistant is-pending">
                <div>
                  <Loader2 size={17} />
                  <p>正在整理更适合你的穿搭建议...</p>
                </div>
              </article>
            ) : null}
            <div ref={messageEndRef} />
          </div>
          <div className="h5-chat-composer" ref={composerRef}>
            {error ? <div className="h5-chat-error">{error}</div> : null}
            <form className="h5-chat-input" onSubmit={submitMessage}>
              <textarea
                ref={inputRef}
                aria-label="输入穿搭问题"
                maxLength={500}
                placeholder="问问今天怎么穿、怎么改、适合什么风格"
                rows={1}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  scrollChatToBottom("auto");
                }}
                onFocus={() => scrollChatToBottom("auto")}
                onKeyDown={handleInputKeyDown}
              />
              <button type="submit" disabled={sending || !input.trim()}>
                {sending ? <Loader2 size={18} /> : <Send size={18} />}
              </button>
            </form>
          </div>
        </>
      )}
    </section>
  );
}

function ChatMessageBubble({
  message,
  onGenerationClick,
  onQuickReply,
  onTypingDone,
  onTypingTick,
  typing,
}: {
  message: H5ChatMessage;
  onGenerationClick: (input: H5ChatSuggestedGenerationInput) => void;
  onQuickReply: (reply: string) => void;
  onTypingDone: () => void;
  onTypingTick: () => void;
  typing: boolean;
}) {
  const actionsVisible = !typing;

  return (
    <article className={`h5-chat-message is-${message.role}`}>
      <div>
        <p>
          {typing ? (
            <TypewriterText
              text={message.content}
              onDone={onTypingDone}
              onTick={onTypingTick}
            />
          ) : (
            message.content
          )}
        </p>
        {actionsVisible && message.suggestedGenerationInput ? (
          <button
            type="button"
            className="h5-chat-generate"
            onClick={() => onGenerationClick(message.suggestedGenerationInput as H5ChatSuggestedGenerationInput)}
          >
            <Sparkles size={15} />
            按这个生成
            <ArrowRight size={14} />
          </button>
        ) : null}
        {actionsVisible && message.role === "assistant" && message.quickReplies?.length ? (
          <div className="h5-chat-quick-row">
            {message.quickReplies.map((reply) => (
              <button
                type="button"
                key={reply}
                onClick={() => onQuickReply(reply)}
              >
                {reply}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function TypewriterText({
  onDone,
  onTick,
  text,
}: {
  onDone: () => void;
  onTick: () => void;
  text: string;
}) {
  const [visibleLength, setVisibleLength] = useState(0);
  const characters = useMemo(() => Array.from(text), [text]);

  useEffect(() => {
    if (!characters.length) {
      onDone();
      return;
    }

    if (visibleLength >= characters.length) {
      onDone();
      return;
    }

    const timer = window.setTimeout(() => {
      setVisibleLength((current) => Math.min(characters.length, current + 1));
      onTick();
    }, 22);

    return () => window.clearTimeout(timer);
  }, [characters.length, onDone, onTick, visibleLength]);

  return (
    <>
      {characters.slice(0, visibleLength).join("")}
      <span className="h5-chat-type-caret" aria-hidden="true" />
    </>
  );
}

function buildGenerationHref(input: H5ChatSuggestedGenerationInput) {
  const query = new URLSearchParams({ screen: "keyword" });
  Object.entries(input).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    query.set(key, String(value));
  });

  return `/?${query.toString()}`;
}
