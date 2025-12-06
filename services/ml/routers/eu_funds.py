"""
EU Funds Router - PNRR, Cohesion, and InvestEU Grant Management
🎵 Overture for European Funding - €21.6B PNRR + €31B Cohesion

Features:
- AI eligibility scanner for Romanian SMBs
- PNRR €13.57B grant matching
- Cohesion 2021-2027 allocation tracker
- InvestEU €50k SME vouchers
- Application automator (UiPath-ready)
- Milestone tracker (Aug 2026 deadline)
"""

import json
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from enum import Enum

from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel, Field
from loguru import logger

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════
# 🎵 EU Funds Constants - The European Score
# ═══════════════════════════════════════════════════════════════════

# PNRR Romania - €29.2B total (€13.57B grants + €15.63B loans)
PNRR_TOTAL = 29_200_000_000  # EUR
PNRR_GRANTS = 13_570_000_000  # EUR
PNRR_LOANS = 15_630_000_000  # EUR

# Cohesion Policy 2021-2027 Romania
COHESION_ALLOCATION = 31_000_000_000  # EUR

# Critical deadlines
PNRR_FINAL_DEADLINE = datetime(2026, 8, 31)
COHESION_DEADLINE = datetime(2027, 12, 31)

# PNRR Components for Romania
PNRR_COMPONENTS = {
    "C1": {
        "name": "Managementul apelor",
        "allocation_eur": 1_500_000_000,
        "priority": "environment"
    },
    "C2": {
        "name": "Păduri și biodiversitate",
        "allocation_eur": 1_200_000_000,
        "priority": "environment"
    },
    "C3": {
        "name": "Managementul deșeurilor",
        "allocation_eur": 1_200_000_000,
        "priority": "environment"
    },
    "C4": {
        "name": "Transport durabil",
        "allocation_eur": 3_000_000_000,
        "priority": "infrastructure"
    },
    "C5": {
        "name": "Val de renovare",
        "allocation_eur": 2_200_000_000,
        "priority": "green_transition"
    },
    "C6": {
        "name": "Energie",
        "allocation_eur": 1_600_000_000,
        "priority": "energy"
    },
    "C7": {
        "name": "Digitalizare",
        "allocation_eur": 1_900_000_000,
        "priority": "digital",
        "smb_relevant": True
    },
    "C8": {
        "name": "Reforme fiscale",
        "allocation_eur": 500_000_000,
        "priority": "governance"
    },
    "C9": {
        "name": "Suport pentru afaceri",
        "allocation_eur": 2_300_000_000,
        "priority": "business",
        "smb_relevant": True
    },
    "C10": {
        "name": "Fondul local",
        "allocation_eur": 2_100_000_000,
        "priority": "local_development"
    },
    "C11": {
        "name": "Turism și cultură",
        "allocation_eur": 500_000_000,
        "priority": "tourism",
        "smb_relevant": True
    },
    "C12": {
        "name": "Sănătate",
        "allocation_eur": 2_400_000_000,
        "priority": "health"
    },
    "C13": {
        "name": "Reformă socială",
        "allocation_eur": 800_000_000,
        "priority": "social"
    },
    "C14": {
        "name": "Bună guvernare",
        "allocation_eur": 400_000_000,
        "priority": "governance"
    },
    "C15": {
        "name": "Educație",
        "allocation_eur": 3_600_000_000,
        "priority": "education"
    }
}

