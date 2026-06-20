"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Book, Sparkles, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTED_TERMS = [
  "SAFE Note",
  "Convertible Note",
  "Liquidation Preference",
  "Pre-Money Valuation",
  "Drag-Along Rights",
  "TAM / SAM / SOM",
  "CAC / LTV Ratio",
  "Burn Rate & Runway",
  "Cap Table",
  "Dilution",
];

export default function VocabChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hi! I am your AI Startup Vocabulary & VC Terms Advisor. I can help explain complex venture concepts, legal term sheet clauses, metrics, and capitalization concepts. \n\nClick on any of the popular terms below or type a custom question!",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  async function handleSendMessage(text: string) {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: text };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post<{ reply: string }>("/vocab/chat", {
        messages: updatedMessages,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: response.reply }]);
    } catch (err: any) {
      setError(err.message || "Failed to communicate with advisor.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Book className="h-6 w-6 text-indigo-400" />
          <h1 className="text-3xl font-black text-gradient">Startup Glossary</h1>
        </div>
        <p className="text-muted-foreground">
          Venture capital concepts, term sheets, SaaS metrics, and investment terminology explained clearly by an AI advisor.
        </p>
      </div>

      {/* Main Chat Container */}
      <div className="w-full max-w-4xl mx-auto rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md overflow-hidden flex flex-col h-[600px] shadow-lg shadow-black/10">
        
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <span className="text-[10px] text-muted-foreground mb-1 px-1 capitalize">
                {msg.role === "user" ? "Analyst" : "Glossary Advisor"}
              </span>
              <div
                className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed shadow-sm max-w-[85%] ${
                  msg.role === "user"
                    ? "bg-indigo-600/10 text-indigo-300 border border-indigo-500/20 rounded-tr-none"
                    : "bg-muted/30 text-foreground border border-border/20 rounded-tl-none"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading bubble */}
          {isLoading && (
            <div className="flex flex-col items-start">
              <span className="text-[10px] text-muted-foreground mb-1 px-1">
                Glossary Advisor
              </span>
              <div className="bg-muted/30 text-muted-foreground px-4 py-3 rounded-2xl rounded-tl-none border border-border/20 text-sm flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="h-1.5 w-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <span>Analyzing terminology...</span>
              </div>
            </div>
          )}

          {/* Error Alert */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm rounded-xl border border-red-500/20 bg-red-500/10 text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions Row */}
        <div className="px-6 py-3 border-t border-border/30 bg-muted/10">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Sparkles className="h-3 w-3 text-indigo-400" />
            <span>Popular Terms:</span>
          </div>
          <div className="flex flex-wrap gap-2 max-h-[70px] overflow-y-auto pr-2">
            {SUGGESTED_TERMS.map((term) => (
              <button
                key={term}
                disabled={isLoading}
                onClick={() => handleSendMessage(`Explain ${term}`)}
                className="text-xs bg-muted/40 hover:bg-indigo-600/15 hover:text-indigo-400 border border-border/40 hover:border-indigo-500/20 rounded-lg px-2.5 py-1.5 font-medium transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none"
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border/30 bg-card/80 flex items-end gap-3">
          <textarea
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about SAFEs, pre/post valuation, down rounds..."
            className="flex-1 bg-background/50 border border-border/40 hover:border-border/60 focus:border-indigo-500 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 text-foreground resize-none max-h-24 min-h-[44px] transition-all duration-200"
          />
          <button
            disabled={!inputValue.trim() || isLoading}
            onClick={() => handleSendMessage(inputValue)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-xl disabled:opacity-50 disabled:hover:bg-indigo-600 transition-all duration-150 flex items-center justify-center shrink-0"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>

      </div>
    </div>
  );
}
