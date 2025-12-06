"""
Dividend & Excise Tax Forecaster - Prophet-based Financial Projections
Compliant with 2026 Romanian fiscal reform (16% dividend tax from Jan 2026)
"""

import io
from datetime import datetime, timedelta
from typing import Optional, List, Dict

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from loguru import logger

router = APIRouter()

# 2026 Fiscal Reform Constants
DIVIDEND_TAX_CURRENT = 0.08  # 8% until Dec 2025
DIVIDEND_TAX_2026 = 0.10     # 10% from Jan 2026 (corrected from 16%)
DIVIDEND_REFORM_DATE = datetime(2026, 1, 1)

# Romanian Excise Rates (2025)
EXCISE_RATES = {
    "fuel_gasoline": 1897.56,     # RON per 1000 liters
    "fuel_diesel": 1792.68,       # RON per 1000 liters
    "fuel_lpg": 565.50,           # RON per 1000 kg
    "alcohol_spirits": 4574.93,   # RON per hl pure alcohol
    "alcohol_beer": 4.35,         # RON per hl/Plato degree
    "alcohol_wine": 0.0,          # RON per hl (0 for still wine)
    "tobacco_cigarettes": 594.97, # RON per 1000 cigarettes + 15% of retail
    "energy_electricity": 0.50,   # RON per MWh
    "energy_gas": 0.30,           # RON per GJ
}


class DividendProjection(BaseModel):
    """Dividend distribution projection."""
    year: int
    quarter: Optional[int] = None
    gross_profit: float
    retained_earnings: float
    distributable_amount: float
    tax_rate: float
    tax_amount: float
    net_dividend: float
    recipients: Optional[int] = None


class ExciseProjection(BaseModel):
    """Excise tax projection for a product category."""
    product_type: str
    quantity: float
    unit: str
    base_rate: float
    projected_rate: float
    tax_amount: float
    effective_date: datetime


class ForecastRequest(BaseModel):
    """Request for dividend forecast."""
    historical_profits: List[Dict[str, float]] = Field(
        ..., description="List of {date: 'YYYY-MM-DD', value: amount} historical profits"
    )
    retained_earnings_ratio: float = Field(0.3, ge=0, le=1, description="Ratio of profits to retain")
    forecast_periods: int = Field(4, ge=1, le=20, description="Quarters to forecast")
    shareholder_count: Optional[int] = None


class ExciseForecastRequest(BaseModel):
    """Request for excise tax forecast."""
    product_type: str = Field(..., description="Product type from EXCISE_RATES")
    historical_consumption: List[Dict[str, float]] = Field(
        ..., description="List of {date: 'YYYY-MM-DD', value: quantity} consumption data"
    )
    forecast_months: int = Field(12, ge=1, le=36)


@router.get("/dividend-rates")
async def get_dividend_rates(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD to check applicable rate")
):
    """
    Get applicable dividend tax rates based on date.

    2026 Reform: Dividend tax increases from 8% to 10% starting Jan 1, 2026.
    """
    if date:
        try:
            check_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        check_date = datetime.now()

    is_2026_rate = check_date >= DIVIDEND_REFORM_DATE

    return {
        "date": check_date.strftime("%Y-%m-%d"),
        "current_rate": DIVIDEND_TAX_2026 if is_2026_rate else DIVIDEND_TAX_CURRENT,
        "rate_percentage": f"{(DIVIDEND_TAX_2026 if is_2026_rate else DIVIDEND_TAX_CURRENT) * 100:.0f}%",
        "reform_date": DIVIDEND_REFORM_DATE.strftime("%Y-%m-%d"),
        "regime": "2026" if is_2026_rate else "pre-2026",
        "rates_timeline": [
            {"period": "Until Dec 31, 2025", "rate": "8%", "tax_code": "Art. 97 Cod Fiscal"},
            {"period": "From Jan 1, 2026", "rate": "10%", "tax_code": "Art. 97 modified by Law 141/2025"}
        ],
        "health_insurance_contribution": {
            "applies": True,
            "rate": "10%",
            "threshold": "12 minimum salaries / year",
            "note": "CASS applies to dividends exceeding 12 minimum gross salaries annually"
        }
    }


