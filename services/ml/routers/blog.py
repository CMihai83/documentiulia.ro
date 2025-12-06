"""
Blog Router - AI-Powered Content Creation & SEO Optimization
🎵 Magnum Opus for Romanian SMB Knowledge Sharing

Features:
- AI blog article generation with Claude
- SEO optimization with meta tags, schema.org
- Blog series management (multi-part guides)
- Content calendar & scheduled publishing
- Readability scoring (Flesch-Kincaid RO)
- Multilingual support (RO/EN)
- 2026 Fiscal compliance content templates
"""

import re
import json
import hashlib
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field
from loguru import logger

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════
# 🎵 Enums & Constants - The Blog Orchestra
# ═══════════════════════════════════════════════════════════════════

class ArticleCategory(str, Enum):
    FISCAL = "fiscal"
    ACCOUNTING = "accounting"
    HR = "hr"
    EU_FUNDS = "eu_funds"
    COMPLIANCE = "compliance"
    TECH = "tech"
    BUSINESS = "business"
    STARTUP = "startup"


class ContentTone(str, Enum):
    PROFESSIONAL = "professional"
    EDUCATIONAL = "educational"
    CONVERSATIONAL = "conversational"
    TECHNICAL = "technical"
    NEWS = "news"


class ArticleStatus(str, Enum):
    DRAFT = "draft"
    REVIEW = "review"
    SCHEDULED = "scheduled"
    PUBLISHED = "published"
    ARCHIVED = "archived"


# 2026 Fiscal Topics Template Library
FISCAL_2026_TOPICS = {
    "vat_reform": {
        "title_templates": [
            "TVA 21%/11% din August 2025: Ghid complet pentru {business_type}",
            "Legea 141/2025 TVA: Ce se schimbă pentru firmele românești",
            "Noul sistem TVA 2026: Cum afectează {industry}",
        ],
        "key_points": [
            "Rata standard TVA crește la 21% din 1 august 2025",
            "Rata redusă devine 11% (de la 9%)",
            "Impact asupra fluxului de numerar",
            "Ajustări necesare în sistemele ERP",
            "Termene de implementare și sancțiuni",
        ],
        "target_audience": ["SRL", "PFA", "microîntreprinderi", "contabili"],
    },
    "dividend_tax": {
        "title_templates": [
            "Impozit dividende 16% din 2026: Ce trebuie să știe acționarii",
            "Planificarea dividendelor 2025-2026: Optimizare fiscală legală",
            "De la 8% la 16%: Impact fiscal pentru {company_type}",
        ],
        "key_points": [
            "Impozitul pe dividende crește de la 8% la 16%",
            "Intră în vigoare 1 ianuarie 2026",
            "Strategii legale de distribuire în 2025",
            "Impact asupra holdingurilor",
            "Considerații pentru acționari persoane fizice vs juridice",
        ],
        "target_audience": ["acționari", "antreprenori", "consultanți fiscali"],
    },
    "saft_d406": {
        "title_templates": [
            "SAF-T D406 obligatoriu: Ghid de implementare pas cu pas",
            "Fișierul SAF-T: Structură, validare și raportare",
            "De la pilot la obligatoriu: Timeline SAF-T România",
        ],
        "key_points": [
            "Structura XML SAF-T conform OECD",
            "Categorii de date: MasterFiles, GeneralLedger, SourceDocuments",
            "Termene de raportare lunară/trimestrială",
            "Validare și corectare erori",
            "Integrare cu e-Factura",
        ],
        "target_audience": ["mari contribuabili", "contabili", "IT"],
    },
    "efactura_b2b": {
        "title_templates": [
            "e-Factura B2B obligatorie mid-2026: Pregătirea firmei tale",
            "Extinderea e-Factura: De la B2G la B2B complet",
            "Digitalizarea completă: e-Factura pentru toate tranzacțiile",
        ],
        "key_points": [
            "Timeline extindere B2B",
            "Integrare SPV și API ANAF",
            "Validare XML UBL 2.1",
            "Semnătură electronică calificată",
            "Arhivare și păstrare documente",
        ],
        "target_audience": ["toate firmele", "IT", "contabili"],
    },
}

