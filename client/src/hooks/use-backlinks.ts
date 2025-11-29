import { useQuery } from "@tanstack/react-query";

interface Doc {
  id: string;
  title: string;
  type: string;
  domain?: string;
  status: string;
  body?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook for finding backlinks to a specific document
 * Searches for docs that contain references to the current doc
 * @param docId - ID of the document to find backlinks for
 * @param docTitle - Title of the document (used for searching [[Title]] references)
 * @returns Query result with loading state, backlinks, and error
 */
export function useBacklinks(docId: string | undefined, docTitle: string | undefined) {
  return useQuery<Doc[]>({
    queryKey: ["/api/docs/backlinks", docId, docTitle],
    queryFn: async () => {
      if (!docId || !docTitle) {
        return [];
      }

      // Search for documents containing [[Title]](doc-id) or [[Title]]
      // We'll search by title since that's what appears in the link syntax
      const searchQuery = `[[${docTitle}]]`;
      const response = await fetch(
        `/api/docs/search?q=${encodeURIComponent(searchQuery)}`,
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch backlinks");
      }

      const allDocs: Doc[] = await response.json();

      // Filter out the current document itself and only include docs
      // that actually contain the reference in their body
      return allDocs.filter((doc) => {
        if (doc.id === docId) return false;

        // Check if body contains [[Title]] reference (with or without ID)
        if (!doc.body) return false;

        const hasReference =
          doc.body.includes(`[[${docTitle}]](${docId})`) ||
          doc.body.includes(`[[${docTitle}]]`);

        return hasReference;
      });
    },
    enabled: !!docId && !!docTitle,
    staleTime: 60000, // Cache for 60 seconds
  });
}
