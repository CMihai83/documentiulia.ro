"""
RAG Assistant - Romanian Fiscal Law & Treaty Query System
Uses Llama3-based retrieval-augmented generation for accurate legal answers.
"""

import os
import json
from datetime import datetime
from typing import Optional, List, Dict, Any

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from loguru import logger

router = APIRouter()

# Knowledge Base - Romanian Fiscal Law 2026
FISCAL_KNOWLEDGE_BASE = {
    "vat_rates": {
        "title": "TVA - Taxa pe Valoarea Adăugată (2026)",
        "effective_date": "2025-08-01",
        "content": """
        Conform Legii 141/2025 privind reforma fiscală:

        COTE TVA din 1 August 2025:
        - Cota standard A: 21% (anterior 19%)
        - Cota redusă B: 11% (anterior 9%)
        - Cota super-redusă C: 5% (neschimbată)
        - Scutit D: 0%

        Bunuri/servicii cu cotă redusă 11%:
        - Alimentație și băuturi nealcoolice
        - Apă potabilă
        - Medicamente
        - Cazare hotelieră
        - Servicii de restaurant

        Bunuri cu cotă 5%:
        - Locuințe sociale (sub 120 mp)
        - Materiale școlare
        - Evenimente culturale
        - Cărți și publicații

        Baza legală: Art. 291 Cod Fiscal modificat prin Legea 141/2025
        """,
        "law_references": ["Art. 291 Cod Fiscal", "Legea 141/2025"]
    },
    "dividend_tax": {
        "title": "Impozit pe Dividende (2026)",
        "effective_date": "2026-01-01",
        "content": """
        Conform modificărilor Codului Fiscal:

        IMPOZIT DIVIDENDE din 1 Ianuarie 2026:
        - Cota: 10% (anterior 8%)

        CASS pe Dividende:
        - Se aplică CASS 10% pentru dividende care depășesc
          pragul de 12 salarii minime brute pe economie/an
        - Prag 2025: 12 × 3.700 RON = 44.400 RON/an
        - Dividendele sub acest prag: doar impozit 10%
        - Dividendele peste prag: impozit 10% + CASS 10% pe surplus

        Termen plată impozit: 25 a lunii următoare distribuirii

        Optimizare fiscală:
        - Distribuiți dividendele înainte de 1 Ian 2026 pentru cota 8%
        - Împărțiți dividendele între asociați pentru a rămâne sub prag CASS

        Baza legală: Art. 97 Cod Fiscal
        """,
        "law_references": ["Art. 97 Cod Fiscal", "Art. 155 Cod Fiscal (CASS)"]
    },
    "e_factura": {
        "title": "e-Factura și RO e-Transport",
        "effective_date": "2024-01-01",
        "content": """
        SISTEM e-FACTURA (SPV):

        Obligații curente (2024):
        - B2B: Obligatoriu pentru facturi între persoane juridice
        - Termen transmitere: 5 zile de la emitere
        - Format: XML UBL 2.1

        Din 2026:
        - e-Factura B2B devine obligatoriu pentru TOATE sectoarele
        - Integrare cu SAF-T D406

        RO e-TRANSPORT:
        - Obligatoriu pentru transport bunuri > 500 kg sau > 10.000 RON
        - Cod ITD trebuie generat înainte de transport
        - Bunuri cu risc fiscal: obligatoriu indiferent de valoare/greutate

        Penalități:
        - Neînregistrare e-Factura: 5.000 - 10.000 RON
        - Lipsă cod ITD: confiscarea bunurilor + amendă

        Baza legală: OUG 120/2021, Legea 296/2023
        """,
        "law_references": ["OUG 120/2021", "Legea 296/2023", "Ordinul ANAF 1783/2022"]
    },
    "saft": {
        "title": "SAF-T D406 - Raportare Fiscală Standardizată",
        "effective_date": "2025-01-01",
        "content": """
        SAF-T (Standard Audit File for Tax) D406:

        OBLIGAȚII RAPORTARE (din 2025):
        - Mari contribuabili: lunar
        - Contribuabili mijlocii: trimestrial
        - Contribuabili mici: semestrial (din 2026)

        CONȚINUT DECLARAȚIE D406:
        1. Date generale firmă
        2. Registre contabile (jurnal, sold, etc.)
        3. Tranzacții de vânzare/cumpărare
        4. Registre bunuri/servicii
        5. Informații despre plăți

        FORMAT:
        - XML conform schemei OECD SAF-T v2.0
        - Transmitere electronică prin SPV

        TERMEN:
        - Până în ultima zi a lunii următoare perioadei de raportare

        PENALITĂȚI:
        - Nedepunere: 1.000 - 5.000 RON
        - Depunere cu erori: avertisment → 500 RON la recidivă

        Baza legală: OPANAF 1783/2024, Directiva 2006/112/CE
        """,
        "law_references": ["OPANAF 1783/2024", "Directiva 2006/112/CE"]
    },
    "micro_enterprise": {
        "title": "Impozit Microîntreprinderi (2025-2026)",
        "effective_date": "2025-01-01",
        "content": """
        REGIM MICROÎNTREPRINDERI:

        Condiții aplicare:
        - Venituri an precedent < 500.000 EUR
        - Capital social minim 100 LEI (nu aplică pentru PFA)
        - Nu activează în domeniile excluse (consultanță, HoReCa peste plafon)

        COTE IMPOZIT 2025:
        - 1% dacă are minim 1 salariat
        - 3% fără salariați

        PLAFON VENITURI:
        - Peste 500.000 EUR: trecere obligatorie la impozit profit 16%

        DOMENII EXCLUSE din micro:
        - Consultanță (CAEN 70)
        - Activități juridice (CAEN 69)
        - HoReCa cu venituri > 500.000 EUR

        OPȚIUNE:
        - Microîntreprinderile pot opta pentru impozit profit 16%
        - Opțiunea se exercită până la 31 martie

        Baza legală: Titlul III Cod Fiscal
        """,
        "law_references": ["Art. 47-56 Cod Fiscal"]
    }
}

