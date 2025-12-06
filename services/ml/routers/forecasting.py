"""
Financial Forecasting Router - Prophet based time series predictions
Optimized for Romanian business patterns (seasonality, holidays)
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import date, datetime, timedelta
from loguru import logger
import json
from enum import Enum

router = APIRouter()


class ForecastType(str, Enum):
    REVENUE = "revenue"
    EXPENSES = "expenses"
    CASH_FLOW = "cash_flow"
    VAT = "vat"
    INVOICES = "invoices"


class SeasonalityMode(str, Enum):
    ADDITIVE = "additive"
    MULTIPLICATIVE = "multiplicative"


class ForecastRequest(BaseModel):
    company_id: str
    forecast_type: ForecastType
    periods: int = Field(default=30, ge=1, le=365, description="Days to forecast")
    confidence_interval: float = Field(default=0.95, ge=0.5, le=0.99)
    include_holidays: bool = True
    seasonality_mode: SeasonalityMode = SeasonalityMode.MULTIPLICATIVE


class ForecastPoint(BaseModel):
    date: str
    value: float
    lower_bound: float
    upper_bound: float


class ForecastResponse(BaseModel):
    success: bool
    forecast_type: ForecastType
    start_date: str
    end_date: str
    predictions: List[ForecastPoint]
    summary: Dict[str, Any]
    model_metrics: Dict[str, float]
    insights: List[str]


class CashFlowForecast(BaseModel):
    date: str
    projected_inflows: float
    projected_outflows: float
    net_cash_flow: float
    running_balance: float
    confidence_lower: float
    confidence_upper: float


class VatForecastResponse(BaseModel):
    period: str
    projected_sales_vat: float
    projected_purchases_vat: float
    projected_net_vat: float
    confidence_interval: Dict[str, float]
    recommendations: List[str]


# Romanian holidays for seasonality
ROMANIAN_HOLIDAYS = [
    {"name": "Anul Nou", "month": 1, "day": 1},
    {"name": "Anul Nou", "month": 1, "day": 2},
    {"name": "Ziua Unirii", "month": 1, "day": 24},
    {"name": "Paște Ortodox", "month": 4, "day": 20},  # Approximate, varies yearly
    {"name": "Paște Ortodox", "month": 4, "day": 21},
    {"name": "Ziua Muncii", "month": 5, "day": 1},
    {"name": "Ziua Copilului", "month": 6, "day": 1},
    {"name": "Rusalii", "month": 6, "day": 8},  # Approximate
    {"name": "Adormirea Maicii Domnului", "month": 8, "day": 15},
    {"name": "Sf. Andrei", "month": 11, "day": 30},
    {"name": "Ziua Națională", "month": 12, "day": 1},
    {"name": "Crăciun", "month": 12, "day": 25},
    {"name": "Crăciun", "month": 12, "day": 26},
]


@router.post("/predict", response_model=ForecastResponse)
async def generate_forecast(request: ForecastRequest):
    """
    Generate financial forecast using Prophet

    Supports:
    - Revenue forecasting
    - Expense forecasting
    - Cash flow projections
    - VAT liability forecasting
    - Invoice volume predictions
    """
    try:
        logger.info(f"Generating {request.forecast_type} forecast for {request.company_id}")

        # In production, this would:
        # 1. Load historical data from database
        # 2. Prepare Prophet model with Romanian holidays
        # 3. Fit and predict

        # Mock forecast data
        base_date = datetime.now()
        predictions = []

        # Generate mock predictions with realistic patterns
        base_value = 50000 if request.forecast_type == ForecastType.REVENUE else 30000

        for i in range(request.periods):
            forecast_date = base_date + timedelta(days=i)
            day_of_week = forecast_date.weekday()

            # Add weekly pattern
            weekly_factor = 1.0
            if day_of_week in [5, 6]:  # Weekend
                weekly_factor = 0.3

            # Add monthly pattern (higher at month end)
            monthly_factor = 1.0
            if forecast_date.day >= 25:
                monthly_factor = 1.3

            # Add seasonal pattern
            seasonal_factor = 1.0
            if forecast_date.month in [11, 12]:  # Q4 higher
                seasonal_factor = 1.2
            elif forecast_date.month in [7, 8]:  # Summer lower
                seasonal_factor = 0.85

            value = base_value * weekly_factor * monthly_factor * seasonal_factor

            # Add some noise
            import random
            noise = random.uniform(-0.1, 0.1)
            value *= (1 + noise)

            # Calculate confidence bounds
            uncertainty = value * 0.15 * (1 + i / request.periods)

            predictions.append(ForecastPoint(
                date=forecast_date.strftime("%Y-%m-%d"),
                value=round(value, 2),
                lower_bound=round(value - uncertainty, 2),
                upper_bound=round(value + uncertainty, 2)
            ))

        # Calculate summary statistics
        values = [p.value for p in predictions]
        summary = {
            "total_predicted": round(sum(values), 2),
            "average_daily": round(sum(values) / len(values), 2),
            "min_predicted": round(min(values), 2),
            "max_predicted": round(max(values), 2),
            "trend": "growing" if values[-1] > values[0] else "declining"
        }

        # Generate insights
        insights = [
            f"Prognoza {request.forecast_type.value} pentru următoarele {request.periods} zile",
            f"Valoare totală estimată: {summary['total_predicted']:,.2f} RON",
            "Se observă un pattern sezonier puternic în Q4",
            "Volumul scade cu ~70% în weekend"
        ]

        if summary["trend"] == "growing":
            insights.append("Tendință crescătoare detectată pe termen scurt")
        else:
            insights.append("Tendință descrescătoare - recomandăm monitorizare")

        return ForecastResponse(
            success=True,
            forecast_type=request.forecast_type,
            start_date=predictions[0].date,
            end_date=predictions[-1].date,
            predictions=predictions,
            summary=summary,
            model_metrics={
                "mape": 0.12,  # Mean Absolute Percentage Error
                "rmse": 5234.56,  # Root Mean Square Error
                "r_squared": 0.87
            },
            insights=insights
        )

    except Exception as e:
        logger.error(f"Forecast generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cash-flow", response_model=List[CashFlowForecast])
async def forecast_cash_flow(
    company_id: str,
    days: int = Query(default=90, ge=1, le=365),
    include_pending_invoices: bool = True
):
    """
    Generate cash flow forecast

    Takes into account:
    - Expected invoice payments (based on payment terms)
    - Scheduled expenses
    - Recurring payments
    - Historical payment patterns
    """
    try:
        forecasts = []
        base_date = datetime.now()
        running_balance = 100000  # Mock starting balance

        for i in range(days):
            forecast_date = base_date + timedelta(days=i)

            # Mock projections
            inflows = 5000 if forecast_date.weekday() < 5 else 500
            outflows = 3500 if forecast_date.weekday() < 5 else 200

            # Add patterns
            if forecast_date.day == 10:  # Salary payment
                outflows += 50000
            if forecast_date.day in [15, 30]:  # Client payment days
                inflows += 20000
            if forecast_date.day == 25:  # Tax payment
                outflows += 15000

            net = inflows - outflows
            running_balance += net

            forecasts.append(CashFlowForecast(
                date=forecast_date.strftime("%Y-%m-%d"),
                projected_inflows=round(inflows, 2),
                projected_outflows=round(outflows, 2),
                net_cash_flow=round(net, 2),
                running_balance=round(running_balance, 2),
                confidence_lower=round(running_balance * 0.85, 2),
                confidence_upper=round(running_balance * 1.15, 2)
            ))

        return forecasts

    except Exception as e:
        logger.error(f"Cash flow forecast failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/vat", response_model=List[VatForecastResponse])
async def forecast_vat(
    company_id: str,
    months: int = Query(default=6, ge=1, le=12)
):
    """
    Forecast VAT liability for upcoming periods

    Helps with:
    - Cash planning for VAT payments
    - Identifying potential VAT credits
    - Quarterly reporting preparation
    """
    try:
        forecasts = []
        current_date = datetime.now()

        for i in range(months):
            forecast_month = current_date.month + i
            forecast_year = current_date.year

            while forecast_month > 12:
                forecast_month -= 12
                forecast_year += 1

            period = f"{forecast_year}-{str(forecast_month).zfill(2)}"

            # Mock VAT projections
            sales_vat = 15000 + (i * 500)  # Slight growth
            purchases_vat = 8000 + (i * 200)
            net_vat = sales_vat - purchases_vat

            forecasts.append(VatForecastResponse(
                period=period,
                projected_sales_vat=round(sales_vat, 2),
                projected_purchases_vat=round(purchases_vat, 2),
                projected_net_vat=round(net_vat, 2),
                confidence_interval={
                    "lower": round(net_vat * 0.85, 2),
                    "upper": round(net_vat * 1.15, 2)
                },
                recommendations=[
                    f"Rezervă aproximativ {net_vat:,.0f} RON pentru plata TVA",
                    "Termenul de plată: 25 a lunii următoare"
                ]
            ))

        return forecasts

    except Exception as e:
        logger.error(f"VAT forecast failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/anomalies")
async def detect_anomalies(
    company_id: str,
    metric: str = Query(default="revenue"),
    sensitivity: float = Query(default=2.0, ge=1.0, le=5.0)
):
    """
    Detect anomalies in financial data

    Uses:
    - Statistical deviation detection
    - Seasonal decomposition
    - Prophet's anomaly detection
    """
    try:
        # Mock anomalies
        anomalies = [
            {
                "date": "2024-11-15",
                "metric": metric,
                "value": 125000,
                "expected_value": 50000,
                "deviation_pct": 150,
                "severity": "high",
                "possible_reasons": [
                    "Factură mare neobișnuită",
                    "Posibilă intrare duplicată"
                ]
            },
            {
                "date": "2024-11-28",
                "metric": metric,
                "value": 5000,
                "expected_value": 45000,
                "deviation_pct": -89,
                "severity": "medium",
                "possible_reasons": [
                    "Weekend sau sărbătoare",
                    "Întârziere în înregistrare"
                ]
            }
        ]

        return {
            "company_id": company_id,
            "metric": metric,
            "analysis_period": "last_90_days",
            "anomalies_found": len(anomalies),
            "anomalies": anomalies,
            "recommendations": [
                "Verificați facturile mari din noiembrie",
                "Reconciliați intrările pentru zilele cu volum redus"
            ]
        }

    except Exception as e:
        logger.error(f"Anomaly detection failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/benchmarks")
async def get_industry_benchmarks(
    industry_code: str,
    company_id: Optional[str] = None
):
    """
    Get industry benchmarks for comparison

    Categories:
    - Profitability ratios
    - Liquidity ratios
    - Efficiency metrics
    """
    # Mock benchmark data
    benchmarks = {
        "industry_code": industry_code,
        "industry_name": "Servicii IT și Consultanță",
        "data_period": "2024",
        "sample_size": 1250,
        "metrics": {
            "profit_margin": {
                "industry_median": 15.5,
                "industry_p25": 8.2,
                "industry_p75": 22.3,
                "your_value": 18.7 if company_id else None
            },
            "current_ratio": {
                "industry_median": 1.8,
                "industry_p25": 1.2,
                "industry_p75": 2.5,
                "your_value": 2.1 if company_id else None
            },
            "days_sales_outstanding": {
                "industry_median": 45,
                "industry_p25": 30,
                "industry_p75": 60,
                "your_value": 38 if company_id else None
            },
            "revenue_per_employee": {
                "industry_median": 85000,
                "industry_p25": 55000,
                "industry_p75": 120000,
                "your_value": 92000 if company_id else None
            }
        }
    }

    if company_id:
        benchmarks["comparison"] = {
            "profit_margin": "Above median (+3.2%)",
            "current_ratio": "Above median (+0.3)",
            "days_sales_outstanding": "Better than median (-7 days)",
            "revenue_per_employee": "Above median (+8.2%)"
        }

    return benchmarks


@router.get("/holidays")
async def get_romanian_holidays(year: int = None):
    """Get Romanian holidays for the specified year"""
    if year is None:
        year = datetime.now().year

    holidays = []
    for h in ROMANIAN_HOLIDAYS:
        holidays.append({
            "date": f"{year}-{str(h['month']).zfill(2)}-{str(h['day']).zfill(2)}",
            "name": h["name"],
            "affects_business": True
        })

    # Add Easter (variable date) - simplified
    # In production, calculate actual Easter date

    return {
        "year": year,
        "count": len(holidays),
        "holidays": holidays
    }
