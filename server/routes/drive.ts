/**
 * Google Drive Routes
 * File management, sync, and knowledge base integration
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";

const router = Router();

// Check if Google Drive is configured
function isDriveConfigured(): boolean {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID || process.env.GOOGLE_CALENDAR_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || process.env.GOOGLE_CALENDAR_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || process.env.GOOGLE_CALENDAR_REFRESH_TOKEN;
  return !!(clientId && clientSecret && refreshToken);
}

// GET /status - Check Drive connection status
router.get("/status", async (req: Request, res: Response) => {
  try {
    if (!isDriveConfigured()) {
      return res.json({
        configured: false,
        connected: false,
        message: "Google Drive credentials not set",
      });
    }

    const { checkDriveConnection } = await import("../google-drive");
    const status = await checkDriveConnection();

    res.json({
      ...status,
      message: status.connected
        ? "Google Drive connected successfully"
        : "Failed to connect to Google Drive",
    });
  } catch (error: any) {
    logger.error({ error }, "Drive status check failed");
    res.json({
      configured: true,
      connected: false,
      error: error.message,
      message: "Failed to check Drive status",
    });
  }
});

// GET /quota - Get storage quota
router.get("/quota", async (req: Request, res: Response) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const { getStorageQuota } = await import("../google-drive");
    const quota = await getStorageQuota();

    res.json(quota);
  } catch (error) {
    logger.error({ error }, "Error getting Drive quota");
    res.status(500).json({ error: "Failed to get storage quota" });
  }
});

// GET /files - List files in Knowledge Base
router.get("/files", async (req: Request, res: Response) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const { folderId, mimeType, search, pageToken, pageSize } = req.query;

    const { listFiles } = await import("../google-drive");
    const result = await listFiles(folderId as string | undefined, {
      mimeType: mimeType as string | undefined,
      searchQuery: search as string | undefined,
      pageToken: pageToken as string | undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    logger.error({ error }, "Error listing Drive files");
    res.status(500).json({ error: "Failed to list files" });
  }
});

// GET /files/:fileId - Get file metadata
router.get("/files/:fileId", async (req: Request, res: Response) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const { fileId } = req.params;

    const { getFile } = await import("../google-drive");
    const file = await getFile(fileId);

    res.json(file);
  } catch (error) {
    logger.error({ error }, "Error getting file");
    res.status(500).json({ error: "Failed to get file" });
  }
});

// GET /files/:fileId/download - Download file content
router.get("/files/:fileId/download", async (req: Request, res: Response) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const { fileId } = req.params;

    const { getFile, downloadFile, exportDoc } = await import("../google-drive");

    // Get file metadata first to determine type
    const file = await getFile(fileId);

    let content: Buffer;

    // If it's a Google Doc, export it
    if (file.mimeType === "application/vnd.google-apps.document") {
      content = await exportDoc(fileId, "text/plain");
      res.setHeader("Content-Type", "text/plain");
    } else if (file.mimeType === "application/vnd.google-apps.spreadsheet") {
      content = await exportDoc(fileId, "text/csv" as any);
      res.setHeader("Content-Type", "text/csv");
    } else {
      content = await downloadFile(fileId);
      res.setHeader("Content-Type", file.mimeType || "application/octet-stream");
    }

    res.setHeader("Content-Disposition", `attachment; filename="${file.name}"`);
    res.send(content);
  } catch (error) {
    logger.error({ error }, "Error downloading file");
    res.status(500).json({ error: "Failed to download file" });
  }
});

// GET /search - Search files
router.get("/search", async (req: Request, res: Response) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const { query, pageToken, pageSize } = req.query;

    if (!query) {
      return res.status(400).json({ error: "Search query is required" });
    }

    const { searchFiles } = await import("../google-drive");
    const result = await searchFiles(query as string, {
      pageToken: pageToken as string | undefined,
      pageSize: pageSize ? parseInt(pageSize as string) : undefined,
    });

    res.json(result);
  } catch (error) {
    logger.error({ error }, "Error searching Drive");
    res.status(500).json({ error: "Failed to search files" });
  }
});

// GET /folders/knowledge-base - Get knowledge base folder ID
router.get("/folders/knowledge-base", async (req: Request, res: Response) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const { getOrCreateKnowledgeBaseFolder } = await import("../google-drive");
    const folderId = await getOrCreateKnowledgeBaseFolder();

    res.json({ folderId });
  } catch (error) {
    logger.error({ error }, "Error getting knowledge base folder");
    res.status(500).json({ error: "Failed to get knowledge base folder" });
  }
});

// POST /folders - Create a folder
router.post("/folders", async (req: Request, res: Response) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const { name, parentId, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Folder name is required" });
    }

    const { createFolder } = await import("../google-drive");
    const folder = await createFolder(name, parentId, description);

    res.json(folder);
  } catch (error) {
    logger.error({ error }, "Error creating folder");
    res.status(500).json({ error: "Failed to create folder" });
  }
});

// POST /docs - Create a Google Doc
router.post("/docs", async (req: Request, res: Response) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const { name, content, parentId, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Document name is required" });
    }

    const { createDoc } = await import("../google-drive");
    const doc = await createDoc(name, content || "", parentId, description);

    res.json(doc);
  } catch (error) {
    logger.error({ error }, "Error creating doc");
    res.status(500).json({ error: "Failed to create document" });
  }
});

// POST /upload - Upload a file
router.post("/upload", async (req: Request, res: Response) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const { name, content, mimeType, parentId, description } = req.body;

    if (!name || !content || !mimeType) {
      return res.status(400).json({ error: "name, content, and mimeType are required" });
    }

    const { uploadFile } = await import("../google-drive");

    // Decode base64 content if provided
    const buffer = Buffer.from(content, "base64");
    const file = await uploadFile(name, buffer, mimeType, parentId, description);

    res.json(file);
  } catch (error) {
    logger.error({ error }, "Error uploading file");
    res.status(500).json({ error: "Failed to upload file" });
  }
});

// POST /sync-doc - Sync a knowledge base doc to Drive
router.post("/sync-doc", async (req: Request, res: Response) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const { docId, title, content, ventureName } = req.body;

    if (!docId || !title) {
      return res.status(400).json({ error: "docId and title are required" });
    }

    const { createDoc, createVentureFolder, updateFileContent, getOrCreateKnowledgeBaseFolder } = await import("../google-drive");

    // Get or create venture folder if venture specified
    let parentId: string;
    if (ventureName) {
      parentId = await createVentureFolder(ventureName);
    } else {
      parentId = await getOrCreateKnowledgeBaseFolder();
    }

    // Check if doc already has an externalId (previously synced)
    const existingDoc = await storage.getDoc(docId);

    if (existingDoc?.externalId) {
      // Update existing Drive doc
      await updateFileContent(existingDoc.externalId, content || "", "text/plain");

      res.json({
        synced: true,
        driveFileId: existingDoc.externalId,
        action: "updated",
      });
    } else {
      // Create new Drive doc
      const driveDoc = await createDoc(title, content || "", parentId, `Synced from SB-OS - Doc ID: ${docId}`);

      // Update local doc with Drive ID
      await storage.updateDoc(docId, {
        externalId: driveDoc.id,
        metadata: {
          ...existingDoc?.metadata,
          driveWebViewLink: driveDoc.webViewLink,
          lastSyncedAt: new Date().toISOString(),
        },
      });

      res.json({
        synced: true,
        driveFileId: driveDoc.id,
        webViewLink: driveDoc.webViewLink,
        action: "created",
      });
    }
  } catch (error) {
    logger.error({ error }, "Error syncing doc to Drive");
    res.status(500).json({ error: "Failed to sync document" });
  }
});

// PATCH /files/:fileId - Update file metadata
router.patch("/files/:fileId", async (req: Request, res: Response) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const { fileId } = req.params;
    const { name, description, starred } = req.body;

    const { updateFileMetadata } = await import("../google-drive");
    const file = await updateFileMetadata(fileId, { name, description, starred });

    res.json(file);
  } catch (error) {
    logger.error({ error }, "Error updating file");
    res.status(500).json({ error: "Failed to update file" });
  }
});

// POST /files/:fileId/move - Move file to different folder
router.post("/files/:fileId/move", async (req: Request, res: Response) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const { fileId } = req.params;
    const { parentId } = req.body;

    if (!parentId) {
      return res.status(400).json({ error: "parentId is required" });
    }

    const { moveFile } = await import("../google-drive");
    const file = await moveFile(fileId, parentId);

    res.json(file);
  } catch (error) {
    logger.error({ error }, "Error moving file");
    res.status(500).json({ error: "Failed to move file" });
  }
});

// DELETE /files/:fileId - Delete (trash) a file
router.delete("/files/:fileId", async (req: Request, res: Response) => {
  try {
    if (!isDriveConfigured()) {
      return res.status(503).json({ error: "Google Drive not configured" });
    }

    const { fileId } = req.params;
    const { permanent } = req.query;

    if (permanent === "true") {
      const { permanentlyDeleteFile } = await import("../google-drive");
      await permanentlyDeleteFile(fileId);
    } else {
      const { deleteFile } = await import("../google-drive");
      await deleteFile(fileId);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting file");
    res.status(500).json({ error: "Failed to delete file" });
  }
});

export default router;
