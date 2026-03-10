import { useState, useEffect, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ZoomIn, ZoomOut, Download, Search, ChevronLeft, ChevronRight, FileText, Loader2, AlertCircle, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import { copyToClipboard } from "@/lib/clipboard";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFViewerProps {
  pdfId: string | number;
}

export default function PDFViewer({ pdfId }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [searchText, setSearchText] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractedText, setExtractedText] = useState<string>("");
  const [showExtractDialog, setShowExtractDialog] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchMatches, setSearchMatches] = useState<{page: number, count: number}[]>([]);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [currentMatchIndex, setCurrentMatchIndex] = useState<number>(-1);
  const [highlightText, setHighlightText] = useState<string>("");
  const { toast } = useToast();

  // Fetch PDF URL from backend
  useEffect(() => {
    const fetchPdfUrl = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const token = localStorage.getItem("auth_token");
        const API_BASE_URL = import.meta.env.VITE_API_URL || "http://122.129.80.228:8005/api";
        
        // Create a blob URL from the PDF download
        const response = await fetch(`${API_BASE_URL}/datasets/${pdfId}/download`, {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to load PDF: ${response.statusText}`);
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
      } catch (err: any) {
        console.error("Error loading PDF:", err);
        setError(err?.message || "Failed to load PDF file.");
        toast({
          title: "Error loading PDF",
          description: err?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (pdfId) {
      fetchPdfUrl();
    }

    // Cleanup blob URL on unmount
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfId, toast]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error("PDF load error:", error);
    setError("Failed to load PDF file.");
    toast({
      title: "PDF Load Error",
      description: error.message || "Please check if the file is a valid PDF.",
      variant: "destructive",
    });
  };

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const handleZoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  const handleExtractText = async () => {
    try {
      setIsExtracting(true);
      const response = await apiRequest<{
        text: string;
        total_pages: number;
        dataset_id: string;
      }>(`/datasets/${pdfId}/extract-text`);

      if (response && response.text) {
        setExtractedText(response.text);
        setShowExtractDialog(true);
        toast({
          title: "Text extracted successfully",
          description: `Extracted text from ${response.total_pages} pages`,
        });
      }
    } catch (err: any) {
      console.error("Error extracting text:", err);
      toast({
        title: "Failed to extract text",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) {
      clearSearch();
      return;
    }

    try {
      setIsSearching(true);
      
      // Use cached extracted text if available, otherwise fetch it
      let textToSearch = extractedText;
      if (!textToSearch) {
        const response = await apiRequest<{
          text: string;
          total_pages: number;
          dataset_id: string;
        }>(`/datasets/${pdfId}/extract-text`);
        
        if (response && response.text) {
          textToSearch = response.text;
          setExtractedText(response.text);
        }
      }
      
      if (!textToSearch) {
        toast({
          title: "Search failed",
          description: "Could not extract text from PDF",
          variant: "destructive",
        });
        return;
      }
      
      // Parse text by pages (format: "--- Page X ---")
      const pageRegex = /--- Page (\d+) ---/g;
      const pages: {pageNum: number, text: string}[] = [];
      let lastIndex = 0;
      let match;
      
      while ((match = pageRegex.exec(textToSearch)) !== null) {
        if (pages.length > 0) {
          pages[pages.length - 1].text = textToSearch.substring(lastIndex, match.index);
        }
        pages.push({ pageNum: parseInt(match[1]), text: "" });
        lastIndex = match.index + match[0].length;
      }
      if (pages.length > 0) {
        pages[pages.length - 1].text = textToSearch.substring(lastIndex);
      }
      
      // Search for matches in each page
      const searchLower = searchText.toLowerCase();
      const matches: {page: number, count: number}[] = [];
      let total = 0;
      
      pages.forEach(({ pageNum, text }) => {
        const textLower = text.toLowerCase();
        let count = 0;
        let pos = 0;
        while ((pos = textLower.indexOf(searchLower, pos)) !== -1) {
          count++;
          pos += searchLower.length;
        }
        if (count > 0) {
          matches.push({ page: pageNum, count });
          total += count;
        }
      });
      
      setSearchMatches(matches);
      setTotalMatches(total);
      
      if (matches.length > 0) {
        setCurrentMatchIndex(0);
        setPageNumber(matches[0].page);
        setHighlightText(searchText); // Enable highlighting
        toast({
          title: "Search complete",
          description: `Found ${total} match${total !== 1 ? 'es' : ''} in ${matches.length} page${matches.length !== 1 ? 's' : ''}`,
        });
      } else {
        setCurrentMatchIndex(-1);
        setHighlightText(""); // Clear highlighting
        toast({
          title: "No matches found",
          description: `"${searchText}" was not found in this document`,
        });
      }
    } catch (err: any) {
      console.error("Search error:", err);
      toast({
        title: "Search failed",
        description: err?.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchText, extractedText, pdfId, toast]);

  const clearSearch = useCallback(() => {
    setSearchText("");
    setSearchMatches([]);
    setTotalMatches(0);
    setCurrentMatchIndex(-1);
    setHighlightText(""); // Clear highlighting
  }, []);

  const goToPrevMatch = useCallback(() => {
    if (searchMatches.length === 0 || currentMatchIndex <= 0) return;
    const newIndex = currentMatchIndex - 1;
    setCurrentMatchIndex(newIndex);
    setPageNumber(searchMatches[newIndex].page);
  }, [searchMatches, currentMatchIndex]);

  const goToNextMatch = useCallback(() => {
    if (searchMatches.length === 0 || currentMatchIndex >= searchMatches.length - 1) return;
    const newIndex = currentMatchIndex + 1;
    setCurrentMatchIndex(newIndex);
    setPageNumber(searchMatches[newIndex].page);
  }, [searchMatches, currentMatchIndex]);

  // Highlight text in PDF using DOM manipulation
  useEffect(() => {
    if (!highlightText || !pdfUrl) return;

    const highlightTextInPDF = () => {
      // Find text layer for current page
      const textLayer = document.querySelector('.react-pdf__Page__textContent');
      if (!textLayer) {
        // Retry if text layer not ready yet
        setTimeout(highlightTextInPDF, 200);
        return;
      }

      // Remove previous highlights
      const existingHighlights = textLayer.querySelectorAll('.pdf-highlight');
      existingHighlights.forEach((el) => {
        const parent = el.parentNode;
        if (parent && el.textContent) {
          const textNode = document.createTextNode(el.textContent);
          parent.replaceChild(textNode, el);
          parent.normalize();
        }
      });

      // Get all text nodes in the text layer
      const walker = document.createTreeWalker(
        textLayer,
        NodeFilter.SHOW_TEXT,
        null
      );

      const textNodes: Text[] = [];
      let node;
      while ((node = walker.nextNode())) {
        if (node.nodeType === Node.TEXT_NODE && node.textContent) {
          textNodes.push(node as Text);
        }
      }

      textNodes.forEach((textNode) => {
        const text = textNode.textContent || '';
        const searchLower = highlightText.toLowerCase();
        const textLower = text.toLowerCase();

        if (textLower.includes(searchLower)) {
          const parent = textNode.parentNode;
          if (!parent) return;

          // Create document fragment with highlighted parts
          const fragment = document.createDocumentFragment();
          let lastIndex = 0;
          let index = textLower.indexOf(searchLower);

          while (index !== -1) {
            // Add text before match
            if (index > lastIndex) {
              fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
            }

            // Add highlighted match - use span instead of mark for better compatibility
            const highlightSpan = document.createElement('span');
            highlightSpan.className = 'pdf-highlight';
            highlightSpan.textContent = text.substring(index, index + highlightText.length);
            highlightSpan.style.display = 'inline';
            highlightSpan.style.position = 'relative';
            fragment.appendChild(highlightSpan);

            lastIndex = index + highlightText.length;
            index = textLower.indexOf(searchLower, lastIndex);
          }

          // Add remaining text
          if (lastIndex < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
          }

          // Replace the text node with the fragment
          parent.replaceChild(fragment, textNode);
        }
      });
    };

    // Wait for text layer to render, then highlight
    // Use multiple attempts to catch text layer when it's ready
    const timeoutId1 = setTimeout(() => {
      highlightTextInPDF();
    }, 300);
    
    const timeoutId2 = setTimeout(() => {
      highlightTextInPDF();
    }, 600);

    return () => {
      clearTimeout(timeoutId1);
      clearTimeout(timeoutId2);
    };
  }, [highlightText, pageNumber, pdfUrl]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
  const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));

  const handlePageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    const newPage = Math.min(Math.max(1, value), numPages);
    setPageNumber(newPage);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error || !pdfUrl) {
    return (
      <div className="flex items-center justify-center h-full bg-background">
        <div className="flex flex-col items-center gap-4 text-center p-8">
          <AlertCircle className="h-16 w-16 text-destructive" />
          <div>
            <h3 className="text-lg font-semibold mb-2">Failed to load PDF file.</h3>
            <p className="text-sm text-muted-foreground">{error || "Please try again later."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-full gap-4 bg-background">
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between gap-4 p-4 border-b border-border bg-card shadow-sm flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 border rounded-lg p-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleZoomOut} 
                  className="h-8 w-8"
                  disabled={scale <= 0.5}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Separator orientation="vertical" className="h-6" />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={handleZoomIn} 
                  className="h-8 w-8"
                  disabled={scale >= 3.0}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <span className="text-sm font-medium text-foreground px-2 py-1 bg-muted rounded">
                {Math.round(scale * 100)}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={goToPrevPage} 
                disabled={pageNumber <= 1 || numPages === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-lg">
                <Input
                  type="number"
                  min={1}
                  max={numPages}
                  value={pageNumber}
                  onChange={handlePageInputChange}
                  className="w-16 h-8 text-center"
                  disabled={numPages === 0}
                />
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  of {numPages || 0}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={goToNextPage} 
                disabled={pageNumber >= numPages || numPages === 0}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-muted/30 p-4">
            <div className="flex justify-center">
              <div className="shadow-lg rounded-lg overflow-hidden bg-white inline-flex">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={
                    <div className="flex flex-col items-center justify-center h-96 p-8">
                      <Loader2 className="h-16 w-16 text-muted-foreground mb-4 animate-spin" />
                      <p className="text-muted-foreground font-medium">Loading PDF...</p>
                    </div>
                  }
                  error={
                    <div className="flex flex-col items-center justify-center h-96 p-8">
                      <AlertCircle className="h-16 w-16 text-destructive mb-4" />
                      <p className="text-destructive font-medium">Failed to load PDF</p>
                    </div>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={false}
                    loading={
                      <div className="flex items-center justify-center h-96 w-64">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    }
                  />
                </Document>
              </div>
            </div>
          </div>
        </div>

        <div className="w-80 border-l border-border bg-background flex-shrink-0 sticky top-0 self-start h-[calc(100vh-200px)]">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    Search in PDF
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search text..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                      disabled={isSearching}
                    />
                    {searchMatches.length > 0 ? (
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={clearSearch}
                        title="Clear search"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={handleSearch}
                        disabled={!searchText.trim() || isSearching}
                      >
                        {isSearching ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Search className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  
                  {/* Search Results */}
                  {searchMatches.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-sm text-muted-foreground">
                        Found <span className="font-semibold text-foreground">{totalMatches}</span> match{totalMatches !== 1 ? 'es' : ''} in{' '}
                        <span className="font-semibold text-foreground">{searchMatches.length}</span> page{searchMatches.length !== 1 ? 's' : ''}
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToPrevMatch}
                          disabled={currentMatchIndex <= 0}
                          className="flex-1"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Prev
                        </Button>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">
                          {currentMatchIndex + 1} / {searchMatches.length}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={goToNextMatch}
                          disabled={currentMatchIndex >= searchMatches.length - 1}
                          className="flex-1"
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Page {searchMatches[currentMatchIndex]?.page}: {searchMatches[currentMatchIndex]?.count} match{searchMatches[currentMatchIndex]?.count !== 1 ? 'es' : ''}
                      </div>
                    </div>
                  )}
                  
                  {totalMatches === 0 && searchText.trim() && !isSearching && searchMatches.length === 0 && currentMatchIndex === -1 && (
                    <div className="text-sm text-muted-foreground">
                      No matches found
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleExtractText} 
                    className="w-full gap-2"
                    disabled={isExtracting || numPages === 0}
                  >
                    {isExtracting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Extracting...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        Extract Text
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Document Info
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Total Pages</span>
                      <span className="text-sm font-semibold text-foreground">{numPages || 0}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="text-sm text-muted-foreground">Current Page</span>
                      <span className="text-sm font-semibold text-foreground">{pageNumber}</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-muted-foreground">Zoom Level</span>
                      <span className="text-sm font-semibold text-foreground">{Math.round(scale * 100)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </ScrollArea>
        </div>
      </div>

      {/* Extract Text Dialog */}
      <Dialog open={showExtractDialog} onOpenChange={setShowExtractDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Extracted Text</DialogTitle>
            <DialogDescription>
              Text extracted from the PDF document
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-4 bg-muted/30 rounded-lg">
              <pre className="whitespace-pre-wrap text-sm font-mono">
                {extractedText || "No text extracted"}
              </pre>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={async () => {
                const ok = await copyToClipboard(extractedText);
                toast(
                  ok
                    ? {
                        title: "Copied to clipboard",
                        description: "Text has been copied to your clipboard",
                      }
                    : {
                        title: "Copy failed",
                        description: "Clipboard is not available in this context.",
                        variant: "destructive",
                      },
                );
              }}
            >
              Copy Text
            </Button>
            <Button onClick={() => setShowExtractDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
