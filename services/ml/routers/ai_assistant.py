"""
AI Assistant Router - RAG-based accounting chatbot
Specialized for Romanian fiscal legislation and accounting practices
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from loguru import logger
from enum import Enum

router = APIRouter()


class AssistantRole(str, Enum):
    ACCOUNTANT = "accountant"
    TAX_ADVISOR = "tax_advisor"
    FINANCIAL_ANALYST = "financial_analyst"
    GENERAL = "general"


class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str
    timestamp: Optional[str] = None
    sources: Optional[List[Dict[str, str]]] = None


class ChatRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    assistant_role: AssistantRole = AssistantRole.GENERAL
    company_id: Optional[str] = None
    include_sources: bool = True


class ChatResponse(BaseModel):
    conversation_id: str
    response: str
    sources: List[Dict[str, Any]]
    suggested_actions: List[Dict[str, str]]
    confidence: float
    processing_time_ms: int


class KnowledgeSource(BaseModel):
    title: str
    source_type: str  # legislation, guide, article
    url: Optional[str] = None
    relevance_score: float
    excerpt: str


# Romanian fiscal knowledge base (simplified for demo)
FISCAL_KNOWLEDGE = {
    "tva": {
        "cote": {
            "19": "Cota standard TVA aplicabilă majorității bunurilor și serviciilor",
            "9": "Cota redusă pentru alimente, medicamente, hoteluri, restaurante",
            "5": "Cota redusă pentru cărți, ziare, prima locuință (sub 120mp)"
        },
        "termene": {
            "d300": "Decontul de TVA se depune până pe 25 a lunii următoare perioadei de raportare",
            "d390": "Declarația recapitulativă se depune lunar până pe 25"
        }
    },
    "efactura": {
        "obligativitate": "Obligatorie pentru relațiile B2B și B2G din 1 ianuarie 2024",
        "termen": "Se transmite în maximum 5 zile de la emitere",
        "format": "XML în format UBL 2.1 conform specificațiilor ANAF"
    },
    "saft": {
        "obligativitate": "Obligatoriu pentru marii contribuabili din 2022, ceilalți din 2025",
        "format": "XML conform standardului SAF-T D406",
        "termen": "Se depune lunar sau trimestrial, până pe ultima zi a lunii următoare"
    },
    "impozit_profit": {
        "cota": "16% din profitul impozabil",
        "microintreprinderi": "1% sau 3% din venituri, în funcție de angajați"
    }
}


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(request: ChatRequest):
    """
    Chat with the AI accounting assistant

    Capabilities:
    - Answer Romanian fiscal legislation questions
    - Explain accounting procedures
    - Provide tax optimization suggestions
    - Guide through e-Factura and SAF-T
    """
    import time
    start_time = time.time()

    try:
        logger.info(f"Processing chat: {request.message[:50]}...")

        # Generate conversation ID if not provided
        conversation_id = request.conversation_id or f"conv-{int(time.time() * 1000)}"

        # In production, this would:
        # 1. Embed the query
        # 2. Search vector database for relevant documents
        # 3. Build context from retrieved documents
        # 4. Generate response using LLM

        # Analyze query intent
        query_lower = request.message.lower()
        response_text = ""
        sources = []
        suggested_actions = []
        confidence = 0.9

        # Pattern matching for common questions (simplified RAG demo)
        if any(word in query_lower for word in ["tva", "taxă", "valoare adăugată"]):
            if "cotă" in query_lower or "procent" in query_lower:
                response_text = """În România, cotele de TVA sunt:

**19% - Cota standard**
Se aplică majorității bunurilor și serviciilor.

**9% - Cota redusă**
- Alimente și băuturi nealcoolice
- Medicamente și dispozitive medicale
- Servicii hoteliere
- Restaurante (pentru consumul pe loc)
- Apă potabilă

**5% - Cota super-redusă**
- Cărți, ziare, reviste
- Prima locuință (max 120mp util)
- Evenimente culturale și sportive