@router.get("/excise-rates")
async def get_excise_rates():
    """
    Get current Romanian excise duty rates (accize).
    """
    return {
        "effective_date": "2025-01-01",
        "currency": "RON",
        "rates": {
            "fuels": {
                "gasoline": {"rate": EXCISE_RATES["fuel_gasoline"], "unit": "per 1000 liters"},
                "diesel": {"rate": EXCISE_RATES["fuel_diesel"], "unit": "per 1000 liters"},
                "lpg": {"rate": EXCISE_RATES["fuel_lpg"], "unit": "per 1000 kg"}
            },
            "alcohol": {
                "spirits": {"rate": EXCISE_RATES["alcohol_spirits"], "unit": "per hl pure alcohol"},
                "beer": {"rate": EXCISE_RATES["alcohol_beer"], "unit": "per hl/degree Plato"},
                "wine": {"rate": EXCISE_RATES["alcohol_wine"], "unit": "per hl (still wine exempt)"}
            },
            "tobacco": {
                "cigarettes": {
                    "specific": EXCISE_RATES["tobacco_cigarettes"],
                    "ad_valorem": "15%",
                    "unit": "per 1000 + % of retail price"
                }
            },
            "energy": {
                "electricity": {"rate": EXCISE_RATES["energy_electricity"], "unit": "per MWh"},
                "natural_gas": {"rate": EXCISE_RATES["energy_gas"], "unit": "per GJ"}
            }
        },
        "legal_reference": "Titlul VIII - Accize, Codul Fiscal"
    }


