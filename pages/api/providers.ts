import type { NextApiRequest, NextApiResponse } from "next";
import { getAvailableModels } from "../../lib/providers";

export default function providersHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const models = getAvailableModels();

  if (models.length === 0) {
    return res.status(503).json({
      error: "No AI providers configured. Set at least one API key.",
    });
  }

  return res.status(200).json({ models });
}
