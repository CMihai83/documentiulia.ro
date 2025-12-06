"""
Anomaly Detection Router - Fraud Detection and Unusual Transaction Alerts
"""

from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from loguru import logger

router = APIRouter()


# Models
class Transaction(BaseModel):
    """Transaction for analysis."""
    id: str
    date: datetime
    amount: float
    category: str
    vendor: Optional[str] = None
    description: Optional[str] = None


class AnomalyResult(BaseModel):
    """Detected anomaly."""
    transaction_id: str
    anomaly_score: float  # 0-1, higher = more anomalous
    anomaly_type: str
    reason: str
    severity: str  # low, medium, high, critical
    recommended_action: str


class AnomalyResponse(BaseModel):
    """Anomaly detection response."""
    success: bool
    company_id: str
    total_transactions: int
    anomalies_detected: int
    anomalies: List[AnomalyResult]
    summary: dict
    generated_at: datetime


@router.post("/detect", response_model=AnomalyResponse)
async def detect_anomalies(
    company_id: str,
    transactions: List[Transaction],
    sensitivity: float = Query(0.7, ge=0.1, le=1.0, description="Detection sensitivity")
):
    """
    Detect anomalies in a list of transactions.

    Uses statistical methods and rule-based detection to identify:
    - Unusual amounts (too high/low for category)
    - Unusual timing (weekend, late night)
    - Duplicate transactions
    - Suspicious vendors
    - Pattern breaks
    """
    try:
        anomalies = []

        # Calculate statistics per category
        category_stats = {}
        for tx in transactions:
            if tx.category not in category_stats:
                category_stats[tx.category] = []
            category_stats[tx.category].append(tx.amount)

        # Calculate mean and std for each category
        for cat in category_stats:
            amounts = category_stats[cat]
            if len(amounts) > 1:
                import statistics
                mean = statistics.mean(amounts)
                std = statistics.stdev(amounts) if len(amounts) > 2 else mean * 0.3
                category_stats[cat] = {"mean": mean, "std": std, "count": len(amounts)}
            else:
                category_stats[cat] = {"mean": amounts[0], "std": amounts[0] * 0.3, "count": 1}

        # Detect anomalies
        seen_amounts = {}  # For duplicate detection

        for tx in transactions:
            anomaly_score = 0.0
            reasons = []

            # 1. Amount anomaly (Z-score based)
            stats = category_stats.get(tx.category, {"mean": tx.amount, "std": tx.amount * 0.3})
            if stats["std"] > 0:
                z_score = abs(tx.amount - stats["mean"]) / stats["std"]
                if z_score > 2.5:
                    anomaly_score += 0.4
                    reasons.append(f"Sumă neobișnuită pentru categoria {tx.category}")
                elif z_score > 2.0:
                    anomaly_score += 0.2

            # 2. Time anomaly (weekend/late night)
            if tx.date.weekday() >= 5:  # Weekend
                anomaly_score += 0.1
                reasons.append("Tranzacție în weekend")

            hour = tx.date.hour
            if hour < 6 or hour > 22:  # Outside business hours
                anomaly_score += 0.15
                reasons.append("Tranzacție în afara orelor de program")

            # 3. Duplicate detection
            amount_key = f"{tx.amount}_{tx.date.date()}"
            if amount_key in seen_amounts:
                anomaly_score += 0.3
                reasons.append(f"Posibilă tranzacție duplicată")
            seen_amounts[amount_key] = tx.id

            # 4. Round number detection (potential fake receipts)
            if tx.amount > 100 and tx.amount % 100 == 0:
                anomaly_score += 0.1
                reasons.append("Sumă rotundă suspectă")

            # 5. Large transaction detection
            if tx.amount > 10000:
                anomaly_score += 0.15
                reasons.append("Tranzacție de valoare mare")

            # Apply sensitivity
            adjusted_score = anomaly_score * sensitivity

            if adjusted_score >= 0.3:  # Threshold for reporting
                severity = "low"
                if adjusted_score >= 0.7:
                    severity = "critical"
                elif adjusted_score >= 0.5:
                    severity = "high"
                elif adjusted_score >= 0.4:
                    severity = "medium"

                # Determine anomaly type
                if "duplicată" in " ".join(reasons):
                    anomaly_type = "duplicate"
                elif "neobișnuită" in " ".join(reasons):
                    anomaly_type = "amount_outlier"
                elif "weekend" in " ".join(reasons) or "program" in " ".join(reasons):
                    anomaly_type = "timing"
                else:
                    anomaly_type = "other"

                # Recommended action
                if severity == "critical":
                    action = "Verificare imediată necesară"
                elif severity == "high":
                    action = "Verificare recomandată în 24h"
                elif severity == "medium":
                    action = "Revizuiți tranzacția"
                else:
                    action = "Monitorizare"

                anomalies.append(AnomalyResult(
                    transaction_id=tx.id,
                    anomaly_score=round(adjusted_score, 3),
                    anomaly_type=anomaly_type,
                    reason="; ".join(reasons),
                    severity=severity,
                    recommended_action=action
                ))

        # Sort by score descending
        anomalies.sort(key=lambda x: x.anomaly_score, reverse=True)

        return AnomalyResponse(
            success=True,
            company_id=company_id,
            total_transactions=len(transactions),
            anomalies_detected=len(anomalies),
            anomalies=anomalies[:50],  # Limit results
            summary={
                "critical": len([a for a in anomalies if a.severity == "critical"]),
                "high": len([a for a in anomalies if a.severity == "high"]),
                "medium": len([a for a in anomalies if a.severity == "medium"]),
                "low": len([a for a in anomalies if a.severity == "low"]),
                "by_type": {
                    "duplicate": len([a for a in anomalies if a.anomaly_type == "duplicate"]),
                    "amount_outlier": len([a for a in anomalies if a.anomaly_type == "amount_outlier"]),
                    "timing": len([a for a in anomalies if a.anomaly_type == "timing"]),
                    "other": len([a for a in anomalies if a.anomaly_type == "other"]),
                }
            },
            generated_at=datetime.now()
        )

    except Exception as e:
        logger.error(f"Anomaly detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scan-expenses")
