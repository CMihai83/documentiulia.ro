'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Send,
  Bot,
  User,
  Lightbulb,
  FileText,
  Calculator,
  Calendar,
  Building2,
  Receipt,
  TrendingUp,
  AlertCircle,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Trash2,
  Clock,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface SuggestedQuestion {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  question: string;
  category: 'tva' | 'efactura' | 'deductibilitate' | 'declaratii' | 'pfa' | 'srl';
}

const suggestedQuestions: SuggestedQuestion[] = [
  {
    icon: Calculator,
    title: 'Prag TVA 2025',
    question: 'Care este pragul de înregistrare în scopuri de TVA în 2025?',
    category: 'tva',
  },
  {
    icon: FileText,
    title: 'e-Factura obligatorie',
    question: 'De când este obligatorie e-Factura pentru toate firmele?',
    category: 'efactura',
  },
  {
    icon: Receipt,
    title: 'Cheltuieli deductibile',
    question: 'Ce cheltuieli sunt deductibile fiscal pentru un SRL?',
    category: 'deductibilitate',
  },
  {
    icon: Calendar,
    title: 'Termen D300',
    question: 'Până când trebuie depusă declarația D300 pentru TVA?',
    category: 'declaratii',
  },
  {
    icon: Building2,
    title: 'PFA vs SRL',
    question: 'Care sunt diferențele fiscale între PFA și SRL?',
    category: 'pfa',
  },
  {
    icon: TrendingUp,
    title: 'Impozit micro 2025',
    question: 'Care este impozitul pe venit pentru microîntreprinderi în 2025?',
    category: 'srl',
  },
];

// Simulated AI responses for demo
const aiResponses: Record<string, string> = {
  'prag tva': `**Pragul de înregistrare în scopuri de TVA pentru 2025**

Conform legislației în vigoare, pragul de scutire pentru TVA este de **300.000 lei** (cifra de afaceri anuală).

📋 **Ce trebuie să știi:**
- Dacă depășești acest prag, ai **10 zile** pentru a te înregistra în scopuri de TVA
- Monitorizează cifra de afaceri lunar
- Poți opta pentru înregistrare voluntară și sub acest prag

⚠️ **Atenție:** Pragul se calculează pe baza cifrei de afaceri din anul calendaristic curent.

📅 **Recomandare:** Setează alerte în DocumentIulia pentru a fi notificat când te apropii de prag.`,

  'e-factura': `**e-Factura - Sistem național de facturare electronică**

📅 **Termene importante:**
- **1 ianuarie 2024**: Obligatorie pentru relațiile B2B între firme înregistrate în RO e-Factura
- **1 iulie 2024**: Obligatorie pentru TOATE tranzacțiile B2B din România

🔧 **Cum funcționează:**
1. Emiți factura în format XML structurat
2. O trimiți către sistemul ANAF SPV
3. ANAF validează și atribuie un număr de index
4. Clientul o primește în spațiul său privat virtual

✅ **DocumentIulia te ajută:**
- Generare automată XML conform standardului
- Transmitere directă către ANAF
- Monitorizare stare factură
- Notificări pentru facturi primite`,

  'cheltuieli deductibile': `**Cheltuieli deductibile fiscal pentru SRL**

✅ **100% deductibile:**
- Salarii și contribuții sociale
- Chirii pentru spații de lucru
- Utilități (curent, gaz, apă, internet)
- Materii prime și materiale
- Servicii profesionale (contabilitate, juridic)
- Asigurări obligatorii
- Amortizare echipamente

⚠️ **Parțial deductibile:**
- Combustibil autovehicule: 50% (fără foaie de parcurs)
- Protocol și reprezentare: 2% din profit brut
- Sponsorizări: 0.75% din cifra de afaceri

❌ **Nedeductibile:**
- Amenzi și penalități
- Cheltuieli personale ale asociaților
- Cheltuieli fără documente justificative
- TVA nedeductibilă

💡 **Sfat:** Păstrează toate documentele justificative minimum 10 ani!`,

  'd300': `**Declarația D300 - Decont TVA**

📅 **Termene de depunere:**
- **Lunar**: până pe data de **25** a lunii următoare (pentru cifră afaceri > 100.000 EUR)
- **Trimestrial**: până pe data de **25** a lunii următoare trimestrului

📋 **Conținut D300:**
- TVA colectată din vânzări
- TVA deductibilă din achiziții
- TVA de plată sau de recuperat
- Operațiuni scutite și intracomunitare

✅ **DocumentIulia calculează automat:**
- Centralizare TVA din toate facturile
- Verificare coduri TVA parteneri
- Generare XML pentru depunere
- Arhivare digitală conform ANAF`,

  'pfa srl': `**Comparație fiscală PFA vs SRL în 2025**

👤 **PFA (Persoană Fizică Autorizată)**
- Impozit pe venit: **10%** din venitul net
- Contribuții sociale obligatorii: ~35% din venit
- Venit maxim pentru norma de venit: depinde de activitate
- Răspundere: nelimitată (cu patrimoniul personal)

🏢 **SRL Microîntreprindere**
- Impozit pe venit: **1%** din cifra de afaceri (fără angajați) sau **3%** (cu angajați)
- Dividende: **8%** impozit la distribuire
- Contribuții: doar pentru angajați
- Răspundere: limitată la capitalul social

💡 **Recomandare:**
- Venituri mici (<100.000 lei/an): PFA poate fi mai avantajos
- Venituri mari: SRL microîntreprindere
- Nevoie de protecție patrimoniu: SRL

⚠️ **Notă:** Consultă un expert contabil pentru situația ta specifică!`,

  'impozit micro': `**Impozitul pe venit pentru microîntreprinderi 2025**

📊 **Cote de impozitare:**
- **1%** din cifra de afaceri - pentru firme FĂRĂ angajați
- **3%** din cifra de afaceri - pentru firme CU angajați

📋 **Condiții microîntreprindere:**
- Cifra de afaceri < 500.000 EUR/an
- Capital social deținut de persoane fizice (nu alte firme)
- Nu activezi în domenii excluse (bancar, asigurări, jocuri de noroc)

💰 **Calcul exemplu:**
- Cifră afaceri: 100.000 lei
- Impozit (fără angajați): 1.000 lei
- Impozit (cu angajați): 3.000 lei

📅 **Plată:** Trimestrial, până pe 25 a lunii următoare trimestrului

⚠️ **Modificări 2025:** Verifică legislația actuală pentru eventuale schimbări!`,
};