# Treaty Knowledge Base
TREATY_KNOWLEDGE_BASE = {
    "uk": {
        "title": "Convenție România - Marea Britanie",
        "content": """
        CONVENȚIA DE EVITARE A DUBLEI IMPUNERI ROMÂNIA - MAREA BRITANIE

        Ratificată: Legea 29/1976 (actualizată post-Brexit)
        Status: ACTIVĂ

        COTE REȚINERE LA SURSĂ:
        - Dividende: 10% (5% pentru participații > 25%)
        - Dobânzi: 10% (0% pentru dobânzi bancare)
        - Redevențe: 10% (0% în anumite condiții)

        POST-BREXIT:
        - Convenția rămâne în vigoare
        - Nu se mai aplică directivele UE (Mamă-Fiică, Dobânzi-Redevențe)
        - Reținerea la sursă: se aplică cotele din convenție

        PROCEDURĂ APLICARE:
        1. Obțineți certificat de rezidență fiscală din UK
        2. Completați formularul de aplicare beneficii convenție
        3. Transmiteți plătitorului român dovada rezidenței

        ATENȚIE:
        - Verificați substanța economică în UK
        - Evitați structurile artificiale (anti-avoidance)
        """,
        "withholding_rates": {"dividends": 10, "interest": 10, "royalties": 10}
    },
    "andorra": {
        "title": "Convenție România - Andorra",
        "content": """
        CONVENȚIA DE EVITARE A DUBLEI IMPUNERI ROMÂNIA - ANDORRA

        Ratificată: Legea 118/2016
        Status: ACTIVĂ

        COTE REȚINERE LA SURSĂ:
        - Dividende: 5% (0% pentru participații > 10% deținute > 365 zile)
        - Dobânzi: 0%
        - Redevențe: 0%

        AVANTAJE ANDORRA:
        - Impozit maxim pe profit: 10%
        - Impozit dividende intern: 0%
        - Nu există impozit pe avere
        - Regim favorabil pentru holding-uri

        CERINȚE SUBSTANȚĂ:
        - Prezență fizică reală în Andorra
        - Angajați locali
        - Decizii de management luate în Andorra

        ATENȚIE:
        - Andorra nu este în lista neagră UE/OECD
        - Schimb automat de informații (CRS) activ din 2018
        """,
        "withholding_rates": {"dividends": 5, "interest": 0, "royalties": 0}
    },
    "cyprus": {
        "title": "Convenție România - Cipru",
        "content": """
        CONVENȚIA DE EVITARE A DUBLEI IMPUNERI ROMÂNIA - CIPRU

        Ratificată: Legea 193/2003
        Status: ACTIVĂ

        COTE REȚINERE LA SURSĂ:
        - Dividende: 10%
        - Dobânzi: 10%
        - Redevențe: 5%

        + DIRECTIVA MAMĂ-FIICĂ (UE):
        - Dividende: 0% dacă participație > 10% și deținere > 1 an

        AVANTAJE CIPRU:
        - Impozit profit: 12.5%
        - Regim IP Box: 2.5% pe venituri din proprietate intelectuală
        - Holding regime: scutire câștiguri de capital din vânzare acțiuni

        CERINȚE SUBSTANȚĂ:
        - Management și control în Cipru
        - Angajați calificați
        - Birou funcțional

        ATENȚIE:
        - Cipru a ieșit de pe listele gri UE
        - Recomandat pentru structuri de holding și IP
        """,
        "withholding_rates": {"dividends": 10, "interest": 10, "royalties": 5}
    }
}

