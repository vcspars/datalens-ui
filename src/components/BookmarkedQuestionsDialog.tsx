import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bookmark, Send, Trash2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getBookmarks, deleteBookmark, type BookmarkItem } from "@/lib/api";

interface BookmarkedQuestionsDialogProps {
  onSelectQuestion: (question: string) => void;
  /** Increment to trigger a refresh of bookmark count (e.g. after adding from chat). */
  refreshTrigger?: number;
}

export default function BookmarkedQuestionsDialog({ onSelectQuestion, refreshTrigger }: BookmarkedQuestionsDialogProps) {
  const { toast } = useToast();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const loadBookmarks = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBookmarks();
      console.log("[BookmarkedQuestionsDialog] Loaded", data.length, "bookmarks from DB");
      setBookmarks(data);
    } catch (err) {
      console.error("[BookmarkedQuestionsDialog] Load error:", err);
      toast({ title: "Error loading bookmarks", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Load on mount so badge count shows without opening the dialog
  useEffect(() => {
    loadBookmarks();
  }, [loadBookmarks]);

  // Reload when dialog opens (fresh list when user opens)
  useEffect(() => {
    if (open) loadBookmarks();
  }, [open, loadBookmarks]);

  // Refresh when parent signals (e.g. after adding a bookmark from chat)
  useEffect(() => {
    if (refreshTrigger != null && refreshTrigger > 0) loadBookmarks();
  }, [refreshTrigger, loadBookmarks]);

  const handleDelete = async (id: string) => {
    console.log("[BookmarkedQuestionsDialog] Deleting bookmark:", id);
    try {
      await deleteBookmark(id);
      setBookmarks((prev) => prev.filter((b) => b.id !== id));
      toast({ title: "Removed", description: "Bookmark deleted." });
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    }
  };

  const handleSend = (question: string) => {
    onSelectQuestion(question);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bookmark className="h-5 w-5" />
          {bookmarks.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {bookmarks.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            Bookmarked Questions ({bookmarks.length})
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : bookmarks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No bookmarked questions yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click the bookmark icon next to any question to save it
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookmarks.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground mb-1">{item.question}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()} at{" "}
                      {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleSend(item.question)}
                      className="h-8 w-8"
                      title="Send to chat"
                    >
                      <Send className="h-4 w-4 text-primary" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                      className="h-8 w-8"
                      title="Delete bookmark"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