function getAIResponse(question: string): string {
  const q = question.toLowerCase();

  if (q.includes('prag') && q.includes('tva')) return aiResponses['prag tva'];
  if (q.includes('e-factura') || q.includes('efactura') || q.includes('factura electronica')) return aiResponses['e-factura'];
  if (q.includes('deductibil') || q.includes('cheltuiel')) return aiResponses['cheltuieli deductibile'];
  if (q.includes('d300') || q.includes('decont')) return aiResponses['d300'];
  if (q.includes('pfa') && q.includes('srl')) return aiResponses['pfa srl'];
  if (q.includes('micro') || q.includes('impozit')) return aiResponses['impozit micro'];

  return `Mulțumesc pentru întrebare!

Aceasta este o versiune demo a Consultantului AI DocumentIulia. În versiunea completă, vei primi răspunsuri personalizate bazate pe:

📚 **Baza de cunoștințe:**
- Codul Fiscal actualizat
- Norme metodologice ANAF
- Ghiduri și instrucțiuni oficiale
- Practici contabile românești

🔍 **Pentru întrebarea ta:**
"${question}"

Te rugăm să reformulezi întrebarea sau să alegi una din sugestiile de mai jos pentru a vedea un exemplu de răspuns detaliat.

💡 **Sfat:** Încearcă întrebări despre TVA, e-Factura, cheltuieli deductibile, sau diferențe PFA/SRL!`;
}

