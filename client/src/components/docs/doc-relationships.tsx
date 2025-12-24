import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { X, Plus, FileText } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface Doc {
  id: string;
  title: string;
  type: string;
  domain?: string;
}

interface DocRelationshipsProps {
  type: 'prerequisites' | 'relatedDocs';
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  excludeIds?: string[];  // Docs to exclude from search (e.g., current doc)
  ventureId?: string;  // Filter by venture
  maxItems?: number;  // Max number of links allowed
}

export function DocRelationships({
  type,
  selectedIds,
  onChange,
  excludeIds = [],
  ventureId,
  maxItems = 10,
}: DocRelationshipsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Fetch selected docs details
  const { data: selectedDocs = [] } = useQuery({
    queryKey: ["docs-by-ids", selectedIds],
    queryFn: async () => {
      if (selectedIds.length === 0) return [];
      // Fetch each doc - in production you'd want a batch endpoint
      const docs = await Promise.all(
        selectedIds.map(async (id) => {
          try {
            const response = await apiRequest("GET", `/api/docs/${id}`);
            return response.json();
          } catch {
            return null;
          }
        })
      );
      return docs.filter(Boolean) as Doc[];
    },
    enabled: selectedIds.length > 0,
  });

  // Search docs
  const { data: searchResults = [], isLoading: isSearching } = useQuery({
    queryKey: ["docs-search", search, ventureId],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const params = new URLSearchParams({ query: search });
      if (ventureId) params.append("ventureId", ventureId);
      const response = await apiRequest("GET", `/api/docs/search?${params}`);
      const data = await response.json();
      return (data.docs || data || []) as Doc[];
    },
    enabled: search.length >= 2,
  });

  // Filter out already selected and excluded docs
  const filteredResults = searchResults.filter(
    (doc: Doc) => !selectedIds.includes(doc.id) && !excludeIds.includes(doc.id)
  );

  const handleAdd = (docId: string) => {
    if (selectedIds.length >= maxItems) return;
    onChange([...selectedIds, docId]);
    setSearch("");
    setIsOpen(false);
  };

  const handleRemove = (docId: string) => {
    onChange(selectedIds.filter((id) => id !== docId));
  };

  const label = type === 'prerequisites' ? 'Prerequisites' : 'Related Docs';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">{label}</label>
        <span className="text-xs text-muted-foreground">
          {selectedIds.length}/{maxItems}
        </span>
      </div>

      {/* Selected docs */}
      {selectedDocs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedDocs.map((doc: Doc) => (
            <Badge
              key={doc.id}
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <FileText className="h-3 w-3" />
              <span className="max-w-[150px] truncate">{doc.title}</span>
              <button
                type="button"
                onClick={() => handleRemove(doc.id)}
                className="ml-1 hover:bg-muted rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Add button with search popover */}
      {selectedIds.length < maxItems && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-start text-muted-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add {type === 'prerequisites' ? 'prerequisite' : 'related doc'}...
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Search documents..."
                value={search}
                onValueChange={setSearch}
              />
              <CommandList>
                <CommandEmpty>
                  {search.length < 2
                    ? "Type to search..."
                    : isSearching
                    ? "Searching..."
                    : "No documents found."}
                </CommandEmpty>
                {filteredResults.length > 0 && (
                  <CommandGroup heading="Documents">
                    {filteredResults.slice(0, 10).map((doc: Doc) => (
                      <CommandItem
                        key={doc.id}
                        value={doc.id}
                        onSelect={() => handleAdd(doc.id)}
                        className="cursor-pointer"
                      >
                        <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                        <div className="flex-1 truncate">
                          <span>{doc.title}</span>
                          {doc.type && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {doc.type}
                            </span>
                          )}
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {selectedIds.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {type === 'prerequisites'
            ? "Link documents that should be read before this one."
            : "Link documents related to this topic."}
        </p>
      )}
    </div>
  );
}