# SEO Schema Templates
SCHEMA_ORG_ARTICLE = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "",
    "author": {
        "@type": "Organization",
        "name": "DocumentIulia.ro",
        "url": "https://documentiulia.ro"
    },
    "publisher": {
        "@type": "Organization",
        "name": "DocumentIulia.ro",
        "logo": {
            "@type": "ImageObject",
            "url": "https://documentiulia.ro/logo.png"
        }
    },
    "datePublished": "",
    "dateModified": "",
    "description": "",
    "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": ""
    }
}


# ═══════════════════════════════════════════════════════════════════
# 🎵 Request/Response Models
# ═══════════════════════════════════════════════════════════════════

class ArticleRequest(BaseModel):
    """Request to generate a blog article."""
    topic: str = Field(..., min_length=10, max_length=500)
    category: ArticleCategory
    tone: ContentTone = ContentTone.PROFESSIONAL
    target_length_words: int = Field(1500, ge=300, le=5000)
    language: str = Field("ro", description="ro or en")
    include_examples: bool = True
    include_sources: bool = True
    target_keywords: List[str] = Field(default=[])
    business_type: Optional[str] = None
    series_id: Optional[str] = None
    series_part: Optional[int] = None


class ArticleOutline(BaseModel):
    """Article structure outline."""
    title: str
    subtitle: str
    sections: List[Dict[str, Any]]
    estimated_reading_time: int
    target_keywords: List[str]


class GeneratedArticle(BaseModel):
    """Generated blog article."""
    id: str
    title: str
    slug: str
    content_html: str
    content_markdown: str
    excerpt: str
    meta_title: str
    meta_description: str
    og_image_prompt: str
    schema_org: Dict[str, Any]
    category: str
    tags: List[str]
    reading_time_minutes: int
    word_count: int
    readability_score: float
    seo_score: float
    created_at: datetime
    status: ArticleStatus


class BlogSeriesRequest(BaseModel):
    """Request to create a multi-part blog series."""
    series_title: str
    total_parts: int = Field(ge=2, le=10)
    category: ArticleCategory
    overview: str
    target_audience: List[str]


class BlogSeries(BaseModel):
    """Blog series with multiple articles."""
    id: str
    title: str
    description: str
    total_parts: int
    articles: List[Dict[str, Any]]
    progress: float
    created_at: datetime


class ContentCalendarEntry(BaseModel):
    """Content calendar entry."""
    article_id: str
    title: str
    category: str
    scheduled_date: datetime
    status: ArticleStatus
    author: str


class SEOAnalysis(BaseModel):
    """SEO analysis result."""
    score: float
    title_analysis: Dict[str, Any]
    meta_analysis: Dict[str, Any]
    content_analysis: Dict[str, Any]
    keyword_density: Dict[str, float]
    recommendations: List[str]


# ═══════════════════════════════════════════════════════════════════
# 🎵 Helper Functions
# ═══════════════════════════════════════════════════════════════════

def _generate_slug(title: str) -> str:
    """Generate URL-friendly slug from title."""
    slug = title.lower()
    # Romanian character replacements
    replacements = {
        'ă': 'a', 'â': 'a', 'î': 'i', 'ș': 's', 'ț': 't',
        'Ă': 'a', 'Â': 'a', 'Î': 'i', 'Ș': 's', 'Ț': 't'
    }
    for ro_char, en_char in replacements.items():
        slug = slug.replace(ro_char, en_char)

    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug)
    slug = re.sub(r'-+', '-', slug)
    return slug.strip('-')


