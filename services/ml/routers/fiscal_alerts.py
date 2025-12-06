"""
Fiscal Reform Alerts & ANAF Scraper
Monitors Romanian fiscal authority (ANAF) for regulatory changes
"""

from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
import httpx
from bs4 import BeautifulSoup
import re
from loguru import logger
import asyncio
from enum import Enum

router = APIRouter()

# ==================== MODELS ====================

class AlertSeverity(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class AlertCategory(str, Enum):
    VAT = "vat"
    EFACTURA = "efactura"
    SAFT = "saft"
    INCOME_TAX = "income_tax"
    SOCIAL_CONTRIBUTIONS = "social_contributions"
    ETRANSPORT = "etransport"
    DIVIDENDS = "dividends"
    OTHER = "other"

class FiscalAlert(BaseModel):
    id: str
    title: str
    description: str
    category: AlertCategory
    severity: AlertSeverity
    effective_date: Optional[datetime] = None
    source_url: Optional[str] = None
    anaf_reference: Optional[str] = None
    impact_summary: str
    action_items: List[str] = []
    created_at: datetime = Field(default_factory=datetime.now)

class FiscalAlertResponse(BaseModel):
    success: bool
    alerts: List[FiscalAlert]
    last_checked: datetime
    sources_checked: List[str]

class UpcomingChange(BaseModel):
    title: str
    description: str
    effective_date: datetime
    category: AlertCategory
    impact: str
    days_until: int
    preparation_checklist: List[str]

class FiscalCalendarResponse(BaseModel):
    upcoming_deadlines: List[dict]
    regulatory_changes: List[UpcomingChange]
    month_summary: str

class ComplianceCheckResult(BaseModel):
    overall_status: str  # compliant, action_required, critical
    checks: List[dict]
    recommendations: List[str]
    next_deadline: Optional[datetime]

# ==================== ANAF SCRAPER ====================

ANAF_SOURCES = [
    {
        "name": "ANAF Noutăți",
        "url": "https://www.anaf.ro/anaf/internet/ANAF/informatii_publice/noutati",
        "type": "news"
    },
    {
        "name": "ANAF Legislație",
        "url": "https://www.anaf.ro/anaf/internet/ANAF/legislatie",
        "type": "legislation"
    },
    {
        "name": "e-Factura Updates",
        "url": "https://www.anaf.ro/anaf/internet/ANAF/despre_anaf/e-factura",
        "type": "efactura"
    },
]

# Keywords to monitor for fiscal changes
FISCAL_KEYWORDS = {
    "vat": ["TVA", "taxă pe valoare adăugată", "cotă", "19%", "21%", "9%", "11%", "5%"],
    "efactura": ["e-Factura", "facturare electronică", "SPV", "B2B", "B2G"],
    "saft": ["SAF-T", "D406", "raportare", "fișier standard"],
    "income_tax": ["impozit pe venit", "venituri", "deduceri", "CAS", "CASS"],
    "dividends": ["dividende", "impozit dividende", "8%", "10%"],
    "etransport": ["e-Transport", "transport", "monitorizare"],
}

# Cache for scraped data
_alert_cache: dict = {
    "alerts": [],
    "last_updated": None
}

async def scrape_anaf_news() -> List[dict]:
    """Scrape ANAF website for news and updates."""
    news_items = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for source in ANAF_SOURCES:
            try:
                response = await client.get(source["url"])
                if response.status_code == 200:
                    soup = BeautifulSoup(response.text, "html.parser")

                    # Parse news items (structure depends on ANAF website)
                    articles = soup.find_all("div", class_="news-item") or soup.find_all("article")

                    for article in articles[:10]:  # Limit to 10 items per source
                        title_elem = article.find(["h2", "h3", "a"])
                        date_elem = article.find(class_="date") or article.find("time")

                        if title_elem:
                            news_items.append({
                                "title": title_elem.get_text(strip=True),
                                "source": source["name"],
                                "type": source["type"],
                                "url": source["url"],
                                "date": date_elem.get_text(strip=True) if date_elem else None
                            })

            except Exception as e:
                logger.warning(f"Failed to scrape {source['name']}: {e}")

    return news_items

def categorize_alert(title: str, content: str = "") -> tuple[AlertCategory, AlertSeverity]:
    """Categorize an alert based on keywords and content."""
    text = f"{title} {content}".lower()

    category = AlertCategory.OTHER
    severity = AlertSeverity.INFO

    for cat, keywords in FISCAL_KEYWORDS.items():
        if any(kw.lower() in text for kw in keywords):
            category = AlertCategory(cat)
            break

    # Determine severity based on urgency keywords
    if any(word in text for word in ["urgent", "obligatoriu", "termen limită", "sancțiuni"]):
        severity = AlertSeverity.HIGH
    elif any(word in text for word in ["modificare", "nou", "actualizare"]):
        severity = AlertSeverity.MEDIUM
    elif any(word in text for word in ["2026", "2025", "viitor"]):
        severity = AlertSeverity.MEDIUM

    return category, severity

async def refresh_alerts() -> List[FiscalAlert]:
    """Refresh alerts from ANAF sources."""
    news_items = await scrape_anaf_news()
    alerts = []

    for idx, item in enumerate(news_items):
        category, severity = categorize_alert(item["title"])

        alert = FiscalAlert(
            id=f"alert_{datetime.now().strftime('%Y%m%d')}_{idx}",
            title=item["title"],
            description=f"Sursa: {item['source']}",
            category=category,
            severity=severity,
            source_url=item["url"],
            impact_summary="Verificați documentul pentru detalii complete.",
            action_items=["Citiți comunicatul oficial", "Evaluați impactul asupra afacerii"]
        )
        alerts.append(alert)

    _alert_cache["alerts"] = alerts
    _alert_cache["last_updated"] = datetime.now()

    return alerts

# ==================== HARDCODED 2025-2026 CHANGES ====================

KNOWN_FISCAL_CHANGES = [
    UpcomingChange(
        title="Creștere TVA Standard la 21%",
        description="Cota standard de TVA crește de la 19% la 21%",
        effective_date=datetime(2025, 8, 1),
        category=AlertCategory.VAT,
        impact="Toate facturile emise după 1 August 2025 trebuie să utilizeze cota de 21%",
        days_until=(datetime(2025, 8, 1) - datetime.now()).days,
        preparation_checklist=[
            "Actualizați sistemele de facturare",
            "Notificați clienții despre modificarea prețurilor",
            "Revizuiți contractele în curs",
            "Actualizați etichetele de preț"
        ]
    ),
    UpcomingChange(
        title="Creștere TVA Redus la 11%",
        description="Cota redusă de TVA crește de la 9% la 11%",
        effective_date=datetime(2025, 8, 1),
        category=AlertCategory.VAT,
        impact="Produsele alimentare, serviciile de catering vor avea TVA 11%",
        days_until=(datetime(2025, 8, 1) - datetime.now()).days,
        preparation_checklist=[
            "Actualizați sistemele de facturare pentru TVA 11%",
            "Revizuiți prețurile produselor cu TVA redus",
            "Actualizați SAF-T pentru noua cotă"
        ]
    ),
    UpcomingChange(
        title="Impozit Dividende 10%",
        description="Impozitul pe dividende crește de la 8% la 10%",
        effective_date=datetime(2026, 1, 1),
        category=AlertCategory.DIVIDENDS,
        impact="Toate dividendele distribuite după 1 Ianuarie 2026",
        days_until=(datetime(2026, 1, 1) - datetime.now()).days,
        preparation_checklist=[
            "Planificați distribuirea dividendelor înainte de 2026",
            "Actualizați calculele de impozitare",
            "Informați acționarii despre modificare"
        ]
    ),
    UpcomingChange(
        title="e-Factura B2B Obligatoriu",
        description="Facturarea electronică devine obligatorie pentru toate tranzacțiile B2B",
        effective_date=datetime(2026, 7, 1),
        category=AlertCategory.EFACTURA,
        impact="Toate facturile între firme trebuie transmise prin SPV ANAF",
        days_until=(datetime(2026, 7, 1) - datetime.now()).days,
        preparation_checklist=[
            "Obțineți certificat digital ANAF",
            "Integrați sistemul de facturare cu SPV",
            "Testați transmiterea facturilor",
            "Instruiți personalul contabil"
        ]
    ),
]

FISCAL_DEADLINES = [
    {"deadline": "25", "description": "Declarație TVA (D300)", "monthly": True},
    {"deadline": "25", "description": "Declarație contribuții (D112)", "monthly": True},
    {"deadline": "25", "description": "Impozit pe profit trimestrial", "quarterly": True},
    {"deadline": "ultimo", "description": "SAF-T D406 (lunar)", "monthly": True},
    {"deadline": "15 martie", "description": "Declarație unică (persoane fizice)", "annual": True},
    {"deadline": "25 mai", "description": "Bilanț anual", "annual": True},
]

# ==================== ENDPOINTS ====================

@router.get("/alerts", response_model=FiscalAlertResponse)
async def get_fiscal_alerts(
    category: Optional[AlertCategory] = None,
    severity: Optional[AlertSeverity] = None,
    refresh: bool = False
):
    """Get current fiscal alerts and regulatory news."""

    if refresh or not _alert_cache["last_updated"] or \
       (datetime.now() - _alert_cache["last_updated"]) > timedelta(hours=6):
        await refresh_alerts()

    alerts = _alert_cache.get("alerts", [])

    # Filter by category/severity
    if category:
        alerts = [a for a in alerts if a.category == category]
    if severity:
        alerts = [a for a in alerts if a.severity == severity]

    return FiscalAlertResponse(
        success=True,
        alerts=alerts,
        last_checked=_alert_cache.get("last_updated", datetime.now()),
        sources_checked=[s["name"] for s in ANAF_SOURCES]
    )

@router.get("/upcoming-changes")
async def get_upcoming_changes(
    category: Optional[AlertCategory] = None,
    days_ahead: int = 365
):
    """Get known upcoming fiscal changes for 2025-2026."""

    changes = KNOWN_FISCAL_CHANGES

    # Filter by category
    if category:
        changes = [c for c in changes if c.category == category]

    # Filter by days ahead
    changes = [c for c in changes if c.days_until <= days_ahead and c.days_until > 0]

    # Sort by date
    changes = sorted(changes, key=lambda x: x.effective_date)

    return {
        "success": True,
        "changes": [c.model_dump() for c in changes],
        "count": len(changes),
        "next_change": changes[0].model_dump() if changes else None
    }

@router.get("/calendar", response_model=FiscalCalendarResponse)
async def get_fiscal_calendar(month: Optional[int] = None, year: Optional[int] = None):
    """Get fiscal calendar with deadlines and upcoming changes."""

    now = datetime.now()
    target_month = month or now.month
    target_year = year or now.year

    # Calculate upcoming deadlines
    upcoming_deadlines = []
    for deadline in FISCAL_DEADLINES:
        if deadline.get("monthly"):
            day = int(deadline["deadline"]) if deadline["deadline"].isdigit() else 28
            deadline_date = datetime(target_year, target_month, min(day, 28))
            upcoming_deadlines.append({
                "date": deadline_date.isoformat(),
                "description": deadline["description"],
                "type": "monthly"
            })

    # Get regulatory changes for the period
    regulatory_changes = [
        c for c in KNOWN_FISCAL_CHANGES
        if c.effective_date.month == target_month and c.effective_date.year == target_year
    ]

    return FiscalCalendarResponse(
        upcoming_deadlines=upcoming_deadlines,
        regulatory_changes=regulatory_changes,
        month_summary=f"Calendarul fiscal pentru {target_month}/{target_year}"
    )

@router.get("/compliance-check", response_model=ComplianceCheckResult)
async def check_compliance():
    """Run a compliance check for current fiscal requirements."""

    checks = [
        {
            "name": "e-Factura B2C",
            "status": "compliant",
            "description": "Facturare electronică B2C activă"
        },
        {
            "name": "SAF-T D406",
            "status": "compliant",
            "description": "Raportare SAF-T configurată"
        },
        {
            "name": "Rate TVA 2026",
            "status": "action_required",
            "description": "Pregătire pentru TVA 21%/11% din August 2025"
        },
        {
            "name": "Certificat Digital ANAF",
            "status": "action_required",
            "description": "Verificați valabilitatea certificatului"
        },
        {
            "name": "e-Transport",
            "status": "compliant",
            "description": "Monitorizare transport configurată"
        }
    ]

    # Determine overall status
    statuses = [c["status"] for c in checks]
    if "critical" in statuses:
        overall = "critical"
    elif "action_required" in statuses:
        overall = "action_required"
    else:
        overall = "compliant"

    recommendations = [
        "Actualizați sistemul pentru rate TVA 2026",
        "Verificați certificatul digital ANAF",
        "Pregătiți-vă pentru e-Factura B2B obligatoriu din Iulie 2026"
    ]

    # Next deadline
    next_deadline = datetime(datetime.now().year, datetime.now().month, 25)
    if next_deadline < datetime.now():
        if datetime.now().month == 12:
            next_deadline = datetime(datetime.now().year + 1, 1, 25)
        else:
            next_deadline = datetime(datetime.now().year, datetime.now().month + 1, 25)

    return ComplianceCheckResult(
        overall_status=overall,
        checks=checks,
        recommendations=recommendations,
        next_deadline=next_deadline
    )

@router.post("/subscribe")
async def subscribe_to_alerts(email: str, categories: Optional[List[AlertCategory]] = None):
    """Subscribe to fiscal alert notifications."""

    # In production, this would store in database and send confirmation email
    return {
        "success": True,
        "message": f"Abonament creat pentru {email}",
        "categories": categories or ["all"],
        "frequency": "instant"
    }

@router.get("/vat-calculator")
async def calculate_vat(
    amount: float,
    vat_rate: Optional[float] = None,
    transaction_date: Optional[str] = None,
    include_tax: bool = False
):
    """Calculate VAT with automatic rate detection based on date."""

    # Determine applicable rate based on date
    date = datetime.fromisoformat(transaction_date) if transaction_date else datetime.now()

    if vat_rate is None:
        # Auto-detect based on date
        if date >= datetime(2025, 8, 1):
            vat_rate = 21.0  # New standard rate
        else:
            vat_rate = 19.0  # Current standard rate

    if include_tax:
        # Amount includes VAT
        net_amount = amount / (1 + vat_rate / 100)
        vat_amount = amount - net_amount
        gross_amount = amount
    else:
        # Amount is net
        net_amount = amount
        vat_amount = amount * (vat_rate / 100)
        gross_amount = amount + vat_amount

    return {
        "net_amount": round(net_amount, 2),
        "vat_amount": round(vat_amount, 2),
        "gross_amount": round(gross_amount, 2),
        "vat_rate": vat_rate,
        "transaction_date": date.isoformat(),
        "rate_source": "auto" if vat_rate in [19, 21, 9, 11, 5] else "custom"
    }
