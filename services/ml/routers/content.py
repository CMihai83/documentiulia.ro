"""
Content Generation Router - AI-powered content generation for Blog and Forum
"""

from datetime import datetime
from typing import List, Optional
import random

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from loguru import logger

router = APIRouter()


class ContentGenerationRequest(BaseModel):
    """Request for AI content generation."""
    prompt: str = Field(..., min_length=10, max_length=5000)
    target_length: int = Field(default=800, ge=100, le=10000)
    style: str = Field(default="professional", description="professional, casual, technical, educational")
    language: str = Field(default="ro")
    content_type: str = Field(default="blog", description="blog, forum_topic, forum_reply")
    keywords: List[str] = Field(default=[])
    include_sources: bool = Field(default=False)


class ContentGenerationResult(BaseModel):
    """Generated content result."""
    title: str
    content: str
    excerpt: str
    meta_description: str
    suggested_tags: List[str]
    word_count: int
    reading_time: int
    language: str
    generated_at: datetime


class TopicSuggestionRequest(BaseModel):
    """Request for topic suggestions."""
    category: str = Field(..., min_length=2, max_length=100)
    existing_topics: List[str] = Field(default=[])
    count: int = Field(default=5, ge=1, le=20)


class TopicSuggestion(BaseModel):
    """Suggested topic."""
    title: str
    description: str
    tags: List[str]
    difficulty: str
    estimated_engagement: str


# Romanian accounting topic templates
ACCOUNTING_TOPICS = {
    "e-factura": [
        "Ghid complet pentru implementarea e-Factura în {year}",
        "Erori frecvente în e-Factura și cum să le eviți",
        "e-Factura pentru microîntreprinderi: Ce trebuie să știi",
        "Termene limită e-Factura: Calendar complet {year}",
        "Integrarea e-Factura cu software-ul de contabilitate",
    ],
    "saft": [
        "SAF-T D406: Ghid pas cu pas pentru contabili",
        "Validarea fișierelor SAF-T: Erori comune și soluții",
        "SAF-T și inventarul: Cum să raportezi corect",
        "Diferențe între SAF-T și D394: Ce trebuie să știi",
        "Automatizarea raportării SAF-T în {year}",
    ],
    "fiscalitate": [
        "Modificări Cod Fiscal {year}: Impact asupra firmelor",
        "TVA la încasare vs TVA la facturare: Avantaje și dezavantaje",
        "Optimizare fiscală legală pentru PFA și SRL",
        "Declarații fiscale {year}: Calendar și termene",
        "Impozit pe profit vs Impozit pe venit microîntreprinderi",
    ],
    "contabilitate": [
        "Închidere an fiscal: Lista de verificare completă",
        "Politici contabile: Cum să le stabilești corect",
        "Contabilitatea stocurilor: Metode și aplicare practică",
        "Registrul de casă: Obligații și bune practici",
        "Amortizarea imobilizărilor: Ghid complet",
    ],
}

# Content templates for different styles
CONTENT_STYLES = {
    "professional": {
        "intro_templates": [
            "În contextul actual al reglementărilor fiscale din România, {topic} reprezintă o temă esențială pentru orice profesionist contabil.",
            "Legislația fiscală românească aduce în {year} modificări semnificative privind {topic}.",
            "Profesioniștii din domeniul contabilității se confruntă frecvent cu provocări legate de {topic}.",
        ],
        "section_templates": [
            "## Aspecte cheie\n\nPrincipalele elemente care trebuie luate în considerare sunt:",
            "## Cadrul legal\n\nConform legislației în vigoare, {topic} este reglementat(ă) de:",
            "## Recomandări practice\n\nPentru o implementare eficientă, vă recomandăm:",
        ],
        "conclusion_templates": [
            "În concluzie, {topic} necesită o abordare sistematică și o bună cunoaștere a reglementărilor în vigoare.",
            "Înțelegerea corectă a aspectelor prezentate va contribui la o gestionare eficientă a {topic}.",
        ],
    },
    "educational": {
        "intro_templates": [
            "Hai să înțelegem împreună ce presupune {topic} și cum ne afectează activitatea.",
            "În acest articol vom explora pas cu pas tot ce trebuie să știi despre {topic}.",
            "Dacă te-ai întrebat vreodată cum funcționează {topic}, ești în locul potrivit.",
        ],
        "section_templates": [
            "## Ce este {topic}?\n\nPentru a înțelege mai bine, să începem cu bazele:",
            "## De ce este important?\n\nMotivele pentru care {topic} contează:",
            "## Exemple practice\n\nSă vedem câteva situații concrete:",
        ],
        "conclusion_templates": [
            "Sperăm că acest ghid te-a ajutat să înțelegi mai bine {topic}.",
            "Acum ai toate informațiile necesare pentru a gestiona corect {topic}.",
        ],
    },
}