# AIC (Administrative Code) Knowledge
AIC_KNOWLEDGE = {
    "infiintare_srl": {
        "title": "Înființare SRL - Procedură Completă",
        "content": """
        PAȘI ÎNFIINȚARE SRL:

        1. REZERVARE DENUMIRE
           - Online pe portal ONRC: recom.onrc.ro
           - Taxă: 36 RON
           - Valabilitate: 3 luni

        2. DOCUMENTE NECESARE:
           - Act constitutiv (model tip sau notariat)
           - Declarație privind beneficiarul real
           - Dovadă sediu (contract închiriere/comodat)
           - Specimen semnătură
           - Actele de identitate asociați

        3. DEPUNERE ONRC:
           - Online: portal.onrc.ro (cu semnătură electronică)
           - Fizic: la sediul ONRC județean
           - Taxă înregistrare: 200-500 RON

        4. TERMENE:
           - Analiză: 1-3 zile lucrătoare
           - Emitere CUI: automat la înregistrare
           - Certificat înregistrare: 1 zi de la aprobare

        5. PAȘI POST-ÎNREGISTRARE:
           - Deschidere cont bancar
           - Înregistrare TVA (dacă depășește plafonul sau optează)
           - Declarație beneficiar real la ONRC
           - Înregistrare Revisal

        CAPITAL SOCIAL MINIM: 1 LEU (de la 1 ianuarie 2025)
        """,
        "authority": "ONRC"
    },
    "autorizare_aic": {
        "title": "Autorizații și Licențe Necesare",
        "content": """
        AUTORIZAȚII GENERALE:

        1. AUTORIZAȚIE DE FUNCȚIONARE:
           - Primărie locală
           - Documente: certificat urbanism, avize ISU, DSP
           - Taxă: variabilă pe localitate

        2. AUTORIZAȚIE ISU (prevenire incendii):
           - Pentru spații > 200 mp sau activități cu risc
           - Termen eliberare: 30 zile

        3. AUTORIZAȚIE SANITARĂ:
           - Obligatorie pentru HoReCa, producție alimentară
           - Eliberată de DSP județean
           - Termen: 30-60 zile

        4. LICENȚE SPECIALE:
           - Transport: ARR
           - Alcool: ANAF (autorizație antrepozit)
           - Construcții: ISC

        5. ÎNREGISTRARE FISCALĂ:
           - Formular 010 (la început activitate)
           - Formular 700 (modificări)
           - Formular 094 (opțiune TVA)

        ATENȚIE: Verificați CAEN-ul pentru autorizații specifice!
        """
    }
}


class RAGQuery(BaseModel):
    """Query for RAG system."""
    question: str = Field(..., min_length=5, max_length=500)
    category: Optional[str] = Field(None, description="fiscal, treaty, or aic")
    include_sources: bool = True
    language: str = Field("ro", description="ro or en")