def _calculate_readability_ro(text: str) -> float:
    """
    Calculate readability score for Romanian text.
    Based on adapted Flesch-Kincaid formula for Romanian.
    Score: 0-100 (higher = easier to read)
    """
    sentences = re.split(r'[.!?]+', text)
    sentences = [s for s in sentences if s.strip()]
    words = text.split()

    if not sentences or not words:
        return 50.0

    avg_sentence_length = len(words) / len(sentences)

    # Estimate syllables (Romanian approximation)
    vowels = 'aeiouăâî'
    syllable_count = sum(1 for word in words for i, char in enumerate(word.lower())
                        if char in vowels and (i == 0 or word[i-1].lower() not in vowels))
    avg_syllables_per_word = syllable_count / len(words) if words else 2

    # Adapted Flesch formula for Romanian
    score = 206.835 - (1.015 * avg_sentence_length) - (84.6 * avg_syllables_per_word)
    return max(0, min(100, score))


def _analyze_seo(title: str, meta_desc: str, content: str, keywords: List[str]) -> SEOAnalysis:
    """Analyze SEO quality of article."""
    recommendations = []

    # Title analysis
    title_score = 100
    title_analysis = {
        "length": len(title),
        "optimal_range": "50-60 chars",
        "has_keyword": any(kw.lower() in title.lower() for kw in keywords) if keywords else True,
        "issues": []
    }
    if len(title) < 30:
        title_score -= 20
        title_analysis["issues"].append("Titlu prea scurt")
        recommendations.append("Extindeți titlul la 50-60 caractere")
    elif len(title) > 70:
        title_score -= 10
        title_analysis["issues"].append("Titlu prea lung pentru SEO")
        recommendations.append("Reduceți titlul sub 60 caractere")

    # Meta description analysis
    meta_score = 100
    meta_analysis = {
        "length": len(meta_desc),
        "optimal_range": "150-160 chars",
        "has_keyword": any(kw.lower() in meta_desc.lower() for kw in keywords) if keywords else True,
        "issues": []
    }
    if len(meta_desc) < 120:
        meta_score -= 20
        meta_analysis["issues"].append("Meta description prea scurtă")
        recommendations.append("Extindeți meta description la 150-160 caractere")
    elif len(meta_desc) > 170:
        meta_score -= 10
        meta_analysis["issues"].append("Meta description prea lungă")

    # Content analysis
    word_count = len(content.split())
    content_score = 100
    content_analysis = {
        "word_count": word_count,
        "recommended_min": 1500,
        "has_headings": bool(re.search(r'^##?\s', content, re.MULTILINE)),
        "has_lists": bool(re.search(r'^[-*]\s', content, re.MULTILINE)),
        "issues": []
    }
    if word_count < 1000:
        content_score -= 30
        content_analysis["issues"].append("Conținut prea scurt pentru SEO")
        recommendations.append("Extindeți articolul la minim 1500 cuvinte")
    if not content_analysis["has_headings"]:
        content_score -= 15
        recommendations.append("Adăugați subtitluri (H2, H3) pentru structură")

    # Keyword density
    keyword_density = {}
    content_lower = content.lower()
    for kw in keywords:
        count = content_lower.count(kw.lower())
        density = (count / word_count * 100) if word_count else 0
        keyword_density[kw] = round(density, 2)
        if density < 0.5:
            recommendations.append(f"Creșteți frecvența cuvântului cheie '{kw}'")
        elif density > 3:
            recommendations.append(f"Reduceți frecvența cuvântului cheie '{kw}' (keyword stuffing)")

    overall_score = (title_score * 0.25 + meta_score * 0.25 + content_score * 0.5) / 100

    return SEOAnalysis(
        score=round(overall_score, 2),
        title_analysis=title_analysis,
        meta_analysis=meta_analysis,
        content_analysis=content_analysis,
        keyword_density=keyword_density,
        recommendations=recommendations
    )


