// Rules for uploaded files. They mirror the storage bucket settings in
// supabase/migrations/*_storage.sql; the bucket itself enforces them too.

export const ATTACHMENT_BUCKET = "task-files";
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB

// File extension -> type the bucket accepts. Used when the browser doesn't report a type.
const TYPES_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  csv: "text/csv",
  zip: "application/zip",
};

export const ALLOWED_TYPES = new Set([...Object.values(TYPES_BY_EXTENSION), "application/x-zip-compressed"]);

export const ACCEPT_ATTRIBUTE = Object.keys(TYPES_BY_EXTENSION)
  .map((ext) => `.${ext}`)
  .join(",");

export const ALLOWED_LABEL = "PDF, JPG, PNG, Word, Excel, PowerPoint, CSV, ZIP";

export function fileType(file: { name: string; type: string }) {
  if (ALLOWED_TYPES.has(file.type)) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return TYPES_BY_EXTENSION[extension] ?? file.type;
}

// Storage keys must be simple: keep letters, numbers, dot, dash and underscore.
export function safeFileName(name: string) {
  const cleaned = name.normalize("NFKD").replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return (cleaned || "file").slice(-100);
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Files the browser can show by itself open in a new tab; others download.
export function opensInBrowser(mimeType: string | null) {
  return mimeType === "application/pdf" || mimeType === "image/jpeg" || mimeType === "image/png";
}