export default function AIConsultantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (question: string) => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages(prev => [...prev, typingMessage]);

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Get AI response
    const response = getAIResponse(question);

    // Remove typing indicator and add real response
    setMessages(prev => {
      const filtered = prev.filter(m => m.id !== 'typing');
      return [...filtered, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      }];
    });

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Consultant AI Fiscal</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Răspunsuri inteligente la întrebări fiscale și contabile
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearChat}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Șterge conversația
          </button>
        )}
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white dark:bg-gray-950 rounded-xl border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center">
              {/* Welcome Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center max-w-xl"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-xl font-semibold mb-2">
                  Bună! Sunt asistentul tău fiscal AI
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Pot răspunde la întrebări despre TVA, e-Factura, deductibilități,
                  declarații fiscale și multe altele. Cu ce te pot ajuta astăzi?
                </p>

                {/* Suggested Questions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suggestedQuestions.map((q, index) => (
                    <motion.button
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleSubmit(q.question)}
                      className="flex items-start gap-3 p-3 text-left rounded-lg border border-gray-200 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/20 transition-colors group"
                    >
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                        <q.icon className="w-4 h-4 text-gray-600 dark:text-gray-400 group-hover:text-purple-600 dark:group-hover:text-purple-400" />
                      </div>
                      <div>
                        <div className="font-medium text-sm group-hover:text-purple-600 dark:group-hover:text-purple-400">
                          {q.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                          {q.question}
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </div>
          ) : (
            <>
              <AnimatePresence>
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : ''}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                    )}

                    <div className={`max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          message.role === 'user'
                            ? 'bg-purple-600 text-white rounded-br-md'
                            : 'bg-gray-100 dark:bg-gray-800 rounded-bl-md'
                        }`}
                      >
                        {message.isTyping ? (
                          <div className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        ) : (
                          <div className={`prose prose-sm max-w-none ${message.role === 'user' ? 'prose-invert' : 'dark:prose-invert'}`}>
                            {message.content.split('\n').map((line, i) => {
                              // Handle bold text
                              const parts = line.split(/(\*\*[^*]+\*\*)/g);
                              return (
                                <p key={i} className="mb-2 last:mb-0">
                                  {parts.map((part, j) => {
                                    if (part.startsWith('**') && part.endsWith('**')) {
                                      return <strong key={j}>{part.slice(2, -2)}</strong>;
                                    }
                                    return part;
                                  })}
                                </p>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Message Actions */}
                      {!message.isTyping && message.role === 'assistant' && (
                        <div className="flex items-center gap-2 mt-1 px-2">
                          <span className="text-xs text-gray-400">
                            {formatTime(message.timestamp)}
                          </span>
                          <button
                            onClick={() => copyMessage(message.content)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                            title="Copiază"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            className="p-1 text-gray-400 hover:text-green-500"
                            title="Răspuns util"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            className="p-1 text-gray-400 hover:text-red-500"
                            title="Răspuns neutil"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}

                      {message.role === 'user' && (
                        <div className="text-right mt-1 px-2">
                          <span className="text-xs text-gray-400">
                            {formatTime(message.timestamp)}
                          </span>
                        </div>
                      )}
                    </div>

                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Quick Suggestions (shown when there are messages) */}
        {messages.length > 0 && (
          <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-2">
              <span className="text-xs text-gray-400 flex-shrink-0">Sugestii:</span>
              {suggestedQuestions.slice(0, 4).map((q, index) => (
                <button
                  key={index}
                  onClick={() => handleSubmit(q.question)}
                  className="flex-shrink-0 px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                >
                  {q.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-end gap-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Scrie întrebarea ta despre fiscalitate..."
                rows={1}
                className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                style={{ maxHeight: '120px' }}
              />
              <div className="absolute right-2 bottom-2 text-xs text-gray-400">
                Enter pentru a trimite
              </div>
            </div>
            <button
              onClick={() => handleSubmit(input)}
              disabled={!input.trim() || isLoading}
              className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isLoading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Disclaimer */}
          <p className="mt-2 text-xs text-center text-gray-400">
            <AlertCircle className="w-3 h-3 inline mr-1" />
            Răspunsurile AI sunt orientative. Pentru decizii importante, consultă un expert contabil.
          </p>
        </div>
      </div>
    </div>
  );
}
