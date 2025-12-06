"""
ESG Calculator - Environmental, Social, Governance Analysis from Expenses
Calculates carbon footprint and ESG metrics from expense data
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from enum import Enum
from loguru import logger
import math

router = APIRouter()

# ==================== MODELS ====================

class ExpenseCategory(str, Enum):
    UTILITIES = "utilities"
    FUEL = "fuel"
    TRAVEL = "travel"
    OFFICE_SUPPLIES = "office_supplies"
    IT_EQUIPMENT = "it_equipment"
    CATERING = "catering"
    WASTE_MANAGEMENT = "waste_management"
    MAINTENANCE = "maintenance"
    TRANSPORT = "transport"
    ACCOMMODATION = "accommodation"
    OTHER = "other"

class UtilityType(str, Enum):
    ELECTRICITY = "electricity"
    NATURAL_GAS = "natural_gas"
    WATER = "water"
    HEATING = "heating"

class FuelType(str, Enum):
    DIESEL = "diesel"
    PETROL = "petrol"
    LPG = "lpg"
    ELECTRIC = "electric"

class TravelMode(str, Enum):
    AIR_DOMESTIC = "air_domestic"
    AIR_SHORT_HAUL = "air_short_haul"
    AIR_LONG_HAUL = "air_long_haul"
    TRAIN = "train"
    CAR = "car"
    PUBLIC_TRANSPORT = "public_transport"

class ESGCategory(str, Enum):
    ENVIRONMENTAL = "environmental"
    SOCIAL = "social"
    GOVERNANCE = "governance"

class ExpenseInput(BaseModel):
    category: ExpenseCategory
    amount: float  # In RON
    description: Optional[str] = None
    date: Optional[datetime] = None
    # For utilities
    utility_type: Optional[UtilityType] = None
    consumption_kwh: Optional[float] = None
    consumption_m3: Optional[float] = None
    # For fuel
    fuel_type: Optional[FuelType] = None
    liters: Optional[float] = None
    km_traveled: Optional[float] = None
    # For travel
    travel_mode: Optional[TravelMode] = None
    distance_km: Optional[float] = None

class CarbonFootprint(BaseModel):
    total_co2_kg: float
    scope1_kg: float  # Direct emissions (fuel, gas)
    scope2_kg: float  # Indirect from electricity
    scope3_kg: float  # Value chain (travel, supplies)
    breakdown: Dict[str, float]
    equivalent_trees: int
    equivalent_km_driven: float

class ESGScore(BaseModel):
    overall_score: float  # 0-100
    environmental_score: float
    social_score: float
    governance_score: float
    rating: str  # A, B, C, D, E
    industry_percentile: int
    improvement_areas: List[str]

class ESGRecommendation(BaseModel):
    category: ESGCategory
    title: str
    description: str
    potential_savings_ron: float
    co2_reduction_kg: float
    implementation_difficulty: str  # easy, medium, hard
    roi_months: int

class ESGReport(BaseModel):
    period_start: datetime
    period_end: datetime
    carbon_footprint: CarbonFootprint
    esg_score: ESGScore
    expense_analysis: Dict[str, Any]
    recommendations: List[ESGRecommendation]
    comparison_previous_period: Optional[Dict[str, float]]

# ==================== EMISSION FACTORS ====================

# CO2 emission factors (kg CO2 per unit)
EMISSION_FACTORS = {
    # Electricity (kg CO2 per kWh) - Romania grid average
    "electricity_ro": 0.299,  # Romanian grid emission factor 2024

    # Natural Gas (kg CO2 per m3)
    "natural_gas": 1.93,

    # District heating (kg CO2 per kWh)
    "heating": 0.220,

    # Fuels (kg CO2 per liter)
    "diesel": 2.68,
    "petrol": 2.31,
    "lpg": 1.51,

    # Travel (kg CO2 per km per passenger)
    "air_domestic": 0.255,
    "air_short_haul": 0.156,
    "air_long_haul": 0.195,
    "train": 0.041,
    "car": 0.171,  # Average car
    "public_transport": 0.089,

    # Office supplies and equipment (kg CO2 per RON spent - approximation)
    "office_supplies": 0.5,  # kg CO2 per 100 RON
    "it_equipment": 2.0,  # kg CO2 per 100 RON (manufacturing intensive)
    "catering": 0.8,  # kg CO2 per 100 RON (food-related)

    # Waste (kg CO2 per kg waste)
    "waste_landfill": 0.587,
    "waste_recycled": 0.021,
}

# Average prices for conversion (RON)
AVERAGE_PRICES = {
    "electricity_kwh": 1.5,  # RON per kWh
    "natural_gas_m3": 3.5,  # RON per m3
    "diesel_liter": 8.0,
    "petrol_liter": 7.5,
    "lpg_liter": 3.5,
}

# ==================== HELPER FUNCTIONS ====================

def estimate_consumption_from_amount(category: ExpenseCategory, amount: float, **kwargs) -> Dict[str, float]:
    """Estimate consumption quantities from expense amounts."""

    if category == ExpenseCategory.UTILITIES:
        utility_type = kwargs.get("utility_type", UtilityType.ELECTRICITY)
        if utility_type == UtilityType.ELECTRICITY:
            kwh = amount / AVERAGE_PRICES["electricity_kwh"]
            return {"kwh": kwh, "emission_factor": EMISSION_FACTORS["electricity_ro"]}
        elif utility_type == UtilityType.NATURAL_GAS:
            m3 = amount / AVERAGE_PRICES["natural_gas_m3"]
            return {"m3": m3, "emission_factor": EMISSION_FACTORS["natural_gas"]}
        elif utility_type == UtilityType.HEATING:
            # Estimate kWh from amount (assume district heating rate)
            kwh = amount / 0.5  # Approximate rate
            return {"kwh": kwh, "emission_factor": EMISSION_FACTORS["heating"]}

    elif category == ExpenseCategory.FUEL:
        fuel_type = kwargs.get("fuel_type", FuelType.DIESEL)
        if fuel_type == FuelType.DIESEL:
            liters = amount / AVERAGE_PRICES["diesel_liter"]
            return {"liters": liters, "emission_factor": EMISSION_FACTORS["diesel"]}
        elif fuel_type == FuelType.PETROL:
            liters = amount / AVERAGE_PRICES["petrol_liter"]
            return {"liters": liters, "emission_factor": EMISSION_FACTORS["petrol"]}
        elif fuel_type == FuelType.LPG:
            liters = amount / AVERAGE_PRICES["lpg_liter"]
            return {"liters": liters, "emission_factor": EMISSION_FACTORS["lpg"]}

    return {"amount": amount}

def calculate_co2_from_expense(expense: ExpenseInput) -> float:
    """Calculate CO2 emissions from a single expense."""

    if expense.category == ExpenseCategory.UTILITIES:
        if expense.consumption_kwh:
            factor = EMISSION_FACTORS["electricity_ro"]
            if expense.utility_type == UtilityType.NATURAL_GAS and expense.consumption_m3:
                return expense.consumption_m3 * EMISSION_FACTORS["natural_gas"]
            return expense.consumption_kwh * factor
        else:
            # Estimate from amount
            est = estimate_consumption_from_amount(
                expense.category,
                expense.amount,
                utility_type=expense.utility_type
            )
            if "kwh" in est:
                return est["kwh"] * est["emission_factor"]
            elif "m3" in est:
                return est["m3"] * est["emission_factor"]

    elif expense.category == ExpenseCategory.FUEL:
        if expense.liters:
            factor = EMISSION_FACTORS.get(expense.fuel_type.value if expense.fuel_type else "diesel", 2.5)
            return expense.liters * factor
        else:
            est = estimate_consumption_from_amount(
                expense.category,
                expense.amount,
                fuel_type=expense.fuel_type
            )
            if "liters" in est:
                return est["liters"] * est["emission_factor"]

    elif expense.category == ExpenseCategory.TRAVEL:
        if expense.distance_km:
            factor = EMISSION_FACTORS.get(
                expense.travel_mode.value if expense.travel_mode else "car",
                0.171
            )
            return expense.distance_km * factor
        else:
            # Rough estimate: 1 RON = 5 km of travel
            estimated_km = expense.amount / 5
            return estimated_km * 0.171

    elif expense.category == ExpenseCategory.OFFICE_SUPPLIES:
        return (expense.amount / 100) * EMISSION_FACTORS["office_supplies"]

    elif expense.category == ExpenseCategory.IT_EQUIPMENT:
        return (expense.amount / 100) * EMISSION_FACTORS["it_equipment"]

    elif expense.category == ExpenseCategory.CATERING:
        return (expense.amount / 100) * EMISSION_FACTORS["catering"]

    # Default estimation for other categories
    return (expense.amount / 100) * 0.3  # 0.3 kg CO2 per 100 RON

def categorize_scope(category: ExpenseCategory) -> str:
    """Categorize expense into GHG Protocol scope."""
    if category in [ExpenseCategory.FUEL]:
        return "scope1"
    elif category == ExpenseCategory.UTILITIES:
        return "scope2"
    else:
        return "scope3"

def calculate_esg_score(
    carbon_footprint: CarbonFootprint,
    total_expenses: float,
    employee_count: int = 10
) -> ESGScore:
    """Calculate ESG score based on metrics."""

    # Environmental score (0-100)
    # Lower CO2 per employee = better score
    co2_per_employee = carbon_footprint.total_co2_kg / max(employee_count, 1)
    # Benchmark: 2000 kg CO2 per employee per year is average
    env_score = max(0, min(100, 100 - (co2_per_employee / 2000) * 50))

    # Social score (placeholder - would need more data)
    social_score = 70.0  # Default assumption

    # Governance score (placeholder - would need more data)
    governance_score = 75.0  # Default assumption

    # Overall weighted score
    overall = env_score * 0.5 + social_score * 0.25 + governance_score * 0.25

    # Rating
    if overall >= 80:
        rating = "A"
    elif overall >= 65:
        rating = "B"
    elif overall >= 50:
        rating = "C"
    elif overall >= 35:
        rating = "D"
    else:
        rating = "E"

    improvement_areas = []
    if env_score < 60:
        improvement_areas.append("Reduce carbon emissions")
    if carbon_footprint.scope2_kg > carbon_footprint.total_co2_kg * 0.5:
        improvement_areas.append("Switch to renewable energy")
    if carbon_footprint.scope3_kg > 1000:
        improvement_areas.append("Optimize business travel")

    return ESGScore(
        overall_score=round(overall, 1),
        environmental_score=round(env_score, 1),
        social_score=round(social_score, 1),
        governance_score=round(governance_score, 1),
        rating=rating,
        industry_percentile=int(overall),  # Simplified
        improvement_areas=improvement_areas
    )

def generate_recommendations(
    carbon_footprint: CarbonFootprint,
    expenses_by_category: Dict[str, float]
) -> List[ESGRecommendation]:
    """Generate ESG improvement recommendations."""

    recommendations = []

    # Electricity optimization
    if carbon_footprint.scope2_kg > 500:
        recommendations.append(ESGRecommendation(
            category=ESGCategory.ENVIRONMENTAL,
            title="Tranziție la energie regenerabilă",
            description="Schimbați furnizorul de energie la unul cu certificat verde sau instalați panouri solare",
            potential_savings_ron=expenses_by_category.get("utilities", 0) * 0.15,
            co2_reduction_kg=carbon_footprint.scope2_kg * 0.6,
            implementation_difficulty="medium",
            roi_months=24
        ))

    # Fuel optimization
    if carbon_footprint.scope1_kg > 1000:
        recommendations.append(ESGRecommendation(
            category=ESGCategory.ENVIRONMENTAL,
            title="Flotă de vehicule electrice/hibride",
            description="Înlocuiți treptat vehiculele diesel cu variante electrice sau hibride",
            potential_savings_ron=expenses_by_category.get("fuel", 0) * 0.30,
            co2_reduction_kg=carbon_footprint.scope1_kg * 0.5,
            implementation_difficulty="hard",
            roi_months=48
        ))

    # Travel optimization
    if expenses_by_category.get("travel", 0) > 10000:
        recommendations.append(ESGRecommendation(
            category=ESGCategory.ENVIRONMENTAL,
            title="Politică de călătorii sustenabile",
            description="Prioritizați trenul pentru distanțe sub 500km și videoconferințe pentru întâlniri",
            potential_savings_ron=expenses_by_category.get("travel", 0) * 0.20,
            co2_reduction_kg=carbon_footprint.scope3_kg * 0.3,
            implementation_difficulty="easy",
            roi_months=6
        ))

    # Office optimization
    if expenses_by_category.get("office_supplies", 0) > 5000:
        recommendations.append(ESGRecommendation(
            category=ESGCategory.ENVIRONMENTAL,
            title="Digitalizare și reducere hârtie",
            description="Implementați semnături electronice și arhivare digitală",
            potential_savings_ron=expenses_by_category.get("office_supplies", 0) * 0.40,
            co2_reduction_kg=200,
            implementation_difficulty="easy",
            roi_months=12
        ))

    # LED lighting
    recommendations.append(ESGRecommendation(
        category=ESGCategory.ENVIRONMENTAL,
        title="Iluminat LED și senzori de mișcare",
        description="Înlocuiți becurile clasice cu LED și instalați senzori în zonele comune",
        potential_savings_ron=expenses_by_category.get("utilities", 0) * 0.10,
        co2_reduction_kg=carbon_footprint.scope2_kg * 0.15,
        implementation_difficulty="easy",
        roi_months=18
    ))

    # Social recommendations
    recommendations.append(ESGRecommendation(
        category=ESGCategory.SOCIAL,
        title="Program de wellness pentru angajați",
        description="Oferiți abonamente sportive și zile de sănătate mintală",
        potential_savings_ron=0,  # Not cost saving
        co2_reduction_kg=0,
        implementation_difficulty="easy",
        roi_months=0  # Non-financial benefit
    ))

    return recommendations[:6]  # Top 6 recommendations

# ==================== ENDPOINTS ====================

@router.post("/calculate", response_model=ESGReport)
async def calculate_esg_from_expenses(
    expenses: List[ExpenseInput],
    employee_count: int = 10,
    period_months: int = 12
):
    """Calculate ESG metrics from expense data."""

    if not expenses:
        raise HTTPException(status_code=400, detail="No expenses provided")

    # Calculate carbon footprint
    scope1_total = 0.0
    scope2_total = 0.0
    scope3_total = 0.0
    breakdown = {}
    expenses_by_category = {}

    for expense in expenses:
        co2 = calculate_co2_from_expense(expense)
        scope = categorize_scope(expense.category)

        if scope == "scope1":
            scope1_total += co2
        elif scope == "scope2":
            scope2_total += co2
        else:
            scope3_total += co2

        # Track breakdown
        cat_name = expense.category.value
        breakdown[cat_name] = breakdown.get(cat_name, 0) + co2
        expenses_by_category[cat_name] = expenses_by_category.get(cat_name, 0) + expense.amount

    total_co2 = scope1_total + scope2_total + scope3_total

    carbon_footprint = CarbonFootprint(
        total_co2_kg=round(total_co2, 2),
        scope1_kg=round(scope1_total, 2),
        scope2_kg=round(scope2_total, 2),
        scope3_kg=round(scope3_total, 2),
        breakdown={k: round(v, 2) for k, v in breakdown.items()},
        equivalent_trees=int(total_co2 / 21),  # One tree absorbs ~21 kg CO2/year
        equivalent_km_driven=round(total_co2 / 0.171, 0)  # Average car emissions per km
    )

    # Calculate ESG score
    total_expenses = sum(e.amount for e in expenses)
    esg_score = calculate_esg_score(carbon_footprint, total_expenses, employee_count)

    # Generate recommendations
    recommendations = generate_recommendations(carbon_footprint, expenses_by_category)

    # Period dates
    now = datetime.now()
    period_start = now - timedelta(days=period_months * 30)

    return ESGReport(
        period_start=period_start,
        period_end=now,
        carbon_footprint=carbon_footprint,
        esg_score=esg_score,
        expense_analysis={
            "total_expenses_ron": round(total_expenses, 2),
            "expenses_by_category": expenses_by_category,
            "co2_intensity": round(total_co2 / max(total_expenses, 1) * 1000, 2),  # kg CO2 per 1000 RON
            "co2_per_employee": round(total_co2 / employee_count, 2)
        },
        recommendations=recommendations,
        comparison_previous_period=None  # Would need historical data
    )

@router.get("/emission-factors")
async def get_emission_factors():
    """Get current emission factors used in calculations."""
    return {
        "emission_factors": EMISSION_FACTORS,
        "source": "Romanian Energy Regulatory Authority (ANRE) 2024",
        "electricity_mix": {
            "nuclear": "18%",
            "hydro": "27%",
            "natural_gas": "15%",
            "coal": "17%",
            "wind": "14%",
            "solar": "5%",
            "other": "4%"
        }
    }

@router.post("/quick-estimate")
async def quick_carbon_estimate(
    monthly_electricity_ron: float = 0,
    monthly_gas_ron: float = 0,
    monthly_fuel_ron: float = 0,
    annual_travel_ron: float = 0,
    employee_count: int = 10
):
    """Quick carbon footprint estimate from basic expense data."""

    # Estimate consumption and emissions
    electricity_kwh = monthly_electricity_ron / AVERAGE_PRICES["electricity_kwh"]
    electricity_co2 = electricity_kwh * EMISSION_FACTORS["electricity_ro"] * 12  # Annual

    gas_m3 = monthly_gas_ron / AVERAGE_PRICES["natural_gas_m3"]
    gas_co2 = gas_m3 * EMISSION_FACTORS["natural_gas"] * 12  # Annual

    fuel_liters = monthly_fuel_ron / AVERAGE_PRICES["diesel_liter"]
    fuel_co2 = fuel_liters * EMISSION_FACTORS["diesel"] * 12  # Annual

    # Rough estimate for travel (mix of air and ground)
    travel_co2 = (annual_travel_ron / 5) * 0.2  # Assume 5 RON/km average, 0.2 kg CO2/km

    total_co2 = electricity_co2 + gas_co2 + fuel_co2 + travel_co2

    # Industry benchmark (Romanian SME average: ~2500 kg CO2 per employee per year)
    benchmark_co2 = employee_count * 2500

    return {
        "annual_co2_estimate_kg": round(total_co2, 0),
        "breakdown": {
            "electricity": round(electricity_co2, 0),
            "natural_gas": round(gas_co2, 0),
            "fuel": round(fuel_co2, 0),
            "travel": round(travel_co2, 0)
        },
        "co2_per_employee": round(total_co2 / employee_count, 0),
        "industry_benchmark_per_employee": 2500,
        "vs_benchmark": f"{round((total_co2 / benchmark_co2) * 100, 0)}%",
        "equivalent_trees_needed": int(total_co2 / 21),
        "rating": "Good" if total_co2 < benchmark_co2 else "Needs Improvement"
    }

@router.get("/benchmarks")
async def get_industry_benchmarks():
    """Get ESG benchmarks by industry."""
    return {
        "benchmarks_kg_co2_per_employee_annual": {
            "technology": 1500,
            "services": 2000,
            "retail": 3000,
            "manufacturing": 5000,
            "logistics": 8000,
            "construction": 6000,
            "agriculture": 4000
        },
        "reduction_targets": {
            "2025": "10% reduction vs 2020 baseline",
            "2030": "45% reduction vs 2020 baseline",
            "2050": "Net zero emissions"
        },
        "eu_taxonomy_thresholds": {
            "substantially_contributing": "< 100 g CO2/kWh",
            "do_no_significant_harm": "< 270 g CO2/kWh"
        }
    }

@router.get("/reporting-standards")
async def get_reporting_standards():
    """Get information about ESG reporting standards."""
    return {
        "mandatory_reporting": {
            "csrd": {
                "name": "Corporate Sustainability Reporting Directive",
                "applicable_from": "2024 (large companies), 2025 (listed SMEs)",
                "scope": "EU companies with 500+ employees or listed",
                "requirements": [
                    "Double materiality assessment",
                    "Scope 1, 2, 3 emissions",
                    "EU Taxonomy alignment",
                    "Third-party assurance"
                ]
            },
            "sfdr": {
                "name": "Sustainable Finance Disclosure Regulation",
                "applicable_to": "Financial market participants",
                "key_metrics": ["PAI indicators", "Climate risks"]
            }
        },
        "voluntary_frameworks": {
            "ghg_protocol": "Greenhouse Gas Protocol - Standard for emissions accounting",
            "gri": "Global Reporting Initiative - Comprehensive sustainability reporting",
            "tcfd": "Task Force on Climate-related Financial Disclosures",
            "sbti": "Science Based Targets initiative"
        },
        "romanian_specific": {
            "anre_reporting": "Energy consumption reporting to ANRE",
            "afm_requirements": "Environmental Fund Administration requirements",
            "green_certificates": "Renewable energy certificates system"
        }
    }

@router.post("/offset-options")
async def get_offset_options(co2_to_offset_kg: float):
    """Get carbon offset options and costs."""

    # Current carbon credit prices (approximate)
    credit_prices = {
        "voluntary_market": 15,  # EUR per ton CO2
        "eu_ets": 80,  # EUR per ton CO2
        "gold_standard": 25,  # EUR per ton CO2
        "verra_vcs": 20  # EUR per ton CO2
    }

    tons_to_offset = co2_to_offset_kg / 1000

    return {
        "co2_to_offset_tons": round(tons_to_offset, 2),
        "offset_options": [
            {
                "type": "Tree planting (Romania)",
                "cost_eur": round(tons_to_offset * 10, 2),
                "description": "Native forest restoration projects in Romania",
                "verification": "Local NGO verified"
            },
            {
                "type": "Gold Standard Certified",
                "cost_eur": round(tons_to_offset * credit_prices["gold_standard"], 2),
                "description": "International gold standard carbon credits",
                "verification": "Gold Standard"
            },
            {
                "type": "Verra VCS",
                "cost_eur": round(tons_to_offset * credit_prices["verra_vcs"], 2),
                "description": "Verified Carbon Standard projects globally",
                "verification": "Verra"
            },
            {
                "type": "EU ETS Credits",
                "cost_eur": round(tons_to_offset * credit_prices["eu_ets"], 2),
                "description": "EU Emissions Trading System allowances",
                "verification": "EU regulated"
            }
        ],
        "recommendation": "Consider Gold Standard for best credibility-cost balance",
        "note": "Offsetting should complement, not replace, emissions reduction efforts"
    }
