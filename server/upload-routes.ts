import { Router, Request, Response } from 'express';
import { upload, UPLOADS_DIR } from './upload';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { attachments } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = Router();

// POST /api/upload - Upload single image
router.post('/upload', upload.single('image'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/api/uploads/${req.file.filename}`;
    const docId = req.query.docId as string | undefined;

    // Optionally create attachment record if docId is provided
    if (docId) {
      await db.insert(attachments).values({
        docId,
        name: req.file.originalname,
        type: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
        storageType: 'local',
      });
    }

    res.json({
      success: true,
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimeType: req.file.mimetype,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

// POST /api/upload/multiple - Upload multiple images
router.post('/upload/multiple', upload.array('images', 10), async (req: Request, res: Response) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const docId = req.query.docId as string | undefined;

    const uploadedFiles = await Promise.all(
      req.files.map(async (file) => {
        const fileUrl = `/api/uploads/${file.filename}`;

        // Optionally create attachment record if docId is provided
        if (docId) {
          await db.insert(attachments).values({
            docId,
            name: file.originalname,
            type: file.mimetype,
            size: file.size,
            url: fileUrl,
            storageType: 'local',
          });
        }

        return {
          url: fileUrl,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
          mimeType: file.mimetype,
        };
      })
    );

    res.json({
      success: true,
      files: uploadedFiles,
    });
  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// GET /api/uploads/:filename - Serve uploaded files
router.get('/uploads/:filename', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(UPLOADS_DIR, filename);

    // Security: Prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(UPLOADS_DIR);

    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Serve the file
    res.sendFile(filePath);
  } catch (error) {
    console.error('File serve error:', error);
    res.status(500).json({ error: 'Failed to serve file' });
  }
});

// DELETE /api/uploads/:filename - Delete uploaded file
router.delete('/uploads/:filename', async (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(UPLOADS_DIR, filename);

    // Security: Prevent directory traversal
    const resolvedPath = path.resolve(filePath);
    const resolvedUploadsDir = path.resolve(UPLOADS_DIR);

    if (!resolvedPath.startsWith(resolvedUploadsDir)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Delete the file
    fs.unlinkSync(filePath);

    // Also delete from attachments table if exists
    const fileUrl = `/api/uploads/${filename}`;
    await db.delete(attachments).where(eq(attachments.url, fileUrl));

    res.json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    console.error('File delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

export default router;
