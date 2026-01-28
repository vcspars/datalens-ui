import { useState, useRef, useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import Header from "@/components/Header";
import Chatbot from "@/components/Chatbot";
import DataTabs from "@/components/DataTabs";

export default function Dashboard() {
  const { type, id } = useParams();
  const [leftWidth, setLeftWidth] = useState(40);
  const [questionToSend, setQuestionToSend] = useState<string>("");
  const [chatFullscreen, setChatFullscreen] = useState(false);
  const [tabsFullscreen, setTabsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const datasetType = (type as 'pdf' | 'csv' | 'database') || 'database';
  // Keep ID as string since backend uses MongoDB ObjectId strings
  const datasetId = id || "1";

  const handleMouseDown = () => {
    if (chatFullscreen || tabsFullscreen) return;
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const newLeftWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
    if (newLeftWidth > 25 && newLeftWidth < 75) {
      setLeftWidth(newLeftWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  const handleSendQuestionFromTabs = useCallback((question: string) => {
    setQuestionToSend(question);
  }, []);

  const toggleChatFullscreen = () => {
    setChatFullscreen(!chatFullscreen);
    if (tabsFullscreen) setTabsFullscreen(false);
  };

  const toggleTabsFullscreen = () => {
    setTabsFullscreen(!tabsFullscreen);
    if (chatFullscreen) setChatFullscreen(false);
  };

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      <Header />
      <div ref={containerRef} className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {!tabsFullscreen && (
          <div 
            style={chatFullscreen ? { width: '100%' } : { width: `${leftWidth}%` }}
            className="h-full transition-all duration-300 hidden lg:flex flex-col"
          >
            <Chatbot 
              datasetId={datasetId} 
              datasetType={datasetType}
              externalQuestion={questionToSend}
              onQuestionSent={() => setQuestionToSend("")}
              isFullscreen={chatFullscreen}
              onToggleFullscreen={toggleChatFullscreen}
            />
          </div>
        )}
        {!chatFullscreen && !tabsFullscreen && (
          <div className="hidden lg:block w-1 bg-border hover:bg-primary cursor-col-resize transition-colors flex-shrink-0" onMouseDown={handleMouseDown} />
        )}
        {!chatFullscreen && (
          <div 
            style={tabsFullscreen ? { width: '100%' } : { width: `${100 - leftWidth}%` }}
            className="h-full bg-background transition-all duration-300 flex-1 min-w-0"
          >
            <DataTabs 
              datasetType={datasetType} 
              datasetId={datasetId}
              onSendQuestion={handleSendQuestionFromTabs}
              isFullscreen={tabsFullscreen}
              onToggleFullscreen={toggleTabsFullscreen}
            />
          </div>
        )}
      </div>
    </div>
  );
}
