import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
 * Hook for searching docs with debounced input
 * @param query - Search query string
 * @param debounceMs - Debounce delay in milliseconds (default: 300ms)
 * @returns Query result with loading state, docs, and error
 */
export function useDocSearch(query: string, debounceMs: number = 300) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Debounce the search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Only fetch if we have a query (min 2 characters)
  const shouldFetch = debouncedQuery.trim().length >= 2;

  const queryResult = useQuery<Doc[]>({
    queryKey: ["/api/docs/search", debouncedQuery],
    queryFn: async () => {
      const response = await apiRequest(
        "GET",
        `/api/docs/search?q=${encodeURIComponent(debouncedQuery)}`
      );

      if (!response.ok) {
        throw new Error("Failed to search docs");
      }

      return response.json();
    },
    enabled: shouldFetch,
    staleTime: 30000, // Cache for 30 seconds
  });

  return {
    docs: queryResult.data || [],
    isLoading: queryResult.isLoading && shouldFetch,
    error: queryResult.error,
    isSearching: query !== debouncedQuery, // True while debouncing
  };
}
