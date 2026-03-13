/**
 * ChatWithDatabase page
 *
 * Layout: identical to Dashboard.tsx — resizable split panels:
 *   Left  → Chat panel  (same UI as Chatbot.tsx but with real LangChain streaming)
 *   Right → Data tabs   (same UI as DataTabs.tsx but database-specific:
 *                        Overview | Graphs | Report)
 *
 * Chat streams via SSE from /api/chat/stream, renders markdown with
 * react-markdown + remark-gfm, and shows action buttons (Copy / Save to Dashboard /
 * Convert to Graph) when the response contains a table.
 *
 * "Convert to Graph" populates the Graphs tab on the right panel.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import MarkdownMessage from "@/components/MarkdownMessage";
import GraphPreview from "@/components/GraphPreview";
import SaveNameModal from "@/components/SaveNameModal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BookmarkedQuestionsDialog from "@/components/BookmarkedQuestionsDialog";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/clipboard";
import {
  Send, Mic, MicOff, Loader2, Star, Maximize2, Minimize2,
  User, Copy, Check, BookmarkPlus, BarChart3, Sparkles, Download, Trash2,
} from "lucide-react";
import {
  getChatHistory,
  streamChat,
  saveDashboardTable,
  clearChatHistory,
  streamGenerateReport,
  streamDbSummary,
  streamDbQuestions,
  streamDbReport,
  getDbOverview,
  clearDbOverview,
  getDbGraphs,
  saveDbGraphs,
  addBookmark,
  downloadDbReportPdf,
  type ChatMessageItem,
} from "@/lib/api";
import type { GraphType } from "@/lib/chartUtils";
import ConvertToGraphDialog from "@/components/ConvertToGraphDialog";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface TableEntry {
  columns: string[];
  data: Record<string, string>[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  has_table?: boolean;
  table_data?: Record<string, string>[];
  table_columns?: string[];
  // All tables parsed from this message
  tables?: TableEntry[];
  /** Generated SQL for this response (from Vanna or LangChain) */
  sql_query?: string;
}

/** One chart instance in the Graphs tab */
export interface GraphInstance {
  id: string;
  tableData: Record<string, string>[];
  tableColumns: string[];
  graphType: GraphType;
  xKey: string;
  yKey: string;
  sourceLabel?: string;
  sourcePrompt?: string;
  sourceResponse?: string;
}

// ---------------------------------------------------------------------------
// SSE parser
// ---------------------------------------------------------------------------
function parseSSELine(line: string): { type: string; [key: string]: unknown } | null {
  const t = line.trim();
  if (!t.startsWith("data: ")) return null;
  try { return JSON.parse(t.slice(6)); } catch { return null; }
}