**0% - Scutit cu drept de deducere**
- Exporturi
- Livrări intracomunitare de bunuri"""

                sources = [
                    {
                        "title": "Codul Fiscal - Art. 291",
                        "type": "legislation",
                        "excerpt": "Cotele de taxă pe valoarea adăugată"
                    }
                ]
                suggested_actions = [
                    {"action": "view_vat_rates", "label": "Vezi toate cotele TVA"},
                    {"action": "calculate_vat", "label": "Calculează TVA"}
                ]

            elif "decont" in query_lower or "d300" in query_lower:
                response_text = """**Decontul de TVA (D300)** se depune:

📅 **Termen**: Până pe **25** a lunii următoare perioadei de raportare

**Periodicitate:**
- **Lunar** - pentru plătitorii cu cifră de afaceri > 100.000 EUR
- **Trimestrial** - pentru ceilalți plătitori

**Depunere:**
- Online prin SPV (Spațiul Privat Virtual) ANAF
- Este obligatorie semnătura electronică

**Atenție:** Nedepunerea atrage amenzi între 1.000 și 5.000 RON."""

                sources = [
                    {
                        "title": "Codul Fiscal - Art. 323",
                        "type": "legislation",
                        "excerpt": "Obligații declarative privind TVA"
                    }
                ]

        elif any(word in query_lower for word in ["efactura", "e-factura", "facturare electronică"]):
            response_text = """**e-Factura în România (2024-2025)**

📋 **Obligativitate:**
- Din **1 ianuarie 2024**: Obligatorie pentru relații B2B și B2G
- Toate facturile trebuie transmise prin sistemul e-Factura ANAF

⏰ **Termene:**
- Transmitere: Maximum **5 zile calendaristice** de la emitere
- Validare ANAF: 1-3 zile lucrătoare

📝 **Format:**
- XML conform UBL 2.1
- Specificație CIUS-RO pentru România

🔧 **Cum funcționează:**
1. Generați factura în format XML
2. O semnați electronic
3. O transmiteți prin API ANAF sau SPV
4. Primiți confirmarea cu index

**DocumentIulia generează automat XML-ul e-Factura conform specificațiilor ANAF.**"""

            sources = [
                {
                    "title": "OUG 120/2021 privind e-Factura",
                    "type": "legislation",
                    "url": "https://anaf.ro/efactura"
                }
            ]
            suggested_actions = [
                {"action": "configure_efactura", "label": "Configurează e-Factura"},
                {"action": "generate_xml", "label": "Generează XML test"}
            ]

        elif any(word in query_lower for word in ["saf-t", "saft", "d406"]):
            response_text = """**SAF-T (D406) în România**

📋 **Ce este SAF-T?**
Standard Audit File for Tax - fișier XML standardizat pentru schimb de date fiscale.

📅 **Obligativitate:**
- **2022**: Mari contribuabili
- **2025**: Toți contribuabilii

📝 **Conținut:**
- Registre contabile
- Facturi emise și primite
- Plăți și încasări
- Stocuri și mișcări de bunuri

⏰ **Termene:**
- **Lunar**: Marii contribuabili
- **Trimestrial**: Ceilalți
- Depunere: ultima zi a lunii următoare

**DocumentIulia generează automat raportul SAF-T D406 din datele contabile.**"""

            sources = [
                {
                    "title": "OPANAF 1783/2021",
                    "type": "legislation",
                    "excerpt": "Specificații tehnice SAF-T"
                }
            ]

        elif any(word in query_lower for word in ["microîntreprindere", "micro", "impozit venit"]):
            response_text = """**Impozitul pe veniturile microîntreprinderilor (2024)**

📊 **Cote de impozitare:**
- **1%** din venituri - dacă ai cel puțin 1 angajat
- **3%** din venituri - fără angajați

📋 **Condiții încadrare:**
- Venituri < 500.000 EUR/an
- Capital social ≥ 45.000 RON
- Nu desfășurați activități de consultanță/management

⏰ **Declarații:**
- **D100**: Trimestrial, până pe 25 a lunii următoare trimestrului

💡 **Optimizare:**
- Angajarea cu normă întreagă reduce impozitul la 1%
- Există avantaje fiscale pentru IT și cercetare"""

            sources = [
                {
                    "title": "Codul Fiscal - Titlul III",
                    "type": "legislation",
                    "excerpt": "Impozitul pe veniturile microîntreprinderilor"
                }
            ]

        else:
            # Generic response
            response_text = f"""Înțeleg că întrebați despre: **{request.message}**