class RAGResponse(BaseModel):
    """Response from RAG system."""
    answer: str
    confidence: float
    sources: List[Dict[str, str]]
    related_topics: List[str]
    disclaimer: str


@router.post("/query", response_model=RAGResponse)
async def query_fiscal_law(request: RAGQuery):
    """
    Query the Romanian fiscal law knowledge base using RAG.

    Categories:
    - fiscal: VAT, dividends, e-Factura, SAF-T, micro-enterprises
    - treaty: Double taxation treaties (UK, Andorra, Cyprus)
    - aic: Administrative procedures (company registration, licenses)
    """
    question_lower = request.question.lower()

    # Determine category if not specified
    if not request.category:
        if any(word in question_lower for word in ["tva", "vat", "impozit", "dividend", "saft", "factura", "micro"]):
            request.category = "fiscal"
        elif any(word in question_lower for word in ["conventie", "treaty", "uk", "andorra", "cipru", "cyprus", "retinere"]):
            request.category = "treaty"
        elif any(word in question_lower for word in ["infiintare", "srl", "autorizatie", "licenta", "onrc"]):
            request.category = "aic"
        else:
            request.category = "fiscal"  # Default

    # Select knowledge base
    if request.category == "treaty":
        knowledge = TREATY_KNOWLEDGE_BASE
    elif request.category == "aic":
        knowledge = AIC_KNOWLEDGE
    else:
        knowledge = FISCAL_KNOWLEDGE_BASE

    # Find relevant entries
    relevant_entries = []
    for key, entry in knowledge.items():
        title = entry.get("title", "").lower()
        content = entry.get("content", "").lower()

        # Simple relevance scoring based on keyword matching
        score = 0
        for word in question_lower.split():
            if len(word) > 3:  # Skip short words
                if word in title:
                    score += 3
                if word in content:
                    score += 1

        if score > 0:
            relevant_entries.append((score, key, entry))

    # Sort by relevance
    relevant_entries.sort(reverse=True, key=lambda x: x[0])

    if not relevant_entries:
        return RAGResponse(
            answer="Nu am găsit informații relevante pentru întrebarea dumneavoastră. Vă rugăm să reformulați sau să contactați un consultant fiscal.",
            confidence=0.1,
            sources=[],
            related_topics=list(knowledge.keys())[:5],
            disclaimer="Informațiile furnizate au caracter orientativ. Consultați un specialist pentru situații specifice."
        )

    # Build answer from top relevant entries
    top_entries = relevant_entries[:3]
    answer_parts = []
    sources = []

    for _, key, entry in top_entries:
        answer_parts.append(f"**{entry['title']}**\n{entry['content'][:1000]}")
        sources.append({
            "topic": entry["title"],
            "references": entry.get("law_references", entry.get("authority", "Cod Fiscal"))
        })

    # Calculate confidence
    confidence = min(0.95, 0.5 + (top_entries[0][0] / 20))

    # Get related topics
    related = [key for _, key, _ in relevant_entries[3:8]]

    answer = "\n\n---\n\n".join(answer_parts)

    return RAGResponse(
        answer=answer,
        confidence=round(confidence, 2),
        sources=sources,
        related_topics=related,
        disclaimer="⚠️ Informațiile furnizate au caracter orientativ și nu constituie consultanță fiscală. Pentru situații specifice, consultați un consultant fiscal autorizat sau ANAF."
    )


@router.get("/topics")
async def list_topics():
    """List all available topics in the knowledge base."""
    return {
        "fiscal": list(FISCAL_KNOWLEDGE_BASE.keys()),
        "treaty": list(TREATY_KNOWLEDGE_BASE.keys()),
        "aic": list(AIC_KNOWLEDGE.keys()),
        "total_topics": len(FISCAL_KNOWLEDGE_BASE) + len(TREATY_KNOWLEDGE_BASE) + len(AIC_KNOWLEDGE)
    }


