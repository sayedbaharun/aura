/**
 * Books Routes
 * CRUD operations for reading list
 */
import { Router, Request, Response } from "express";
import { storage } from "../storage";
import { logger } from "../logger";
import { insertBookSchema } from "@shared/schema";
import { z } from "zod";

const router = Router();

// Get all books
router.get("/", async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string;
    const books = await storage.getBooks(status ? { status } : undefined);
    res.json(books);
  } catch (error) {
    logger.error({ error }, "Error fetching books");
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

// Get single book
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const book = await storage.getBook(req.params.id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.json(book);
  } catch (error) {
    logger.error({ error }, "Error fetching book");
    res.status(500).json({ error: "Failed to fetch book" });
  }
});

// Create book
router.post("/", async (req: Request, res: Response) => {
  try {
    const validatedData = insertBookSchema.parse(req.body);
    const book = await storage.createBook(validatedData);
    res.status(201).json(book);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid book data", details: error.errors });
    } else {
      logger.error({ error }, "Error creating book");
      res.status(500).json({ error: "Failed to create book" });
    }
  }
});

// Update book
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const updates = insertBookSchema.partial().parse(req.body);
    const book = await storage.updateBook(req.params.id, updates);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.json(book);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: "Invalid book data", details: error.errors });
    } else {
      logger.error({ error }, "Error updating book");
      res.status(500).json({ error: "Failed to update book" });
    }
  }
});

// Delete book
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    await storage.deleteBook(req.params.id);
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Error deleting book");
    res.status(500).json({ error: "Failed to delete book" });
  }
});

export default router;
