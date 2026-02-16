import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";

const MAX_FILE_SIZE = 10_000_000; // 10MB raw file size limit

/**
 * Extract plain text from a file buffer based on its extension.
 * Supports PDF, DOCX, and plain text formats.
 */
export async function extractText(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error("File too large (max 10MB)");
  }

  const ext = filename.toLowerCase().split(".").pop() || "";

  switch (ext) {
    case "pdf":
      return extractPdf(buffer);
    case "docx":
      return extractDocx(buffer);
    default:
      // Treat everything else as plain text
      return buffer.toString("utf-8");
  }
}

async function extractPdf(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  const text = result.text.trim();
  await parser.destroy();
  if (text.length === 0) {
    throw new Error("Could not extract text from PDF (it may be image-based or empty)");
  }
  return text;
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  const text = result.value.trim();
  if (text.length === 0) {
    throw new Error("Could not extract text from DOCX (it may be empty)");
  }
  return text;
}

/** File extensions that should be parsed as binary (not read as text on the client). */
export const BINARY_EXTENSIONS = new Set(["pdf", "docx"]);

/** All supported file extensions. */
export const SUPPORTED_EXTENSIONS = [
  // Binary formats (parsed server-side)
  "pdf", "docx",
  // Text formats (can be read client-side or server-side)
  "txt", "md", "csv", "json", "xml", "html", "log",
  "js", "ts", "jsx", "tsx", "py", "java", "c", "cpp", "h", "hpp",
  "go", "rs", "yaml", "yml", "toml", "ini", "cfg", "conf",
  "sh", "bat", "sql", "r", "rb", "php", "swift", "kt",
];
