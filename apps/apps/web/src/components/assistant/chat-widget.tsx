"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  X,
  MessageCircle,
  Sparkles,
  BookOpen,
  Loader2,
  Copy,
  Check,
  Minimize2,
  Maximize2,
  ChevronDown,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: { title: string; type: string }[];
}

interface ChatWidgetProps {
  initialMessage?: string;
  position?: "bottom-right" | "bottom-left";
  primaryColor?: string;
  apiEndpoint?: string;
}

export function ChatWidget({
  initialMessage = "Bună! Sunt asistentul AI DocumentIulia. Cu ce te pot ajuta?",
  position = "bottom-right",
  primaryColor = "blue",
  apiEndpoint = "/api/assistant/chat",
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: initialMessage,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const positionClasses = {
    "bottom-right": "bottom-4 right-4",
    "bottom-left": "bottom-4 left-4",
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // In production, replace with actual API call
      // const response = await fetch(apiEndpoint, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ message: input }),
      // });
      // const data = await response.json();

      // Simulated response for demo
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const responseContent = getSimulatedResponse(input);

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: responseContent.content,
        timestamp: new Date(),
        sources: responseContent.sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      if (!isOpen) {
        setUnreadCount((prev) => prev + 1);
      }
    } catch {
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "Ne pare rău, a apărut o eroare. Te rog încearcă din nou.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSimulatedResponse = (
    query: string
  ): { content: string; sources?: { title: string; type: string }[] } => {
    const q = query.toLowerCase();

    if (q.includes("tva") || q.includes("cot")) {
      return {
        content: `**Cotele de TVA în România:**

• **19%** - Cota standard (majoritatea bunurilor și serviciilor)
• **9%** - Cota redusă (alimente, medicamente, servicii hoteliere)
• **5%** - Cota super-redusă (cărți, prima locuință)
• **0%** - Exporturi și livrări intracomunitare`,
        sources: [{ title: "Codul Fiscal - Art. 291", type: "legislation" }],
      };
    }

    if (q.includes("efactura") || q.includes("e-factura")) {
      return {
        content: `**e-Factura în România:**

Din **1 ianuarie 2024**, e-Factura este obligatorie pentru relații B2B și B2G.

**Termen transmitere:** Maximum 5 zile calendaristice de la emitere.

DocumentIulia generează automat XML-ul e-Factura și îl transmite la ANAF!`,
        sources: [{ title: "OUG 120/2021", type: "legislation" }],
      };
    }

    if (q.includes("saft") || q.includes("saf-t") || q.includes("d406")) {
      return {
        content: `**SAF-T (D406) în România:**

SAF-T = Standard Audit File for Tax

**Obligativitate:**
• 2022: Mari contribuabili
• 2025: Toți contribuabilii

**Conținut:** Registre contabile, facturi, plăți, stocuri.`,
        sources: [{ title: "OPANAF 1783/2021", type: "legislation" }],
      };
    }

    return {
      content: `Am înțeles întrebarea ta despre: **${query}**

Te pot ajuta cu:
• TVA și cotele aplicabile
• e-Factura și transmitere ANAF
• SAF-T D406
• Termene fiscale

Reformulează sau alege o temă de mai sus.`,
    };
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatContent = (content: string) => {
    return content.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br />");
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed ${positionClasses[position]} z-50 w-14 h-14 bg-gradient-to-br from-${primaryColor}-500 to-${primaryColor}-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center group`}
      >
        <MessageCircle className="w-6 h-6 group-hover:hidden" />
        <Bot className="w-6 h-6 hidden group-hover:block" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div
      className={`fixed ${positionClasses[position]} z-50 ${
        isMinimized ? "w-72" : "w-96"
      } bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transition-all`}
    >
      {/* Header */}
      <div className={`bg-gradient-to-r from-${primaryColor}-500 to-${primaryColor}-700 text-white p-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Asistent AI</h3>
              <p className="text-sm text-white/80">DocumentIulia</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              {isMinimized ? (
                <Maximize2 className="w-4 h-4" />
              ) : (
                <Minimize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div className="h-80 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] ${
                    message.role === "user"
                      ? `bg-${primaryColor}-600 text-white rounded-2xl rounded-br-md px-4 py-3`
                      : "bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm"
                  }`}
                >
                  {message.role === "assistant" && (
                    <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-slate-100">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                      <span className="text-xs font-medium text-slate-600">AI</span>
                    </div>
                  )}
                  <div
                    className={`text-sm ${message.role === "user" ? "" : "text-slate-700"}`}
                    dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
                  />
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-slate-100">
                      {message.sources.map((source, i) => (
                        <span
                          key={i}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded mr-1"
                        >
                          <BookOpen className="w-3 h-3" />
                          {source.title}
                        </span>
                      ))}
                    </div>
                  )}
                  {message.role === "assistant" && (
                    <button
                      onClick={() => copyToClipboard(message.content, message.id)}
                      className="mt-2 text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                    >
                      {copiedId === message.id ? (
                        <>
                          <Check className="w-3 h-3" /> Copiat
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copiază
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />
                    <span className="text-sm text-slate-500">Se procesează...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="px-4 py-2 border-t border-slate-100 bg-white">
            <div className="flex gap-2 overflow-x-auto hide-scrollbar">
              {["Cotele TVA", "e-Factura", "SAF-T D406"].map((action) => (
                <button
                  key={action}
                  onClick={() => {
                    setInput(action);
                    handleSend();
                  }}
                  className="flex-shrink-0 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs rounded-full transition"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-200 bg-white">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Scrie o întrebare..."
                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`w-10 h-10 bg-${primaryColor}-600 text-white rounded-xl flex items-center justify-center hover:bg-${primaryColor}-700 transition disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      {isMinimized && (
        <button
          onClick={() => setIsMinimized(false)}
          className="w-full p-3 flex items-center justify-center gap-2 text-slate-600 hover:bg-slate-50 transition"
        >
          <ChevronDown className="w-4 h-4" />
          <span className="text-sm">Deschide chat</span>
        </button>
      )}
    </div>
  );
}

export default ChatWidget;
