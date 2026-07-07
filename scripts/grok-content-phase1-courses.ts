#!/usr/bin/env node

/**
 * Grok Content Generation - Phase 1: Courses
 * Generates 24 comprehensive Romanian courses
 */

import { generateText } from 'ai';
import { createXai } from '@ai-sdk/xai';
import * as fs from 'fs';
import * as path from 'path';

const xai = createXai({
  apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY,
});

async function generateCourses(): Promise<void> {
  console.log('\n📚 Generating 24 Comprehensive Courses...\n');
  console.log('━'.repeat(80));

  const prompt = `Generate 24 COMPLETE, production-ready courses for DocumentIulia.ro in ROMANIAN.

CATEGORIES & COURSES:

**Contabilitate & Fiscalitate (8 courses):**
1. Contabilitate pentru Începători - Bazele contabilității
2. Declarații Fiscale ANAF - Ghid Complet D112, D394, SAF-T
3. e-Factura - Implementare și Utilizare Practică
4. TVA 2025 - Noile Rate 21% și 11% (Legea 141/2025)
5. Închiderea Exercițiului Financiar - Proceduri Complete
6. Raportări Financiare - Bilanț, Profit & Pierdere
7. Optimizare Fiscală Legală pentru IMM-uri
8. Contabilitate Avansată - Active Fixe și Amortizări

**HR & Legislația Muncii (6 courses):**
9. REVISAL - Registrul Electronic de Evidență a Salariaților
10. Calcul Salariu și Contribuții Sociale 2025
11. Contracte de Muncă - Tipuri și Clauze Esențiale
12. Legislația Muncii 2025 - Noutăți și Modificări
13. Concedii și Absențe - Proceduri Administrative
14. Pontaje și Foi de Prezență - Evidență Corectă

**Business & Operațiuni (6 courses):**
15. ERP pentru IMM-uri - Digitalizare Completă
16. Freelancing în România - Ghid Complet PFA
17. PFA vs SRL - Analiza Comparativă 2025
18. GDPR și Protecția Datelor Personale
19. E-commerce și Facturare Electronică
20. Managementul Stocurilor și Inventar

**Tehnologie & Automatizare (4 courses):**
21. Automatizare Procese Contabile cu AI
22. OCR pentru Facturi - Digitalizare Rapidă
23. Excel Avansat pentru Contabili
24. Integrare SAGA v3.2 - Sincronizare Automată

For EACH course provide in JSON format:

\`\`\`json
{
  "title": "Course title in Romanian",
  "slug": "url-friendly-slug",
  "description": "150-200 word description explaining what students will learn, who it's for, and key benefits",
  "category": "Contabilitate & Fiscalitate | HR & Legislația Muncii | Business & Operațiuni | Tehnologie & Automatizare",
  "level": "Începător | Intermediar | Avansat",
  "duration": hours (number),
  "price": price in RON (number),
  "modules": [
    {
      "title": "Module title",
      "duration": "2h 30m",
      "lessons": [
        "Lesson 1 title",
        "Lesson 2 title",
        "Lesson 3 title"
      ]
    }
  ],
  "objectives": [
    "Learning objective 1",
    "Learning objective 2",
    "Learning objective 3",
    "Learning objective 4",
    "Learning objective 5"
  ],
  "prerequisites": [
    "Prerequisite 1",
    "Prerequisite 2"
  ],
  "instructor": "Echipa DocumentIulia.ro",
  "students": estimated students enrolled (100-500),
  "rating": 4.5-4.9,
  "seo": {
    "title": "SEO title (60 chars max)",
    "description": "SEO description (155 chars max)",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
  }
}
\`\`\`

REQUIREMENTS:
- All content in ROMANIAN with proper diacritics (ș, ț, ă, î, â)
- Professional, accurate content reflecting 2025 legislation
- Each course must have 5-8 modules
- Each module must have 3-6 lessons
- SEO-optimized titles and descriptions
- Return ONLY valid JSON array

Generate ALL 24 courses now:`;

  try {
    const { text } = await generateText({
      model: xai('grok-2-1212'),
      prompt,
      temperature: 0.7,
      maxTokens: 8000,
    });

    console.log('\n✅ Courses generated!\n');

    // Save and process
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Extract JSON
    let jsonText = text;
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    }

    const courses = JSON.parse(jsonText);

    // Save to seed data
    const seedDataDir = path.join(process.cwd(), 'backend', 'prisma', 'seed-data');
    if (!fs.existsSync(seedDataDir)) {
      fs.mkdirSync(seedDataDir, { recursive: true });
    }

    const outputPath = path.join(seedDataDir, `courses-generated-${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(courses, null, 2));

    console.log(`📚 ${courses.length} courses saved to: ${outputPath}\n`);
    console.log('✅ Phase 1 complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateCourses().catch(console.error);
