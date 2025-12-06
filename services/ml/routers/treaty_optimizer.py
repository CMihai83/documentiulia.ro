"""
Treaty Optimizer - Double Taxation Agreement Analysis
Optimizes tax positions for UK/Andorra and other treaty countries
"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from enum import Enum
from loguru import logger

router = APIRouter()

# ==================== MODELS ====================

class TreatyCountry(str, Enum):
    UK = "UK"
    ANDORRA = "AD"
    GERMANY = "DE"
    FRANCE = "FR"
    SPAIN = "ES"
    ITALY = "IT"
    NETHERLANDS = "NL"
    SWITZERLAND = "CH"
    AUSTRIA = "AT"
    BELGIUM = "BE"
    USA = "US"
    CYPRUS = "CY"
    LUXEMBOURG = "LU"
    IRELAND = "IE"

class IncomeType(str, Enum):
    DIVIDENDS = "dividends"
    INTEREST = "interest"
    ROYALTIES = "royalties"
    CAPITAL_GAINS = "capital_gains"
    EMPLOYMENT = "employment"
    BUSINESS_PROFITS = "business_profits"
    DIRECTORS_FEES = "directors_fees"
    PENSIONS = "pensions"
    REAL_ESTATE = "real_estate"

class ResidencyStatus(str, Enum):
    RO_RESIDENT = "ro_resident"
    FOREIGN_RESIDENT = "foreign_resident"
    DUAL_RESIDENT = "dual_resident"

class TaxTreatyRate(BaseModel):
    income_type: IncomeType
    domestic_rate: float
    treaty_rate: float
    conditions: List[str]
    documentation_required: List[str]
    applicable_article: str

class TreatyInfo(BaseModel):
    country_code: str
    country_name: str
    treaty_signed: str
    treaty_effective: str
    last_protocol: Optional[str]
    rates: List[TaxTreatyRate]
    key_provisions: List[str]
    special_notes: List[str]

class OptimizationRequest(BaseModel):
    source_country: TreatyCountry
    income_type: IncomeType
    gross_amount: float
    residency: ResidencyStatus = ResidencyStatus.RO_RESIDENT
    beneficial_owner: bool = True
    holding_percentage: Optional[float] = None  # For dividends
    holding_period_months: Optional[int] = None

class OptimizationResult(BaseModel):
    gross_amount: float
    domestic_tax: float
    treaty_tax: float
    savings: float
    effective_rate: float
    documentation: List[str]
    conditions_met: List[str]
    conditions_pending: List[str]
    recommendations: List[str]

class WithholdingTaxRequest(BaseModel):
    payment_type: IncomeType
    recipient_country: TreatyCountry
    gross_amount: float
    is_beneficial_owner: bool = True
    has_certificate_of_residence: bool = False

class SubstanceRequirement(BaseModel):
    requirement: str
    description: str
    documentation: List[str]
    risk_level: str  # low, medium, high

# ==================== TREATY DATABASE ====================

TREATY_DATABASE: Dict[TreatyCountry, TreatyInfo] = {
    TreatyCountry.UK: TreatyInfo(
        country_code="UK",
        country_name="United Kingdom",
        treaty_signed="1975-03-18",
        treaty_effective="1976-01-01",
        last_protocol="2016",
        rates=[
            TaxTreatyRate(
                income_type=IncomeType.DIVIDENDS,
                domestic_rate=8.0,  # 10% from 2026
                treaty_rate=10.0,  # 15% for < 10% holdings
                conditions=["Beneficial owner", "Not PE-attributable"],
                documentation_required=["Certificate of residence", "Beneficial ownership declaration"],
                applicable_article="Article 10"
            ),
            TaxTreatyRate(
                income_type=IncomeType.INTEREST,
                domestic_rate=16.0,
                treaty_rate=10.0,
                conditions=["Beneficial owner", "Arm's length"],
                documentation_required=["Certificate of residence", "Loan agreement"],
                applicable_article="Article 11"
            ),
            TaxTreatyRate(
                income_type=IncomeType.ROYALTIES,
                domestic_rate=16.0,
                treaty_rate=10.0,  # 15% for some types
                conditions=["Beneficial owner"],
                documentation_required=["Certificate of residence", "License agreement"],
                applicable_article="Article 12"
            ),
            TaxTreatyRate(
                income_type=IncomeType.CAPITAL_GAINS,
                domestic_rate=10.0,
                treaty_rate=0.0,  # Exempt in residence state
                conditions=["Not real estate related"],
                documentation_required=["Share transfer documentation", "Holding structure"],
                applicable_article="Article 13"
            ),
        ],
        key_provisions=[
            "MLI compliant since 2019",
            "Principal Purpose Test (PPT) applies",
            "Limitation on Benefits (LOB) provisions",
            "Arbitration available for disputes"
        ],
        special_notes=[
            "Post-Brexit: Treaty remains in force",
            "PE threshold: 12 months for construction",
            "Dual residence tie-breaker: Place of effective management"
        ]
    ),
    TreatyCountry.ANDORRA: TreatyInfo(
        country_code="AD",
        country_name="Andorra",
        treaty_signed="2015-07-02",
        treaty_effective="2016-02-23",
        last_protocol=None,
        rates=[
            TaxTreatyRate(
                income_type=IncomeType.DIVIDENDS,
                domestic_rate=8.0,
                treaty_rate=5.0,  # 10% for < 25% holdings
                conditions=["25%+ holding for 365 days", "Beneficial owner"],
                documentation_required=["Certificate of residence", "Holding structure proof"],
                applicable_article="Article 10"
            ),
            TaxTreatyRate(
                income_type=IncomeType.INTEREST,
                domestic_rate=16.0,
                treaty_rate=0.0,  # Exempt
                conditions=["Beneficial owner"],
                documentation_required=["Certificate of residence"],
                applicable_article="Article 11"
            ),
            TaxTreatyRate(
                income_type=IncomeType.ROYALTIES,
                domestic_rate=16.0,
                treaty_rate=5.0,
                conditions=["Beneficial owner"],
                documentation_required=["Certificate of residence", "License agreement"],
                applicable_article="Article 12"
            ),
        ],
        key_provisions=[
            "Information exchange provisions",
            "Anti-abuse clauses",
            "Mutual agreement procedure"
        ],
        special_notes=[
            "Andorra removed from blacklist in 2018",
            "Strict substance requirements apply",
            "Annual exchange of information"
        ]
    ),
    TreatyCountry.CYPRUS: TreatyInfo(
        country_code="CY",
        country_name="Cyprus",
        treaty_signed="1981-11-16",
        treaty_effective="1982-12-25",
        last_protocol="2017",
        rates=[
            TaxTreatyRate(
                income_type=IncomeType.DIVIDENDS,
                domestic_rate=8.0,
                treaty_rate=10.0,
                conditions=["Beneficial owner"],
                documentation_required=["Certificate of residence"],
                applicable_article="Article 10"
            ),
            TaxTreatyRate(
                income_type=IncomeType.INTEREST,
                domestic_rate=16.0,
                treaty_rate=10.0,
                conditions=["Beneficial owner"],
                documentation_required=["Certificate of residence"],
                applicable_article="Article 11"
            ),
            TaxTreatyRate(
                income_type=IncomeType.ROYALTIES,
                domestic_rate=16.0,
                treaty_rate=5.0,
                conditions=["Beneficial owner"],
                documentation_required=["Certificate of residence"],
                applicable_article="Article 12"
            ),
        ],
        key_provisions=[
            "EU Directive alignment",
            "Exchange of information",
            "No capital gains in source state (non-PE)"
        ],
        special_notes=[
            "Popular holding jurisdiction",
            "Check IP box regime interaction",
            "BEPS compliance required"
        ]
    ),
}

# Domestic Romanian withholding rates (as of 2024/2026)
DOMESTIC_RATES = {
    IncomeType.DIVIDENDS: {"2024": 8.0, "2026": 10.0},
    IncomeType.INTEREST: {"2024": 16.0, "2026": 16.0},
    IncomeType.ROYALTIES: {"2024": 16.0, "2026": 16.0},
    IncomeType.CAPITAL_GAINS: {"2024": 10.0, "2026": 10.0},
    IncomeType.EMPLOYMENT: {"2024": 10.0, "2026": 10.0},
}

# ==================== HELPER FUNCTIONS ====================

def get_applicable_domestic_rate(income_type: IncomeType, year: int = None) -> float:
    """Get the domestic Romanian withholding rate."""
    if year is None:
        year = datetime.now().year

    rates = DOMESTIC_RATES.get(income_type, {"2024": 16.0, "2026": 16.0})
    return rates.get("2026" if year >= 2026 else "2024", 16.0)

def calculate_treaty_benefit(
    gross_amount: float,
    domestic_rate: float,
    treaty_rate: float
) -> Dict[str, float]:
    """Calculate tax under both scenarios."""
    domestic_tax = gross_amount * (domestic_rate / 100)
    treaty_tax = gross_amount * (treaty_rate / 100)
    savings = domestic_tax - treaty_tax

    return {
        "domestic_tax": round(domestic_tax, 2),
        "treaty_tax": round(treaty_tax, 2),
        "savings": round(savings, 2),
        "effective_rate": treaty_rate
    }

# ==================== ENDPOINTS ====================

@router.get("/treaties")
async def list_treaties():
    """List all available double taxation treaties."""
    treaties = []
    for country, info in TREATY_DATABASE.items():
        treaties.append({
            "country_code": info.country_code,
            "country_name": info.country_name,
            "treaty_effective": info.treaty_effective,
            "income_types_covered": [r.income_type.value for r in info.rates]
        })

    return {
        "success": True,
        "treaties": treaties,
        "total": len(treaties)
    }

@router.get("/treaties/{country_code}", response_model=TreatyInfo)
async def get_treaty_details(country_code: TreatyCountry):
    """Get detailed information about a specific treaty."""
    if country_code not in TREATY_DATABASE:
        raise HTTPException(status_code=404, detail="Treaty not found")

    return TREATY_DATABASE[country_code]

@router.post("/optimize", response_model=OptimizationResult)
async def optimize_tax_position(request: OptimizationRequest):
    """Optimize tax position using applicable treaty."""

    if request.source_country not in TREATY_DATABASE:
        raise HTTPException(
            status_code=400,
            detail=f"No treaty available with {request.source_country.value}"
        )

    treaty = TREATY_DATABASE[request.source_country]

    # Find applicable rate
    applicable_rate = None
    for rate in treaty.rates:
        if rate.income_type == request.income_type:
            applicable_rate = rate
            break

    if not applicable_rate:
        raise HTTPException(
            status_code=400,
            detail=f"Income type {request.income_type.value} not covered by treaty"
        )

    # Get domestic rate (considering 2026 changes)
    year = datetime.now().year
    domestic_rate = get_applicable_domestic_rate(request.income_type, year)

    # Calculate benefits
    calculation = calculate_treaty_benefit(
        request.gross_amount,
        domestic_rate,
        applicable_rate.treaty_rate
    )

    # Assess conditions
    conditions_met = []
    conditions_pending = []

    if request.beneficial_owner:
        conditions_met.append("Beneficial owner status confirmed")
    else:
        conditions_pending.append("Beneficial owner status needs verification")

    if request.income_type == IncomeType.DIVIDENDS and request.holding_percentage:
        if request.holding_percentage >= 25:
            conditions_met.append(f"Substantial holding ({request.holding_percentage}%)")
            # May qualify for reduced rate
            calculation["treaty_tax"] = request.gross_amount * 0.05  # 5% for substantial
            calculation["savings"] = calculation["domestic_tax"] - calculation["treaty_tax"]
            calculation["effective_rate"] = 5.0
        else:
            conditions_met.append(f"Portfolio holding ({request.holding_percentage}%)")

    # Generate recommendations
    recommendations = [
        "Obtain certificate of fiscal residence before payment date",
        "Maintain beneficial ownership documentation",
        "File treaty claim with Romanian tax authorities",
    ]

    if calculation["savings"] > 1000:
        recommendations.append("Consider transfer pricing documentation")

    if request.source_country == TreatyCountry.ANDORRA:
        recommendations.append("Ensure substance requirements are met in Andorra")

    return OptimizationResult(
        gross_amount=request.gross_amount,
        domestic_tax=calculation["domestic_tax"],
        treaty_tax=calculation["treaty_tax"],
        savings=calculation["savings"],
        effective_rate=calculation["effective_rate"],
        documentation=applicable_rate.documentation_required,
        conditions_met=conditions_met,
        conditions_pending=conditions_pending,
        recommendations=recommendations
    )

@router.post("/withholding-rate")
async def calculate_withholding_rate(request: WithholdingTaxRequest):
    """Calculate applicable withholding tax rate for outbound payments."""

    domestic_rate = get_applicable_domestic_rate(request.payment_type)

    if request.recipient_country not in TREATY_DATABASE:
        # No treaty - apply domestic rate
        return {
            "applicable_rate": domestic_rate,
            "tax_amount": round(request.gross_amount * (domestic_rate / 100), 2),
            "treaty_benefit": False,
            "reason": "No double taxation treaty in force",
            "documentation_required": ["Standard withholding documentation"]
        }

    treaty = TREATY_DATABASE[request.recipient_country]

    # Find applicable treaty rate
    treaty_rate = domestic_rate
    applicable_article = None

    for rate in treaty.rates:
        if rate.income_type == request.payment_type:
            treaty_rate = rate.treaty_rate
            applicable_article = rate.applicable_article
            break

    # Check conditions
    can_apply_treaty = True
    reasons = []

    if not request.is_beneficial_owner:
        can_apply_treaty = False
        reasons.append("Beneficial owner status not confirmed")

    if not request.has_certificate_of_residence:
        reasons.append("Certificate of residence required before applying treaty rate")

    applicable_rate = treaty_rate if can_apply_treaty and request.has_certificate_of_residence else domestic_rate

    return {
        "applicable_rate": applicable_rate,
        "tax_amount": round(request.gross_amount * (applicable_rate / 100), 2),
        "treaty_benefit": applicable_rate < domestic_rate,
        "treaty_rate": treaty_rate,
        "domestic_rate": domestic_rate,
        "savings": round(request.gross_amount * ((domestic_rate - applicable_rate) / 100), 2),
        "applicable_article": applicable_article,
        "conditions_to_apply": reasons,
        "documentation_required": [
            "Certificate of fiscal residence (original)",
            "Beneficial ownership declaration",
            "Form 102 (Romanian withholding declaration)"
        ]
    }

@router.get("/substance-requirements/{country_code}")
async def get_substance_requirements(country_code: TreatyCountry):
    """Get substance requirements for treaty application."""

    requirements = {
        TreatyCountry.ANDORRA: [
            SubstanceRequirement(
                requirement="Local Directors",
                description="At least one director must be Andorran resident",
                documentation=["Board meeting minutes", "Director residence proof"],
                risk_level="high"
            ),
            SubstanceRequirement(
                requirement="Physical Office",
                description="Registered office with actual presence",
                documentation=["Lease agreement", "Utility bills"],
                risk_level="medium"
            ),
            SubstanceRequirement(
                requirement="Local Employees",
                description="Staff to manage day-to-day operations",
                documentation=["Employment contracts", "Social security registration"],
                risk_level="high"
            ),
            SubstanceRequirement(
                requirement="Decision Making",
                description="Key decisions must be made in Andorra",
                documentation=["Board resolutions", "Management accounts"],
                risk_level="high"
            ),
        ],
        TreatyCountry.UK: [
            SubstanceRequirement(
                requirement="Central Management",
                description="Place of effective management in UK",
                documentation=["Board meeting records", "Management accounts"],
                risk_level="medium"
            ),
            SubstanceRequirement(
                requirement="PE Avoidance",
                description="No permanent establishment in Romania if relying on business profits article",
                documentation=["Employee location records", "Contract analysis"],
                risk_level="medium"
            ),
        ],
        TreatyCountry.CYPRUS: [
            SubstanceRequirement(
                requirement="Management and Control",
                description="Board meetings in Cyprus, directors resident in Cyprus",
                documentation=["Board minutes", "Director tax residency"],
                risk_level="high"
            ),
            SubstanceRequirement(
                requirement="Qualified Employees",
                description="Adequate staff to perform functions",
                documentation=["Org chart", "Employment records"],
                risk_level="medium"
            ),
        ],
    }

    if country_code not in requirements:
        return {
            "country": country_code.value,
            "requirements": [],
            "note": "Standard treaty application requirements apply"
        }

    return {
        "country": country_code.value,
        "requirements": [r.model_dump() for r in requirements[country_code]],
        "general_advice": [
            "Maintain contemporaneous documentation",
            "Regular review of substance adequacy",
            "Consider anti-avoidance rules (PPT, GAAR)",
            "Annual compliance review recommended"
        ]
    }

@router.get("/comparison")
async def compare_treaties(
    income_type: IncomeType,
    amount: float = 100000
):
    """Compare treaty rates across multiple jurisdictions."""

    domestic_rate = get_applicable_domestic_rate(income_type)
    comparisons = []

    for country, treaty in TREATY_DATABASE.items():
        for rate in treaty.rates:
            if rate.income_type == income_type:
                treaty_tax = amount * (rate.treaty_rate / 100)
                domestic_tax = amount * (domestic_rate / 100)

                comparisons.append({
                    "country": treaty.country_name,
                    "country_code": country.value,
                    "treaty_rate": rate.treaty_rate,
                    "treaty_tax": round(treaty_tax, 2),
                    "savings": round(domestic_tax - treaty_tax, 2),
                    "savings_percentage": round((domestic_rate - rate.treaty_rate), 2),
                    "conditions": rate.conditions[:2],  # First 2 conditions
                    "article": rate.applicable_article
                })
                break

    # Sort by savings
    comparisons.sort(key=lambda x: x["savings"], reverse=True)

    return {
        "income_type": income_type.value,
        "test_amount": amount,
        "domestic_rate": domestic_rate,
        "domestic_tax": round(amount * (domestic_rate / 100), 2),
        "treaty_comparisons": comparisons,
        "best_option": comparisons[0] if comparisons else None
    }

@router.get("/uk-specifics")
async def get_uk_treaty_specifics():
    """Get UK-specific treaty information post-Brexit."""

    return {
        "status": "In force (post-Brexit)",
        "key_changes_post_brexit": [
            "EU Parent-Subsidiary Directive no longer applies",
            "EU Interest and Royalties Directive no longer applies",
            "Treaty rates now apply instead of EU exemptions",
            "Withholding tax reinstated on certain payments"
        ],
        "current_rates": {
            "dividends": "10% (15% for portfolio)",
            "interest": "10%",
            "royalties": "10-15%"
        },
        "documentation_for_uk_recipients": [
            "UK certificate of residence (self-serve from HMRC)",
            "Beneficial ownership declaration",
            "Non-PE declaration if applicable"
        ],
        "upcoming_changes": [
            "UK-Romania treaty under review for MLI updates",
            "PPT now applies - ensure business purpose"
        ],
        "practical_tips": [
            "File Form 102 with ANAF for withholding purposes",
            "Keep treaty claims separate in accounting",
            "Monitor UK tax residence rules changes"
        ]
    }

@router.get("/andorra-specifics")
async def get_andorra_treaty_specifics():
    """Get Andorra-specific treaty information."""

    return {
        "status": "In force since 2016",
        "attractiveness": {
            "dividends": "5% for substantial holdings (vs 8% domestic)",
            "interest": "0% exemption (vs 16% domestic)",
            "royalties": "5% (vs 16% domestic)"
        },
        "substance_critical": True,
        "minimum_substance": [
            "Board majority resident in Andorra",
            "Physical office (not virtual)",
            "At least 1 full-time employee",
            "Bank accounts in Andorra",
            "Key decisions documented in Andorra"
        ],
        "risk_factors": [
            "High scrutiny from Romanian authorities",
            "Information exchange with Romania",
            "Anti-abuse provisions apply",
            "Blacklist history considerations"
        ],
        "cost_benefit_analysis": {
            "setup_cost_estimate": "€15,000-30,000",
            "annual_maintenance": "€10,000-20,000",
            "minimum_savings_threshold": "€50,000+ annual savings recommended",
            "break_even_period": "2-3 years typically"
        },
        "alternatives_to_consider": [
            "Cyprus (EU member, lower scrutiny)",
            "Luxembourg (robust treaty network)",
            "Netherlands (holding regime)"
        ]
    }
