import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import fs from "fs";
import {
  listDocuments,
  addDocument,
  removeDocument,
} from "../../lib/documents";
import { extractText, SUPPORTED_EXTENSIONS } from "../../lib/fileparser";

const MAX_NAME_LENGTH = 200;
const MAX_CONTENT_LENGTH = 200_000; // 200KB of extracted text
const MAX_FILE_SIZE = 10_000_000; // 10MB raw upload

// Disable Next.js body parsing so formidable can handle multipart uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

/** Manually parse JSON body for non-multipart requests. */
async function parseJsonBody(req: NextApiRequest): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => {
      body += chunk.toString();
      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
      }
    });
    req.on("end", () => {
      try {
        resolve(body.length > 0 ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

/** Parse multipart form data and return file buffer + fields. */
async function parseMultipart(
  req: NextApiRequest,
): Promise<{ file: { buffer: Buffer; originalFilename: string } | null; fields: Record<string, string> }> {
  const form = formidable({
    maxFileSize: MAX_FILE_SIZE,
    maxFields: 5,
    maxFieldsSize: MAX_CONTENT_LENGTH,
  });

  return new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => {
      if (err) {
        reject(err);
        return;
      }

      // Extract fields (formidable v3 returns arrays)
      const parsedFields: Record<string, string> = {};
      for (const [key, value] of Object.entries(fields)) {
        parsedFields[key] = Array.isArray(value) ? value[0] : String(value);
      }

      // Extract file
      const fileArray = files.file;
      const fileObj = Array.isArray(fileArray) ? fileArray[0] : fileArray;

      if (fileObj && fileObj.filepath) {
        const buffer = fs.readFileSync(fileObj.filepath);
        // Clean up temp file
        fs.unlinkSync(fileObj.filepath);
        resolve({
          file: {
            buffer,
            originalFilename: fileObj.originalFilename || "unknown",
          },
          fields: parsedFields,
        });
      } else {
        resolve({ file: null, fields: parsedFields });
      }
    });
  });
}

export default async function documentsHandler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // GET — list all documents
  if (req.method === "GET") {
    const docs = listDocuments();
    return res.status(200).json({ documents: docs });
  }

  // POST — add a document (JSON text paste or multipart file upload)
  if (req.method === "POST") {
    const contentType = req.headers["content-type"] || "";
    const isMultipart = contentType.includes("multipart/form-data");

    let name: string;
    let content: string;

    if (isMultipart) {
      // File upload path
      try {
        const { file, fields } = await parseMultipart(req);

        if (!file) {
          return res.status(400).json({ error: "No file provided" });
        }

        // Validate file extension
        const ext = file.originalFilename.toLowerCase().split(".").pop() || "";
        if (!SUPPORTED_EXTENSIONS.includes(ext)) {
          return res.status(400).json({
            error: `Unsupported file type: .${ext}. Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`,
          });
        }

        name = (fields.name || file.originalFilename).trim();

        // Extract text from file
        try {
          content = await extractText(file.buffer, file.originalFilename);
        } catch (extractErr: unknown) {
          const msg = extractErr instanceof Error ? extractErr.message : "Failed to extract text from file";
          return res.status(400).json({ error: msg });
        }
      } catch (uploadErr: unknown) {
        const msg = uploadErr instanceof Error ? uploadErr.message : "Upload failed";
        return res.status(400).json({ error: msg });
      }
    } else {
      // JSON text paste path
      let body: Record<string, unknown>;
      try {
        body = await parseJsonBody(req);
      } catch {
        return res.status(400).json({ error: "Invalid request body" });
      }

      const rawName = body.name;
      const rawContent = body.content;

      if (typeof rawName !== "string" || rawName.trim().length === 0) {
        return res.status(400).json({ error: "Document name is required" });
      }

      if (typeof rawContent !== "string" || rawContent.trim().length === 0) {
        return res.status(400).json({ error: "Document content is required" });
      }

      name = rawName.trim();
      content = rawContent;
    }

    // Common validation
    if (name.length > MAX_NAME_LENGTH) {
      name = name.slice(0, MAX_NAME_LENGTH);
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return res
        .status(400)
        .json({ error: `Extracted text too large (${Math.round(content.length / 1000)}KB, max ${MAX_CONTENT_LENGTH / 1000}KB)` });
    }

    try {
      const doc = addDocument(name, content);
      return res.status(201).json({ document: doc });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to add document";
      return res.status(400).json({ error: message });
    }
  }

  // DELETE — remove a document by ID
  if (req.method === "DELETE") {
    let body: Record<string, unknown>;
    try {
      body = await parseJsonBody(req);
    } catch {
      return res.status(400).json({ error: "Invalid request body" });
    }

    const id = body.id;

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
