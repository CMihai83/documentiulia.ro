'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Brain, Send, Loader2, Sparkles, MessageCircle, HelpCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const suggestedQuestions = [
  'Care este cota standard de TVA in 2025?',
  'Ce este SAF-T D406 si cand trebuie depus?',
  'Cum functioneaza e-Factura pentru B2B?',
  'Care este salariul minim brut in 2025?',
  'Ce documente sunt necesare pentru REVISAL?',
  'Cum calculez contributiile sociale?',
  'Ce este PNRR si cum pot accesa fonduri?',
  'Care sunt cotele reduse de TVA?',
];

async function askGrok(question: string): Promise<string> {
  const response = await fetch('/api/ai/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error('Failed to get response');
  }

  const data = await response.json();
  return data.answer;
}

export default function AskGrokPage() {
  const t = useTranslations();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const question = input.trim();
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: question,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const answer = await askGrok(question);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: answer,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Ne pare rau, a aparut o eroare. Te rugam sa incerci din nou.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Brain className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">DocumentIulia</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/courses" className="text-gray-600 hover:text-blue-600 transition">
              Cursuri
            </Link>
            <Link href="/blog" className="text-gray-600 hover:text-blue-600 transition">
              Blog
            </Link>
            <Link href="/login" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              Autentificare
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Powered by Grok AI
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Intreaba Grok
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Asistentul AI expert in contabilitate si fiscalitate romaneasca.
            Intreaba orice despre TVA, SAF-T, e-Factura, salarizare sau conformitate ANAF.
          </p>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-2xl shadow-xl border overflow-hidden">
          {/* Messages Area */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Incepe o conversatie
                </h3>
                <p className="text-gray-500 mb-6 max-w-md">
                  Pune o intrebare despre contabilitate, fiscalitate sau legislatia muncii din Romania.
                </p>

                {/* Suggested Questions */}
                <div className="w-full max-w-2xl">
                  <p className="text-sm text-gray-500 mb-3 flex items-center justify-center gap-1">
                    <HelpCircle className="w-4 h-4" />
                    Intrebari sugerate:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {suggestedQuestions.slice(0, 6).map((q, i) => (
                      <button
                        key={i}
                        onClick={() => handleSuggestedQuestion(q)}
                        className="text-left p-3 bg-gray-50 hover:bg-blue-50 rounded-lg text-sm text-gray-700 hover:text-blue-700 transition border hover:border-blue-200"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] p-4 rounded-2xl ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-md'
                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                      }`}
                    >
                      {msg.role === 'assistant' && (
                        <div className="flex items-center gap-2 mb-2 text-blue-600">
                          <Brain className="w-4 h-4" />
                          <span className="text-xs font-medium">Grok AI</span>
                        </div>
                      )}
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                      <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400'}`}>
                        {msg.timestamp.toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 p-4 rounded-2xl rounded-bl-md">
                      <div className="flex items-center gap-2 text-blue-600">
                        <Brain className="w-4 h-4" />
                        <span className="text-xs font-medium">Grok AI</span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                        <span className="text-gray-500">Gandesc...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t bg-gray-50 p-4">
            {messages.length > 0 && (
              <div className="flex justify-end mb-2">
                <button
                  onClick={clearChat}
                  className="text-sm text-gray-500 hover:text-red-500 flex items-center gap-1 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Sterge conversatia
                </button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Scrie intrebarea ta aici..."
                className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span className="hidden sm:inline">Trimite</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid md:grid-cols-3 gap-6 mt-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <Brain className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Expert in fiscalitate RO</h3>
            <p className="text-gray-600 text-sm">
              Cunoaste TVA (21%/11%/5%), SAF-T D406, e-Factura si toata legislatia ANAF actualizata.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Raspunsuri instant</h3>
            <p className="text-gray-600 text-sm">
              Obtine raspunsuri detaliate in cateva secunde, cu referinte la legislatie.
            </p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <MessageCircle className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Conversatie naturala</h3>
            <p className="text-gray-600 text-sm">
              Intreaba in limbaj natural, in romana sau engleza. AI-ul intelege contextul.
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
            Grok AI ofera informatii orientative bazate pe legislatia in vigoare.
            Pentru decizii importante, consulta un specialist autorizat.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-12">
        <div className="max-w-5xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Brain className="w-6 h-6 text-blue-600" />
              <span className="font-semibold text-gray-900">DocumentIulia.ro</span>
            </div>
            <p className="text-gray-500 text-sm">
              Platforma AI pentru contabilitate si fiscalitate romaneasca
            </p>
            <div className="flex gap-4 text-sm">
              <Link href="/terms" className="text-gray-500 hover:text-blue-600">Termeni</Link>
              <Link href="/privacy" className="text-gray-500 hover:text-blue-600">Confidentialitate</Link>
              <Link href="/contact" className="text-gray-500 hover:text-blue-600">Contact</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
