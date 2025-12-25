import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

// Grok AI Service for DocumentIulia.ro
// Provides RAG-based Q&A for Romanian accounting/tax queries

interface GrokResponse {
  id: string;
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly grokApiUrl = 'https://api.x.ai/v1/chat/completions';

  // Romanian tax/accounting knowledge base
  private readonly systemPrompt = `Ești un asistent AI expert în contabilitate și fiscalitate românească pentru DocumentIulia.ro.

Cunoștințe cheie:
- TVA: Legea 141/2025 - cota standard 21%, redusă 11% (alimente, medicamente), 5% (locuințe sociale)
- SAF-T D406: Ordin 1783/2021 - raportare lunară XML din ianuarie 2025 pentru mici/nerezidenți
- e-Factura: Obligatorie B2B din mid-2026, format UBL 2.1
- Pilot SAF-T: Septembrie 2025 - August 2026, cu 6 luni perioadă de grație
- PNRR: €21.6 miliarde fonduri disponibile pentru digitalizare
- GDPR/SOC 2: Conformitate obligatorie pentru date personale

Răspunde întotdeauna:
1. Concis și la obiect
2. Cu referințe la legislația aplicabilă
3. În limba în care ți se adresează (RO/EN)
4. Cu exemple practice când e util

Nu inventa informații. Dacă nu știi, spune-o.`;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async ask(userId: string, question: string): Promise<{ answer: string; tokens: number }> {
    const startTime = Date.now();
    const apiKey = this.configService.get('GROK_API_KEY');

    if (!apiKey || apiKey === 'your_grok_key' || apiKey.length < 10) {
      this.logger.warn('GROK_API_KEY not configured, returning fallback response');
      return {
        answer: 'Serviciul AI nu este configurat momentan. Vă rugăm să contactați administratorul.',
        tokens: 0,
      };
    }

    try {
      const response = await axios.post<GrokResponse>(
        this.grokApiUrl,
        {
          model: 'grok-2-latest',
          messages: [
            { role: 'system', content: this.systemPrompt },
            { role: 'user', content: question },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.configService.get('GROK_API_KEY')}`,
          },
        },
      );

      const answer = response.data.choices[0]?.message?.content || 'Nu am putut genera un răspuns.';
      const tokens = response.data.usage?.total_tokens || 0;
      const latencyMs = Date.now() - startTime;

      // Log the query
      if (userId && userId !== 'system') {
        await this.prisma.aIQuery.create({
          data: {
            user: { connect: { id: userId } },
            question,
            answer,
            model: 'grok-2-latest',
            tokens,
            latencyMs,
          },
        });
      }

      this.logger.log(`AI query processed in ${latencyMs}ms, ${tokens} tokens`);
      return { answer, tokens };
    } catch (error) {
      this.logger.error('Grok API error', error);
      throw new Error('Failed to get AI response');
    }
  }

  // Specialized queries
  async explainVAT(scenario: string): Promise<string> {
    const prompt = `Explică următorul scenariu TVA conform Legea 141/2025: ${scenario}`;
    const { answer } = await this.ask('system', prompt);
    return answer;
  }

  async checkCompliance(data: any): Promise<{ compliant: boolean; issues: string[] }> {
    const prompt = `Verifică conformitatea următoarelor date contabile și listează problemele găsite:
${JSON.stringify(data, null, 2)}

Răspunde în format JSON: { "compliant": boolean, "issues": string[] }`;

    const { answer } = await this.ask('system', prompt);

    try {
      return JSON.parse(answer);
    } catch {
      return { compliant: false, issues: ['Nu am putut verifica conformitatea'] };
    }
  }

  async generateReport(type: string, data: any): Promise<string> {
    const prompt = `Generează un raport de tip "${type}" bazat pe următoarele date:
${JSON.stringify(data, null, 2)}

Include analiză, concluzii și recomandări.`;

    const { answer } = await this.ask('system', prompt);
    return answer;
  }

  // Get AI usage stats
  async getUsageStats(userId: string): Promise<{
    totalQueries: number;
    totalTokens: number;
    avgLatency: number;
  }> {
    const stats = await this.prisma.aIQuery.aggregate({
      where: { userId },
      _count: true,
      _sum: { tokens: true },
      _avg: { latencyMs: true },
    });

    return {
      totalQueries: stats._count,
      totalTokens: stats._sum.tokens || 0,
      avgLatency: Math.round(stats._avg.latencyMs || 0),
    };
  }
}