@router.post("/forecast-dividends")
async def forecast_dividends(request: ForecastRequest):
    """
    Forecast dividend distributions using Prophet time series model.

    Accounts for:
    - 2026 tax rate change (8% -> 10%)
    - Retained earnings policy
    - CASS health contribution threshold
    """
    try:
        # Import Prophet
        try:
            from prophet import Prophet
        except ImportError:
            # Fallback to simple linear projection if Prophet not available
            return await _simple_dividend_forecast(request)

        import pandas as pd

        # Prepare data for Prophet
        df = pd.DataFrame(request.historical_profits)
        df.columns = ['ds', 'y']
        df['ds'] = pd.to_datetime(df['ds'])

        # Create and fit Prophet model
        model = Prophet(
            yearly_seasonality=True,
            weekly_seasonality=False,
            daily_seasonality=False,
            changepoint_prior_scale=0.1
        )
        model.fit(df)

        # Create future dataframe (quarterly)
        future = model.make_future_dataframe(periods=request.forecast_periods * 90, freq='D')
        forecast = model.predict(future)

        # Aggregate to quarterly projections
        projections = []
        last_date = df['ds'].max()

        for q in range(1, request.forecast_periods + 1):
            quarter_end = last_date + timedelta(days=q * 90)
            quarter_data = forecast[forecast['ds'] <= quarter_end].tail(90)

            gross_profit = float(quarter_data['yhat'].sum())
            retained = gross_profit * request.retained_earnings_ratio
            distributable = gross_profit - retained

            # Apply correct tax rate based on date
            tax_rate = DIVIDEND_TAX_2026 if quarter_end >= DIVIDEND_REFORM_DATE else DIVIDEND_TAX_CURRENT
            tax_amount = distributable * tax_rate
            net_dividend = distributable - tax_amount

            projections.append(DividendProjection(
                year=quarter_end.year,
                quarter=(quarter_end.month - 1) // 3 + 1,
                gross_profit=round(gross_profit, 2),
                retained_earnings=round(retained, 2),
                distributable_amount=round(distributable, 2),
                tax_rate=tax_rate,
                tax_amount=round(tax_amount, 2),
                net_dividend=round(net_dividend, 2),
                recipients=request.shareholder_count
            ))

        # Calculate totals
        total_gross = sum(p.gross_profit for p in projections)
        total_tax = sum(p.tax_amount for p in projections)
        total_net = sum(p.net_dividend for p in projections)

        return {
            "success": True,
            "model": "Prophet",
            "forecast_periods": request.forecast_periods,
            "projections": [p.dict() for p in projections],
            "summary": {
                "total_gross_profit": round(total_gross, 2),
                "total_retained_earnings": round(total_gross * request.retained_earnings_ratio, 2),
                "total_distributable": round(total_gross * (1 - request.retained_earnings_ratio), 2),
                "total_tax_liability": round(total_tax, 2),
                "total_net_dividends": round(total_net, 2),
                "effective_tax_rate": f"{(total_tax / (total_gross * (1 - request.retained_earnings_ratio)) * 100):.1f}%"
            },
            "tax_planning_notes": [
                "Consider distributing dividends before Jan 1, 2026 to benefit from 8% rate",
                "CASS (10%) applies if annual dividends exceed 12 minimum salaries",
                "Quarterly distributions can help manage cash flow",
                "Retained earnings grow tax-free until distribution"
            ]
        }

    except Exception as e:
        logger.error(f"Dividend forecast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


async def _simple_dividend_forecast(request: ForecastRequest):
    """Fallback simple linear forecast when Prophet is not available."""
    # Calculate average growth rate
    profits = [p['value'] for p in request.historical_profits]
    if len(profits) < 2:
        avg_growth = 0.05  # Default 5% growth
    else:
        growth_rates = [(profits[i] - profits[i-1]) / profits[i-1]
                       for i in range(1, len(profits)) if profits[i-1] != 0]
        avg_growth = sum(growth_rates) / len(growth_rates) if growth_rates else 0.05

    last_profit = profits[-1] if profits else 10000
    last_date = datetime.strptime(request.historical_profits[-1]['date'], "%Y-%m-%d")

    projections = []
    for q in range(1, request.forecast_periods + 1):
        quarter_end = last_date + timedelta(days=q * 90)
        gross_profit = last_profit * ((1 + avg_growth) ** q)
        retained = gross_profit * request.retained_earnings_ratio
        distributable = gross_profit - retained

        tax_rate = DIVIDEND_TAX_2026 if quarter_end >= DIVIDEND_REFORM_DATE else DIVIDEND_TAX_CURRENT
        tax_amount = distributable * tax_rate

        projections.append({
            "year": quarter_end.year,
            "quarter": (quarter_end.month - 1) // 3 + 1,
            "gross_profit": round(gross_profit, 2),
            "retained_earnings": round(retained, 2),
            "distributable_amount": round(distributable, 2),
            "tax_rate": tax_rate,
            "tax_amount": round(tax_amount, 2),
            "net_dividend": round(distributable - tax_amount, 2)
        })

    return {
        "success": True,
        "model": "Linear (Prophet not installed)",
        "projections": projections,
        "install_prophet": "pip install prophet"
    }


@router.post("/forecast-excise")
async def forecast_excise(request: ExciseForecastRequest):
    """
    Forecast excise tax liabilities based on consumption patterns.
    """
    if request.product_type not in EXCISE_RATES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown product type. Available: {list(EXCISE_RATES.keys())}"
        )

    try:
        # Import Prophet or use fallback
        try:
            from prophet import Prophet
            import pandas as pd

            df = pd.DataFrame(request.historical_consumption)
            df.columns = ['ds', 'y']
            df['ds'] = pd.to_datetime(df['ds'])

            model = Prophet(
                yearly_seasonality=True,
                weekly_seasonality=False,
                changepoint_prior_scale=0.05
            )
            model.fit(df)

            future = model.make_future_dataframe(periods=request.forecast_months * 30, freq='D')
            forecast = model.predict(future)

            # Monthly aggregation
            projections = []
            last_date = df['ds'].max()
            base_rate = EXCISE_RATES[request.product_type]

            for m in range(1, request.forecast_months + 1):
                month_end = last_date + timedelta(days=m * 30)
                month_data = forecast[
                    (forecast['ds'] > last_date + timedelta(days=(m-1) * 30)) &
                    (forecast['ds'] <= month_end)
                ]

                quantity = float(month_data['yhat'].sum())
                # Assume 2% annual rate increase
                projected_rate = base_rate * (1.02 ** (m / 12))
                tax_amount = quantity * projected_rate / 1000  # Rates are per 1000 units

                projections.append({
                    "month": month_end.strftime("%Y-%m"),
                    "product_type": request.product_type,
                    "forecasted_quantity": round(quantity, 2),
                    "base_rate": base_rate,
                    "projected_rate": round(projected_rate, 2),
                    "tax_amount": round(tax_amount, 2)
                })

            return {
                "success": True,
                "model": "Prophet",
                "product_type": request.product_type,
                "forecast_months": request.forecast_months,
                "projections": projections,
                "total_excise_liability": round(sum(p['tax_amount'] for p in projections), 2)
            }

        except ImportError:
            # Simple fallback
            consumption = [c['value'] for c in request.historical_consumption]
            avg_consumption = sum(consumption) / len(consumption) if consumption else 100
            base_rate = EXCISE_RATES[request.product_type]

            projections = []
            for m in range(1, request.forecast_months + 1):
                month_end = datetime.now() + timedelta(days=m * 30)
                projected_rate = base_rate * (1.02 ** (m / 12))
                tax_amount = avg_consumption * projected_rate / 1000

                projections.append({
                    "month": month_end.strftime("%Y-%m"),
                    "product_type": request.product_type,
                    "forecasted_quantity": round(avg_consumption, 2),
                    "tax_amount": round(tax_amount, 2)
                })

            return {
                "success": True,
                "model": "Average (Prophet not installed)",
                "projections": projections,
                "total_excise_liability": round(sum(p['tax_amount'] for p in projections), 2)
            }

    except Exception as e:
        logger.error(f"Excise forecast error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/optimize-dividend-timing")
