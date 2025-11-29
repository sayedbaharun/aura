/**
 * File utility functions for attachments management
 */

import {
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  FileCode,
  FileArchive,
  File,
  FileSpreadsheet,
  Presentation,
} from "lucide-react";

/**
 * Format file size in bytes to human-readable string
 * @param bytes - File size in bytes
 * @returns Formatted string (e.g., "1.5 MB", "234 KB")
 */
export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
}

/**
 * Get appropriate icon component for file type based on MIME type
 * @param mimeType - MIME type string
 * @returns Lucide icon component
 */
export function getFileIcon(mimeType: string | null | undefined) {
  if (!mimeType) return File;

  const type = mimeType.toLowerCase();

  // Images
  if (type.startsWith("image/")) return FileImage;

  // Videos
  if (type.startsWith("video/")) return FileVideo;

  // Audio
  if (type.startsWith("audio/")) return FileAudio;

  // Documents
  if (
    type.includes("pdf") ||
    type.includes("word") ||
    type.includes("document")
  ) {
    return FileText;
  }

  // Spreadsheets
  if (
    type.includes("sheet") ||
    type.includes("excel") ||
    type.includes("csv")
  ) {
    return FileSpreadsheet;
  }

  // Presentations
  if (type.includes("presentation") || type.includes("powerpoint")) {
    return Presentation;
  }

  // Code files
  if (
    type.includes("javascript") ||
    type.includes("typescript") ||
    type.includes("json") ||
    type.includes("html") ||
    type.includes("css") ||
    type.includes("xml") ||
    type.includes("python") ||
    type.includes("java") ||
    type.includes("text/plain")
  ) {
    return FileCode;
  }

  // Archives
  if (
    type.includes("zip") ||
    type.includes("rar") ||
    type.includes("tar") ||
    type.includes("7z") ||
    type.includes("compressed")
  ) {
    return FileArchive;
  }

  return File;
}

/**
 * Check if MIME type is an image
 * @param mimeType - MIME type string
 * @returns True if image type
 */
export function isImageType(mimeType: string | null | undefined): boolean {
  if (!mimeType) return false;
  return mimeType.toLowerCase().startsWith("image/");
}

/**
 * Get preview URL for attachment
 * For images, return the URL or thumbnail URL
 * For other types, return null
 * @param attachment - Attachment object
 * @returns Preview URL or null
 */
export function getImagePreviewUrl(attachment: {
  type: string;
  url?: string | null;
  thumbnailUrl?: string | null;
  data?: string | null;
  storageType?: string | null;
}): string | null {
  if (!isImageType(attachment.type)) return null;

  // Prefer thumbnail if available
  if (attachment.thumbnailUrl) return attachment.thumbnailUrl;

  // Use full image URL
  if (attachment.url) return attachment.url;

  // Use base64 data if available
  if (attachment.storageType === "base64" && attachment.data) {
    return `data:${attachment.type};base64,${attachment.data}`;
  }

  return null;
}

/**
 * Get file extension from filename
 * @param filename - Name of file
 * @returns File extension (without dot) or empty string
 */
export function getFileExtension(filename: string | null | undefined): string {
  if (!filename) return "";
  const parts = filename.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "";
}

/**
 * Get color class for file type badge
 * @param mimeType - MIME type string
 * @returns Tailwind color class string
 */
export function getFileTypeColor(mimeType: string | null | undefined): string {
  if (!mimeType) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

  const type = mimeType.toLowerCase();

  if (type.startsWith("image/"))
    return "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300";
  if (type.startsWith("video/"))
    return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
  if (type.startsWith("audio/"))
    return "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300";
  if (type.includes("pdf") || type.includes("document"))
    return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
  if (type.includes("sheet") || type.includes("csv"))
    return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
  if (type.includes("presentation"))
    return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300";
  if (type.includes("zip") || type.includes("compressed"))
    return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300";

  return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";
}

/**
 * Copy text to clipboard and return success status
 * @param text - Text to copy
 * @returns Promise<boolean> - True if successful
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // Fallback for older browsers
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textArea);
    return success;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}

/**
 * Generate markdown syntax for embedding an attachment
 * @param attachment - Attachment object
 * @returns Markdown string
 */
export function getMarkdownSyntax(attachment: {
  name: string;
  type: string;
  url?: string | null;
  data?: string | null;
  storageType?: string | null;
}): string {
  const url = attachment.url || "#";

  if (isImageType(attachment.type)) {
    // Image syntax
    return `![${attachment.name}](${url})`;
  } else {
    // Link syntax
    return `[${attachment.name}](${url})`;
  }
}