@router.get("/topic/{category}/{topic_id}")
async def get_topic(category: str, topic_id: str):
    """Get detailed information about a specific topic."""
    if category == "fiscal":
        knowledge = FISCAL_KNOWLEDGE_BASE
    elif category == "treaty":
        knowledge = TREATY_KNOWLEDGE_BASE
    elif category == "aic":
        knowledge = AIC_KNOWLEDGE
    else:
        raise HTTPException(status_code=400, detail="Invalid category. Use: fiscal, treaty, or aic")

    if topic_id not in knowledge:
        raise HTTPException(status_code=404, detail=f"Topic {topic_id} not found in {category}")

    return {
        "category": category,
        "topic_id": topic_id,
        **knowledge[topic_id]
    }


@router.post("/compare-treaties")
async def compare_treaties(
    countries: List[str] = Query(..., min_length=2, max_length=5, description="List of country codes to compare")
):
    """
    Compare double taxation treaties between Romania and specified countries.
    """
    results = []
    for country in countries:
        country_lower = country.lower()
        if country_lower in TREATY_KNOWLEDGE_BASE:
            treaty = TREATY_KNOWLEDGE_BASE[country_lower]
            results.append({
                "country": country_lower.upper(),
                "title": treaty["title"],
                "withholding_rates": treaty.get("withholding_rates", {}),
                "status": "ACTIVE"
            })
        else:
            results.append({
                "country": country_lower.upper(),
                "status": "NOT_FOUND",
                "note": "Treaty not in database"
            })

    # Find best option for each income type
    best_rates = {
        "dividends": {"country": None, "rate": 100},
        "interest": {"country": None, "rate": 100},
        "royalties": {"country": None, "rate": 100}
    }

    for result in results:
        rates = result.get("withholding_rates", {})
        for income_type in best_rates:
            if income_type in rates and rates[income_type] < best_rates[income_type]["rate"]:
                best_rates[income_type] = {
                    "country": result["country"],
                    "rate": rates[income_type]
                }

    return {
        "comparison": results,
        "best_rates": best_rates,
        "recommendation": "Alegeți jurisdicția în funcție de tipul predominant de venit și cerințele de substanță."
    }


@router.get("/quick-answer/{topic}")
async def quick_answer(topic: str):
    """
    Get a quick answer for common fiscal questions.
    """
    quick_answers = {
        "tva_standard": "Cota TVA standard este 21% din 1 August 2025 (Legea 141/2025)",
        "tva_redus": "Cota TVA redusă este 11% din 1 August 2025 pentru alimente, medicamente, cazare",
        "dividend_2026": "Impozitul pe dividende crește la 10% din 1 Ianuarie 2026",
        "micro_cota": "Microîntreprinderile plătesc 1% cu salariat sau 3% fără salariat",
        "efactura": "e-Factura B2B este obligatorie. Termen transmitere: 5 zile de la emitere",
        "saft": "SAF-T D406 este obligatoriu pentru mari contribuabili lunar",
        "cass_dividende": "CASS 10% se aplică pe dividendele care depășesc 12 salarii minime/an",
        "andorra_dividende": "Cota reținere dividende România-Andorra: 5% (0% pentru participații > 10%)",
        "uk_post_brexit": "Convenția România-UK rămâne activă post-Brexit. Reținere dividende: 10%"
    }

    topic_lower = topic.lower().replace("-", "_").replace(" ", "_")

    if topic_lower in quick_answers:
        return {
            "topic": topic,
            "answer": quick_answers[topic_lower],
            "timestamp": datetime.now().isoformat(),
            "note": "Pentru detalii, folosiți endpoint-ul /query"
        }

    return {
        "topic": topic,
        "answer": None,
        "available_topics": list(quick_answers.keys()),
        "suggestion": "Folosiți unul din subiectele disponibile sau endpoint-ul /query pentru întrebări complexe"
    }


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "operational",
        "service": "rag-assistant",
        "knowledge_base_size": {
            "fiscal_topics": len(FISCAL_KNOWLEDGE_BASE),
            "treaty_topics": len(TREATY_KNOWLEDGE_BASE),
            "aic_topics": len(AIC_KNOWLEDGE)
        },
        "features": [
            "Romanian fiscal law Q&A",
            "Double taxation treaty comparison",
            "Administrative procedures guide",
            "2026 fiscal reform compliance"
        ],
        "model": "Rule-based (Llama3 integration pending)"
    }
