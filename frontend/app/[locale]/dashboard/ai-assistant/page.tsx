'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api';
import { notifyNotAvailable, toastFromAnywhere } from '@/lib/toast-bus';
import {
  Bot,
  Send,
  Sparkles,
  MessageSquare,
  History,
  Lightbulb,
  FileText,
  BarChart3,
  Euro,
  Calculator,
  FileSearch,
  TrendingUp,
  AlertTriangle,
  Copy,
  RefreshCw,
  Mic,
  Paperclip,
  ChevronRight,
  Zap,
  Brain,
  HelpCircle,
  Plus,
  Loader2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Backend contract (NestJS /api/v1/ai-assistant)
//   POST /ai-assistant/conversations       { title? }                 -> ApiConversation
//   GET  /ai-assistant/conversations       ?limit=                     -> { conversations: ApiConversation[] }
//   GET  /ai-assistant/conversations/:id                               -> ApiConversation | { error }
//   POST /ai-assistant/chat                { conversationId, message } -> { userMessage, assistantMessage } | { error }
// ---------------------------------------------------------------------------

type ApiMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

interface ApiMessage {
  id: string;
  conversationId: string;
  role: ApiMessageRole;
  content: string;
  contentRo?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface ApiConversation {
  id: string;
  title: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'CLOSED';
  messages?: ApiMessage[];
  createdAt: string;
  updatedAt: string;
  error?: string;
}

interface ChatResponse {
  userMessage?: ApiMessage;
  assistantMessage?: ApiMessage;
  error?: string;
}

interface ConversationsResponse {
  conversations?: ApiConversation[];
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  /** true when this bubble is a client-side error notice, not an answer */
  isError?: boolean;
}

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  prompt: string;
}

const UNAVAILABLE_MESSAGE =
  'Asistentul AI este indisponibil momentan. Încercați din nou în câteva minute.';

const starterPrompts = [
  'Care sunt termenele ANAF pentru luna aceasta?',
  'Cum se calculează TVA-ul la cota de 21%?',
  'Ce trebuie să știu despre e-Factura?',
];

const quickActions: QuickAction[] = [
  {
    id: '1',
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Raport Financiar',
    description: 'Întreabă despre situația financiară',
    prompt: 'Ce analize financiare poți face pentru luna curentă?',
  },
  {
    id: '2',
    icon: <TrendingUp className="h-5 w-5" />,
    title: 'Prognoză Venituri',
    description: 'Previziuni pentru următoarele luni',
    prompt: 'Cum pot obține o prognoză de venituri pentru următoarele 3 luni?',
  },
  {
    id: '3',
    icon: <Calculator className="h-5 w-5" />,
    title: 'Calcul TVA',
    description: 'Cote TVA și mod de calcul',
    prompt: 'Cum calculez TVA-ul de plătit pentru luna curentă?',
  },
  {
    id: '4',
    icon: <FileSearch className="h-5 w-5" />,
    title: 'Facturi',
    description: 'Întrebări despre facturi și e-Factura',
    prompt: 'Cum verific statusul e-Factura pentru facturile emise?',
  },
  {
    id: '5',
    icon: <Euro className="h-5 w-5" />,
    title: 'Flux Numerar',
    description: 'Întrebări despre cash-flow',
    prompt: 'Cum pot urmări fluxul de numerar pentru următoarele 30 de zile?',
  },
  {
    id: '6',
    icon: <AlertTriangle className="h-5 w-5" />,
    title: 'Conformitate',
    description: 'ANAF, D406, SAF-T',
    prompt: 'Ce obligații de conformitate ANAF am luna aceasta?',
  },
];

const capabilities = [
  {
    icon: <Brain className="h-6 w-6 text-purple-500" />,
    title: 'Întrebări despre contabilitate',
    description: 'TVA, facturare, e-Factura, termene și obligații ANAF',
  },
  {
    icon: <Sparkles className="h-6 w-6 text-yellow-500" />,
    title: 'Conformitate',
    description: 'Explicații despre D406 SAF-T, e-Factura și cerințe legale',
  },
  {
    icon: <Zap className="h-6 w-6 text-blue-500" />,
    title: 'Ghidare în aplicație',
    description: 'Unde găsești funcțiile de facturare, rapoarte și declarații',
  },
  {
    icon: <FileText className="h-6 w-6 text-green-500" />,
    title: 'Istoric conversații',
    description: 'Conversațiile sunt salvate și pot fi reluate oricând',
  },
];

function apiToMessage(m: ApiMessage): Message | null {
  if (m.role === 'USER') {
    return { id: m.id, role: 'user', content: m.content, timestamp: m.createdAt };
  }
  // ASSISTANT and SYSTEM (server greeting) are both shown as assistant bubbles
  return {
    id: m.id,
    role: 'assistant',
    content: m.contentRo || m.content,
    timestamp: m.createdAt,
  };
}

function conversationPreview(conv: ApiConversation): string {
  const msgs = conv.messages ?? [];
  for (let i = msgs.length - 1; i >= 0; i -= 1) {
    const m = msgs[i];
    if (m.role !== 'SYSTEM') return m.contentRo || m.content;
  }
  return msgs.length ? msgs[msgs.length - 1].contentRo || msgs[msgs.length - 1].content : '';
}

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [serviceStatus, setServiceStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const loadConversations = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError(null);
    const res = await api.get<ConversationsResponse>('/ai-assistant/conversations', {
      params: { limit: 50 },
    });
    if (res.error || !res.data) {
      setHistoryError(UNAVAILABLE_MESSAGE);
      setServiceStatus('offline');
      setConversations([]);
    } else {
      setConversations(res.data.conversations ?? []);
      setServiceStatus('online');
    }
    setHistoryLoading(false);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === today.toDateString()) return 'Astăzi';
    if (date.toDateString() === yesterday.toDateString()) return 'Ieri';
    return date.toLocaleDateString('ro-RO');
  };

  const pushError = () => {
    setMessages((prev) => [
      ...prev,
      {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: UNAVAILABLE_MESSAGE,
        timestamp: new Date().toISOString(),
        isError: true,
      },
    ]);
    setServiceStatus('offline');
  };

  const ensureConversation = async (firstMessage: string): Promise<string | null> => {
    if (conversationId) return conversationId;
    const title = firstMessage.length > 60 ? `${firstMessage.slice(0, 57)}…` : firstMessage;
    const res = await api.post<ApiConversation>('/ai-assistant/conversations', { title });
    if (res.error || !res.data?.id) return null;
    setConversationId(res.data.id);
    return res.data.id;
  };

  const sendMessage = async (content: string) => {
    const text = content.trim();
    if (!text || isTyping) return;

    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, role: 'user', content: text, timestamp: new Date().toISOString() },
    ]);
    setInputValue('');
    setIsTyping(true);

    try {
      const convId = await ensureConversation(text);
      if (!convId) {
        pushError();
        return;
      }

      const res = await api.post<ChatResponse>('/ai-assistant/chat', {
        conversationId: convId,
        message: text,
      });

      if (res.error || !res.data || res.data.error || !res.data.assistantMessage) {
        pushError();
        return;
      }

      const assistant = apiToMessage(res.data.assistantMessage);
      if (assistant) {
        setMessages((prev) => [...prev, assistant]);
      }
      setServiceStatus('online');
      // Refresh the history list in the background so the new conversation shows up
      loadConversations();
    } catch {
      pushError();
    } finally {
      setIsTyping(false);
    }
  };

  const openConversation = async (id: string) => {
    setOpeningId(id);
    const res = await api.get<ApiConversation>(`/ai-assistant/conversations/${id}`);
    setOpeningId(null);
    if (res.error || !res.data || res.data.error || !res.data.id) {
      toastFromAnywhere('error', 'Conversația nu a putut fi încărcată', UNAVAILABLE_MESSAGE);
      setServiceStatus('offline');
      return;
    }
    const loaded = (res.data.messages ?? [])
      .map(apiToMessage)
      .filter((m): m is Message => m !== null);
    setConversationId(res.data.id);
    setMessages(loaded);
    setServiceStatus('online');
    setActiveTab('chat');
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setInputValue('');
    setActiveTab('chat');
  };

  const copyMessage = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      toastFromAnywhere('success', 'Copiat', 'Răspunsul a fost copiat în clipboard.');
    } catch {
      toastFromAnywhere('error', 'Nu s-a putut copia', 'Browserul nu permite accesul la clipboard.');
    }
  };

  const statusBadge =
    serviceStatus === 'online' ? (
      <Badge className="bg-green-100 text-green-800">
        <span className="w-2 h-2 rounded-full bg-green-500 mr-2" />
        Conectat
      </Badge>
    ) : serviceStatus === 'offline' ? (
      <Badge className="bg-red-100 text-red-800">
        <span className="w-2 h-2 rounded-full bg-red-500 mr-2" />
        Indisponibil
      </Badge>
    ) : (
      <Badge className="bg-muted text-muted-foreground">
        <span className="w-2 h-2 rounded-full bg-gray-400 mr-2" />
        Se verifică…
      </Badge>
    );

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl">
            <Bot className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Asistent AI</h1>
            <p className="text-muted-foreground">
              Întrebări despre contabilitate, TVA și conformitate ANAF
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge}
          <Button variant="outline" onClick={startNewConversation}>
            <Plus className="h-4 w-4 mr-2" />
            Conversație nouă
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="chat">
                <MessageSquare className="mr-2 h-4 w-4" />
                Conversație
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="mr-2 h-4 w-4" />
                Istoric
              </TabsTrigger>
              <TabsTrigger value="capabilities">
                <Sparkles className="mr-2 h-4 w-4" />
                Capabilități
              </TabsTrigger>
            </TabsList>

            {/* Chat Tab */}
            <TabsContent value="chat" className="space-y-4">
              <Card className="h-[600px] flex flex-col">
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.length === 0 && !isTyping && (
                      <div className="flex flex-col items-center justify-center text-center py-12 px-4">
                        <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-500 rounded-2xl mb-4">
                          <Bot className="h-8 w-8 text-white" />
                        </div>
                        <h2 className="text-lg font-semibold">Bună ziua! Sunt asistentul AI DocumentIulia.</h2>
                        <p className="text-sm text-muted-foreground mt-2 max-w-md">
                          Vă pot răspunde la întrebări despre TVA, facturare, e-Factura, D406 SAF-T și
                          termenele ANAF. Scrieți o întrebare sau alegeți una dintre sugestii.
                        </p>
                        <div className="flex flex-wrap justify-center gap-2 mt-4">
                          {starterPrompts.map((prompt) => (
                            <Button
                              key={prompt}
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => sendMessage(prompt)}
                            >
                              {prompt}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback
                            className={
                              message.role === 'assistant'
                                ? message.isError
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                                : 'bg-blue-100 text-blue-700'
                            }
                          >
                            {message.role === 'assistant' ? (
                              message.isError ? <AlertTriangle className="h-4 w-4" /> : <Bot className="h-4 w-4" />
                            ) : (
                              'EU'
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                          <div
                            role={message.isError ? 'alert' : undefined}
                            className={`rounded-2xl px-4 py-2 ${
                              message.role === 'user'
                                ? 'bg-blue-500 text-white rounded-br-md'
                                : message.isError
                                  ? 'bg-red-50 text-red-800 border border-red-200 rounded-bl-md'
                                  : 'bg-muted rounded-bl-md'
                            }`}
                          >
                            <div className="whitespace-pre-wrap text-sm">{message.content}</div>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{formatTime(message.timestamp)}</span>
                            {message.role === 'assistant' && !message.isError && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                aria-label="Copiază răspunsul"
                                onClick={() => copyMessage(message.content)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                            {message.isError && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  // Re-send the last user message, if any
                                  const lastUser = [...messages].reverse().find((m) => m.role === 'user');
                                  if (lastUser) {
                                    setMessages((prev) => prev.filter((m) => m.id !== message.id && m.id !== lastUser.id));
                                    sendMessage(lastUser.content);
                                  }
                                }}
                              >
                                <RefreshCw className="h-3 w-3 mr-1" />
                                Reîncearcă
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {isTyping && (
                      <div className="flex gap-3" aria-live="polite" aria-label="Asistentul scrie">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-gradient-to-br from-purple-500 to-blue-500 text-white">
                            <Bot className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                          <div className="flex gap-1">
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <div className="p-4 border-t">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="flex-shrink-0"
                      aria-label="Atașează document"
                      onClick={() => notifyNotAvailable('Atașare documente')}
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Întreabă-mă orice despre contabilitate..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage(inputValue);
                          }
                        }}
                        disabled={isTyping}
                        className="pr-20"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label="Dictare vocală"
                          onClick={() => notifyNotAvailable('Dictare vocală')}
                        >
                          <Mic className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      onClick={() => sendMessage(inputValue)}
                      disabled={!inputValue.trim() || isTyping}
                      className="flex-shrink-0"
                      aria-label="Trimite"
                    >
                      {isTyping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                  <div>
                    <CardTitle>Istoric Conversații</CardTitle>
                    <CardDescription>Conversațiile anterioare cu asistentul AI</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={loadConversations} disabled={historyLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${historyLoading ? 'animate-spin' : ''}`} />
                    Reîncarcă
                  </Button>
                </CardHeader>
                <CardContent>
                  {historyLoading && conversations.length === 0 ? (
                    <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Se încarcă istoricul…
                    </div>
                  ) : historyError ? (
                    <div
                      role="alert"
                      className="flex items-start gap-3 p-4 rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm"
                    >
                      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{historyError}</span>
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <MessageSquare className="h-8 w-8 text-muted-foreground mb-3" />
                      <p className="font-medium">Nicio conversație încă</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Începeți o conversație din fila „Conversație” și o veți regăsi aici.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {conversations.map((conv) => {
                        const count = (conv.messages ?? []).filter((m) => m.role !== 'SYSTEM').length;
                        const preview = conversationPreview(conv);
                        return (
                          <button
                            type="button"
                            key={conv.id}
                            onClick={() => openConversation(conv.id)}
                            disabled={openingId === conv.id}
                            className={`w-full text-left flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                              conv.id === conversationId ? 'border-purple-300 bg-purple-50/40' : ''
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="p-2 bg-muted rounded-lg flex-shrink-0">
                                {openingId === conv.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <MessageSquare className="h-4 w-4" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{conv.title}</p>
                                {preview && (
                                  <p className="text-sm text-muted-foreground line-clamp-1">{preview}</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                              <div className="text-right text-sm">
                                <p className="text-muted-foreground">{formatDate(conv.updatedAt)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {count} {count === 1 ? 'mesaj' : 'mesaje'}
                                </p>
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Capabilities Tab */}
            <TabsContent value="capabilities" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                {capabilities.map((cap, idx) => (
                  <Card key={idx}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 bg-muted rounded-lg">{cap.icon}</div>
                        <div>
                          <h3 className="font-semibold">{cap.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{cap.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Exemple de Întrebări</CardTitle>
                  <CardDescription>Ce poți întreba asistentul AI</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2">
                    {[
                      'Care sunt cotele de TVA în vigoare?',
                      'Cum depun declarația D406 SAF-T?',
                      'Ce facturi trebuie transmise prin e-Factura?',
                      'Cum calculez TVA-ul de plătit?',
                      'Care sunt termenele ANAF pentru luna aceasta?',
                      'Cum se aplică taxarea inversă?',
                      'Ce înseamnă SPV și cum îl folosesc?',
                      'Cum verific un CUI la ANAF?',
                    ].map((question, idx) => (
                      <Button
                        key={idx}
                        variant="outline"
                        className="justify-start h-auto py-3 px-4"
                        onClick={() => {
                          setActiveTab('chat');
                          sendMessage(question);
                        }}
                      >
                        <HelpCircle className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="text-left">{question}</span>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar - Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acțiuni Rapide</CardTitle>
              <CardDescription>Întrebări frecvente cu un singur click</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-3"
                  disabled={isTyping}
                  onClick={() => {
                    setActiveTab('chat');
                    sendMessage(action.prompt);
                  }}
                >
                  <div className="p-2 bg-muted rounded-lg mr-3">{action.icon}</div>
                  <div className="text-left">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">{action.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Real stats only */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversațiile tale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conversații salvate</span>
                <span className="font-semibold">
                  {historyLoading && conversations.length === 0 ? '…' : conversations.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conversația curentă</span>
                <span className="font-semibold">
                  {conversationId ? `${messages.filter((m) => !m.isError).length} mesaje` : 'Neîncepută'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tips */}
          <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-100">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-purple-900">Sfat</p>
                  <p className="text-sm text-purple-700 mt-1">
                    Asistentul răspunde la întrebări generale despre TVA, e-Factura, D406 și termene
                    ANAF. Pentru cifrele companiei dumneavoastră folosiți rapoartele din secțiunea
                    Finanțe.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