Sunt asistentul contabil DocumentIulia, specializat în legislația fiscală din România. Pot să vă ajut cu:

📋 **Legislație fiscală:**
- TVA și cotele aplicabile
- Impozit pe profit/venit
- Contribuții sociale

📝 **Raportare ANAF:**
- e-Factura
- SAF-T D406
- Declarații fiscale

💼 **Operațiuni contabile:**
- Înregistrări contabile
- Facturare
- Gestiune cheltuieli

Vă rog să reformulați întrebarea pentru un răspuns mai specific, sau alegeți una din temele de mai sus."""

            confidence = 0.7
            suggested_actions = [
                {"action": "ask_vat", "label": "Întreabă despre TVA"},
                {"action": "ask_efactura", "label": "Întreabă despre e-Factura"},
                {"action": "ask_saft", "label": "Întreabă despre SAF-T"}
            ]

        processing_time = int((time.time() - start_time) * 1000)

        return ChatResponse(
            conversation_id=conversation_id,
            response=response_text,
            sources=sources,
            suggested_actions=suggested_actions,
            confidence=confidence,
            processing_time_ms=processing_time
        )

    except Exception as e:
        logger.error(f"Chat failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions")
async def get_suggestions(
    context: Optional[str] = None,
    company_id: Optional[str] = None
):
    """Get contextual suggestions for the user"""
    suggestions = [
        {
            "question": "Care sunt cotele de TVA în România?",
            "category": "TVA"
        },
        {
            "question": "Cum funcționează e-Factura?",
            "category": "e-Factura"
        },
        {
            "question": "Ce este SAF-T și când trebuie depus?",
            "category": "SAF-T"
        },
        {
            "question": "Care este termenul pentru decontul de TVA?",
            "category": "Termene"
        },
        {
            "question": "Ce condiții trebuie să îndeplinesc pentru regimul micro?",
            "category": "Microîntreprinderi"
        }
    ]

    return {
        "suggestions": suggestions,
        "context": context
    }


@router.get("/fiscal-calendar")
async def get_fiscal_calendar(
    year: int = None,
    month: int = None
):
    """Get fiscal calendar with upcoming deadlines"""
    if year is None:
        year = datetime.now().year
    if month is None:
        month = datetime.now().month

    deadlines = [
        {
            "date": f"{year}-{str(month).zfill(2)}-25",
            "deadline": "D300 - Decont TVA",
            "description": f"Decontul de TVA pentru {month-1 if month > 1 else 12}/{year if month > 1 else year-1}",
            "category": "tva"
        },
        {
            "date": f"{year}-{str(month).zfill(2)}-25",
            "deadline": "D390 - Declarație recapitulativă",
            "description": "Livrări/Achiziții intracomunitare",
            "category": "tva"
        },
        {
            "date": f"{year}-{str(month).zfill(2)}-25",
            "deadline": "D100 - Impozit micro",
            "description": "Impozit pe veniturile microîntreprinderilor (trimestrial)",
            "category": "impozit"
        },
        {
            "date": f"{year}-{str(month).zfill(2)}-25",
            "deadline": "D112 - Contribuții",
            "description": "Declarația privind contribuțiile sociale",
            "category": "contributii"
        }
    ]

    return {
        "year": year,
        "month": month,
        "deadlines": deadlines
    }


@router.get("/knowledge-base/search")
async def search_knowledge_base(
    query: str,
    category: Optional[str] = None,
    limit: int = Query(default=10, le=50)
):
    """Search the fiscal knowledge base"""
    # Mock search results
    results = [
        KnowledgeSource(
            title="Codul Fiscal 2024 - TVA",
            source_type="legislation",
            url="https://static.anaf.ro/static/10/Anaf/legislatie/Cod_fiscal_norme_2024.htm",
            relevance_score=0.95,
            excerpt="Art. 291 - Cotele taxei pe valoarea adăugată..."
        ),
        KnowledgeSource(
            title="Ghid e-Factura ANAF",
            source_type="guide",
            url="https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/e-factura",
            relevance_score=0.88,
            excerpt="Sistemul național privind factura electronică RO e-Factura..."
        )
    ]

    return {
        "query": query,
        "results": results,
        "total_found": len(results)
    }
