"use client";

import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import {
  Bot,
  Send,
  Sparkles,
  BookOpen,
  FileText,
  Calculator,
  Calendar,
  HelpCircle,
  ChevronRight,
  Copy,
  Check,
  Loader2,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: { title: string; type: string }[];
}

const suggestedQuestions = [
  {
    icon: Calculator,
    question: "Care sunt cotele de TVA în România?",
    category: "TVA",
  },
  {
    icon: FileText,
    question: "Cum funcționează e-Factura?",
    category: "e-Factura",
  },
  {
    icon: BookOpen,
    question: "Ce este SAF-T și când trebuie depus?",
    category: "SAF-T",
  },
  {
    icon: Calendar,
    question: "Care este termenul pentru decontul de TVA?",
    category: "Termene",
  },
];

const quickActions = [
  { label: "Cotele TVA 2024", query: "Care sunt cotele de TVA în 2024?" },
  { label: "Termen D300", query: "Până când se depune D300?" },
  { label: "e-Factura obligatorie", query: "Cine trebuie să folosească e-Factura?" },
  { label: "Calcul TVA", query: "Cum calculez TVA pentru o factură?" },
];

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Bună! Sunt asistentul AI DocumentIulia, specializat în legislația fiscală din România.

Pot să te ajut cu:
- **TVA și cotele aplicabile** (19%, 9%, 5%)
- **e-Factura** - transmitere către ANAF
- **SAF-T D406** - raportare fiscală
- **Termene fiscale** și calendar obligații
- **Microîntreprinderi** - regim fiscal

Întreabă-mă orice despre contabilitate și fiscalitate!`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response (in production, call ML service)
    setTimeout(() => {
      let response = "";
      let sources: { title: string; type: string }[] = [];

      const query = messageText.toLowerCase();

      if (query.includes("tva") && (query.includes("cot") || query.includes("procent"))) {
        response = `**Cotele de TVA în România (2024)**

**19% - Cota standard**
Se aplică majorității bunurilor și serviciilor.

**9% - Cota redusă**
- Alimente și băuturi nealcoolice
- Medicamente și dispozitive medicale
- Servicii hoteliere
- Restaurante (consum pe loc)
- Apă potabilă

**5% - Cota super-redusă**
- Cărți, ziare, reviste
- Prima locuință (max 120mp util)
- Evenimente culturale și sportive

**0% - Scutit cu drept de deducere**
- Exporturi
- Livrări intracomunitare de bunuri`;
        sources = [{ title: "Codul Fiscal - Art. 291", type: "legislation" }];
      } else if (query.includes("efactura") || query.includes("e-factura")) {
        response = `**e-Factura în România (2024)**

📋 **Obligativitate:**
Din **1 ianuarie 2024** - obligatorie pentru relații B2B și B2G

⏰ **Termene:**
- Transmitere: Maximum **5 zile calendaristice** de la emitere
- Validare ANAF: 1-3 zile lucrătoare

📝 **Format:** XML conform UBL 2.1 (CIUS-RO)

🔧 **Pași:**
1. Generați factura în format XML
2. Semnați electronic
3. Transmiteți prin API ANAF sau SPV
4. Primiți confirmarea cu index

**DocumentIulia generează automat XML-ul e-Factura!**`;
        sources = [{ title: "OUG 120/2021", type: "legislation" }];
      } else if (query.includes("saft") || query.includes("saf-t") || query.includes("d406")) {
        response = `**SAF-T (D406) în România**

📋 **Ce este?**
Standard Audit File for Tax - fișier XML pentru schimb date fiscale

📅 **Obligativitate:**
- **2022**: Mari contribuabili
- **2025**: Toți contribuabilii

📝 **Conținut:**
- Registre contabile
- Facturi emise/primite
- Plăți și încasări
- Stocuri și mișcări bunuri

⏰ **Termene:**
- Lunar (marii contribuabili)
- Trimestrial (ceilalți)
- Ultima zi a lunii următoare`;
        sources = [{ title: "OPANAF 1783/2021", type: "legislation" }];
      } else if (query.includes("termen") || query.includes("d300") || query.includes("decont")) {
        response = `**Decontul de TVA (D300)**

📅 **Termen:** Până pe **25** a lunii următoare perioadei de raportare

**Periodicitate:**
- **Lunar** - cifră de afaceri > 100.000 EUR
- **Trimestrial** - ceilalți plătitori

**Depunere:** Online prin SPV ANAF (semnătură electronică obligatorie)

⚠️ **Atenție:** Nedepunerea atrage amenzi 1.000 - 5.000 RON`;
        sources = [{ title: "Codul Fiscal - Art. 323", type: "legislation" }];
      } else if (query.includes("micro") || query.includes("microîntreprindere")) {
        response = `**Impozitul Microîntreprinderilor (2024)**

📊 **Cote:**
- **1%** din venituri - cel puțin 1 angajat
- **3%** din venituri - fără angajați

📋 **Condiții:**
- Venituri < 500.000 EUR/an
- Capital social ≥ 45.000 RON
- Fără activități consultanță/management

⏰ **Declarație D100:** Trimestrial, până pe 25 a lunii următoare

💡 **Sfat:** Angajarea reduce impozitul la 1%!`;
        sources = [{ title: "Codul Fiscal - Titlul III", type: "legislation" }];
      } else {
        response = `Înțeleg că întrebi despre: **${messageText}**

Pot să te ajut cu:
- TVA și cotele aplicabile
- e-Factura și transmitere ANAF
- SAF-T D406
- Termene fiscale
- Microîntreprinderi

Te rog să reformulezi întrebarea sau alege una din temele de mai sus.`;
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: response,
        timestamp: new Date(),
        sources,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AppLayout>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">Asistent AI Fiscal</h1>
              <p className="text-sm text-slate-500">Întrebări despre contabilitate și fiscalitate</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Online
            </span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] ${
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-2xl rounded-br-md px-4 py-3"
                    : "bg-white border border-slate-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-100">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                    <span className="text-sm font-medium text-slate-700">DocumentIulia AI</span>
                  </div>
                )}
                <div
                  className={`prose prose-sm max-w-none ${
                    message.role === "user" ? "prose-invert" : ""
                  }`}
                  dangerouslySetInnerHTML={{
                    __html: message.content
                      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                      .replace(/\n/g, "<br />"),
                  }}
                />
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-100">
                    <p className="text-xs text-slate-500 mb-1">Surse:</p>
                    {message.sources.map((source, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded mr-2"
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

        {/* Suggestions */}
        {messages.length === 1 && (
          <div className="pb-4">
            <p className="text-sm text-slate-500 mb-3">Întrebări sugerate:</p>
            <div className="grid grid-cols-2 gap-2">
              {suggestedQuestions.map((item, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(item.question)}
                  className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition text-left group"
                >
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition">
                    <item.icon className="w-4 h-4 text-slate-600 group-hover:text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.question}</p>
                    <p className="text-xs text-slate-500">{item.category}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pb-2">
          <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => handleSend(action.query)}
                className="flex-shrink-0 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm rounded-full transition"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="flex gap-2 pt-2 border-t border-slate-200">
          <div className="flex-1 relative">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Scrie o întrebare despre contabilitate sau fiscalitate..."
              className="w-full px-4 py-3 pr-12 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