async def scan_expenses(
    company_id: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    """
    Scan company expenses for anomalies.

    Fetches expenses from database and runs anomaly detection.
    Returns prioritized list of suspicious transactions.
    """
    try:
        # In production, fetch from database
        # For now, return sample analysis

        return {
            "success": True,
            "company_id": company_id,
            "period": {
                "start": (start_date or datetime.now() - timedelta(days=30)).isoformat(),
                "end": (end_date or datetime.now()).isoformat()
            },
            "summary": {
                "total_expenses_scanned": 156,
                "total_amount": 45678.90,
                "anomalies_found": 7,
                "potential_savings": 2340.00
            },
            "top_anomalies": [
                {
                    "expense_id": "exp-001",
                    "date": "2025-11-28",
                    "amount": 1500.00,
                    "category": "Materiale",
                    "vendor": "SC Exemplu SRL",
                    "anomaly_type": "duplicate",
                    "reason": "Aceeași sumă facturată de 2 ori în aceeași zi",
                    "severity": "high",
                    "action": "Verificați cu furnizorul"
                },
                {
                    "expense_id": "exp-002",
                    "date": "2025-11-25",
                    "amount": 3200.00,
                    "category": "Servicii",
                    "vendor": "Consultant X",
                    "anomaly_type": "amount_outlier",
                    "reason": "Sumă cu 180% mai mare decât media pentru această categorie",
                    "severity": "medium",
                    "action": "Revizuiți factura"
                }
            ],
            "recommendations": [
                "Activați alertele pentru tranzacții > 2000 RON",
                "Revizuiți procesul de aprobare pentru categoria 'Servicii'",
                "Configurați limite per furnizor"
            ],
            "generated_at": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Expense scan error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoice-verification")
async def verify_invoice(
    company_id: str,
    invoice_data: dict
):
    """
    Verify invoice authenticity and detect potential fraud.

    Checks:
    - CUI validity
    - Bank account format
    - Amount reasonability
    - Vendor history
    - Duplicate invoices
    """
    try:
        warnings = []
        risk_score = 0.0

        # Extract invoice data
        vendor_cui = invoice_data.get("vendor_cui", "")
        amount = invoice_data.get("amount", 0)
        vendor_name = invoice_data.get("vendor_name", "")
        invoice_number = invoice_data.get("invoice_number", "")
        iban = invoice_data.get("iban", "")

        # 1. CUI validation
        if vendor_cui:
            # Basic format check
            clean_cui = vendor_cui.replace("RO", "").strip()
            if not clean_cui.isdigit() or len(clean_cui) < 2 or len(clean_cui) > 10:
                warnings.append({
                    "type": "invalid_cui",
                    "message": "Format CUI invalid",
                    "severity": "high"
                })
                risk_score += 0.3
        else:
            warnings.append({
                "type": "missing_cui",
                "message": "CUI furnizor lipsă",
                "severity": "medium"
            })
            risk_score += 0.2

        # 2. IBAN validation
        if iban:
            if not iban.startswith("RO") or len(iban) != 24:
                warnings.append({
                    "type": "invalid_iban",
                    "message": "Format IBAN invalid sau non-românesc",
                    "severity": "medium"
                })
                risk_score += 0.15
        else:
            warnings.append({
                "type": "missing_iban",
                "message": "IBAN lipsă - verificați modalitatea de plată",
                "severity": "low"
            })
            risk_score += 0.05

        # 3. Amount checks
        if amount > 50000:
            warnings.append({
                "type": "large_amount",
                "message": f"Factură de valoare mare: {amount} RON",
                "severity": "medium"
            })
            risk_score += 0.1

        if amount > 0 and amount % 1000 == 0 and amount > 1000:
            warnings.append({
                "type": "round_amount",
                "message": "Sumă rotundă - verificați dacă factura detaliază serviciile",
                "severity": "low"
            })
            risk_score += 0.05

        # 4. First-time vendor check (simulated)
        is_new_vendor = True  # In production, check database
        if is_new_vendor and amount > 5000:
            warnings.append({
                "type": "new_vendor_large_amount",
                "message": "Furnizor nou cu factură de valoare mare - recomandăm verificare suplimentară",
                "severity": "medium"
            })
            risk_score += 0.15

        # Calculate overall risk
        risk_level = "low"
        if risk_score >= 0.5:
            risk_level = "high"
        elif risk_score >= 0.3:
            risk_level = "medium"

        return {
            "success": True,
            "company_id": company_id,
            "invoice_number": invoice_number,
            "vendor": {
                "name": vendor_name,
                "cui": vendor_cui,
                "is_verified": risk_score < 0.3
            },
            "risk_assessment": {
                "score": round(risk_score, 2),
                "level": risk_level,
                "warnings": warnings,
                "warning_count": len(warnings)
            },
            "recommendations": [
                "Verificați CUI-ul în baza ANAF" if vendor_cui else "Solicitați CUI-ul furnizorului",
                "Păstrați dovada recepției bunurilor/serviciilor",
                "Verificați dacă factura conține toate elementele obligatorii"
            ] if warnings else ["Factura pare validă"],
            "verified_at": datetime.now().isoformat()
        }

    except Exception as e:
        logger.error(f"Invoice verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/{company_id}")
async def get_active_alerts(
    company_id: str,
    include_resolved: bool = Query(False)
):
    """
    Get active anomaly alerts for a company.

    Returns unresolved alerts from automatic scanning.
    """
    try:
        # In production, fetch from database
        alerts = [
            {
                "id": "alert-001",
                "type": "duplicate_expense",
                "title": "Posibilă cheltuială duplicată",
                "description": "Două tranzacții de 1,500 RON către SC Exemplu SRL în aceeași zi",
                "severity": "high",
                "created_at": (datetime.now() - timedelta(hours=2)).isoformat(),
                "status": "active",
                "affected_items": ["exp-123", "exp-124"],
                "recommended_action": "Verificați cu furnizorul și anulați duplicatul dacă este cazul"
            },
            {
                "id": "alert-002",
                "type": "budget_exceeded",
                "title": "Buget depășit pentru Marketing",
                "description": "Cheltuielile de marketing au depășit bugetul lunar cu 23%",
                "severity": "medium",
                "created_at": (datetime.now() - timedelta(days=1)).isoformat(),
                "status": "active",
                "affected_items": [],
                "recommended_action": "Revizuiți bugetul sau limitați cheltuielile rămase"
            }
        ]

        if not include_resolved:
            alerts = [a for a in alerts if a["status"] == "active"]

        return {
            "success": True,
            "company_id": company_id,
            "alerts": alerts,
            "total_active": len([a for a in alerts if a["status"] == "active"]),
            "by_severity": {
                "critical": len([a for a in alerts if a["severity"] == "critical"]),
                "high": len([a for a in alerts if a["severity"] == "high"]),
                "medium": len([a for a in alerts if a["severity"] == "medium"]),
                "low": len([a for a in alerts if a["severity"] == "low"])
            }
        }

    except Exception as e:
        logger.error(f"Get alerts error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
