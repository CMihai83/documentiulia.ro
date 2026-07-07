#!/usr/bin/env node

/**
 * Grok Content Generation - Phase 2: Blog Articles (Fixed)
 */

import { generateText } from 'ai';
import { createXai } from '@ai-sdk/xai';
import * as fs from 'fs';
import * as path from 'path';

const xai = createXai({
  apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY,
});

async function generateBlogArticles(): Promise<void> {
  console.log('\n📝 Generating 25 Blog Articles (Batch 1 of 2)...\n');
  console.log('━'.repeat(80));

  const prompt = `Generate 25 blog article summaries for DocumentIulia.ro in Romanian.

Create articles covering ANAF compliance, HR, business tips, and technology topics.

Return ONLY a JSON array with this simplified structure:

[
  {
    "title": "SEO-optimized title in Romanian",
    "slug": "url-friendly-slug",
    "excerpt": "100-word summary",
    "category": "ANAF | HR | Business | Tehnologie",
    "tags": ["tag1", "tag2", "tag3"],
    "author": "Echipa DocumentIulia.ro",
    "publishedAt": "2024-12-15T10:00:00Z",
    "readTime": 8
  }
]

Generate 25 diverse articles covering:
- e-Factura implementation (3 articles)
- SAF-T D406 reporting (2 articles)
- TVA 21%/11% new rates (2 articles)
- ANAF penalties and procedures (2 articles)
- HR legislation changes 2025 (3 articles)
- Employment contracts (2 articles)
- Salary calculations (2 articles)
- Business accounting tips (3 articles)
- Digital transformation (2 articles)
- AI in accounting (2 articles)
- Cloud ERP (2 articles)

Return ONLY the JSON array, no other text.`;

  try {
    const { text } = await generateText({
      model: xai('grok-2-1212'),
      prompt,
      temperature: 0.7,
      maxTokens: 6000,
    });

    console.log('\n✅ Articles generated!\n');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    // Save raw output first
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const rawPath = path.join(logsDir, `blog-raw-${timestamp}.txt`);
    fs.writeFileSync(rawPath, text);
    console.log(`📄 Raw output saved: ${rawPath}\n`);

    // Extract JSON
    let jsonText = text.trim();
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1].trim();
    }
    // Remove any leading/trailing text
    const arrayStart = jsonText.indexOf('[');
    const arrayEnd = jsonText.lastIndexOf(']') + 1;
    if (arrayStart >= 0 && arrayEnd > arrayStart) {
      jsonText = jsonText.substring(arrayStart, arrayEnd);
    }

    const articles = JSON.parse(jsonText);

    // Save to seed data
    const seedDataDir = path.join(process.cwd(), 'backend', 'prisma', 'seed-data');
    if (!fs.existsSync(seedDataDir)) {
      fs.mkdirSync(seedDataDir, { recursive: true });
    }

    const outputPath = path.join(seedDataDir, `blog-batch1-${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));

    console.log(`📝 ${articles.length} articles saved to: ${outputPath}\n`);
    console.log('✅ Batch 1 complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateBlogArticles().catch(console.error);