// ---------------------------------------------------------------------------
// Table action buttons — rendered OUTSIDE the message bubble
// ---------------------------------------------------------------------------
function TableActions({
  message,
  sourcePrompt,
  onOpenConvertDialog,
  onSaveToDashboard,
}: {
  message: Message;
  sourcePrompt: string;
  onOpenConvertDialog: (msg: Message, sourcePrompt: string) => void;
  /** When multiple tables, (tableIndex | 'all') and name; when single table, just name. */
  onSaveToDashboard: (msg: Message, name: string, tableIndexOrAll: number | "all" | undefined, sourcePrompt: string) => void | Promise<void>;
}) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveChoiceModalOpen, setSaveChoiceModalOpen] = useState(false);
  const [saveChoice, setSaveChoice] = useState<number | "all">(0);
  const [selectedTableIdx, setSelectedTableIdx] = useState(0);

  const tables = message.tables && message.tables.length > 0 ? message.tables : null;

  const handleCopy = () => {
    console.log("[TableActions] Copying raw markdown to clipboard");
    copyToClipboard(message.content).then((ok) => {
      if (!ok) {
        toast({
          title: "Copy failed",
          description: "Clipboard is not available in this context.",
          variant: "destructive",
        });
        return;
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSaveClick = () => {
    if (tables && tables.length > 1) {
      setSaveChoice(0);
      setSaveChoiceModalOpen(true);
    } else {
      setSaveModalOpen(true);
    }
  };

  const handleSaveChoiceConfirm = () => {
    setSaveChoiceModalOpen(false);
    setSaveModalOpen(true);
  };

  const handleSaveConfirmSingleOrChosen = async (name: string) => {
    setSaving(true);
    try {
      await onSaveToDashboard(message, name, tables && tables.length > 1 ? saveChoice : undefined, sourcePrompt);
      if (tables && tables.length > 1 && saveChoice === "all") {
        toast({ title: "Saved", description: `${tables.length} tables saved to your dashboard.` });
      } else {
        toast({ title: "Saved", description: "Table saved to your dashboard." });
      }
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToGraph = () => {
    onOpenConvertDialog(message, sourcePrompt);
  };

  return (
    <>
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap pl-1">
        {/* Multi-table picker — only shown when response has >1 table */}
        {tables && tables.length > 1 && (
          <Select
            value={String(selectedTableIdx)}
            onValueChange={(v) => setSelectedTableIdx(Number(v))}
          >
            <SelectTrigger className="h-7 text-xs w-36">
              <SelectValue placeholder="Select table" />
            </SelectTrigger>
            <SelectContent>
              {tables.map((_, i) => (
                <SelectItem key={i} value={String(i)} className="text-xs">
                  Table {i + 1} ({tables[i].columns.length} cols)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1.5"
          onClick={handleSaveClick}
          disabled={saving}
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <BookmarkPlus className="h-3 w-3" />}
          Save to Dashboard
        </Button>
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5" onClick={handleConvertToGraph}>
          <BarChart3 className="h-3 w-3" />
          Convert to Graph
        </Button>
      </div>

      {/* Which table(s) to save — when multiple tables */}
      {tables && tables.length > 1 && (
        <Dialog open={saveChoiceModalOpen} onOpenChange={setSaveChoiceModalOpen}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Which table(s) to save?</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 py-2">
              {tables.map((t, i) => (
                <Button
                  key={i}
                  variant={saveChoice === i ? "default" : "outline"}
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setSaveChoice(i)}
                >
                  Table {i + 1} ({t.columns.length} cols)
                </Button>
              ))}
              <Button
                variant={saveChoice === "all" ? "default" : "outline"}
                size="sm"
                className="w-full justify-start"
                onClick={() => setSaveChoice("all")}
              >
                All tables ({tables.length})
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSaveChoiceModalOpen(false)}>Cancel</Button>
              <Button onClick={handleSaveChoiceConfirm}>Continue</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <SaveNameModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onConfirm={handleSaveConfirmSingleOrChosen}
        title={tables && tables.length > 1 && saveChoice === "all" ? "Base name for all tables" : "Save Table to Dashboard"}
        placeholder="e.g. Monthly Sales by Region"
        defaultName={`Query result — ${new Date().toLocaleString()}`}
      />
    </>
  );
}

// ---------------------------------------------------------------------------
// Left panel — Chat (matches Chatbot.tsx structure exactly)
// ---------------------------------------------------------------------------
interface ChatPanelProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onOpenConvertDialog: (msg: Message, sourcePrompt: string) => void;
  onSaveToDashboard: (msg: Message, name: string, tableIndexOrAll: number | "all" | undefined, sourcePrompt: string) => void | Promise<void>;
  onSwitchToGraphTab: () => void;
}

function ChatPanel({ isFullscreen, onToggleFullscreen, onOpenConvertDialog, onSaveToDashboard, onSwitchToGraphTab }: ChatPanelProps) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [bookmarkRefreshTrigger, setBookmarkRefreshTrigger] = useState(0);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [sqlPopupMessage, setSqlPopupMessage] = useState<Message | null>(null);
  const lastUserPromptRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const inputAtVoiceStartRef = useRef("");

  // Voice input: Web Speech API (built-in, no LLM)
  const startVoiceInput = useCallback(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      toast({ title: "Not supported", description: "Voice input is not supported in this browser. Try Chrome or Edge.", variant: "destructive" });
      return;
    }
    if (isLoading) return;
    if (!recognitionRef.current) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.onresult = (e: SpeechRecognitionEvent) => {
        const results = e.results;
        let transcript = "";
        for (let i = 0; i < results.length; i++) {
          transcript += results.item(i).item(0).transcript;
        }
        const base = inputAtVoiceStartRef.current;
        setInput((base ? `${base} ${transcript}` : transcript).trim());
      };
      recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
        if (e.error !== "aborted") {
          setIsRecording(false);
          toast({ title: "Voice input error", description: e.error === "not-allowed" ? "Microphone access denied." : "Could not start voice input.", variant: "destructive" });
        }
      };
      recognition.onend = () => setIsRecording(false);
      recognitionRef.current = recognition;
    }
    try {
      inputAtVoiceStartRef.current = input;
      recognitionRef.current.start();
      setIsRecording(true);
    } catch (err) {
      setIsRecording(false);
      toast({ title: "Voice input failed", description: "Could not start microphone.", variant: "destructive" });
    }
  }, [isLoading, toast]);

  const stopVoiceInput = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsRecording(false);
    }
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  // Auto-scroll to the latest message (anchor at the start of the last message)
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [messages, historyLoading]);

  // Load history on mount
  useEffect(() => {
    const load = async () => {
      console.log("[ChatPanel] Loading chat history...");
      try {
        const data = await getChatHistory();
        console.log(`[ChatPanel] Loaded ${data.messages.length} history messages`);
        const welcome: Message = {
          id: "welcome",
          role: "assistant",
          content:
            "Welcome to SPARS lens! I can help you with:\n\n" +
            "- Query your database with natural language\n" +
            "- Help you with your questions\n" +
            "- Generate insights from your data",
          timestamp: new Date(),
        };

        if (data.messages.length === 0) {
          setMessages([welcome]);
        } else {
          const historyMessages: Message[] = data.messages.map((m: ChatMessageItem) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            timestamp: new Date(m.created_at),
            has_table: m.has_table,
            table_data: m.table_data as Record<string, string>[],
            table_columns: m.table_columns,
            tables: m.tables as TableEntry[] | undefined,
            sql_query: m.sql_query,
          }));
          setMessages([welcome, ...historyMessages]);
        }
      } catch (err) {
        console.error("[ChatPanel] Failed to load history:", err);
        setMessages([{
          id: "welcome",
          role: "assistant",
          content:
            "Welcome to SPARSlens! I can help you with:\n\n" +
            "- Query your database with natural language\n" +
            "- Explore relationships between tables\n" +
            "- Generate complex data analysis reports",
          timestamp: new Date(),
        }]);
      } finally {
        setHistoryLoading(false);
      }
    };
    load();
  }, []);

  const handleSend = useCallback(async (messageText?: string) => {
    const textToSend = messageText || input;
    if (!textToSend.trim() || isLoading) return;

    console.log("[ChatPanel] Sending:", textToSend.slice(0, 80));

    // Track latest user prompt for downstream save-to-dashboard metadata
    lastUserPromptRef.current = textToSend;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: textToSend,
      timestamp: new Date(),
    };

    const assistantId = `assistant-${Date.now() + 1}`;
    const assistantPlaceholder: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    setMessages(prev => [...prev, userMsg, assistantPlaceholder]);
    setInput("");
    setIsLoading(true);

    let fullContent = "";
    let hasTable = false;
    let tableData: Record<string, string>[] = [];
    let tableColumns: string[] = [];
    let allTables: TableEntry[] = [];
    let sqlQuery = "";

    try {
      const reader = await streamChat(textToSend);
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const event = parseSSELine(line);
          if (!event) continue;

          console.log("[ChatPanel] SSE event:", event.type);

          if (event.type === "token") {
            fullContent += event.content as string;
            setMessages(prev => prev.map(m =>
              m.id === assistantId ? { ...m, content: fullContent } : m
            ));
          } else if (event.type === "done") {
            fullContent = (event.full_response as string) || fullContent;
            hasTable = (event.has_table as boolean) || false;
            tableData = (event.table_data as Record<string, string>[]) || [];
            tableColumns = (event.table_columns as string[]) || [];
            allTables = (event.tables as TableEntry[]) || [];
            sqlQuery = (event.sql_query as string) || "";
            console.log(`[ChatPanel] Done | has_table=${hasTable} | tables=${allTables.length} | sql_query=${!!sqlQuery}`);
          } else if (event.type === "error") {
            console.error("[ChatPanel] SSE error:", event.content);
            toast({ title: "Error", description: event.content as string, variant: "destructive" });
          }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: fullContent, isStreaming: false, has_table: hasTable, table_data: tableData, table_columns: tableColumns, tables: allTables, sql_query: sqlQuery || undefined }
          : m
      ));
    } catch (err) {
      console.error("[ChatPanel] Fetch error:", err);
      setMessages(prev => prev.map(m =>
        m.id === assistantId
          ? { ...m, content: `Sorry, something went wrong: ${String(err)}`, isStreaming: false }
          : m
      ));
      toast({ title: "Connection error", description: String(err), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, toast]);

  // Support suggested question clicks from the right panel
  useEffect(() => {
    const handler = (e: CustomEvent<string>) => {
      console.log("[ChatPanel] External question received:", e.detail);
      handleSend(e.detail);
    };
    window.addEventListener("db-send-question" as any, handler as any);
    return () => window.removeEventListener("db-send-question" as any, handler as any);
  }, [handleSend]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleBookmarkQuestion = async (_messageId: string, content: string) => {
    console.log("[ChatPanel] Bookmarking question:", content.slice(0, 60));
    try {
      await addBookmark(content);
      setBookmarkRefreshTrigger((t) => t + 1);
      toast({ title: "Bookmarked", description: "Question saved to your bookmarks." });
    } catch (err: unknown) {
      const msg = String(err);
      if (msg.includes("409") || msg.toLowerCase().includes("already bookmarked")) {
        toast({ title: "Already Bookmarked", description: "This question is already in your bookmarks." });
      } else {
        toast({ title: "Error saving bookmark", description: msg, variant: "destructive" });
      }
    }
  };

  const handleSelectBookmarkedQuestion = (question: string) => {
    setInput(question);
  };

  const handleCopyMessage = (message: Message) => {
    if (!message.content) return;
    copyToClipboard(message.content).then((ok) => {
      if (!ok) {
        toast({
          title: "Copy failed",
          description: "Clipboard is not available in this context.",
          variant: "destructive",
        });
        return;
      }
      setCopiedMessageId(message.id);
      setTimeout(() => {
        setCopiedMessageId((prev) => (prev === message.id ? null : prev));
      }, 2000);
    });
  };

  // Derive the most relevant prompt for a given assistant message
  const getPromptForMessage = (msg: Message): string => {
    let prompt = lastUserPromptRef.current;
    const idx = messages.findIndex((m) => m.id === msg.id);
    if (idx > 0) {
      for (let i = idx - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          prompt = messages[i].content;
          break;
        }
      }
    }
    return prompt;
  };

  const handleOpenConvertDialog = (msg: Message) => {
    const prompt = getPromptForMessage(msg);
    onOpenConvertDialog(msg, prompt);
  };

  const handleSaveToDashboardFromChat = async (
    msg: Message,
    name: string,
    tableIndexOrAll: number | "all" | undefined,
    sourcePromptFromActions?: string,
  ) => {
    const promptToUse = sourcePromptFromActions ?? getPromptForMessage(msg);
    await onSaveToDashboard(msg, name, tableIndexOrAll, promptToUse);
  };

  // -------------------------------------------------------------------------
  // Render — exact same structure / classNames as Chatbot.tsx
  // -------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full w-full min-w-0 overflow-hidden bg-chat-bg">
      {/* Header */}
      <div className="p-3 sm:p-4 border-b border-border bg-background flex items-center justify-between flex-shrink-0">
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">Chat Assistant</h2>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            Talk to your database in natural language. 
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFullscreen}
          className="h-8 w-8 flex-shrink-0 ml-2"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 min-h-0 min-w-0 py-3 sm:py-4 pl-3 sm:pl-4 pr-3 sm:pr-4" ref={scrollRef}>
        <div className="space-y-3 sm:space-y-4 w-full min-w-0">
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            messages.map((message, idx) => (
              <div
                key={message.id}
                className={`group flex min-w-0 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex items-start gap-2 sm:gap-3 min-w-0 ${message.role === "user" ? "max-w-full flex-row-reverse" : "max-w-[95%] flex-row"}`}>
                  {/* Avatar */}
                  <Avatar className="h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 mt-1">
                    {message.role === "user" ? (
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <User className="h-3 w-3 sm:h-4 sm:w-4" />
                      </AvatarFallback>
                    ) : (
                      <>
                        <AvatarImage src="/Lens.png" alt="SPARSlens" className="object-contain bg-background" />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground">D</AvatarFallback>
                      </>
                    )}
                  </Avatar>

                  <div className="flex items-start gap-1 sm:gap-2 flex-1 min-w-0 overflow-hidden">
                    {/* Bookmark button on user messages */}
                    {message.role === "user" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleBookmarkQuestion(message.id, message.content)}
                        className="h-6 w-6 sm:h-7 sm:w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-1"
                      >
                        <Star className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground hover:text-primary" />
                      </Button>
                    )}

                    <div className="flex flex-col min-w-0 max-w-full w-full">
                      <div className={`rounded-lg p-2 sm:p-3 min-w-0 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground overflow-visible"
                          : "bg-background border border-border text-foreground overflow-x-auto overflow-y-visible w-full max-w-[calc(100%-1rem)]"
                      }`}>
                        {message.role === "user" ? (
                          <p className="text-xs sm:text-sm whitespace-pre-wrap break-words min-w-0">{message.content}</p>
                        ) : (
                          <>
                            {message.content ? (
                              <MarkdownMessage content={message.content} className="text-xs sm:text-sm" />
                            ) : (
                              <span className="inline-flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin flex-shrink-0" />
                                Thinking…
                              </span>
                            )}
                            {/* Blinking cursor while streaming and we already have content */}
                            {message.isStreaming && message.content && (
                              <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse ml-0.5 align-middle" />
                            )}
                          </>
                        )}
                        <span className="text-[10px] sm:text-xs opacity-70 mt-1 block">
                          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {/* Actions rendered OUTSIDE the bubble */}
                      {!message.isStreaming && (
                        <>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap pl-1">
                            {message.has_table ? (
                              <TableActions
                                message={message}
                                sourcePrompt={getPromptForMessage(message)}
                                onOpenConvertDialog={handleOpenConvertDialog}
                                onSaveToDashboard={handleSaveToDashboardFromChat}
                              />
                            ) : message.role === "assistant" && message.content && message.id !== "welcome" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5"
                                onClick={() => handleCopyMessage(message)}
                              >
                                {copiedMessageId === message.id ? (
                                  <Check className="h-3 w-3 text-green-500" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                                {copiedMessageId === message.id ? "Copied" : "Copy"}
                              </Button>
                            ) : null}
                            {message.sql_query && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1.5"
                                onClick={() => setSqlPopupMessage(message)}
                                aria-label="View SQL"
                              >
                                SQL
                              </Button>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
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
              <BookmarkedQuestionsDialog onSelectQuestion={handleSelectBookmarkedQuestion} refreshTrigger={bookmarkRefreshTrigger} />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || isLoading}
                size="icon"
                className="h-[50px] sm:h-[60px] w-10 sm:w-12"
              >
                {isLoading
                  ? <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  : <Send className="h-4 w-4 sm:h-5 sm:w-5" />
                }
              </Button>
            </div>
            <Button
              onClick={() => (isRecording ? stopVoiceInput() : startVoiceInput())}
              variant={isRecording ? "destructive" : "outline"}
              size="icon"
              className={`h-full w-full relative ${isRecording ? "animate-pulse" : ""}`}
            >
              {isRecording && (
                <span className="absolute inset-0 rounded-md bg-destructive/40 animate-ping" aria-hidden />
              )}
              {isRecording
                ? <Mic className="h-3 w-3 sm:h-4 sm:w-4 relative z-10" />
                : <Mic className="h-3 w-3 sm:h-4 sm:w-4" />
              }
            </Button>
          </div>
        </div>
      </div>

      {/* SQL popup: single dialog for viewing generated SQL */}
      <Dialog open={!!sqlPopupMessage} onOpenChange={(open) => !open && setSqlPopupMessage(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Generated SQL</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-md bg-muted p-3 min-h-[120px]">
            <pre className="text-xs sm:text-sm whitespace-pre-wrap break-all font-mono">
              <code>{sqlPopupMessage?.sql_query ?? ""}</code>
            </pre>
          </div>
          <DialogFooter>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const sql = sqlPopupMessage?.sql_query;
                const ok = sql ? await copyToClipboard(sql) : false;
                toast(
                  ok
                    ? { title: "Copied", description: "SQL copied to clipboard." }
                    : {
                        title: "Copy failed",
                        description: "Clipboard is not available in this context.",
                        variant: "destructive",
                      },
                );
              }}
            >
              <Copy className="h-3 w-3 mr-1" />
              Copy
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setSqlPopupMessage(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Right panel — Database data tabs (matches DataTabs.tsx structure)
// ---------------------------------------------------------------------------
interface DatabaseTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  graphInstances: GraphInstance[];
  selectedGraphId: string | null;
  onSelectGraph: (id: string | null) => void;
  onRemoveGraph: (id: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

function DatabaseTabs({
  activeTab,
  onTabChange,
  graphInstances,
  selectedGraphId,
  onSelectGraph,
  onRemoveGraph,
  isFullscreen,
  onToggleFullscreen,
}: DatabaseTabsProps) {
  const { toast } = useToast();

  // Summary state
  const [summaryText, setSummaryText] = useState("");
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  // Questions state
  const [questions, setQuestions] = useState<string[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  // Report state
  const [reportText, setReportText] = useState("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  // Load persisted overview from MongoDB on mount
  useEffect(() => {
    console.log("[DatabaseTabs] Loading persisted DB overview from DB...");
    getDbOverview()
      .then((overview) => {
        if (overview.summary) {
          console.log("[DatabaseTabs] Restored summary from DB");
          setSummaryText(overview.summary);
        }
        if (overview.questions?.length) {
          console.log("[DatabaseTabs] Restored", overview.questions.length, "questions from DB");
          setQuestions(overview.questions);
        }
        if (overview.report) {
          console.log("[DatabaseTabs] Restored report from DB");
          setReportText(overview.report);
        }
      })
      .catch((err) => console.warn("[DatabaseTabs] Could not load overview:", err));
  }, []);

  const handleSendQuestion = (question: string) => {
    console.log("[DatabaseTabs] Sending question to chat:", question);
    window.dispatchEvent(new CustomEvent("db-send-question", { detail: question }));
  };

  // ---- Generate Summary ----
  const handleGenerateSummary = async () => {
    console.log("[DatabaseTabs] Generating DB summary...");
    setIsGeneratingSummary(true);
    setSummaryText("");
    try {
      const reader = await streamDbSummary();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const event = parseSSELine(line);
          if (!event) continue;
          if (event.type === "token") {
            accumulated += event.content as string;
            setSummaryText(accumulated);
          } else if (event.type === "done") {
            accumulated = (event.full_report as string) || accumulated;
            setSummaryText(accumulated);
          } else if (event.type === "error") {
            toast({ title: "Error", description: event.content as string, variant: "destructive" });
          }
        }
      }
    } catch (err) {
      console.error("[DatabaseTabs] Summary error:", err);
      toast({ title: "Error generating summary", description: String(err), variant: "destructive" });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // ---- Generate Questions ----
  const handleGenerateQuestions = async () => {
    console.log("[DatabaseTabs] Generating DB questions...");
    setIsGeneratingQuestions(true);
    setQuestions([]);
    try {
      const reader = await streamDbQuestions();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const event = parseSSELine(line);
          if (!event) continue;
          if (event.type === "token") {
            fullText += event.content as string;
          } else if (event.type === "done") {
            fullText = (event.full_report as string) || fullText;
          } else if (event.type === "error") {
            toast({ title: "Error", description: event.content as string, variant: "destructive" });
          }
        }
      }
      // Parse numbered list from fullText
      const parsed = fullText
        .split("\n")
        .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter((l) => l.length > 10);
      console.log("[DatabaseTabs] Parsed questions:", parsed);
      setQuestions(parsed.slice(0, 10));
    } catch (err) {
      console.error("[DatabaseTabs] Questions error:", err);
      toast({ title: "Error generating questions", description: String(err), variant: "destructive" });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // ---- Generate Report ----
  // ---- Generic streaming reader helper ----
  const readStream = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onToken: (t: string) => void,
    onDone: (full: string) => void,
  ) => {
    const decoder = new TextDecoder();
    let buffer = "";
    let accumulated = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const event = parseSSELine(line);
        if (!event) continue;
        if (event.type === "token") {
          accumulated += event.content as string;
          onToken(accumulated);
        } else if (event.type === "done") {
          accumulated = (event.full_report as string) || accumulated;
          onDone(accumulated);
        } else if (event.type === "error") {
          toast({ title: "Error", description: event.content as string, variant: "destructive" });
        }
      }
    }
  };

  // ---- Generate Report (persisted via /chat/db/report) ----
  const handleGenerateReport = async () => {
    console.log("[DatabaseTabs] Generating DB report (persisted)...");
    setIsGeneratingReport(true);
    setReportText("");
    try {
      const reader = await streamDbReport();
      await readStream(
        reader,
        (t) => setReportText(t),
        (full) => setReportText(full),
      );
    } catch (err) {
      console.error("[DatabaseTabs] Report generation error:", err);
      toast({ title: "Error generating report", description: String(err), variant: "destructive" });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      const blob = await downloadDbReportPdf();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `database-report-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[DatabaseTabs] Failed to download DB report PDF:", err);
      toast({ title: "Download failed", description: String(err), variant: "destructive" });
    }
  };

  // ---- Regenerate — clears persisted data for the chosen section and re-runs ----
  const handleRegenerateSummary = async () => {
    console.log("[DatabaseTabs] Regenerating summary...");
    setSummaryText("");
    setIsGeneratingSummary(true);
    try {
      const reader = await streamDbSummary();
      await readStream(reader, (t) => setSummaryText(t), (full) => setSummaryText(full));
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleRegenerateQuestions = async () => {
    console.log("[DatabaseTabs] Regenerating questions...");
    setQuestions([]);
    setIsGeneratingQuestions(true);
    try {
      const reader = await streamDbQuestions();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const event = parseSSELine(line);
          if (!event) continue;
          if (event.type === "token") fullText += event.content as string;
          else if (event.type === "done") fullText = (event.full_report as string) || fullText;
        }
      }
      const parsed = fullText
        .split("\n")
        .map((l) => l.replace(/^\d+[\.\)]\s*/, "").trim())
        .filter((l) => l.length > 10);
      setQuestions(parsed.slice(0, 10));
    } catch (err) {
      toast({ title: "Error", description: String(err), variant: "destructive" });
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  // Same structure as DataTabs.tsx
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="h-full flex flex-col overflow-hidden">
      {/* Tab bar — white background, blue-accented tabs */}
      <div className="px-4 py-3 bg-background border-b flex items-center justify-between flex-shrink-0">
        <TabsList className="flex-1 bg-primary/10 border border-primary/20 rounded-lg h-9">
          {(["overview", "graphs", "report"] as const).map((tab) => (
            <TabsTrigger
              key={tab}
              value={tab}
              className="flex-1 capitalize text-primary/60 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:font-semibold data-[state=active]:shadow-sm rounded-md transition-all"
            >
              {tab}
            </TabsTrigger>
          ))}
        </TabsList>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleFullscreen}
          className="ml-2 h-8 w-8 flex-shrink-0"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="p-4 h-full flex flex-col">

          {/* -------- Overview -------- */}
          <TabsContent value="overview" className="mt-0 flex-1 min-h-0 data-[state=inactive]:hidden">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 h-full min-h-0">

              {/* Data Summary card */}
              <Card className="flex flex-col min-h-0 overflow-hidden">
                <CardHeader className="px-4 pt-4 pb-2 flex-shrink-0">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <span>Data Summary</span>
                    <div className="flex gap-1.5">
                      {summaryText && !isGeneratingSummary && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleRegenerateSummary}
                          className="gap-1.5 text-xs text-muted-foreground"
                          title="Regenerate summary"
                        >
                          <Loader2 className="h-3 w-3" />
                          Regenerate
                        </Button>
                      )}
                      {!summaryText && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleGenerateSummary}
                          disabled={isGeneratingSummary}
                          className="gap-2"
                        >
                          {isGeneratingSummary
                            ? <><Loader2 className="h-3 w-3 animate-spin" />Generating...</>
                            : <><Sparkles className="h-3 w-3" />Generate Summary</>
                          }
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 flex-1 overflow-hidden">
                  {summaryText ? (
                    <ScrollArea className="h-full border rounded-lg p-4 bg-muted/30">
                      <MarkdownMessage content={summaryText} className="text-xs sm:text-sm" />
                      {isGeneratingSummary && (
                        <span className="inline-block w-0.5 h-3.5 bg-primary animate-pulse ml-0.5 align-middle" />
                      )}
                    </ScrollArea>
                  ) : (
                    <div className="h-full border rounded-lg flex items-center justify-center text-center text-sm text-muted-foreground bg-muted/30">
                      <p>
                        {isGeneratingSummary
                          ? "Connecting to database and generating summary…"
                          : 'No summary generated yet. Click "Generate Summary" to create a data summary.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Suggested Questions card */}
              <Card className="flex flex-col min-h-0 overflow-hidden">
                <CardHeader className="px-4 pt-4 pb-2 flex-shrink-0">
                  <CardTitle className="flex items-center justify-between text-base sm:text-lg">
                    <span>Suggested Questions</span>
                    <div className="flex gap-1.5">
                      {questions.length > 0 && !isGeneratingQuestions && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleRegenerateQuestions}
                          className="gap-1.5 text-xs text-muted-foreground"
                          title="Regenerate questions"
                        >
                          <Loader2 className="h-3 w-3" />
                          Regenerate
                        </Button>
                      )}
                      {questions.length === 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleGenerateQuestions}
                          disabled={isGeneratingQuestions}
                          className="gap-2"
                        >
                          {isGeneratingQuestions
                            ? <><Loader2 className="h-3 w-3 animate-spin" />Generating...</>
                            : <><Sparkles className="h-3 w-3" />Generate Questions</>
                          }
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0 flex-1 overflow-hidden">
                  {questions.length > 0 ? (
                    <ScrollArea className="h-full border rounded-lg p-3 bg-muted/30">
                      <div className="space-y-2">
                        {questions.map((question, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-2 p-2 sm:p-3 bg-background border rounded-lg hover:bg-muted/50 transition-colors group"
                          >
                            <span className="text-xs sm:text-sm flex-1 text-foreground">{question}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="flex-shrink-0 h-7 w-7 sm:h-8 sm:w-8 opacity-70 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleSendQuestion(question)}
                            >
                              <Send className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="h-full border rounded-lg flex items-center justify-center text-center text-sm text-muted-foreground bg-muted/30">
                      <p>
                        {isGeneratingQuestions
                          ? "Analysing database to generate questions…"
                          : 'No questions generated yet. Click "Generate Questions" to create suggested questions.'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* -------- Graphs -------- */}
          <TabsContent value="graphs" className="mt-0 flex-1 min-h-0 data-[state=inactive]:hidden">
            <Card className="h-full flex flex-col min-h-0">
              <CardHeader className="flex-shrink-0">
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Visualizations
                </CardTitle>
                <CardDescription>
                  {graphInstances.length > 0
                    ? "Select a chart below to view or edit"
                    : 'Ask a question that returns tabular data, then click "Convert to Graph"'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden flex gap-2 min-h-0 p-4">
                {graphInstances.length > 0 ? (
                  <>
                    <div className="flex-shrink-0 w-40 border-r pr-2 overflow-y-auto space-y-1">
                      {graphInstances.map((inst) => (
                        <div
                          key={inst.id}
                          className={`flex items-center gap-1 rounded-lg border p-2 text-xs cursor-pointer transition-colors ${
                            selectedGraphId === inst.id ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                          }`}
                          onClick={() => onSelectGraph(inst.id)}
                        >
                          <BarChart3 className="h-3.5 w-3.5 flex-shrink-0" />
                          <span className="truncate flex-1 min-w-0">
                            {inst.sourceLabel || `Chart ${inst.id.slice(-6)}`}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0"
                            onClick={(e) => { e.stopPropagation(); onRemoveGraph(inst.id); }}
                            title="Remove"
                          >
                            <Trash2 className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0 overflow-hidden">
                      {selectedGraphId && (() => {
                        const inst = graphInstances.find((g) => g.id === selectedGraphId);
                        if (!inst) return null;
                        return (
                          <ScrollArea className="h-full">
                            <GraphPreview
                              key={inst.id}
                              tableData={inst.tableData}
                              tableColumns={inst.tableColumns}
                              sourceQuestion={inst.sourceLabel}
                              sourcePrompt={inst.sourcePrompt || ""}
                              sourceResponse={inst.sourceResponse || inst.sourceLabel || ""}
                              initialGraphType={inst.graphType}
                              initialXKey={inst.xKey}
                              initialYKey={inst.yKey}
                            />
                          </ScrollArea>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <div className="h-full border rounded-lg bg-muted flex items-center justify-center flex-1">
                    <div className="text-center">
                      <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">No visualizations yet</p>
                      <p className="text-sm text-muted-foreground">Ask questions to generate charts</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* -------- Report -------- */}
          <TabsContent value="report" className="mt-0 flex-1 min-h-0 data-[state=inactive]:hidden">
            <Card className="h-full flex flex-col min-h-0">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 flex-shrink-0">
                <div className="space-y-1.5">
                  <CardTitle className="text-xl sm:text-2xl">Analysis Report</CardTitle>
                  <CardDescription className="text-xs sm:text-sm">
                    AI-generated insights about your database
                  </CardDescription>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {!reportText && (
                    <Button
                      onClick={handleGenerateReport}
                      variant="outline"
                      className="gap-2"
                      disabled={isGeneratingReport}
                    >
                      {isGeneratingReport
                        ? <><Loader2 className="h-4 w-4 animate-spin" />Generating...</>
                        : <><Sparkles className="h-4 w-4" />Generate Report</>
                      }
                    </Button>
                  )}
                  {reportText && !isGeneratingReport && (
                    <Button
                      onClick={handleGenerateReport}
                      variant="ghost"
                      size="sm"
                      className="gap-2 text-muted-foreground"
                    >
                      <Loader2 className="h-3.5 w-3.5" />
                      Regenerate
                    </Button>
                  )}
                  {reportText && (
                    <Button onClick={handleDownloadReport} variant="outline" className="gap-2">
                      <Download className="h-4 w-4" />
                      Download Report
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-4 sm:p-6 pt-0">
                {reportText ? (
                  <ScrollArea className="h-full border rounded-lg p-6 bg-muted/30">
                    <MarkdownMessage content={reportText} />
                    {isGeneratingReport && (
                      <span className="inline-block w-0.5 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
                    )}
                  </ScrollArea>
                ) : (
                  <div className="h-full border rounded-lg flex items-center justify-center bg-muted/30">
                    <div className="text-center space-y-4">
                      <Sparkles className="h-12 w-12 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-muted-foreground font-medium">No report generated yet</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Click "Generate Report" to create an analysis report
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

        </div>
      </div>
    </Tabs>
  );
}

// ---------------------------------------------------------------------------
// Main page — exact same container / resizing logic as Dashboard.tsx
// ---------------------------------------------------------------------------
export default function ChatWithDatabase() {
  const [leftWidth, setLeftWidth] = useState(45);
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [tabsFullscreen, setTabsFullscreen] = useState(false);
  const [graphInstances, setGraphInstances] = useState<GraphInstance[]>([]);
  const [selectedGraphId, setSelectedGraphId] = useState<string | null>(null);
  const [convertDialogOpen, setConvertDialogOpen] = useState(false);
  const [convertDialogMessage, setConvertDialogMessage] = useState<Message | null>(null);
  const [convertDialogPrompt, setConvertDialogPrompt] = useState<string>("");
  const [activeRightTab, setActiveRightTab] = useState("overview");
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const graphsInitialLoadDoneRef = useRef(false);

  // Load persisted graphs from DB on mount
  useEffect(() => {
    let cancelled = false;
    getDbGraphs()
      .then((graphs) => {
        if (cancelled) return;
        const valid = Array.isArray(graphs) ? graphs : [];
        const instances: GraphInstance[] = valid
          .filter((g) => g && g.id && Array.isArray(g.table_data) && Array.isArray(g.table_columns))
          .map((g) => ({
            id: g.id,
            tableData: g.table_data as Record<string, string>[],
            tableColumns: g.table_columns,
            graphType: g.graph_type as GraphType,
            xKey: g.xKey || "",
            yKey: g.yKey || "",
            sourceLabel: g.source_label,
          }));
        setGraphInstances(instances);
        if (instances.length > 0) setSelectedGraphId(instances[0].id);
        graphsInitialLoadDoneRef.current = true;
      })
      .catch((err) => {
        console.warn("[ChatWithDatabase] Failed to load graphs from DB:", err);
        graphsInitialLoadDoneRef.current = true;
      });
    return () => { cancelled = true; };
  }, []);

  // Persist graphs to DB whenever graphInstances changes (after initial load)
  useEffect(() => {
    if (!graphsInitialLoadDoneRef.current) return;
    const payload = graphInstances.map((g) => ({
      id: g.id,
      table_data: g.tableData,
      table_columns: g.tableColumns,
      graph_type: g.graphType,
      xKey: g.xKey,
      yKey: g.yKey,
      source_label: g.sourceLabel ?? null,
    }));
    saveDbGraphs(payload).catch((err) => console.warn("[ChatWithDatabase] Failed to save graphs:", err));
  }, [graphInstances]);

  const handleConvertDialogConfirm = (config: { tableIndex: number; graphType: GraphType; xKey: string; yKey: string }) => {
    const msg = convertDialogMessage;
    if (!msg) return;
    const tables = msg.tables && msg.tables.length > 0 ? msg.tables : null;
    const { tableData, tableColumns } = tables
      ? { tableData: tables[config.tableIndex].data, tableColumns: tables[config.tableIndex].columns }
      : { tableData: msg.table_data || [], tableColumns: msg.table_columns || [] };
    const id = `graph-${Date.now()}`;
    const fullResponse = msg.content || "";
    const sourceLabel = fullResponse.slice(0, 40).trim() || "Chart";
    setGraphInstances((prev) => [
      ...prev,
      {
        id,
        tableData,
        tableColumns,
        graphType: config.graphType,
        xKey: config.xKey,
        yKey: config.yKey,
        sourceLabel,
        sourcePrompt: convertDialogPrompt,
        sourceResponse: fullResponse,
      },
    ]);
    setSelectedGraphId(id);
    setConvertDialogOpen(false);
    setConvertDialogMessage(null);
    setActiveRightTab("graphs");
  };

const handleSaveToDashboard = async (msg: Message, name: string, tableIndexOrAll: number | "all" | undefined, sourcePrompt: string) => {
    const tables = msg.tables && msg.tables.length > 0 ? msg.tables : null;
  const fullResponse = msg.content || "";
  const sourceQuestion = fullResponse; // keep snippet & full identical for now
    if (tables && tableIndexOrAll === "all") {
      for (let i = 0; i < tables.length; i++) {
        await saveDashboardTable({
          name: `${name} — Table ${i + 1}`,
          table_data: tables[i].data,
          table_columns: tables[i].columns,
          source_question: sourceQuestion,
        source_prompt: sourcePrompt,
        source_response: fullResponse,
        });
      }
      return;
    }
    const idx = typeof tableIndexOrAll === "number" ? tableIndexOrAll : 0;
    const tableToSave = tables ? tables[idx] : null;
    await saveDashboardTable({
      name,
      table_data: tableToSave ? tableToSave.data : (msg.table_data || []),
      table_columns: tableToSave ? tableToSave.columns : (msg.table_columns || []),
      source_question: sourceQuestion,
    source_prompt: sourcePrompt,
    source_response: fullResponse,
    });
  };

  const handleMouseDown = () => {
    if (chatFullscreen || tabsFullscreen) return;
    isDragging.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const newLeft = ((e.clientX - rect.left) / rect.width) * 100;
    if (newLeft > 25 && newLeft < 75) setLeftWidth(newLeft);
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const toggleChatFullscreen = () => {
    setChatFullscreen(f => !f);
    if (tabsFullscreen) setTabsFullscreen(false);
  };

  const toggleTabsFullscreen = () => {
    setTabsFullscreen(f => !f);
    if (chatFullscreen) setChatFullscreen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div ref={containerRef} className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left — chat */}
        {!tabsFullscreen && (
          <div
            style={chatFullscreen ? { width: "100%" } : { width: `${leftWidth}%` }}
            className="h-full min-w-0 overflow-hidden transition-all duration-300 hidden lg:flex flex-col"
          >
            <ChatPanel
              isFullscreen={chatFullscreen}
              onToggleFullscreen={toggleChatFullscreen}
              onOpenConvertDialog={(msg, sourcePrompt) => {
                setConvertDialogMessage(msg);
                setConvertDialogPrompt(sourcePrompt);
                setConvertDialogOpen(true);
              }}
              onSaveToDashboard={handleSaveToDashboard}
              onSwitchToGraphTab={() => setActiveRightTab("graphs")}
            />
          </div>
        )}

        {/* Draggable divider */}
        {!chatFullscreen && !tabsFullscreen && (
          <div
            className="hidden lg:block w-1 bg-border hover:bg-primary cursor-col-resize transition-colors flex-shrink-0"
            onMouseDown={handleMouseDown}
          />
        )}

        {/* Right — data tabs */}
        {!chatFullscreen && (
          <div
            style={tabsFullscreen ? { width: "100%" } : { width: `${100 - leftWidth}%` }}
            className="h-full bg-background transition-all duration-300 flex-1 min-w-0"
          >
            <DatabaseTabs
              activeTab={activeRightTab}
              onTabChange={setActiveRightTab}
              graphInstances={graphInstances}
              selectedGraphId={selectedGraphId}
              onSelectGraph={setSelectedGraphId}
              onRemoveGraph={(id) => {
                const next = graphInstances.filter((g) => g.id !== id);
                setGraphInstances(next);
                if (selectedGraphId === id) setSelectedGraphId(next[0]?.id ?? null);
              }}
              isFullscreen={tabsFullscreen}
              onToggleFullscreen={toggleTabsFullscreen}
            />
          </div>
        )}
      </div>
      <ConvertToGraphDialog
        open={convertDialogOpen}
        onClose={() => { setConvertDialogOpen(false); setConvertDialogMessage(null); }}
        message={convertDialogMessage}
        onConfirm={handleConvertDialogConfirm}
      />
    </div>
  );
}
