import { getH5AuthHeader } from "@/lib/auth";
import { outfitApiEndpoints } from "@/lib/api-endpoints";

export interface H5ChatBootstrap {
  enabled: boolean;
  welcomeMessage: string;
  quickPrompts: string[];
  dailyLimit: number;
}

export interface H5ChatSession {
  sessionId: number;
  title: string;
  lastMessage: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface H5ChatSuggestedGenerationInput {
  season?: string;
  temperature?: number;
  weather?: string;
  location?: string;
  occasion?: string;
  style?: string;
  colorPreference?: string;
}

export interface H5ChatMessage {
  messageId: number;
  sessionId: number;
  role: "user" | "assistant";
  content: string;
  quickReplies: string[];
  suggestedGenerationInput?: H5ChatSuggestedGenerationInput;
  createdAt: string;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

export async function fetchH5ChatBootstrap() {
  return requestH5Chat<H5ChatBootstrap>(outfitApiEndpoints.h5ChatBootstrap());
}

export async function listH5ChatSessions() {
  return requestH5Chat<H5ChatSession[]>(outfitApiEndpoints.h5ChatSessions(), {
    headers: getH5AuthHeader(),
  });
}

export async function createH5ChatSession(title?: string) {
  return requestH5Chat<H5ChatSession>(outfitApiEndpoints.h5ChatSessions(), {
    method: "POST",
    headers: {
      ...getH5AuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });
}

export async function listH5ChatMessages(sessionId: number) {
  return requestH5Chat<H5ChatMessage[]>(outfitApiEndpoints.h5ChatMessages(sessionId), {
    headers: getH5AuthHeader(),
  });
}

export async function sendH5ChatMessage(sessionId: number, content: string) {
  return requestH5Chat<{
    userMessage: H5ChatMessage;
    assistantMessage: H5ChatMessage;
  }>(outfitApiEndpoints.h5ChatMessages(sessionId), {
    method: "POST",
    headers: {
      ...getH5AuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ content }),
  });
}

async function requestH5Chat<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
  });
  const payload = (await response.json().catch(() => ({}))) as T | ApiErrorResponse;
  if (!response.ok) {
    const errorPayload =
      payload && typeof payload === "object"
        ? (payload as ApiErrorResponse)
        : {};
    throw new Error(errorPayload.error || errorPayload.message || "AI 穿搭顾问暂时不可用");
  }

  return payload as T;
}