# Common accounting terms for tag generation
ACCOUNTING_TAGS = [
    "contabilitate", "fiscalitate", "TVA", "e-factura", "SAF-T",
    "bilanț", "profit", "impozit", "declarații", "ANAF",
    "registru", "facturare", "plăți", "contribuții", "legislație",
    "microîntreprindere", "SRL", "PFA", "audit", "raportare",
]


def generate_content(prompt: str, target_length: int, style: str, language: str) -> dict:
    """Generate content based on prompt and parameters."""
    current_year = datetime.now().year

    # Select style templates
    style_config = CONTENT_STYLES.get(style, CONTENT_STYLES["professional"])

    # Build content structure
    intro = random.choice(style_config["intro_templates"]).format(
        topic=prompt[:50],
        year=current_year
    )

    sections = []
    for template in style_config["section_templates"]:
        section = template.format(topic=prompt[:50], year=current_year)
        # Add placeholder content for each section
        section += "\n\n" + generate_section_content(prompt, target_length // 4)
        sections.append(section)

    conclusion = random.choice(style_config["conclusion_templates"]).format(
        topic=prompt[:50]
    )

    # Combine all parts
    full_content = f"{intro}\n\n" + "\n\n".join(sections) + f"\n\n{conclusion}"

    # Generate title
    title = generate_title(prompt)

    # Generate excerpt
    excerpt = intro[:200] + "..." if len(intro) > 200 else intro

    # Generate meta description
    meta_description = f"{title} - Ghid complet pentru profesioniști în contabilitate și fiscalitate din România."

    # Generate tags
    tags = generate_tags(prompt)

    # Calculate metrics
    word_count = len(full_content.split())
    reading_time = max(1, word_count // 200)

    return {
        "title": title,
        "content": full_content,
        "excerpt": excerpt,
        "meta_description": meta_description[:160],
        "suggested_tags": tags,
        "word_count": word_count,
        "reading_time": reading_time,
    }


def generate_title(prompt: str) -> str:
    """Generate a compelling title from prompt."""
    prompt_lower = prompt.lower()
    current_year = datetime.now().year

    # Check for common topics
    if "e-factura" in prompt_lower or "efactura" in prompt_lower:
        return f"Ghid Complet e-Factura {current_year}: Tot Ce Trebuie Să Știi"
    elif "saf-t" in prompt_lower or "saft" in prompt_lower:
        return f"SAF-T România {current_year}: Implementare și Raportare"
    elif "tva" in prompt_lower:
        return f"TVA în România {current_year}: Reguli, Rate și Declarații"
    elif "impozit" in prompt_lower:
        return f"Impozitare în România: Ghid Actualizat {current_year}"
    elif "factur" in prompt_lower:
        return f"Facturare Electronică: Cerințe și Bune Practici {current_year}"
    else:
        # Generate generic title
        words = prompt.split()[:8]
        base_title = " ".join(words).title()
        return f"{base_title}: Ghid Practic {current_year}"


def generate_section_content(topic: str, target_words: int) -> str:
    """Generate placeholder section content."""
    paragraphs = []
    words_generated = 0

    sample_paragraphs = [
        "Este important să înțelegem contextul actual al reglementărilor fiscale din România. "
        "Modificările legislative recente au adus schimbări semnificative în modul în care "
        "companiile trebuie să gestioneze obligațiile fiscale și raportările către ANAF.",

        "Din perspectiva practică, implementarea corectă presupune parcurgerea mai multor etape. "
        "Fiecare etapă are cerințe specifice care trebuie respectate pentru a asigura "
        "conformitatea cu legislația în vigoare.",

        "Recomandăm consultarea documentației oficiale ANAF și colaborarea cu un specialist "
        "pentru situații complexe. O abordare proactivă poate preveni problemele și poate "
        "optimiza procesele de raportare.",

        "Experiența practică arată că firmele care adoptă din timp noile cerințe au mai puține "
        "dificultăți și costuri mai reduse pe termen lung. Planificarea adecvată este esențială.",
    ]

    while words_generated < target_words and sample_paragraphs:
        para = sample_paragraphs.pop(0)
        paragraphs.append(para)
        words_generated += len(para.split())

    return "\n\n".join(paragraphs)


def generate_tags(prompt: str) -> List[str]:
    """Generate relevant tags from prompt."""
    prompt_lower = prompt.lower()
    tags = []

    # Check for matching accounting terms
    for tag in ACCOUNTING_TAGS:
        if tag.lower() in prompt_lower:
            tags.append(tag)

    # Add default tags if needed
    if len(tags) < 3:
        default_tags = ["contabilitate", "fiscalitate", "România"]
        for tag in default_tags:
            if tag not in tags:
                tags.append(tag)

    return tags[:5]


@router.post("/generate", response_model=ContentGenerationResult)
async def generate_blog_content(request: ContentGenerationRequest):
    """
    Generate AI-powered content for blog posts or forum topics.

    Used for:
    - Blog post generation from topics
    - Forum topic drafts
    - Content suggestions
    """
    try:
        logger.info(f"Generating content for: {request.prompt[:50]}...")

        result = generate_content(
            request.prompt,
            request.target_length,
            request.style,
            request.language
        )

        return ContentGenerationResult(
            title=result["title"],
            content=result["content"],
            excerpt=result["excerpt"],
            meta_description=result["meta_description"],
            suggested_tags=result["suggested_tags"],
            word_count=result["word_count"],
            reading_time=result["reading_time"],
            language=request.language,
            generated_at=datetime.now()
        )

    except Exception as e:
        logger.error(f"Content generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggest-topics", response_model=List[TopicSuggestion])
async def suggest_topics(request: TopicSuggestionRequest):
    """
    Suggest new topics for blog posts or forum discussions.

    Returns topic ideas based on category and existing content.
    """
    try:
        suggestions = []
        category_lower = request.category.lower()

        # Find matching category templates
        template_topics = []
        for cat_key, topics in ACCOUNTING_TOPICS.items():
            if cat_key in category_lower or category_lower in cat_key:
                template_topics.extend(topics)

        # Use general fiscalitate if no specific match
        if not template_topics:
            template_topics = ACCOUNTING_TOPICS["fiscalitate"]

        current_year = datetime.now().year

        # Generate suggestions
        for topic_template in template_topics[:request.count]:
            title = topic_template.format(year=current_year)

            # Skip if similar to existing topics
            if any(existing.lower() in title.lower() or title.lower() in existing.lower()
                   for existing in request.existing_topics):
                continue

            suggestions.append(TopicSuggestion(
                title=title,
                description=f"Articol despre {title.lower()} pentru profesioniști din domeniul contabil.",
                tags=generate_tags(title),
                difficulty=random.choice(["începător", "intermediar", "avansat"]),
                estimated_engagement=random.choice(["ridicat", "mediu", "foarte ridicat"])
            ))

        return suggestions

    except Exception as e:
        logger.error(f"Topic suggestion error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/improve")
async def improve_content(
    content: str,
    improvement_type: str = "grammar",
    language: str = "ro"
):
    """
    Improve existing content with AI suggestions.

    Improvement types:
    - grammar: Fix grammar and spelling
    - style: Improve writing style
    - seo: Optimize for search engines
    - readability: Improve readability
    """
    try:
        improvements = {
            "original_length": len(content.split()),
            "suggestions": [],
            "improved_content": content,
        }

        # Basic improvements (placeholder for more advanced NLP)
        if improvement_type == "grammar":
            # Romanian common typo fixes
            replacements = {
                " in ": " în ",
                " si ": " și ",
                " sau": " sau",
                "intreprindere": "întreprindere",
                "inregistrare": "înregistrare",
            }
            improved = content
            for old, new in replacements.items():
                if old in improved.lower():
                    improvements["suggestions"].append(f"Replaced '{old.strip()}' with '{new.strip()}'")
                    improved = improved.replace(old, new)
            improvements["improved_content"] = improved

        elif improvement_type == "seo":
            improvements["suggestions"] = [
                "Adăugați mai multe cuvinte cheie în primele 100 de cuvinte",
                "Includeți întrebări frecvente (FAQ)",
                "Adăugați link-uri interne către alte articole",
                "Optimizați meta description la 150-160 caractere",
            ]

        elif improvement_type == "readability":
            improvements["suggestions"] = [
                "Împărțiți paragrafele lungi în secțiuni mai mici",
                "Folosiți liste cu bullet points pentru claritate",
                "Adăugați subtitluri pentru organizare mai bună",
                "Reduceți propozițiile lungi la maxim 25 de cuvinte",
            ]

        return improvements

    except Exception as e:
        logger.error(f"Content improvement error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/templates")
async def get_content_templates():
    """
    Get available content templates for different categories.
    """
    return {
        "categories": list(ACCOUNTING_TOPICS.keys()),
        "styles": list(CONTENT_STYLES.keys()),
        "sample_topics": {
            category: topics[:3] for category, topics in ACCOUNTING_TOPICS.items()
        }
    }
