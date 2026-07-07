#!/usr/bin/env node

/**
 * Grok Content Generation - Phase 2: Blog Articles
 * Generates 50 comprehensive Romanian blog articles
 */

import { generateText } from 'ai';
import { createXai } from '@ai-sdk/xai';
import * as fs from 'fs';
import * as path from 'path';

const xai = createXai({
  apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY,
});

async function generateBlogArticles(): Promise<void> {
  console.log('\n📝 Generating 50 Blog Articles...\n');
  console.log('━'.repeat(80));

  const prompt = `Generate 50 COMPLETE, production-ready blog articles for DocumentIulia.ro in ROMANIAN.

CATEGORIES & ARTICLE TOPICS:

**ANAF & Compliance (15 articles):**
1. e-Factura Obligatorie 2024-2025: Ghid Complet pentru Business
2. SAF-T D406: Ce Trebuie să Știi despre Raportarea Lunară
3. Cum să Depui Declarații la ANAF Online - Pas cu Pas
4. TVA 21% și 11%: Noile Rate din August 2025 - Ghid Practic
5. Penalități ANAF: Tipuri, Calcul și Cum să le Eviți
6. SPV e-Factura: Autentificare și Utilizare Practică
7. DUKIntegrator: Validare SAF-T înainte de Trimitere
8. Declarația 112: Erori Frecvente și Soluții
9. Declarația 394: Raportare TVA Corectă
10. ANAF: Termene Fiscale 2025 - Calendar Complet
11. Inspecții Fiscale: Cum să Te Pregătești
12. Reverse Charge: Când și Cum se Aplică
13. Facturi Corective: Proceduri și Termene
14. CUI și CIF: Diferențe și Verificare Online
15. Certificat Constatator ANAF: Obținere Online

**HR & Legislația Muncii (12 articles):**
16. Modificări Codul Muncii 2025: Ce Se Schimbă
17. Salariu Minim 2025: Actualizări și Impact
18. Cum să Întocmești un Contract de Muncă Conform Legii
19. Concedii Medicale: Proceduri și Drepturi 2025
20. Munca de Acasă: Cadru Legal și Contracte
21. Concediul de Odihnă: Calcul și Planificare
22. Concedierea: Tipuri, Proceduri și Drepturi
23. Zile Libere Legale 2025: Calendar Complet
24. Asigurări Sociale Obligatorii: Ghid 2025
25. Contracte PFA: Tipuri și Specificații
26. Salariu Brut vs Net: Calculator și Explicații
27. Indexare Salarii: Când și Cum se Aplică

**Business & Antreprenoriat (10 articles):**
28. 10 Greșeli Frecvente în Contabilitatea IMM-urilor
29. Cum să Optimizezi Cash Flow-ul Afacerii Tale
30. Digitalizare Procese Contabile: De Unde să Începi
31. Gestiune Stocuri Eficientă pentru E-commerce
32. Facturare Recurentă: Automatizare și Best Practices
33. Raportări Financiare: Ce Trebuie să Monitorizezi
34. Buget Business 2025: Planificare Strategică
35. Active Fixe: Achiziție, Amortizare, Evidență
36. Fonduri Europene: Oportunități pentru IMM-uri 2025
37. Business Plan: Structură și Exemple Practice

**Tehnologie & Inovație (8 articles):**
38. AI în Contabilitate: Cazuri de Utilizare Practice
39. Automatizare Facturare: Instrumente și Beneficii
40. Cloud ERP vs Desktop: Avantaje și Dezavantaje
41. OCR pentru Facturi: Cum Funcționează și Ce Economisește
42. Securitate Date: GDPR și Best Practices
43. Integrări API: Conectare SAGA, e-Factura, Bănci
44. Backup-uri Automate: Protejează-ți Datele
45. Mobile Apps pentru Contabilitate: Top 2025

**Noutăți & Actualizări (5 articles):**
46. Noutăți Legislative Q1 2025: Ce Se Schimbă în Business
47. ANAF: Noi Facilități pentru Contribuabili 2025
48. Transformare Digitală: Tendințe în Contabilitate 2025
49. Legislație UE: Impact pe Piața Românească
50. Programe Guvernamentale IMM: Start-Up Nation 2025

For EACH article provide in JSON format:

\`\`\`json
{
  "title": "SEO-optimized title in Romanian",
  "slug": "url-friendly-slug",
  "excerpt": "150-word engaging excerpt summarizing the article",
  "content": "800-1500 word FULL article content in Romanian with:
    - Introduction (100-150 words)
    - Main sections with H2/H3 headings (use ## and ###)
    - Practical examples and lists
    - Actionable tips and recommendations
    - Conclusion with key takeaways
    - Use Markdown formatting",
  "category": "ANAF & Compliance | HR & Legislația Muncii | Business & Antreprenoriat | Tehnologie & Inovație | Noutăți & Actualizări",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "author": "Echipa DocumentIulia.ro",
  "publishedAt": "2024-12-01T10:00:00Z" (vary dates between Dec 2024 - Jan 2025),
  "featuredImage": "Description of what the featured image should show",
  "readTime": minutes (5-12),
  "seo": {
    "title": "SEO title 60 chars max",
    "description": "SEO description 155 chars max",
    "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"]
  }
}
\`\`\`

CRITICAL REQUIREMENTS:
- All content in ROMANIAN with proper diacritics
- Full article content (800-1500 words each)
- Accurate information reflecting 2025 Romanian legislation
- Practical, actionable content
- SEO-optimized
- Return ONLY valid JSON array

Generate ALL 50 articles now (split into 2 responses if needed):`;

  try {
    const { text } = await generateText({
      model: xai('grok-2-1212'),
      prompt,
      temperature: 0.7,
      maxTokens: 12000,
    });

    console.log('\n✅ Blog articles generated!\n');

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

    const articles = JSON.parse(jsonText);

    // Save to seed data
    const seedDataDir = path.join(process.cwd(), 'backend', 'prisma', 'seed-data');
    if (!fs.existsSync(seedDataDir)) {
      fs.mkdirSync(seedDataDir, { recursive: true });
    }

    const outputPath = path.join(seedDataDir, `blog-generated-${timestamp}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));

    console.log(`📝 ${articles.length} blog articles saved to: ${outputPath}\n`);
    console.log('✅ Phase 2 complete!\n');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

generateBlogArticles().catch(console.error);
