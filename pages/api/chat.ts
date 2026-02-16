import type { NextApiRequest, NextApiResponse } from "next";
import { findProvider, getProviders, type ChatMessage } from "../../lib/providers";

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

interface ValidatedRequest {
  messages: ChatMessage[];
  provider: string;
  model: string;
}

const ALLOWED_PROVIDER_NAMES = new Set(["openai", "anthropic", "gemini", "ollama"]);

function validateRequest(body: unknown): ValidatedRequest | null {
  if (!body || typeof body !== "object") return null;

  const { messages, provider, model } = body as Record<string, unknown>;

  // Validate provider
  if (typeof provider !== "string" || !ALLOWED_PROVIDER_NAMES.has(provider)) {
    return null;
  }

  // Validate model
  if (typeof model !== "string" || model.length === 0 || model.length > 100) {
    return null;
  }

  // Validate messages
  if (!Array.isArray(messages)) return null;

  const MAX_MESSAGES = 50;
  const MAX_CONTENT_LENGTH = 4000;

  if (messages.length > MAX_MESSAGES) return null;

  const validated: ChatMessage[] = [];

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") return null;

    const { role, content } = msg as { role: unknown; content: unknown };

    // Only allow "user" and "assistant" roles from the client.
    // This prevents clients from injecting "system" role messages.
    if (role !== "user" && role !== "assistant") return null;

    if (typeof content !== "string" || content.length === 0) return null;
    if (content.length > MAX_CONTENT_LENGTH) return null;

    validated.push({ role, content });
  }

  return { messages: validated, provider, model };
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

  // Check that at least one provider is configured
  if (getProviders().length === 0) {
    console.error("No AI providers configured");
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
  const request = validateRequest(req.body);
  if (!request) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  // Find the requested provider
  const providerConfig = findProvider(request.provider);
  if (!providerConfig) {
    return res.status(400).json({ error: "Requested provider is not available" });
  }

  // Verify the model belongs to this provider
  const validModel = providerConfig.models.some((m) => m.id === request.model);
  if (!validModel) {
    return res.status(400).json({ error: "Invalid model for the selected provider" });
  }

  try {
    const content = await providerConfig.chat(request.model, request.messages);

    return res.status(200).json({
      result: { role: "assistant", content },
    });
  } catch (error: unknown) {
    // Log the full error server-side for debugging
    console.error(`${request.provider} API error:`, error);

    // Return a generic error to the client — never leak API keys or internal details
    const message =
      error instanceof Error && error.message.includes("429")
        ? "AI service is busy. Please try again later."
        : "An error occurred while processing your request";

    const status =
      error instanceof Error && error.message.includes("429") ? 429 : 500;

    return res.status(status).json({ error: message });
  }
}
