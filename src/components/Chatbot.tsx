import { useState, useRef, useEffect } from "react";
import { Send, Mic, MicOff, Loader2, Star, Maximize2, Minimize2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import BookmarkedQuestionsDialog from "./BookmarkedQuestionsDialog";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  datasetId?: number;
  datasetType?: 'pdf' | 'csv';
  externalQuestion?: string;
  onQuestionSent?: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export default function Chatbot({ datasetId, datasetType, externalQuestion, onQuestionSent, isFullscreen, onToggleFullscreen }: ChatbotProps) {
  const { toast } = useToast();
  
  const getWelcomeMessage = () => {
    const messages = {
      csv: "• Analyze trends and patterns in your CSV data\n• Generate insights from spreadsheet columns\n• Query specific data points and aggregations",
      pdf: "• Extract and analyze information from documents\n• Search through PDF content intelligently\n• Summarize key findings from your files"
    };
    
    return `Welcome to DataLens! I can help you with:\n\n${messages[datasetType || 'csv']}`;
  };
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: getWelcomeMessage(),
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handleExternalQuestion = async () => {
      if (externalQuestion && externalQuestion.trim()) {
        setInput(externalQuestion);
        // Trigger send after a brief delay to allow input state to update
        await new Promise(resolve => setTimeout(resolve, 100));
        await handleSend(externalQuestion);
        if (onQuestionSent) {
          onQuestionSent();
        }
      }
    };
    handleExternalQuestion();
  }, [externalQuestion]);

  const handleSend = async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call appropriate chat API based on dataset type
      const endpoint = datasetType === 'pdf' 
        ? '/api/chat/chat_with_pdf'
        : '/api/chat/chat_with_csv/';

      // Mock response for now - simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'This is a sample response. Connect to your Django backend to get real responses.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
    // Implement voice recording logic here
  };

  const handleBookmarkQuestion = (messageId: string, content: string) => {
    const bookmarked = {
      id: messageId,
      question: content,
      timestamp: new Date(),
    };
    
    // Load existing bookmarks
    const stored = localStorage.getItem('bookmarkedQuestions');
    const existing = stored ? JSON.parse(stored) : [];
    
    // Check if already bookmarked
    if (existing.some((q: any) => q.id === messageId)) {
      toast({
        title: "Already Bookmarked",
        description: "This question is already in your bookmarks",
      });
      return;
    }
    
    // Add new bookmark
    existing.push(bookmarked);
    localStorage.setItem('bookmarkedQuestions', JSON.stringify(existing));
    
    toast({
      title: "Bookmarked",
      description: "Question added to your bookmarks",
    });
  };

  const handleSelectBookmarkedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="flex flex-col h-full w-full bg-chat-bg">
      <div className="p-3 sm:p-4 border-b border-border bg-background flex items-center justify-between flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">Chat Assistant</h2>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            Ask questions about your {datasetType || 'data'}
          </p>
        </div>
        {onToggleFullscreen && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleFullscreen}
            className="h-8 w-8 flex-shrink-0 ml-2"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1 p-3 sm:p-4" ref={scrollRef}>
        <div className="space-y-3 sm:space-y-4 w-full">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`group flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-start gap-2 sm:gap-3 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 mt-1">
                  <AvatarFallback className={message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-gradient-to-br from-primary to-primary/70 text-primary-foreground'}>
                    {message.role === 'user' ? <User className="h-3 w-3 sm:h-4 sm:w-4" /> : 'D'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex items-start gap-1 sm:gap-2 flex-1 min-w-0">
                  {message.role === 'user' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleBookmarkQuestion(message.id, message.content)}
                      className="h-6 w-6 sm:h-7 sm:w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
                    >
                      <Star className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                  )}
                  <div
                    className={`rounded-lg p-2 sm:p-3 ${
                      message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background border border-border text-foreground'
                    }`}
                  >
                    <p className="text-xs sm:text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    <span className="text-[10px] sm:text-xs opacity-70 mt-1 block">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-background border border-border rounded-lg p-2 sm:p-3">
                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin text-primary" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-3 sm:p-4 border-t border-border bg-background flex-shrink-0">
        <div className="flex gap-2 w-full">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your data..."
            className="min-h-[50px] sm:min-h-[60px] max-h-[100px] sm:max-h-[120px] resize-none flex-1"
            disabled={isLoading}
          />
          <div className="flex flex-col gap-2 flex-shrink-0">
            <div className="flex gap-2">
              <BookmarkedQuestionsDialog onSelectQuestion={handleSelectBookmarkedQuestion} />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-[50px] sm:h-[60px] w-10 sm:w-12"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                )}
              </Button>
            </div>
            <Button
              onClick={toggleRecording}
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              className="h-full w-full"
            >
              {isRecording ? (
                <MicOff className="h-3 w-3 sm:h-4 sm:w-4" />
              ) : (
                <Mic className="h-3 w-3 sm:h-4 sm:w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
