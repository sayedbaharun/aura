import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "./use-toast";

export interface Attachment {
  id: string;
  docId: string | null;
  name: string;
  type: string; // MIME type
  size: number | null;
  url: string | null;
  storageType: string | null;
  data: string | null;
  thumbnailUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface CreateAttachmentData {
  docId: string;
  name: string;
  type: string;
  size?: number;
  url?: string;
  storageType?: string;
  data?: string;
  thumbnailUrl?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Hook for managing attachments for a specific document
 * @param docId - Document ID to fetch attachments for
 */
export function useAttachments(docId: string | undefined | null) {
  const { toast } = useToast();

  // Fetch all attachments for a document
  const {
    data: attachments = [],
    isLoading,
    error,
  } = useQuery<Attachment[]>({
    queryKey: [`/api/docs/${docId}/attachments`],
    enabled: !!docId,
  });

  // Create a new attachment
  const createAttachment = useMutation({
    mutationFn: async (data: CreateAttachmentData) => {
      // Use data.docId to ensure we're using the correct docId at mutation time
      const targetDocId = data.docId;
      const response = await apiRequest(
        "POST",
        `/api/docs/${targetDocId}/attachments`,
        data
      );
      return { ...(await response.json()), _docId: targetDocId };
    },
    onSuccess: (result) => {
      // Use the docId from the mutation result to invalidate the correct cache
      const targetDocId = result._docId || docId;
      queryClient.invalidateQueries({
        queryKey: [`/api/docs/${targetDocId}/attachments`],
      });
      toast({
        title: "Attachment added",
        description: "File has been successfully attached to this document.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add attachment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete an attachment
  const deleteAttachment = useMutation({
    mutationFn: async (attachmentId: string) => {
      await apiRequest("DELETE", `/api/attachments/${attachmentId}`);
      // Return the current docId so onSuccess can use it
      return { _docId: docId };
    },
    onSuccess: (result) => {
      // Use the docId captured at mutation time
      const targetDocId = result._docId;
      queryClient.invalidateQueries({
        queryKey: [`/api/docs/${targetDocId}/attachments`],
      });
      toast({
        title: "Attachment deleted",
        description: "File has been removed from this document.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete attachment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    attachments,
    isLoading,
    error,
    createAttachment,
    deleteAttachment,
  };
}
