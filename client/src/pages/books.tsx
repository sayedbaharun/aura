import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, BookOpen, Trash2, Edit, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface Book {
  id: string;
  title: string;
  author: string | null;
  platforms: string[] | null;
  status: "to_read" | "reading" | "finished";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

const statusConfig = {
  to_read: { label: "To Read", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
  reading: { label: "Reading", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
  finished: { label: "Finished", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
};

const platformConfig = {
  kindle: { label: "Kindle", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" },
  audible: { label: "Audible", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" },
  physical: { label: "Physical", color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200" },
};

const platformOptions = [
  { value: "kindle", label: "Kindle" },
  { value: "audible", label: "Audible" },
  { value: "physical", label: "Physical Copy" },
];

export default function Books() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    author: "",
    platforms: [] as string[],
    status: "to_read" as "to_read" | "reading" | "finished",
    notes: "",
  });

  const { data: books = [], isLoading } = useQuery<Book[]>({
    queryKey: ["/api/books"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/books", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({ title: "Book added", description: "Book has been added to your library." });
      closeModal();
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Book> }) => {
      return apiRequest("PATCH", `/api/books/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/books/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
      toast({ title: "Book deleted", description: "Book has been removed from your library." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const filteredBooks = Array.isArray(books) ? books.filter((book) => {
    if (statusFilter !== "all" && book.status !== statusFilter) return false;
    if (platformFilter !== "all") {
      const bookPlatforms = Array.isArray(book.platforms) ? book.platforms : [];
      if (!bookPlatforms.includes(platformFilter)) return false;
    }
    return true;
  }) : [];

  // Group books by status
  const groupedBooks = {
    reading: filteredBooks.filter((b) => b.status === "reading"),
    to_read: filteredBooks.filter((b) => b.status === "to_read"),
    finished: filteredBooks.filter((b) => b.status === "finished"),
  };

  const openModal = (book?: Book) => {
    if (book) {
      setEditingBook(book);
      setFormData({
        title: book.title,
        author: book.author || "",
        platforms: Array.isArray(book.platforms) ? book.platforms : [],
        status: book.status,
        notes: book.notes || "",
      });
    } else {
      setEditingBook(null);
      setFormData({ title: "", author: "", platforms: [], status: "to_read", notes: "" });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingBook(null);
    setFormData({ title: "", author: "", platforms: [], status: "to_read", notes: "" });
  };

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast({ title: "Error", description: "Book title is required", variant: "destructive" });
      return;
    }

    if (editingBook) {
      updateMutation.mutate({ id: editingBook.id, data: formData });
      closeModal();
      toast({ title: "Book updated", description: "Book details have been updated." });
    } else {
      createMutation.mutate(formData);
    }
  };

  const updateStatus = (book: Book, newStatus: "to_read" | "reading" | "finished") => {
    updateMutation.mutate({
      id: book.id,
      data: { status: newStatus },
    });
  };

  const togglePlatform = (platform: string) => {
    setFormData((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const booksArray = Array.isArray(books) ? books : [];
  const toReadCount = booksArray.filter((b) => b.status === "to_read").length;
  const readingCount = booksArray.filter((b) => b.status === "reading").length;
  const finishedCount = booksArray.filter((b) => b.status === "finished").length;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Library className="h-8 w-8" />
            Book Library
          </h1>
          <p className="text-muted-foreground mt-1">
            {readingCount} reading, {toReadCount} to read, {finishedCount} finished
          </p>
        </div>
        <Button onClick={() => openModal()}>
          <Plus className="h-4 w-4 mr-2" />
          Add Book
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="reading">Reading</SelectItem>
            <SelectItem value="to_read">To Read</SelectItem>
            <SelectItem value="finished">Finished</SelectItem>
          </SelectContent>
        </Select>

        <Select value={platformFilter} onValueChange={setPlatformFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            <SelectItem value="kindle">Kindle</SelectItem>
            <SelectItem value="audible">Audible</SelectItem>
            <SelectItem value="physical">Physical</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Books by Status */}
      {(["reading", "to_read", "finished"] as const).map((status) => {
        const statusBooks = groupedBooks[status];
        if (statusBooks.length === 0) return null;

        return (
          <Card key={status}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Badge className={statusConfig[status].color}>
                  {statusConfig[status].label}
                </Badge>
                <span className="text-muted-foreground font-normal">
                  ({statusBooks.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {statusBooks.map((book) => {
                  const bookPlatforms = Array.isArray(book.platforms) ? book.platforms : [];
                  return (
                    <div
                      key={book.id}
                      className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent transition-colors"
                    >
                      <BookOpen className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{book.title}</p>
                        {book.author && (
                          <p className="text-sm text-muted-foreground">by {book.author}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {bookPlatforms.map((platform) => (
                            <Badge
                              key={platform}
                              variant="outline"
                              className={`text-xs ${platformConfig[platform as keyof typeof platformConfig]?.color || ""}`}
                            >
                              {platformConfig[platform as keyof typeof platformConfig]?.label || platform}
                            </Badge>
                          ))}
                          <span className="text-xs text-muted-foreground">
                            Added {format(new Date(book.createdAt), "MMM d, yyyy")}
                          </span>
                        </div>
                        {book.notes && (
                          <p className="text-sm text-muted-foreground mt-1">{book.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={book.status}
                          onValueChange={(v) => updateStatus(book, v as typeof book.status)}
                        >
                          <SelectTrigger className="w-[120px] h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="to_read">To Read</SelectItem>
                            <SelectItem value="reading">Reading</SelectItem>
                            <SelectItem value="finished">Finished</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openModal(book)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => deleteMutation.mutate(book.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {filteredBooks.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Library className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No books found</h3>
            <p className="text-muted-foreground mb-4">
              {statusFilter === "all" && platformFilter === "all"
                ? "Your book library is empty!"
                : "No books match the current filters."}
            </p>
            <Button onClick={() => openModal()}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Book
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBook ? "Edit Book" : "Add Book"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Book Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter book title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Enter author name"
              />
            </div>

            <div className="space-y-2">
              <Label>Platforms</Label>
              <p className="text-sm text-muted-foreground">Select all that apply</p>
              <div className="flex flex-wrap gap-4 pt-2">
                {platformOptions.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <Checkbox
                      id={`platform-${option.value}`}
                      checked={formData.platforms.includes(option.value)}
                      onCheckedChange={() => togglePlatform(option.value)}
                    />
                    <Label
                      htmlFor={`platform-${option.value}`}
                      className="cursor-pointer font-normal"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as typeof formData.status })}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="to_read">To Read</SelectItem>
                  <SelectItem value="reading">Reading</SelectItem>
                  <SelectItem value="finished">Finished</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any thoughts or notes about this book..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeModal}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editingBook ? "Save Changes" : "Add Book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
