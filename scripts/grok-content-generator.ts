#!/usr/bin/env node

/**
 * Grok Content Generation Script
 * Requests Grok to generate full content for courses, blog, and forum
 */

import { generateText } from 'ai';
import { createXai } from '@ai-sdk/xai';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Grok/XAI
const xai = createXai({
  apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY,
});

async function generateContent(): Promise<void> {
  console.log('\n🤖 Requesting Grok to generate full content...\n');
  console.log('━'.repeat(80));

  const systemPrompt = `You are Grok, an expert content creator and Romanian business/accounting specialist for DocumentIulia.ro,
a state-of-the-art AI-powered ERP/accounting platform for Romanian businesses.

Your expertise includes:
- Romanian accounting, tax law, and ANAF compliance (e-Factura, SAF-T D406, TVA)
- HR and payroll regulations in Romania
- Business management and entrepreneurship
- Educational content creation for professionals
- Forum community engagement and discussion topics

Generate comprehensive, professional, SEO-optimized content in Romanian language with proper diacritics (ș, ț, ă, î, â).`;

  const userPrompt = `
# CONTENT GENERATION REQUEST FOR DOCUMENTIULIA.RO

Generate COMPLETE, production-ready content for the following sections:

## 1. COURSES (Minimum 24 comprehensive courses)

Create detailed courses covering:
- **Accounting & Finance** (8 courses):
  - Contabilitate pentru începători
  - Declarații fiscale ANAF (D112, D394, SAF-T)
  - e-Factura - Ghid complet
  - TVA 2025 - Legea 141/2025 (Rate noi 21%/11%)
  - Închidere exercițiu financiar
  - Raportări financiare
  - Optimizare fiscală
  - Contabilitate avansată

- **HR & Payroll** (6 courses):
  - REVISAL - Registrul electronic de evidență
  - Calcul salariu și contribuții sociale
  - Contracte de muncă în România
  - Legislație muncă 2025
  - Concedii și absențe
  - Pontaje și foi de prezență

- **Business & Operations** (6 courses):
  - ERP pentru IMM-uri
  - Freelancing în România - Ghid complet
  - PFA vs SRL - Ce să alegi?
  - GDPR și protecția datelor
  - E-commerce și facturare
  - Managementul stocurilor

- **Technology & AI** (4 courses):
  - Automatizare procese contabile cu AI
  - OCR pentru facturi
  - Excel pentru contabili
  - Integrare SAGA v3.2

For EACH course, provide:
1. Title (Romanian)
2. Slug (URL-friendly)
3. Description (150-200 words)
4. Category
5. Level (Începător/Intermediar/Avansat)
6. Duration (hours)
7. Price (RON)
8. Modules (5-8 modules per course with titles)
9. Learning objectives (5-7 points)
10. Prerequisites
11. SEO metadata (title, description, keywords)

## 2. BLOG ARTICLES (Minimum 50 articles)

Create blog articles covering:
- **ANAF Compliance** (15 articles):
  - e-Factura obligatorie 2024-2025
  - SAF-T D406 - Ghid complet
  - Cum să depui declarații la ANAF
  - TVA 21% și 11% - Noile rate din August 2025
  - Penalități ANAF și cum să le eviți
  - [+ 10 more]

- **HR & Legislation** (12 articles):
  - Modificări Codul Muncii 2025
  - Salariu minim 2025
  - Cum să întocmești un contract de muncă
  - Concedii medicale - Proceduri
  - [+ 8 more]

- **Business Tips** (10 articles):
  - 10 greșeli frecvente în contabilitate
  - Cum să optimizezi cash flow-ul
  - Digitalizare procese contabile
  - [+ 7 more]

- **Technology & Innovation** (8 articles):
  - AI în contabilitate
  - Automatizare facturare
  - Cloud ERP vs Desktop
  - [+ 5 more]

- **News & Updates** (5 articles):
  - Noutăți legislative Q1 2025
  - ANAF - Noi facilități pentru business
  - [+ 3 more]

For EACH article, provide:
1. Title (Romanian, SEO-optimized)
2. Slug (URL-friendly)
3. Excerpt (150 words)
4. Full content (800-1500 words with proper structure)
5. Category
6. Tags (5-8 tags)
7. Author (default: "Echipa DocumentIulia.ro")
8. Publication date
9. Featured image description
10. SEO metadata

## 3. FORUM THREADS (Minimum 50 diverse threads)

Create forum discussions covering:
- **Întrebări Frecvente** (15 threads):
  - Cum depun D112 pentru prima dată?
  - Care este diferența dintre PFA și SRL?
  - Cum funcționează e-Factura?
  - [+ 12 more]

- **Rezolvare Probleme** (12 threads):
  - Eroare la upload SAF-T - cum rezolv?
  - ANAF respinge factura - ce să fac?
  - [+ 10 more]

- **Best Practices** (10 threads):
  - Organizarea documentelor contabile
  - Backup-uri și securitate date
  - [+ 8 more]

- **Discuții Generale** (8 threads):
  - Cum vă pregătiți pentru închiderea anului fiscal?
  - Experiențe cu inspectorii ANAF
  - [+ 6 more]

- **Noutăți & Actualizări** (5 threads):
  - TVA 21% - Cum vă afectează business-ul?
  - [+ 4 more]

For EACH thread, provide:
1. Title (Romanian)
2. Category
3. Initial post (200-400 words)
4. 3-5 realistic replies from community members
5. Tags
6. View count (realistic estimate)
7. Reply count
8. Creation date
9. Last activity date
10. Sticky/pinned status (if important)

## FORMAT REQUIREMENTS:

Return VALID JSON with this structure:
\`\`\`json
{
  "courses": [
    {
      "title": "...",
      "slug": "...",
      "description": "...",
      "category": "...",
      "level": "...",
      "duration": 0,
      "price": 0,
      "modules": [
        {
          "title": "...",
          "lessons": ["..."]
        }
      ],
      "objectives": ["..."],
      "prerequisites": ["..."],
      "seo": {
        "title": "...",
        "description": "...",
        "keywords": ["..."]
      }
    }
  ],
  "blog": [
    {
      "title": "...",
      "slug": "...",
      "excerpt": "...",
      "content": "...",
      "category": "...",
      "tags": ["..."],
      "author": "...",
      "publishedAt": "...",
      "featuredImage": "...",
      "seo": {
        "title": "...",
        "description": "...",
        "keywords": ["..."]
      }
    }
  ],
  "forum": [
    {
      "title": "...",
      "category": "...",
      "initialPost": "...",
      "replies": [
        {
          "author": "...",
          "content": "...",
          "createdAt": "..."
        }
      ],
      "tags": ["..."],
      "views": 0,
      "sticky": false,
      "createdAt": "...",
      "lastActivity": "..."
    }
  ]
}
\`\`\`

CRITICAL REQUIREMENTS:
1. All content in ROMANIAN with proper diacritics
2. Professional, accurate, and SEO-optimized
3. Reflects current Romanian legislation (2025)
4. Practical, actionable content
5. Valid JSON format (escape quotes, proper syntax)
6. Minimum quantities met (24 courses, 50 blog articles, 50 forum threads)
7. Dates in ISO 8601 format

Generate the COMPLETE content now.
`;

  try {
    console.log('⏳ Generating content (this may take 2-3 minutes)...\n');

    const { text } = await generateText({
      model: xai('grok-2-1212'),
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.7,
      maxTokens: 16000, // Maximum for comprehensive content
    });

    console.log('\n✅ Content generated successfully!\n');
    console.log('━'.repeat(80));

    // Save raw response
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rawOutputPath = path.join(process.cwd(), 'logs', `grok-content-raw-${timestamp}.txt`);

    // Ensure logs directory exists
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    fs.writeFileSync(rawOutputPath, text);
    console.log(`📄 Raw response saved to: ${rawOutputPath}\n`);

    // Try to parse as JSON
    try {
      // Extract JSON from markdown code blocks if present
      let jsonText = text;
      const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const contentData = JSON.parse(jsonText);

      // Save structured JSON
      const jsonOutputPath = path.join(process.cwd(), 'backend', 'prisma', 'seed-data', `grok-generated-content-${timestamp}.json`);
      fs.writeFileSync(jsonOutputPath, JSON.stringify(contentData, null, 2));
      console.log(`✅ Structured JSON saved to: ${jsonOutputPath}\n`);

      // Generate summary
      const summary = {
        generatedAt: new Date().toISOString(),
        counts: {
          courses: contentData.courses?.length || 0,
          blogArticles: contentData.blog?.length || 0,
          forumThreads: contentData.forum?.length || 0,
        },
        categories: {
          courses: [...new Set(contentData.courses?.map((c: any) => c.category) || [])],
          blog: [...new Set(contentData.blog?.map((b: any) => b.category) || [])],
          forum: [...new Set(contentData.forum?.map((f: any) => f.category) || [])],
        },
        files: {
          rawText: rawOutputPath,
          structuredJson: jsonOutputPath,
        },
      };

      const summaryPath = path.join(process.cwd(), 'logs', `grok-content-summary-${timestamp}.json`);
      fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

      console.log('📊 CONTENT GENERATION SUMMARY:');
      console.log('━'.repeat(80));
      console.log(`📚 Courses: ${summary.counts.courses}`);
      console.log(`📝 Blog Articles: ${summary.counts.blogArticles}`);
      console.log(`💬 Forum Threads: ${summary.counts.forumThreads}`);
      console.log('━'.repeat(80));
      console.log(`\n📁 Summary saved to: ${summaryPath}\n`);

      console.log('\n✅ NEXT STEPS:');
      console.log('1. Review the generated content in the JSON file');
      console.log('2. Run the seed script to import into database:');
      console.log(`   cd backend && npx ts-node prisma/seed-data/import-grok-content.ts ${path.basename(jsonOutputPath)}`);
      console.log('3. Verify content appears on frontend');
      console.log('4. Make any necessary adjustments\n');

    } catch (parseError) {
      console.error('⚠️  Could not parse as JSON. Content saved as raw text.');
      console.error('Parse error:', parseError instanceof Error ? parseError.message : parseError);
      console.log('\nPlease review the raw output and manually format as needed.\n');
    }

  } catch (error) {
    console.error('❌ Error generating content:', error);

    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }

    process.exit(1);
  }
}

// Main execution
generateContent().catch(console.error);
