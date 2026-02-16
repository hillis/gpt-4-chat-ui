import type { NextApiRequest, NextApiResponse } from "next";
import {
  listDocuments,
  addDocument,
  removeDocument,
} from "../../lib/documents";

const MAX_NAME_LENGTH = 200;
const MAX_CONTENT_LENGTH = 200_000;

export default function documentsHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // GET — list all documents
  if (req.method === "GET") {
    const docs = listDocuments();
    return res.status(200).json({ documents: docs });
  }

  // POST — add a document
  if (req.method === "POST") {
    const { name, content } = req.body as {
      name: unknown;
      content: unknown;
    };

    if (typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Document name is required" });
    }

    if (typeof content !== "string" || content.trim().length === 0) {
      return res.status(400).json({ error: "Document content is required" });
    }

    if (name.length > MAX_NAME_LENGTH) {
      return res.status(400).json({ error: "Document name too long" });
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return res
        .status(400)
        .json({ error: `Document too large (max ${MAX_CONTENT_LENGTH / 1000}KB)` });
    }

    try {
      const doc = addDocument(name.trim(), content);
      return res.status(201).json({ document: doc });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to add document";
      return res.status(400).json({ error: message });
    }
  }

  // DELETE — remove a document by ID
  if (req.method === "DELETE") {
    const { id } = req.body as { id: unknown };

    if (typeof id !== "string" || id.length === 0) {
      return res.status(400).json({ error: "Document ID is required" });
    }

    const removed = removeDocument(id);
    if (!removed) {
      return res.status(404).json({ error: "Document not found" });
    }

    return res.status(200).json({ success: true });
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method not allowed" });
}
