import OpenAI from "openai";
import type { NextApiRequest, NextApiResponse } from "next";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Simple in-memory rate limiter: max requests per IP per window
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20;
const requestCounts = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = requestCounts.get(ip);

  if (!entry || now > entry.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX_REQUESTS;
}

// Periodically clean up expired entries to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of requestCounts) {
    if (now > entry.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

function validateMessages(body: unknown): ChatMessage[] | null {
  if (!body || typeof body !== "object" || !("messages" in body)) {
    return null;
  }

  const { messages } = body as { messages: unknown };

  if (!Array.isArray(messages)) {
    return null;
  }

  const MAX_MESSAGES = 50;
  const MAX_CONTENT_LENGTH = 4000;

  if (messages.length > MAX_MESSAGES) {
    return null;
  }

  const validated: ChatMessage[] = [];

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") {
      return null;
    }

    const { role, content } = msg as { role: unknown; content: unknown };

    // Only allow "user" and "assistant" roles from the client.
    // This prevents clients from injecting "system" role messages
    // to override the system prompt.
    if (role !== "user" && role !== "assistant") {
      return null;
    }

    if (typeof content !== "string" || content.length === 0) {
      return null;
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return null;
    }

    validated.push({ role, content });
  }

  return validated;
}

export default async function chatHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // Only allow POST requests
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Check that the API key is configured
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not configured");
    return res.status(500).json({ error: "Server configuration error" });
  }

  // Rate limiting
  const clientIp =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
    req.socket.remoteAddress ||
    "unknown";

  if (isRateLimited(clientIp)) {
    return res.status(429).json({ error: "Too many requests. Please try again later." });
  }

  // Validate and sanitize input
  const messages = validateMessages(req.body);
  if (!messages) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system" as const,
          content: "You are a helpful assistant.",
        },
        ...messages,
      ],
      temperature: 0,
    });

    const result = completion.choices[0]?.message;

    if (!result) {
      return res.status(502).json({ error: "No response from AI model" });
    }

    return res.status(200).json({
      result: { role: result.role, content: result.content },
    });
  } catch (error: unknown) {
    // Log the full error server-side for debugging
    console.error("OpenAI API error:", error);

    // Return a generic error to the client — never leak API keys or internal details
    if (
      error instanceof OpenAI.APIError &&
      error.status === 429
    ) {
      return res.status(429).json({ error: "AI service is busy. Please try again later." });
    }

    return res.status(500).json({ error: "An error occurred while processing your request" });
  }
}