# SMB-relevant grant schemes
SMB_GRANTS = [
    {
        "id": "digitalizare_imm",
        "name": "Digitalizare IMM",
        "component": "C7",
        "min_grant": 5_000,
        "max_grant": 100_000,
        "cofinancing_rate": 0.15,  # 15% SMB contribution
        "eligible_activities": [
            "E-commerce platforms",
            "Cloud migration",
            "Cybersecurity",
            "ERP/CRM systems",
            "Digital marketing"
        ],
        "status": "open"
    },
    {
        "id": "inovare_imm",
        "name": "Inovare pentru competitivitate",
        "component": "C9",
        "min_grant": 50_000,
        "max_grant": 500_000,
        "cofinancing_rate": 0.25,
        "eligible_activities": [
            "R&D projects",
            "Product innovation",
            "Process optimization",
            "Technology transfer"
        ],
        "status": "open"
    },
    {
        "id": "green_transition",
        "name": "Tranziție verde IMM",
        "component": "C5",
        "min_grant": 30_000,
        "max_grant": 200_000,
        "cofinancing_rate": 0.20,
        "eligible_activities": [
            "Energy efficiency",
            "Solar panels",
            "Electric vehicles",
            "Waste reduction",
            "Circular economy"
        ],
        "status": "upcoming"
    },
    {
        "id": "turism_sustenabil",
        "name": "Turism sustenabil",
        "component": "C11",
        "min_grant": 20_000,
        "max_grant": 150_000,
        "cofinancing_rate": 0.15,
        "eligible_activities": [
            "Accommodation upgrades",
            "Eco-tourism",
            "Digital booking systems",
            "Accessibility improvements"
        ],
        "status": "open"
    },
    {
        "id": "investeu_voucher",
        "name": "InvestEU Innovation Voucher",
        "component": "InvestEU",
        "min_grant": 10_000,
        "max_grant": 50_000,
        "cofinancing_rate": 0.0,  # 100% grant
        "eligible_activities": [
            "Feasibility studies",
            "Prototype development",
            "Patent registration",
            "Market research"
        ],
        "status": "open"
    }
]


class CompanySize(str, Enum):
    MICRO = "micro"  # <10 employees, <2M EUR turnover
    SMALL = "small"  # <50 employees, <10M EUR turnover
    MEDIUM = "medium"  # <250 employees, <50M EUR turnover
    LARGE = "large"  # >=250 employees


class SectorType(str, Enum):
    MANUFACTURING = "manufacturing"
    IT_SERVICES = "it_services"
    TOURISM = "tourism"
    AGRICULTURE = "agriculture"
    CONSTRUCTION = "construction"
    RETAIL = "retail"
    HEALTHCARE = "healthcare"
    EDUCATION = "education"
    TRANSPORT = "transport"
    ENERGY = "energy"
    OTHER = "other"


# ═══════════════════════════════════════════════════════════════════
# 🎵 Request/Response Models
# ═══════════════════════════════════════════════════════════════════

class CompanyProfile(BaseModel):
    """Company profile for eligibility assessment."""
    cui: str = Field(..., description="Company CUI/CIF")
    name: str
    size: CompanySize
    sector: SectorType
    employees: int
    turnover_eur: float
    founded_year: int
    location_county: str
    is_exporter: bool = False
    has_innovation_dept: bool = False
    green_activities: bool = False
    digital_readiness: int = Field(1, ge=1, le=5)
    previous_eu_funds: bool = False


class ProjectProposal(BaseModel):
    """Project proposal for grant application."""
    title: str
    description: str
    budget_total_eur: float
    grant_requested_eur: float
    duration_months: int
    objectives: List[str]
    activities: List[str]
    expected_results: List[Dict[str, Any]]
    jobs_created: int = 0
    sustainability_impact: bool = False


class EligibilityResult(BaseModel):
    """Eligibility assessment result."""
    eligible: bool
    score: float
    matching_grants: List[Dict[str, Any]]
    recommendations: List[str]
    gaps: List[str]
    estimated_funding: float


class MilestoneStatus(BaseModel):
    """PNRR milestone tracking."""
    milestone_id: str
    description: str
    deadline: str
    status: str  # on_track, at_risk, delayed, completed
    completion_percentage: float
    risk_factors: List[str]


# ═══════════════════════════════════════════════════════════════════
# 🎵 Eligibility Scanner - The Funding Aria
# ═══════════════════════════════════════════════════════════════════

