'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bot,
  Send,
  Sparkles,
  MessageSquare,
  History,
  Settings,
  Lightbulb,
  FileText,
  BarChart3,
  Euro,
  Calculator,
  FileSearch,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Mic,
  Paperclip,
  ChevronRight,
  Zap,
  Brain,
  HelpCircle,
  Star,
  Bookmark,
  MoreHorizontal,
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
  actions?: { label: string; action: string }[];
  isLoading?: boolean;
}

interface ConversationHistory {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
  messageCount: number;
}

interface QuickAction {
  id: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  prompt: string;
}

// Sample conversation
const initialMessages: Message[] = [
  {
    id: '1',
    role: 'assistant',
    content: 'Bună ziua! Sunt asistentul AI DocumentIulia. Sunt aici să vă ajut cu:\n\n• Analiză financiară și rapoarte\n• Întrebări despre ANAF și conformitate\n• Optimizare fluxuri de lucru\n• Prognozări și analize predictive\n\nCum vă pot ajuta astăzi?',
    timestamp: new Date().toISOString(),
    suggestions: [
      'Analizează veniturile din ultima lună',
      'Care sunt termenele ANAF pentru luna aceasta?',
      'Generează un raport de flux de numerar',
    ],
  },
];

const sampleHistory: ConversationHistory[] = [
  {
    id: '1',
    title: 'Analiză venituri Q4',
    preview: 'Am analizat veniturile din Q4 și am identificat...',
    timestamp: '2024-12-13T14:30:00',
    messageCount: 8,
  },
  {
    id: '2',
    title: 'Conformitate ANAF',
    preview: 'Termenele pentru declarațiile ANAF sunt...',
    timestamp: '2024-12-12T10:15:00',
    messageCount: 12,
  },
  {
    id: '3',
    title: 'Prognoză flux numerar',
    preview: 'Pe baza datelor istorice, prognoza pentru...',
    timestamp: '2024-12-11T16:45:00',
    messageCount: 6,
  },
  {
    id: '4',
    title: 'Optimizare cheltuieli',
    preview: 'Am identificat următoarele oportunități de...',
    timestamp: '2024-12-10T09:00:00',
    messageCount: 15,
  },
];

const quickActions: QuickAction[] = [
  {
    id: '1',
    icon: <BarChart3 className="h-5 w-5" />,
    title: 'Raport Financiar',
    description: 'Generează un raport complet al situației financiare',
    prompt: 'Generează un raport financiar complet pentru luna curentă',
  },
  {
    id: '2',
    icon: <TrendingUp className="h-5 w-5" />,
    title: 'Prognoză Venituri',
    description: 'Previziuni pentru următoarele 3 luni',
    prompt: 'Creează o prognoză de venituri pentru următoarele 3 luni',
  },
  {
    id: '3',
    icon: <Calculator className="h-5 w-5" />,
    title: 'Calcul TVA',
    description: 'Calculează TVA-ul de plătit/recuperat',
    prompt: 'Calculează TVA-ul de plătit pentru luna curentă',
  },
  {
    id: '4',
    icon: <FileSearch className="h-5 w-5" />,
    title: 'Analiză Facturi',
    description: 'Detectează anomalii în facturi',
    prompt: 'Analizează facturile din ultima lună și identifică anomalii',
  },
  {
    id: '5',
    icon: <Euro className="h-5 w-5" />,
    title: 'Flux Numerar',
    description: 'Previziune cash-flow pe 30 zile',
    prompt: 'Generează o prognoză de flux de numerar pentru următoarele 30 de zile',
  },
  {
    id: '6',
    icon: <AlertTriangle className="h-5 w-5" />,
    title: 'Riscuri Financiare',
    description: 'Identifică riscuri și vulnerabilități',
    prompt: 'Identifică riscurile financiare principale ale companiei',
  },
];

const capabilities = [
  {
    icon: <Brain className="h-6 w-6 text-purple-500" />,
    title: 'Analiză Inteligentă',
    description: 'Procesare documente, extragere date și analiză automată',
  },
  {
    icon: <Sparkles className="h-6 w-6 text-yellow-500" />,
    title: 'Recomandări Personalizate',
    description: 'Sugestii bazate pe pattern-uri și date istorice',
  },
  {
    icon: <Zap className="h-6 w-6 text-blue-500" />,
    title: 'Automatizare Procese',
    description: 'Fluxuri automate pentru sarcini repetitive',
  },
  {
    icon: <FileText className="h-6 w-6 text-green-500" />,
    title: 'Generare Documente',
    description: 'Rapoarte, declarații și documente automate',
  },
];

