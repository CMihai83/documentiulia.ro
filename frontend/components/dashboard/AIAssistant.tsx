'use client';

import { useState } from 'react';
import { Brain, Send, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

async function askGrok(question: string): Promise<string> {
  const response = await fetch('/api/ai/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  const data = await response.json();
  return data.answer;
}

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Bună! Sunt asistentul AI DocumentIulia. Întreabă-mă orice despre TVA, deduceri fiscale, SAF-T, e-Factura sau conformitate ANAF.',
    },
  ]);
  const [input, setInput] = useState('');

  const mutation = useMutation({
    mutationFn: askGrok,
    onSuccess: (answer) => {
      setMessages((prev) => [...prev, { role: 'assistant', content: answer }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Îmi pare rău, a apărut o eroare. Încearcă din nou.' },
      ]);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || mutation.isPending) return;

    const question = input.trim();
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setInput('');
    mutation.mutate(question);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col h-[400px]">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Brain className="w-5 h-5 text-primary-600" />
        Asistent AI (Grok)
      </h2>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg text-sm ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {mutation.isPending && (
          <div className="flex justify-start">
            <div className="bg-gray-100 p-3 rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Întreabă despre TVA, SAF-T, e-Factura..."
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
          disabled={mutation.isPending}
        />
        <button
          type="submit"
          disabled={mutation.isPending || !input.trim()}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
        >
          <Send className="w-5 h-5" />
        </button>
      </form>
    </div>
  );
}