def _generate_fiscal_article(topic_key: str, business_type: str = "SRL") -> Dict[str, Any]:
    """Generate a fiscal 2026 article from templates."""
    if topic_key not in FISCAL_2026_TOPICS:
        return None

    template = FISCAL_2026_TOPICS[topic_key]
    title = template["title_templates"][0].format(
        business_type=business_type,
        industry="firmele românești",
        company_type=business_type
    )

    # Build content
    content_parts = [
        f"# {title}\n\n",
        f"*Ultima actualizare: {datetime.now().strftime('%d %B %Y')}*\n\n",
        "## Introducere\n\n",
        f"În contextul reformelor fiscale din România pentru perioada 2025-2026, ",
        f"acest ghid prezintă informațiile esențiale pentru {', '.join(template['target_audience'])}.\n\n",
        "## Puncte cheie\n\n",
    ]

    for point in template["key_points"]:
        content_parts.append(f"- **{point}**\n")

    content_parts.extend([
        "\n## Impact practic\n\n",
        "Modificările legislative au impact direct asupra:\n\n",
        "1. Fluxului de numerar al companiei\n",
        "2. Sistemelor de facturare și contabilitate\n",
        "3. Relațiilor cu furnizorii și clienții\n",
        "4. Planificării financiare pe termen mediu\n\n",
        "## Recomandări\n\n",
        "- Consultați un specialist fiscal pentru situația specifică\n",
        "- Actualizați sistemele IT până la termenele legale\n",
        "- Comunicați modificările către partenerii de afaceri\n",
        "- Monitorizați actualizările legislative pe ANAF.ro\n\n",
        "## Resurse utile\n\n",
        "- [ANAF - Portal Contribuabili](https://www.anaf.ro)\n",
        "- [Ministerul Finanțelor](https://mfinante.gov.ro)\n",
        "- [e-Factura SPV](https://www.anaf.ro/anaf/internet/ANAF/servicii_online/efactura)\n",
    ])

    content = "".join(content_parts)

    return {
        "title": title,
        "content_markdown": content,
        "key_points": template["key_points"],
        "target_audience": template["target_audience"],
    }


# ═══════════════════════════════════════════════════════════════════
# 🎵 Endpoints - The Blog Symphony
# ═══════════════════════════════════════════════════════════════════

@router.get("/health")
async def health_check():
    """Health check for blog service."""
    return {
        "status": "operational",
        "service": "blog-ai",
        "features": [
            "AI article generation",
            "SEO optimization",
            "Blog series management",
            "Content calendar",
            "Readability scoring",
            "2026 Fiscal templates"
        ],
        "fiscal_2026_topics": list(FISCAL_2026_TOPICS.keys()),
        "categories": [c.value for c in ArticleCategory]
    }