@router.post("/eligibility/scan", response_model=EligibilityResult)
async def scan_eligibility(company: CompanyProfile):
    """
    🎵 AI-powered eligibility scanner for EU funds.

    Analyzes company profile against all available PNRR and Cohesion grants.
    Returns matching opportunities with success probability.
    """
    matching_grants = []
    recommendations = []
    gaps = []

    # Check each SMB grant scheme
    for grant in SMB_GRANTS:
        match_score = _calculate_grant_match(company, grant)

        if match_score >= 0.5:
            max_eligible = min(
                grant["max_grant"],
                company.turnover_eur * 0.5  # Max 50% of turnover
            )

            matching_grants.append({
                "grant_id": grant["id"],
                "grant_name": grant["name"],
                "component": grant["component"],
                "match_score": round(match_score, 2),
                "max_eligible_amount": max_eligible,
                "cofinancing_required": max_eligible * grant["cofinancing_rate"],
                "status": grant["status"],
                "eligible_activities": grant["eligible_activities"]
            })

    # Sort by match score
    matching_grants.sort(key=lambda x: x["match_score"], reverse=True)

    # Generate recommendations
    if company.digital_readiness < 3:
        recommendations.append("Îmbunătățiți maturitatea digitală pentru a accesa Digitalizare IMM")
        gaps.append("Digital readiness below threshold")

    if not company.green_activities:
        recommendations.append("Implementați inițiative verzi pentru Green Transition grants")
        gaps.append("No green/sustainability activities")

    if company.size == CompanySize.MICRO and company.employees < 5:
        recommendations.append("Creșteți echipa pentru a accesa granturi mai mari de inovare")

    if not company.previous_eu_funds:
        recommendations.append("Începeți cu InvestEU vouchers pentru experiență fonduri europene")

    if company.founded_year > 2022:
        gaps.append("Company too new for some schemes (min 2 years required)")

    # Calculate overall eligibility
    eligible = len(matching_grants) > 0
    overall_score = max([g["match_score"] for g in matching_grants]) if matching_grants else 0
    estimated_funding = sum([g["max_eligible_amount"] for g in matching_grants[:3]])  # Top 3

    return EligibilityResult(
        eligible=eligible,
        score=overall_score,
        matching_grants=matching_grants,
        recommendations=recommendations,
        gaps=gaps,
        estimated_funding=estimated_funding
    )


@router.post("/eligibility/quiz")
async def eligibility_quiz(responses: Dict[str, Any] = Body(...)):
    """
    🎵 Interactive eligibility quiz for quick assessment.

    Simplified 10-question quiz for SMBs to check funding opportunities.
    """
    score = 0
    max_score = 100
    recommendations = []

    # Q1: Company size
    if responses.get("employees", 0) < 250:
        score += 10
    else:
        recommendations.append("Large companies have different funding schemes")

    # Q2: Sector eligibility
    eligible_sectors = ["manufacturing", "it_services", "tourism", "healthcare"]
    if responses.get("sector") in eligible_sectors:
        score += 15
    else:
        score += 5
        recommendations.append("Your sector may have limited but specific opportunities")

    # Q3: Age of company
    if responses.get("years_in_business", 0) >= 2:
        score += 10
    else:
        recommendations.append("Wait until 2-year anniversary for most grants")

    # Q4: Previous EU funds experience
    if responses.get("previous_eu_funding"):
        score += 10
    else:
        score += 5
        recommendations.append("Start with smaller voucher schemes")

    # Q5: Digital readiness
    digital_level = responses.get("digital_readiness", 1)
    score += digital_level * 3  # Max 15 points

    # Q6: Green commitment
    if responses.get("sustainability_plan"):
        score += 10
    else:
        recommendations.append("Develop sustainability strategy for green grants")

    # Q7: Innovation activities
    if responses.get("rd_activities"):
        score += 10
    else:
        recommendations.append("Consider R&D partnerships for innovation grants")

    # Q8: Export potential
    if responses.get("exports") or responses.get("export_plans"):
        score += 5

    # Q9: Location (less developed regions get priority)
    if responses.get("county") in ["VN", "BT", "SV", "VS", "GL", "TL", "BR"]:
        score += 10
        recommendations.append("Your region has priority for Cohesion funds")
    else:
        score += 5

    # Q10: Co-financing capacity
    if responses.get("cofinancing_capacity_eur", 0) >= 10000:
        score += 5
    else:
        recommendations.append("Ensure you have 15-25% co-financing available")

    # Determine tier
    if score >= 80:
        tier = "excellent"
        message = "Excelent! Aveți eligibilitate ridicată pentru multiple scheme."
    elif score >= 60:
        tier = "good"
        message = "Bine! Sunteți eligibil pentru câteva programe importante."
    elif score >= 40:
        tier = "moderate"
        message = "Potențial moderat. Urmați recomandările pentru a vă îmbunătăți șansele."
    else:
        tier = "low"
        message = "Eligibilitate limitată. Concentrați-vă pe pregătire înainte de aplicare."

    # Suggest specific programs
    suggested_programs = []
    if score >= 50:
        suggested_programs.append("Digitalizare IMM (C7)")
    if responses.get("sustainability_plan"):
        suggested_programs.append("Tranziție Verde (C5)")
    if responses.get("rd_activities"):
        suggested_programs.append("Inovare pentru competitivitate (C9)")
    if score >= 30:
        suggested_programs.append("InvestEU Innovation Voucher")

    return {
        "score": score,
        "max_score": max_score,
        "percentage": f"{score}%",
        "tier": tier,
        "message": message,
        "recommendations": recommendations,
        "suggested_programs": suggested_programs,
        "next_steps": [
            "Pregătiți documentele de eligibilitate",
            "Contactați un consultant fonduri europene",
            "Înregistrați-vă în platforma MySMIS"
        ]
    }