async def optimize_dividend_timing(
    total_profit: float = Query(..., description="Total profit available for distribution"),
    distribution_deadline: str = Query(..., description="Latest date for distribution (YYYY-MM-DD)")
):
    """
    Optimize dividend distribution timing to minimize tax.

    Key insight: Distributing before Jan 1, 2026 saves 2% tax (8% vs 10%).
    """
    try:
        deadline = datetime.strptime(distribution_deadline, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    scenarios = []

    # Scenario 1: Distribute all before 2026
    if deadline >= DIVIDEND_REFORM_DATE:
        tax_before = total_profit * DIVIDEND_TAX_CURRENT
        tax_after = total_profit * DIVIDEND_TAX_2026
        savings = tax_after - tax_before

        scenarios.append({
            "name": "Distribute before Jan 2026",
            "amount": total_profit,
            "tax_rate": f"{DIVIDEND_TAX_CURRENT * 100:.0f}%",
            "tax_amount": round(tax_before, 2),
            "net_dividend": round(total_profit - tax_before, 2),
            "deadline": "Dec 31, 2025",
            "savings_vs_2026": round(savings, 2)
        })

        scenarios.append({
            "name": "Distribute in 2026+",
            "amount": total_profit,
            "tax_rate": f"{DIVIDEND_TAX_2026 * 100:.0f}%",
            "tax_amount": round(tax_after, 2),
            "net_dividend": round(total_profit - tax_after, 2),
            "deadline": deadline.strftime("%Y-%m-%d"),
            "savings_vs_2026": 0
        })

        # Scenario 3: Split distribution
        split_amount = total_profit * 0.6
        tax_split = (split_amount * DIVIDEND_TAX_CURRENT) + ((total_profit - split_amount) * DIVIDEND_TAX_2026)

        scenarios.append({
            "name": "Split 60/40 (before/after 2026)",
            "distribution_1": {
                "amount": round(split_amount, 2),
                "tax": round(split_amount * DIVIDEND_TAX_CURRENT, 2),
                "deadline": "Dec 31, 2025"
            },
            "distribution_2": {
                "amount": round(total_profit - split_amount, 2),
                "tax": round((total_profit - split_amount) * DIVIDEND_TAX_2026, 2),
                "deadline": deadline.strftime("%Y-%m-%d")
            },
            "total_tax": round(tax_split, 2),
            "total_net": round(total_profit - tax_split, 2),
            "savings_vs_full_2026": round(tax_after - tax_split, 2)
        })
    else:
        tax = total_profit * DIVIDEND_TAX_CURRENT
        scenarios.append({
            "name": "Distribute at current rate",
            "amount": total_profit,
            "tax_rate": f"{DIVIDEND_TAX_CURRENT * 100:.0f}%",
            "tax_amount": round(tax, 2),
            "net_dividend": round(total_profit - tax, 2)
        })

    # CASS consideration
    min_salary_2025 = 3700  # RON
    cass_threshold = min_salary_2025 * 12

    cass_warning = None
    if total_profit > cass_threshold:
        cass_amount = (total_profit - cass_threshold) * 0.10
        cass_warning = {
            "applies": True,
            "threshold": cass_threshold,
            "excess_amount": round(total_profit - cass_threshold, 2),
            "cass_liability": round(cass_amount, 2),
            "note": "CASS 10% applies to dividends exceeding 12 minimum salaries"
        }

    return {
        "total_profit": total_profit,
        "distribution_deadline": distribution_deadline,
        "reform_date": DIVIDEND_REFORM_DATE.strftime("%Y-%m-%d"),
        "scenarios": scenarios,
        "recommended": scenarios[0]["name"] if deadline >= DIVIDEND_REFORM_DATE else "Distribute now",
        "cass_health_contribution": cass_warning,
        "tax_planning_advice": [
            "Maximum tax savings by distributing all profits before Jan 1, 2026",
            "Consider cash flow needs when timing distributions",
            "CASS applies if total annual dividends exceed 12 minimum salaries",
            "Document shareholder meeting decisions for audit trail"
        ]
    }


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "operational",
        "service": "dividend-forecaster",
        "features": [
            "Prophet time series forecasting",
            "2026 dividend tax rate compliance",
            "Excise duty calculations",
            "Tax optimization recommendations"
        ]
    }