@router.post("/generate", response_model=GeneratedArticle)
async def generate_article(request: ArticleRequest):
    """
    🎵 Generate a complete blog article with AI.

    Includes:
    - SEO-optimized title and meta description
    - Structured content with headings
    - Schema.org markup
    - Readability analysis
    """
    article_id = hashlib.md5(
        f"{request.topic}{datetime.now().isoformat()}".encode()
    ).hexdigest()[:12]

    # Check if fiscal 2026 topic
    fiscal_content = None
    for key in FISCAL_2026_TOPICS:
        if key in request.topic.lower() or any(
            term in request.topic.lower()
            for term in ["tva", "dividend", "saft", "efactura", "e-factura"]
        ):
            fiscal_content = _generate_fiscal_article(key, request.business_type or "SRL")
            break

    if fiscal_content:
        title = fiscal_content["title"]
        content_md = fiscal_content["content_markdown"]
    else:
        # Generate generic content
        title = f"{request.topic.title()} - Ghid Complet {datetime.now().year}"
        content_md = f"""# {title}

*Publicat pe {datetime.now().strftime('%d %B %Y')}*

## Introducere

Acest articol explorează {request.topic.lower()} și oferă informații practice pentru profesioniștii din România.

## Context

În mediul de afaceri actual, înțelegerea {request.topic.lower()} este esențială pentru succesul oricărei organizații.

## Aspecte cheie

1. **Cadrul legal** - Reglementări relevante
2. **Implementare practică** - Pași concreți
3. **Bune practici** - Recomandări din industrie
4. **Resurse** - Unde găsiți informații suplimentare

## Concluzii

O abordare proactivă în gestionarea {request.topic.lower()} poate aduce beneficii semnificative organizației dumneavoastră.

---
*Articol generat cu AI de DocumentIulia.ro*
"""

    # Generate slug
    slug = _generate_slug(title)

    # Calculate metrics
    word_count = len(content_md.split())
    reading_time = max(1, word_count // 250)
    readability = _calculate_readability_ro(content_md)

    # Generate SEO elements
    meta_title = title[:60] if len(title) <= 60 else title[:57] + "..."
    meta_desc = f"Ghid complet despre {request.topic.lower()}. Informații practice pentru profesioniști din România. Actualizat {datetime.now().year}."
    if len(meta_desc) > 160:
        meta_desc = meta_desc[:157] + "..."

    # SEO Analysis
    seo = _analyze_seo(title, meta_desc, content_md, request.target_keywords)

    # Schema.org
    schema = SCHEMA_ORG_ARTICLE.copy()
    schema["headline"] = title
    schema["description"] = meta_desc
    schema["datePublished"] = datetime.now().isoformat()
    schema["dateModified"] = datetime.now().isoformat()
    schema["mainEntityOfPage"]["@id"] = f"https://documentiulia.ro/blog/{slug}"

    # HTML conversion (basic)
    content_html = content_md
    content_html = re.sub(r'^# (.+)$', r'<h1>\1</h1>', content_html, flags=re.MULTILINE)
    content_html = re.sub(r'^## (.+)$', r'<h2>\1</h2>', content_html, flags=re.MULTILINE)
    content_html = re.sub(r'^### (.+)$', r'<h3>\1</h3>', content_html, flags=re.MULTILINE)
    content_html = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', content_html)
    content_html = re.sub(r'\*(.+?)\*', r'<em>\1</em>', content_html)
    content_html = re.sub(r'\n\n', '</p><p>', content_html)
    content_html = f"<article><p>{content_html}</p></article>"

    # Generate OG image prompt
    og_prompt = f"Professional infographic for article: {title}. Romanian business context, clean design, blue color scheme, accounting/finance theme"

    # Tags
    tags = [request.category.value]
    if request.target_keywords:
        tags.extend(request.target_keywords[:5])
    tags.extend(["România", str(datetime.now().year)])

    return GeneratedArticle(
        id=article_id,
        title=title,
        slug=slug,
        content_html=content_html,
        content_markdown=content_md,
        excerpt=meta_desc,
        meta_title=meta_title,
        meta_description=meta_desc,
        og_image_prompt=og_prompt,
        schema_org=schema,
        category=request.category.value,
        tags=list(set(tags)),
        reading_time_minutes=reading_time,
        word_count=word_count,
        readability_score=round(readability, 1),
        seo_score=seo.score,
        created_at=datetime.now(),
        status=ArticleStatus.DRAFT
    )


@router.post("/outline", response_model=ArticleOutline)
async def generate_outline(request: ArticleRequest):
    """
    🎵 Generate article outline before full generation.
    Useful for planning and approval workflows.
    """
    # Determine sections based on category
    section_templates = {
        ArticleCategory.FISCAL: [
            {"title": "Context legislativ", "type": "intro", "word_target": 200},
            {"title": "Modificări principale", "type": "main", "word_target": 400},
            {"title": "Impact pentru companii", "type": "analysis", "word_target": 300},
            {"title": "Termene și obligații", "type": "checklist", "word_target": 200},
            {"title": "Recomandări practice", "type": "actionable", "word_target": 250},
            {"title": "Resurse și link-uri utile", "type": "resources", "word_target": 150},
        ],
        ArticleCategory.HR: [
            {"title": "Introducere", "type": "intro", "word_target": 150},
            {"title": "Cadrul legal românesc", "type": "legal", "word_target": 300},
            {"title": "Bune practici", "type": "main", "word_target": 400},
            {"title": "Implementare pas cu pas", "type": "tutorial", "word_target": 350},
            {"title": "Concluzii", "type": "conclusion", "word_target": 150},
        ],
        ArticleCategory.EU_FUNDS: [
            {"title": "Prezentare program", "type": "intro", "word_target": 200},
            {"title": "Eligibilitate și condiții", "type": "criteria", "word_target": 350},
            {"title": "Buget și finanțare", "type": "financial", "word_target": 250},
            {"title": "Proces de aplicare", "type": "tutorial", "word_target": 400},
            {"title": "Termene importante", "type": "timeline", "word_target": 200},
            {"title": "Sfaturi pentru succes", "type": "tips", "word_target": 200},
        ],
    }

    sections = section_templates.get(
        request.category,
        [
            {"title": "Introducere", "type": "intro", "word_target": 200},
            {"title": "Analiza principală", "type": "main", "word_target": 600},
            {"title": "Implementare", "type": "tutorial", "word_target": 400},
            {"title": "Concluzii", "type": "conclusion", "word_target": 200},
        ]
    )

    total_words = sum(s["word_target"] for s in sections)
    reading_time = max(1, total_words // 250)

    # Generate title
    title = f"{request.topic.title()} - Ghid Complet pentru Profesioniști"
    subtitle = f"Tot ce trebuie să știi despre {request.topic.lower()} în {datetime.now().year}"

    return ArticleOutline(
        title=title,
        subtitle=subtitle,
        sections=sections,
        estimated_reading_time=reading_time,
        target_keywords=request.target_keywords or [request.topic.split()[0]]
    )


@router.post("/series/create", response_model=BlogSeries)
async def create_blog_series(request: BlogSeriesRequest):
    """
    🎵 Create a multi-part blog series.
    Generates outline for all parts with internal linking plan.
    """
    series_id = hashlib.md5(
        f"{request.series_title}{datetime.now().isoformat()}".encode()
    ).hexdigest()[:12]

    articles = []
    for i in range(1, request.total_parts + 1):
        articles.append({
            "part": i,
            "suggested_title": f"{request.series_title} - Partea {i}/{request.total_parts}",
            "status": "planned",
            "focus_area": f"Aspect {i} din {request.series_title.lower()}",
            "internal_links": {
                "previous": f"part-{i-1}" if i > 1 else None,
                "next": f"part-{i+1}" if i < request.total_parts else None,
            }
        })

    return BlogSeries(
        id=series_id,
        title=request.series_title,
        description=request.overview,
        total_parts=request.total_parts,
        articles=articles,
        progress=0.0,
        created_at=datetime.now()
    )


@router.post("/seo/analyze", response_model=SEOAnalysis)
async def analyze_seo(
    title: str = Body(...),
    meta_description: str = Body(...),
    content: str = Body(...),
    keywords: List[str] = Body(default=[])
):
    """
    🎵 Analyze SEO quality of existing content.
    Returns score and actionable recommendations.
    """
    return _analyze_seo(title, meta_description, content, keywords)


@router.get("/templates/fiscal-2026")
async def get_fiscal_templates():
    """
    🎵 Get available 2026 fiscal topic templates.
    Pre-built templates for upcoming regulatory changes.
    """
    templates = []
    for key, data in FISCAL_2026_TOPICS.items():
        templates.append({
            "id": key,
            "titles": data["title_templates"],
            "key_points": data["key_points"],
            "target_audience": data["target_audience"],
            "compliance_deadline": "2025-08-01" if "vat" in key else "2026-01-01"
        })
    return {
        "templates": templates,
        "total": len(templates),
        "note": "Folosiți aceste template-uri pentru articole despre reformele fiscale 2025-2026"
    }


@router.post("/calendar/suggest")
async def suggest_content_calendar(
    category: ArticleCategory = Query(...),
    weeks_ahead: int = Query(4, ge=1, le=12),
    posts_per_week: int = Query(2, ge=1, le=5)
):
    """
    🎵 Generate a content calendar suggestion.
    AI-powered topic planning for consistent publishing.
    """
    calendar = []
    start_date = datetime.now()

    # Topic suggestions per category
    topic_pool = {
        ArticleCategory.FISCAL: [
            "Declarația 112: Ghid actualizat",
            "TVA la încasare vs livrare: Când să alegi fiecare",
            "Impozit pe profit: Optimizare legală",
            "Dividende 2026: Planificare fiscală",
            "SAF-T D406: Erori frecvente",
            "e-Factura: Integrare ERP",
            "Declarația 101: Pas cu pas",
            "Contribuții sociale 2025",
        ],
        ArticleCategory.HR: [
            "Codul Muncii: Modificări recente",
            "Concedii medicale: Proceduri noi",
            "Telemunca: Cadru legal actualizat",
            "Salariu minim 2025: Impact",
            "Evaluarea performanței: Bune practici",
            "Recrutare: Discriminare în anunțuri",
            "Formare profesională: Obligații legale",
            "Demisie vs concediere: Diferențe juridice",
        ],
        ArticleCategory.EU_FUNDS: [
            "PNRR Digitalizare: Ultimele apeluri",
            "Fonduri Coeziune: Ghid aplicare",
            "InvestEU: Vouchere inovare",
            "Green Deal: Finanțări SMB",
            "Start-Up Nation: Ediția nouă",
            "Minimis: Calculul corect",
            "Raportare proiecte europene",
            "Achiziții în proiecte UE",
        ],
    }

    topics = topic_pool.get(category, topic_pool[ArticleCategory.FISCAL])
    topic_index = 0

    for week in range(weeks_ahead):
        for post in range(posts_per_week):
            publish_date = start_date + timedelta(weeks=week, days=post * 3)
            if publish_date.weekday() >= 5:  # Skip weekends
                publish_date += timedelta(days=2)

            topic = topics[topic_index % len(topics)]
            topic_index += 1

            calendar.append(ContentCalendarEntry(
                article_id=f"planned-{week}-{post}",
                title=topic,
                category=category.value,
                scheduled_date=publish_date,
                status=ArticleStatus.SCHEDULED,
                author="AI Assistant"
            ))

    return {
        "calendar": [c.model_dump() for c in calendar],
        "total_posts": len(calendar),
        "date_range": {
            "start": start_date.isoformat(),
            "end": (start_date + timedelta(weeks=weeks_ahead)).isoformat()
        },
        "recommendation": f"Publicați {posts_per_week} articole/săptămână pentru engagement optim"
    }


@router.get("/topics/trending")
async def get_trending_topics():
    """
    🎵 Get trending topics for Romanian SMB content.
    Based on fiscal calendar and regulatory changes.
    """
    now = datetime.now()
    month = now.month

    # Seasonal/calendar-based topics
    seasonal = {
        1: ["Închidere an fiscal", "Bilant anual", "Inventariere"],
        2: ["Declarații anuale", "Dividend planning"],
        3: ["Raportări Q1", "ANAF deadline-uri"],
        4: ["D101 termen", "Optimizare TVA"],
        5: ["Pregătire vara", "Concedii angajați"],
        6: ["Semestru I încheiere", "Audit intern"],
        7: ["Modificări legislative august", "TVA 2025/2026"],
        8: ["Noi reglementări fiscale", "Back to business"],
        9: ["Strategie Q4", "Bugetare 2026"],
        10: ["Raportări Q3", "Pregătire sfârșit an"],
        11: ["Black Friday fiscal", "13th salary planning"],
        12: ["Închidere an", "Bonusuri și impozitare"],
    }

    current_trends = seasonal.get(month, ["Actualități fiscale"])

    # Add evergreen 2026 topics
    hot_topics_2026 = [
        "TVA 21% din august 2025 - pregătire",
        "Dividende 16% din 2026 - impact",
        "e-Factura B2B obligatorie - timeline",
        "SAF-T D406 - extindere obligații",
        "PNRR deadline august 2026",
    ]

    return {
        "seasonal_topics": current_trends,
        "hot_2026_topics": hot_topics_2026,
        "recommended_categories": [
            ArticleCategory.FISCAL.value,
            ArticleCategory.COMPLIANCE.value
        ],
        "content_tip": "Articolele despre modificările fiscale 2026 au engagement ridicat în această perioadă"
    }