export default function AIAssistantPage() {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('ro-RO', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Astăzi';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ieri';
    }
    return date.toLocaleDateString('ro-RO');
  };

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: getSimulatedResponse(content),
        timestamp: new Date().toISOString(),
        suggestions: [
          'Arată detalii suplimentare',
          'Exportă raportul',
          'Analizează perioada anterioară',
        ],
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const getSimulatedResponse = (query: string): string => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('venituri') || lowerQuery.includes('revenue')) {
      return `Am analizat veniturile din ultima lună. Iată rezultatele:

**Venituri totale:** 245.890 RON
**Comparativ luna anterioară:** +12.3%

📊 **Distribuție pe categorii:**
• Servicii consultanță: 145.000 RON (59%)
• Vânzări produse: 68.000 RON (28%)
• Abonamente: 32.890 RON (13%)

💡 **Observații:**
- Creștere semnificativă în servicii de consultanță (+18%)
- Vânzările de produse au scăzut ușor (-5%)
- Abonamentele sunt stabile

Dorești să generez un raport detaliat sau să analizez o perioadă specifică?`;
    }

    if (lowerQuery.includes('anaf') || lowerQuery.includes('termen')) {
      return `📅 **Termene ANAF pentru Decembrie 2024:**

**Urgente (următoarele 7 zile):**
• **15 Dec** - D406 SAF-T pentru noiembrie ⚠️
• **20 Dec** - Declarația 300 TVA

**Luna aceasta:**
• 25 Dec - D100 Impozit pe profit
• 31 Dec - Inventarierea anuală

✅ **Status declarații:**
• D406 Octombrie - Depus
• D300 Noiembrie - Depus
• D100 Q3 - Depus

Dorești să generez automat declarația D406 pentru noiembrie?`;
    }

    if (lowerQuery.includes('flux') || lowerQuery.includes('cash') || lowerQuery.includes('numerar')) {
      return `💰 **Prognoză Flux de Numerar - 30 zile:**

**Sold curent:** 125.450 RON

**Încasări estimate:**
• Săptămâna 1: +45.000 RON
• Săptămâna 2: +62.000 RON
• Săptămâna 3: +38.000 RON
• Săptămâna 4: +55.000 RON

**Plăți planificate:**
• Furnizori: -78.000 RON
• Salarii: -95.000 RON
• Utilități: -12.000 RON
• Taxe: -25.000 RON

📈 **Sold estimat la 30 zile:** 115.450 RON

⚠️ **Alertă:** În săptămâna 3 soldul poate scădea sub 50.000 RON. Recomand accelerarea încasărilor.`;
    }

    return `Am înțeles cererea dumneavoastră. Analizez datele disponibile...

Pe baza informațiilor din sistem, pot să vă ajut cu:

1. **Analize financiare** - rapoarte detaliate despre venituri, cheltuieli, profitabilitate
2. **Conformitate ANAF** - verificare termene, generare declarații
3. **Prognoze** - estimări pe baza datelor istorice
4. **Optimizare** - identificare oportunități de reducere costuri

Ce aspect doriți să explorăm mai detaliat?`;
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt);
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

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
              Asistent inteligent pentru analiză și automatizare
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-100 text-green-800">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse" />
            Online
          </Badge>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
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
                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                      >
                        <Avatar className="h-8 w-8 flex-shrink-0">
                          <AvatarFallback className={
                            message.role === 'assistant'
                              ? 'bg-gradient-to-br from-purple-500 to-blue-500 text-white'
                              : 'bg-blue-100 text-blue-700'
                          }>
                            {message.role === 'assistant' ? <Bot className="h-4 w-4" /> : 'EU'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[80%] ${message.role === 'user' ? 'text-right' : ''}`}>
                          <div
                            className={`rounded-2xl px-4 py-2 ${
                              message.role === 'user'
                                ? 'bg-blue-500 text-white rounded-br-md'
                                : 'bg-muted rounded-bl-md'
                            }`}
                          >
                            <div className="whitespace-pre-wrap text-sm">
                              {message.content}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{formatTime(message.timestamp)}</span>
                            {message.role === 'assistant' && (
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <Copy className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <ThumbsUp className="h-3 w-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6">
                                  <ThumbsDown className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                          {message.suggestions && message.role === 'assistant' && (
                            <div className="flex flex-wrap gap-2 mt-3">
                              {message.suggestions.map((suggestion, idx) => (
                                <Button
                                  key={idx}
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  onClick={() => handleSuggestion(suggestion)}
                                >
                                  {suggestion}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex gap-3">
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
                    <Button variant="outline" size="icon" className="flex-shrink-0">
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Întreabă-mă orice despre contabilitate..."
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputValue)}
                        className="pr-20"
                      />
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <Mic className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <Button
                      onClick={() => sendMessage(inputValue)}
                      disabled={!inputValue.trim() || isTyping}
                      className="flex-shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            {/* History Tab */}
            <TabsContent value="history" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Istoric Conversații</CardTitle>
                  <CardDescription>Conversațiile anterioare cu asistentul AI</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {sampleHistory.map((conv) => (
                      <div
                        key={conv.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-muted rounded-lg">
                            <MessageSquare className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium">{conv.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {conv.preview}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right text-sm">
                            <p className="text-muted-foreground">{formatDate(conv.timestamp)}</p>
                            <p className="text-xs text-muted-foreground">
                              {conv.messageCount} mesaje
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Bookmark className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
                        <div className="p-3 bg-muted rounded-lg">
                          {cap.icon}
                        </div>
                        <div>
                          <h3 className="font-semibold">{cap.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {cap.description}
                          </p>
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
                      'Care sunt veniturile din ultima lună?',
                      'Generează un raport de profit și pierdere',
                      'Ce facturi sunt restante?',
                      'Calculează TVA-ul de plătit',
                      'Care sunt termenele ANAF pentru luna aceasta?',
                      'Analizează cheltuielile pe categorii',
                      'Previzionează cash-flow pentru 30 zile',
                      'Identifică anomalii în facturi',
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
              <CardDescription>Sarcini frecvente cu un singur click</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((action) => (
                <Button
                  key={action.id}
                  variant="ghost"
                  className="w-full justify-start h-auto py-3"
                  onClick={() => handleQuickAction(action)}
                >
                  <div className="p-2 bg-muted rounded-lg mr-3">
                    {action.icon}
                  </div>
                  <div className="text-left">
                    <p className="font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* AI Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistici AI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conversații luna aceasta</span>
                <span className="font-semibold">47</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Rapoarte generate</span>
                <span className="font-semibold">23</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Timp economisit</span>
                <span className="font-semibold text-green-600">~12 ore</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Acuratețe răspunsuri</span>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-semibold">4.8/5</span>
                </div>
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
                    Poți atașa documente sau imagini pentru analiză OCR automată.
                    Asistentul va extrage datele relevante.
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
