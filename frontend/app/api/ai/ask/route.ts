import { NextRequest, NextResponse } from 'next/server';

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_API_KEY = process.env.GROK_API_KEY;

const SYSTEM_PROMPT = `Ești un asistent AI expert în contabilitate și fiscalitate românească pentru DocumentIulia.ro.

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

export async function POST(request: NextRequest) {
  try {
    const { question } = await request.json();

    if (!question || typeof question !== 'string') {
      return NextResponse.json({ error: 'Question is required' }, { status: 400 });
    }

    if (!GROK_API_KEY) {
      return NextResponse.json({ error: 'AI service not configured' }, { status: 500 });
    }

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-2-1212',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content || 'Nu am putut genera un răspuns.';

    return NextResponse.json({ answer });
  } catch (error) {
    console.error('AI API error:', error);
    return NextResponse.json(
      { error: 'Failed to process AI request' },
      { status: 500 }
    );
  }
}
