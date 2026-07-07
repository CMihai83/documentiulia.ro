#!/usr/bin/env node

/**
 * Grok Content Generation - Phase 3: Forum Threads
 * Generates 50 engaging forum discussions
 */

import { generateText } from 'ai';
import { createXai } from '@ai-sdk/xai';
import * as fs from 'fs';
import * as path from 'path';

const xai = createXai({
  apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY,
});

async function generateForumThreads(): Promise<void> {
  console.log('\n💬 Generating 50 Forum Threads...\n');
  console.log('━'.repeat(80));

  const prompt = `Generate 50 engaging forum discussion threads for DocumentIulia.ro in Romanian.

CATEGORIES & TOPICS:

**Întrebări Frecvente (15 threads):**
- Cum depun D112 pentru prima dată?
- Care este diferența dintre PFA și SRL?
- Cum funcționează e-Factura?
- SAF-T D406 - De unde încep?
- TVA 21% vs 11% - Când aplic fiecare?
- Cum calculez salariul net din brut?
- REVISAL - Cum mă înregistrez?
- Ce documente contabile trebuie păstrate?
- Cum emit o factură corectivă?
- Diferența între CUI și CIF?
- Când se plătește TVA la buget?
- Cum funcționează SPV ANAF?
- Ce este DUKIntegrator?
- Declarația 394 - Cum se completează?
- Concediu medical - Ce proceduri urmez?

**Rezolvare Probleme (12 threads):**
- Eroare la upload SAF-T - cum rezolv?
- ANAF respinge factura - ce să fac?
- Nu pot accesa SPV - soluții?
- Diferențe în raportul TVA - cauze?
- Probleme cu REVISAL - ajutor?
- Erori în calculul salariului
- Backup-uri pierdute - recuperare?
- Integrare SAGA nu funcționează
- E-factura nu se trimite
- Probleme cu certificatul digital
- Reconciliere bancară nu bate
- Import date vechi în soft nou

**Best Practices (10 threads):**
- Organizarea documentelor contabile
- Backup-uri și securitate date
- Optimizare procese lunare
- Automatizare facturare
- Checklist închidere an fiscal
- Pregătire pentru inspecții ANAF
- Managementul facturilor
- Evidență cheltuieli deductibile
- Gestiune stocuri eficientă
- Raportare managerială

**Discuții Generale (8 threads):**
- Cum vă pregătiți pentru închiderea anului fiscal?
- Experiențe cu inspectorii ANAF
- Ce soft de contabilitate folosiți?
- Freelancing vs Angajat - experiențe?
- Digitalizare - de unde ați început?
- Sfaturi pentru contabili începători
- Colaborare cu cabinet contabil
- Provocări în e-commerce

**Noutăți & Actualizări (5 threads):**
- TVA 21% - Cum vă afectează business-ul?
- Noutăți legislative 2025 - discuții
- ANAF digitalizare - ce se schimbă?
- Fonduri europene 2025 - oportunități?
- AI în contabilitate - folosiți?

For EACH thread return JSON:

\`\`\`json
{
  "title": "Thread title in Romanian",
  "category": "Întrebări Frecvente | Rezolvare Probleme | Best Practices | Discuții Generale | Noutăți",
  "initialPost": "200-300 word opening post explaining the question/topic",
  "replies": [
    {
      "author": "Romanian name",
      "role": "Contabil | Antreprenor | Expert | Utilizator",
      "content": "100-150 word helpful reply",
      "createdAt": "2024-12-20T14:30:00Z",
      "helpful": true/false
    }
  ],
  "tags": ["tag1", "tag2", "tag3"],
  "views": 50-500,
  "sticky": true/false (only for important topics),
  "createdAt": "2024-11-15T10:00:00Z" (vary dates),
  "lastActivity": "2024-12-22T16:45:00Z"
}
\`\`\`

REQUIREMENTS:
- All content in Romanian with proper diacritics
- Realistic, helpful discussions
- 2-4 replies per thread
- Mix of question askers and experts
- Vary dates (Nov 2024 - Dec 2024)
- Return ONLY valid JSON array

Generate ALL 50 threads:`;

  try {
    const { text } = await generateText({
      model: xai('grok-2-1212'),
      prompt,
      temperature: 0.8,
      maxTokens: 12000,
    });

    console.log('\n✅ Forum threads generated!\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save raw
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const rawPath = path.join(logsDir, `forum-raw-${timestamp}.txt`);
    fs.writeFileSync(rawPath, text);
    console.log(`📄 Raw output: ${rawPath}\n`);

    // Extract JSON
    let jsonText = text.trim();
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }
    const arrayStart = jsonText.indexOf('[');
    const arrayEnd = jsonText.lastIndexOf(']') + 1;
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      jsonText = jsonText.substring(arrayStart, arrayEnd);
    }

    const threads = JSON.parse(jsonText);

    // Save to seed data
    const seedDataDir = path.join(process.cwd(), 'backend', 'prisma', 'seed-data');
    if (!fs.existsSync(seedDataDir)) {
      fs.mkdirSync(seedDataDir, { recursive: true });
    }

    const outputPath = path.join(seedDataDir, `forum-generated-${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(threads, null, 2));

    console.log(`💬 ${threads.length} forum threads saved to: ${outputPath}\n`);
    console.log('✅ Phase 3 complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateForumThreads().catch(console.error);