# ═══════════════════════════════════════════════════════════════════
# 🎵 Application Automator - The Submission Symphony
# ═══════════════════════════════════════════════════════════════════

@router.post("/application/generate")
async def generate_application(
    company: CompanyProfile,
    project: ProjectProposal,
    grant_id: str = Query(..., description="Grant scheme ID")
):
    """
    🎵 Auto-generate grant application draft.

    Creates structured application ready for MySMIS submission.
    UiPath-compatible output for automated form filling.
    """
    # Find grant scheme
    grant = next((g for g in SMB_GRANTS if g["id"] == grant_id), None)
    if not grant:
        raise HTTPException(status_code=404, detail=f"Grant scheme {grant_id} not found")

    # Validate budget
    if project.grant_requested_eur > grant["max_grant"]:
        raise HTTPException(
            status_code=400,
            detail=f"Grant request exceeds maximum of €{grant['max_grant']:,.0f}"
        )

    cofinancing = project.grant_requested_eur * grant["cofinancing_rate"]
    if project.budget_total_eur < project.grant_requested_eur + cofinancing:
        raise HTTPException(
            status_code=400,
            detail="Total budget must cover grant + co-financing"
        )

    # Generate application sections
    application = {
        "header": {
            "grant_scheme": grant["name"],
            "component": grant["component"],
            "submission_date": datetime.now().strftime("%Y-%m-%d"),
            "application_id": f"APP-{company.cui}-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        },
        "applicant": {
            "cui": company.cui,
            "name": company.name,
            "size_category": company.size.value,
            "sector": company.sector.value,
            "employees": company.employees,
            "turnover_eur": company.turnover_eur,
            "county": company.location_county
        },
        "project": {
            "title": project.title,
            "description": project.description,
            "duration_months": project.duration_months,
            "start_date": (datetime.now() + timedelta(days=90)).strftime("%Y-%m-%d"),
            "end_date": (datetime.now() + timedelta(days=90 + project.duration_months * 30)).strftime("%Y-%m-%d")
        },
        "budget": {
            "total_eur": project.budget_total_eur,
            "grant_requested_eur": project.grant_requested_eur,
            "cofinancing_eur": cofinancing,
            "cofinancing_rate": f"{grant['cofinancing_rate'] * 100:.0f}%",
            "funding_intensity": f"{(project.grant_requested_eur / project.budget_total_eur) * 100:.0f}%"
        },
        "objectives": project.objectives,
        "activities": [
            {
                "id": f"A{i+1}",
                "description": activity,
                "month_start": 1 + i * 2,
                "month_end": min(1 + (i + 1) * 3, project.duration_months)
            }
            for i, activity in enumerate(project.activities)
        ],
        "expected_results": project.expected_results,
        "indicators": {
            "jobs_created": project.jobs_created,
            "turnover_increase": f"{min(project.grant_requested_eur / company.turnover_eur * 100, 30):.0f}%",
            "digital_transformation": company.digital_readiness < 3,
            "sustainability_impact": project.sustainability_impact
        },
        "eligibility_declaration": {
            "not_in_difficulty": True,
            "no_state_aid_recovery": True,
            "smb_status_confirmed": company.size.value in ["micro", "small", "medium"],
            "fiscal_compliance": True,
            "cofinancing_available": True
        },
        "uipath_automation": {
            "form_fields": _generate_form_fields(company, project, grant),
            "attachments_required": [
                "Certificate constatator ONRC",
                "Situații financiare ultimii 2 ani",
                "Certificat fiscal ANAF",
                "Studiu fezabilitate",
                "Oferte echipamente (min 3)",
                "Declarație pe proprie răspundere"
            ]
        }
    }

    return application


@router.get("/application/documents-checklist")
async def get_documents_checklist(grant_id: str):
    """
    🎵 Get required documents checklist for application.
    """
    common_docs = [
        {"name": "Certificat constatator ONRC", "validity_days": 30, "original": False},
        {"name": "Certificat fiscal ANAF", "validity_days": 30, "original": True},
        {"name": "Situații financiare ultimii 2 ani", "validity_days": None, "original": True},
        {"name": "Bilanț contabil", "validity_days": None, "original": True},
        {"name": "Act constitutiv", "validity_days": None, "original": False},
        {"name": "CI reprezentant legal", "validity_days": None, "original": False}
    ]

    grant_specific = {
        "digitalizare_imm": [
            {"name": "Oferte echipamente IT (min 3)", "validity_days": 90, "original": True},
            {"name": "Plan de digitalizare", "validity_days": None, "original": True},
            {"name": "Declarație maturitate digitală", "validity_days": None, "original": True}
        ],
        "inovare_imm": [
            {"name": "Studiu fezabilitate", "validity_days": None, "original": True},
            {"name": "Plan de afaceri", "validity_days": None, "original": True},
            {"name": "CV-uri echipă proiect", "validity_days": None, "original": True},
            {"name": "Acorduri parteneriat (dacă aplicabil)", "validity_days": None, "original": True}
        ],
        "green_transition": [
            {"name": "Audit energetic", "validity_days": 365, "original": True},
            {"name": "Plan tranziție verde", "validity_days": None, "original": True},
            {"name": "Certificat performanță energetică", "validity_days": 365, "original": True}
        ],
        "investeu_voucher": [
            {"name": "Descriere idee/proiect", "validity_days": None, "original": True},
            {"name": "Ofertă furnizor servicii", "validity_days": 60, "original": True}
        ]
    }

    docs = common_docs + grant_specific.get(grant_id, [])

    return {
        "grant_id": grant_id,
        "documents": docs,
        "total_required": len(docs),
        "tips": [
            "Certificatele fiscale și ONRC trebuie obținute cât mai aproape de depunere",
            "Toate documentele trebuie semnate electronic cu certificat calificat",
            "Traduceți documentele în română dacă sunt emise în altă limbă"
        ]
    }


# ═══════════════════════════════════════════════════════════════════
# 🎵 Milestone Tracker - The Progress Cantata
# ═══════════════════════════════════════════════════════════════════

@router.get("/pnrr/milestones")
async def get_pnrr_milestones():
    """
    🎵 Track PNRR implementation milestones.

    Shows Romania's progress toward €21.6B disbursement.
    Aug 2026 deadline critical for €6.3B at risk.
    """
    milestones = [
        {
            "id": "Q3_2024",
            "description": "3rd Payment Request - €2.7B",
            "deadline": "2024-09-30",
            "status": "completed",
            "amount_eur": 2_700_000_000,
            "reforms_count": 34,
            "investments_count": 56
        },
        {
            "id": "Q4_2024",
            "description": "4th Payment Request - €3.1B",
            "deadline": "2024-12-31",
            "status": "completed",
            "amount_eur": 3_100_000_000,
            "reforms_count": 28,
            "investments_count": 45
        },
        {
            "id": "Q2_2025",
            "description": "5th Payment Request - €2.9B",
            "deadline": "2025-06-30",
            "status": "on_track",
            "amount_eur": 2_900_000_000,
            "reforms_count": 22,
            "investments_count": 38
        },
        {
            "id": "Q4_2025",
            "description": "6th Payment Request - €3.2B",
            "deadline": "2025-12-31",
            "status": "on_track",
            "amount_eur": 3_200_000_000,
            "reforms_count": 18,
            "investments_count": 42
        },
        {
            "id": "Q2_2026",
            "description": "7th Payment Request - €2.8B",
            "deadline": "2026-06-30",
            "status": "at_risk",
            "amount_eur": 2_800_000_000,
            "reforms_count": 15,
            "investments_count": 35,
            "risk_factors": [
                "Procurement delays in transport infrastructure",
                "Energy reforms pending legislation"
            ]
        },
        {
            "id": "Q3_2026",
            "description": "Final Payment Request - €6.3B",
            "deadline": "2026-08-31",
            "status": "at_risk",
            "amount_eur": 6_300_000_000,
            "reforms_count": 25,
            "investments_count": 52,
            "risk_factors": [
                "Concentrated deadline pressure",
                "Multiple large infrastructure projects",
                "Absorption capacity constraints"
            ]
        }
    ]

    # Calculate totals
    completed_amount = sum(m["amount_eur"] for m in milestones if m["status"] == "completed")
    at_risk_amount = sum(m["amount_eur"] for m in milestones if m["status"] == "at_risk")

    days_to_final = (PNRR_FINAL_DEADLINE - datetime.now()).days

    return {
        "total_allocation_eur": PNRR_GRANTS,
        "disbursed_eur": completed_amount,
        "at_risk_eur": at_risk_amount,
        "absorption_rate": f"{(completed_amount / PNRR_GRANTS) * 100:.1f}%",
        "final_deadline": PNRR_FINAL_DEADLINE.strftime("%Y-%m-%d"),
        "days_remaining": days_to_final,
        "milestones": milestones,
        "risk_assessment": {
            "overall_risk": "medium" if at_risk_amount < PNRR_GRANTS * 0.3 else "high",
            "critical_path": [
                "Energy sector reforms",
                "Transport infrastructure delivery",
                "Digitalization of public services"
            ]
        }
    }


@router.get("/cohesion/programs")
async def get_cohesion_programs():
    """
    🎵 Get Cohesion Policy 2021-2027 programs for Romania.
    """
    programs = [
        {
            "code": "POC",
            "name": "Programul Operațional Competitivitate",
            "allocation_eur": 4_500_000_000,
            "priority": "Business competitiveness",
            "smb_calls_active": 3,
            "deadline": "2027-12-31"
        },
        {
            "code": "POCU",
            "name": "Programul Operațional Capital Uman",
            "allocation_eur": 4_800_000_000,
            "priority": "Employment and skills",
            "smb_calls_active": 2,
            "deadline": "2027-12-31"
        },
        {
            "code": "POT",
            "name": "Programul Operațional Transport",
            "allocation_eur": 6_200_000_000,
            "priority": "Infrastructure",
            "smb_calls_active": 0,
            "deadline": "2027-12-31"
        },
        {
            "code": "PODD",
            "name": "Programul Dezvoltare Durabilă",
            "allocation_eur": 5_500_000_000,
            "priority": "Environment and sustainability",
            "smb_calls_active": 4,
            "deadline": "2027-12-31"
        },
        {
            "code": "POR",
            "name": "Programele Regionale",
            "allocation_eur": 8_000_000_000,
            "priority": "Regional development",
            "smb_calls_active": 12,
            "regions": ["NE", "SE", "SM", "SV", "V", "NV", "C", "BI"],
            "deadline": "2027-12-31"
        }
    ]

    return {
        "total_allocation_eur": COHESION_ALLOCATION,
        "programs": programs,
        "active_calls_for_smbs": sum(p["smb_calls_active"] for p in programs),
        "deadline": COHESION_DEADLINE.strftime("%Y-%m-%d"),
        "days_remaining": (COHESION_DEADLINE - datetime.now()).days
    }


# ═══════════════════════════════════════════════════════════════════
# 🎵 InvestEU Vouchers - The Innovation Prelude
# ═══════════════════════════════════════════════════════════════════

@router.get("/investeu/vouchers")
async def get_investeu_vouchers():
    """
    🎵 Get available InvestEU voucher schemes.

    Up to €50k per SMB for innovation activities.
    """
    vouchers = [
        {
            "id": "innovation_voucher",
            "name": "Innovation Voucher",
            "max_amount_eur": 50_000,
            "cofinancing_rate": 0.0,
            "eligible_activities": [
                "Feasibility studies",
                "Prototype development",
                "Technology testing",
                "IP strategy"
            ],
            "status": "open",
            "deadline": "2025-03-31"
        },
        {
            "id": "sustainability_voucher",
            "name": "Sustainability Voucher",
            "max_amount_eur": 30_000,
            "cofinancing_rate": 0.0,
            "eligible_activities": [
                "Carbon footprint assessment",
                "Sustainability strategy",
                "ESG reporting setup",
                "Circular economy planning"
            ],
            "status": "open",
            "deadline": "2025-06-30"
        },
        {
            "id": "digital_voucher",
            "name": "Digital Transformation Voucher",
            "max_amount_eur": 25_000,
            "cofinancing_rate": 0.0,
            "eligible_activities": [
                "Digital strategy",
                "Cybersecurity audit",
                "AI/ML feasibility",
                "E-commerce setup"
            ],
            "status": "upcoming",
            "expected_opening": "2025-01-15"
        }
    ]

    return {
        "program": "InvestEU Advisory Hub",
        "vouchers": vouchers,
        "eligibility": {
            "company_types": ["Micro", "Small", "Medium enterprises"],
            "location": "EU Member States",
            "sectors": "All non-excluded sectors"
        },
        "application_process": [
            "Register on InvestEU portal",
            "Complete eligibility check",
            "Submit project proposal",
            "Receive voucher (if approved)",
            "Select service provider",
            "Implement and report"
        ],
        "average_processing_time_days": 45
    }


# ═══════════════════════════════════════════════════════════════════
# 🎵 ROI Calculator - The Value Cadenza
# ═══════════════════════════════════════════════════════════════════

@router.post("/roi/calculate")
async def calculate_project_roi(
    grant_amount_eur: float = Query(..., ge=1000),
    cofinancing_eur: float = Query(..., ge=0),
    implementation_cost_eur: float = Query(..., ge=0),
    expected_revenue_increase_eur: float = Query(..., ge=0),
    expected_cost_savings_eur: float = Query(..., ge=0),
    project_years: int = Query(3, ge=1, le=10)
):
    """
    🎵 Calculate project ROI with grant funding.
    """
    total_investment = cofinancing_eur + implementation_cost_eur
    total_benefits = (expected_revenue_increase_eur + expected_cost_savings_eur) * project_years
    net_benefit = total_benefits - total_investment

    roi = ((total_benefits - total_investment) / total_investment * 100) if total_investment > 0 else 0

    # With grant (reduced own investment)
    own_investment = total_investment - grant_amount_eur
    roi_with_grant = ((total_benefits - own_investment) / own_investment * 100) if own_investment > 0 else float('inf')

    payback_years = total_investment / (expected_revenue_increase_eur + expected_cost_savings_eur) if (expected_revenue_increase_eur + expected_cost_savings_eur) > 0 else 0
    payback_with_grant = own_investment / (expected_revenue_increase_eur + expected_cost_savings_eur) if (expected_revenue_increase_eur + expected_cost_savings_eur) > 0 else 0

    return {
        "investment_analysis": {
            "total_investment_eur": total_investment,
            "grant_amount_eur": grant_amount_eur,
            "own_investment_eur": own_investment,
            "grant_coverage": f"{(grant_amount_eur / total_investment * 100):.0f}%" if total_investment > 0 else "0%"
        },
        "returns_analysis": {
            "total_benefits_eur": total_benefits,
            "net_benefit_eur": net_benefit,
            "roi_without_grant": f"{roi:.1f}%",
            "roi_with_grant": f"{roi_with_grant:.1f}%" if roi_with_grant != float('inf') else "∞ (fully funded)"
        },
        "payback_period": {
            "without_grant_years": round(payback_years, 1),
            "with_grant_years": round(payback_with_grant, 1)
        },
        "recommendation": "High value" if roi_with_grant > 100 else "Medium value" if roi_with_grant > 50 else "Evaluate carefully"
    }


# ═══════════════════════════════════════════════════════════════════
# 🎵 Helper Functions
# ═══════════════════════════════════════════════════════════════════

def _calculate_grant_match(company: CompanyProfile, grant: Dict) -> float:
    """Calculate match score between company and grant scheme."""
    score = 0.0

    # Size eligibility (SMB only)
    if company.size.value in ["micro", "small", "medium"]:
        score += 0.25
    else:
        return 0  # Large companies not eligible for SMB grants

    # Sector match
    if grant["id"] == "digitalizare_imm":
        score += 0.20 if company.digital_readiness < 4 else 0.10
    elif grant["id"] == "turism_sustenabil" and company.sector == SectorType.TOURISM:
        score += 0.25
    elif grant["id"] == "green_transition" and company.green_activities:
        score += 0.25
    elif grant["id"] == "inovare_imm" and company.has_innovation_dept:
        score += 0.25
    else:
        score += 0.10  # Base sector score

    # Financial capacity (can provide co-financing)
    if company.turnover_eur >= grant["min_grant"] * 2:
        score += 0.20

    # Experience bonus
    if company.previous_eu_funds:
        score += 0.15

    # Location bonus (less developed regions)
    if company.location_county in ["VN", "BT", "SV", "VS", "GL"]:
        score += 0.10

    # Age requirement
    if datetime.now().year - company.founded_year >= 2:
        score += 0.10

    return min(score, 1.0)


def _generate_form_fields(company: CompanyProfile, project: ProjectProposal, grant: Dict) -> List[Dict]:
    """Generate form fields for UiPath automation."""
    return [
        {"field_id": "applicant_cui", "value": company.cui, "type": "text"},
        {"field_id": "applicant_name", "value": company.name, "type": "text"},
        {"field_id": "project_title", "value": project.title, "type": "text"},
        {"field_id": "budget_total", "value": str(project.budget_total_eur), "type": "number"},
        {"field_id": "grant_requested", "value": str(project.grant_requested_eur), "type": "number"},
        {"field_id": "duration_months", "value": str(project.duration_months), "type": "number"},
        {"field_id": "jobs_created", "value": str(project.jobs_created), "type": "number"},
        {"field_id": "smb_category", "value": company.size.value, "type": "dropdown"},
        {"field_id": "sector", "value": company.sector.value, "type": "dropdown"},
        {"field_id": "county", "value": company.location_county, "type": "dropdown"}
    ]


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "operational",
        "service": "eu-funds",
        "features": [
            "PNRR €13.57B eligibility scanner",
            "Cohesion €31B program tracker",
            "InvestEU €50k vouchers",
            "Application automator (UiPath-ready)",
            "Milestone tracker (Aug 2026 deadline)",
            "ROI calculator"
        ],
        "critical_deadline": PNRR_FINAL_DEADLINE.strftime("%Y-%m-%d"),
        "days_remaining": (PNRR_FINAL_DEADLINE - datetime.now()).days
    }
