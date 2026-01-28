import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bookmark, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface BookmarkedQuestion {
  id: string;
  question: string;
  timestamp: Date;
  category?: string;
}

interface BookmarkedQuestionsDialogProps {
  onSelectQuestion: (question: string) => void;
}

export default function BookmarkedQuestionsDialog({ onSelectQuestion }: BookmarkedQuestionsDialogProps) {
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<BookmarkedQuestion[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Load bookmarked questions from localStorage
    const stored = localStorage.getItem('bookmarkedQuestions');
    if (stored) {
      const parsed = JSON.parse(stored);
      setBookmarkedQuestions(parsed.map((q: any) => ({
        ...q,
        timestamp: new Date(q.timestamp)
      })));
    }
  }, [open]);

  const handleDeleteBookmark = (id: string) => {
    const updated = bookmarkedQuestions.filter(q => q.id !== id);
    setBookmarkedQuestions(updated);
    localStorage.setItem('bookmarkedQuestions', JSON.stringify(updated));
  };

  const handleSendQuestion = (question: string) => {
    onSelectQuestion(question);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bookmark className="h-5 w-5" />
          {bookmarkedQuestions.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
              {bookmarkedQuestions.length}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5 text-primary" />
            Bookmarked Questions ({bookmarkedQuestions.length})
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[500px] pr-4">
          {bookmarkedQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Bookmark className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No bookmarked questions yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Click the star icon next to any question to bookmark it
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookmarkedQuestions.map((item) => (
                <div
                  key={item.id}
                  className="group relative flex items-start gap-3 p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground mb-1">
                      {item.question}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.timestamp.toLocaleDateString()} at {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleSendQuestion(item.question)}
                      className="h-8 w-8"
                    >
                      <Send className="h-4 w-4 text-primary" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteBookmark(item.id)}
                      className="h-8 w-8"
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