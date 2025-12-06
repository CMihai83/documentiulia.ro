"""
OCR Router - Receipt and Document Processing
"""

import io
import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, File, UploadFile, HTTPException, Depends, BackgroundTasks, Query
from pydantic import BaseModel, Field
from loguru import logger

router = APIRouter()


@router.get("/status")
async def get_ocr_status():
    """Get OCR service status and capabilities."""
    import pytesseract

    try:
        version = pytesseract.get_tesseract_version()
        languages = pytesseract.get_languages()

        return {
            "status": "operational",
            "tesseract_version": str(version),
            "languages": languages,
            "supported_formats": ["image/jpeg", "image/png", "application/pdf"],
            "max_file_size_mb": 10,
            "features": {
                "receipt_extraction": True,
                "batch_processing": True,
                "async_processing": True,
                "romanian_support": "ron" in languages
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }


# Request/Response Models
class ReceiptItem(BaseModel):
    """Extracted receipt line item - Melody for line item extraction."""
    description: str
    quantity: float = 1.0
    unit_price: float
    total: float
    vat_rate: Optional[float] = None
    vat_code: Optional[str] = None  # A=21%, B=11%, C=5%, D=0%


# 🎵 2026 VAT Rate Symphony - Law 141/2025 Compliance
VAT_RATES_2026 = {
    "A": 21.0,   # Standard rate from Aug 2025
    "B": 11.0,   # Reduced rate from Aug 2025
    "C": 5.0,    # Super-reduced (unchanged)
    "D": 0.0,    # Exempt
    # Legacy rates for documents before Aug 2025
    "A_LEGACY": 19.0,
    "B_LEGACY": 9.0,
}

VAT_REFORM_DATE = datetime(2025, 8, 1)


class ReceiptData(BaseModel):
    """Extracted receipt data - Harmonized for 2026 compliance."""
    vendor_name: Optional[str] = None
    vendor_cui: Optional[str] = None
    vendor_address: Optional[str] = None
    receipt_number: Optional[str] = None
    receipt_date: Optional[datetime] = None
    items: List[ReceiptItem] = []
    subtotal: Optional[float] = None
    vat_amount: Optional[float] = None
    vat_breakdown: Optional[dict] = None  # {21: 10.50, 11: 2.20, 5: 0.50}
    total: float
    payment_method: Optional[str] = None
    currency: str = "RON"
    raw_text: Optional[str] = None
    confidence: float = 0.0
    # 🎵 2026 Reform Fields
    uses_2026_rates: bool = False
    detected_vat_rates: List[float] = []
    fiscal_regime: str = "2024"  # 2024, 2025-transitional, 2026


class OCRResponse(BaseModel):
    """OCR processing response."""
    success: bool
    task_id: str
    status: str
    data: Optional[ReceiptData] = None
    error: Optional[str] = None
    processing_time_ms: Optional[int] = None


class OCRTaskStatus(BaseModel):
    """OCR task status."""
    task_id: str
    status: str  # pending, processing, completed, failed
    progress: int = 0
    result: Optional[ReceiptData] = None
    error: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


# In-memory task storage (use Redis in production)
_tasks: dict = {}


@router.post("/receipt", response_model=OCRResponse)
async def process_receipt(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    async_mode: bool = Query(False, description="Process asynchronously")
):
    """
    Process a receipt image and extract structured data.

    Supports: JPEG, PNG, PDF
    Max size: 10MB

    Returns extracted receipt data including:
    - Vendor information (name, CUI, address)
    - Receipt number and date
    - Line items with prices
    - Totals and VAT amounts
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {allowed_types}"
        )

    # Validate file size (10MB max)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10MB."
        )

    task_id = str(uuid.uuid4())

    if async_mode:
        # Async processing
        _tasks[task_id] = OCRTaskStatus(
            task_id=task_id,
            status="pending",
            progress=0,
            created_at=datetime.now()
        )

        background_tasks.add_task(
            _process_receipt_async,
            task_id,
            contents,
            file.filename
        )

        return OCRResponse(
            success=True,
            task_id=task_id,
            status="pending",
            data=None
        )
    else:
        # Sync processing
        import time
        start_time = time.time()

        try:
            result = await _extract_receipt_data(contents, file.filename)
            processing_time = int((time.time() - start_time) * 1000)

            return OCRResponse(
                success=True,
                task_id=task_id,
                status="completed",
                data=result,
                processing_time_ms=processing_time
            )
        except Exception as e:
            logger.error(f"OCR processing error: {e}")
            raise HTTPException(status_code=500, detail=str(e))


@router.get("/receipt/{task_id}", response_model=OCRTaskStatus)
async def get_receipt_status(task_id: str):
    """Get the status of an async OCR task."""
    if task_id not in _tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    return _tasks[task_id]


@router.post("/batch", response_model=dict)
async def process_batch(
    files: List[UploadFile] = File(...),
    background_tasks: BackgroundTasks = None
):
    """
    Process multiple receipts in batch.
    Returns task IDs for each file.
    """
    if len(files) > 20:
        raise HTTPException(
            status_code=400,
            detail="Maximum 20 files per batch"
        )

    task_ids = []
    for file in files:
        contents = await file.read()
        task_id = str(uuid.uuid4())

        _tasks[task_id] = OCRTaskStatus(
            task_id=task_id,
            status="pending",
            progress=0,
            created_at=datetime.now()
        )

        background_tasks.add_task(
            _process_receipt_async,
            task_id,
            contents,
            file.filename
        )

        task_ids.append({
            "filename": file.filename,
            "task_id": task_id
        })

    return {
        "success": True,
        "batch_size": len(files),
        "tasks": task_ids
    }


async def _process_receipt_async(task_id: str, contents: bytes, filename: str):
    """Background task for async receipt processing."""
    try:
        _tasks[task_id].status = "processing"
        _tasks[task_id].progress = 10

        result = await _extract_receipt_data(contents, filename)

        _tasks[task_id].status = "completed"
        _tasks[task_id].progress = 100
        _tasks[task_id].result = result
        _tasks[task_id].completed_at = datetime.now()

    except Exception as e:
        logger.error(f"Async OCR error for task {task_id}: {e}")
        _tasks[task_id].status = "failed"
        _tasks[task_id].error = str(e)
        _tasks[task_id].completed_at = datetime.now()


async def _extract_receipt_data(contents: bytes, filename: str) -> ReceiptData:
    """
    Extract structured data from receipt image using OCR.

    This is a simplified implementation using Tesseract.
    For production, consider using LayoutLMv3 for better accuracy.
    """
    import pytesseract
    from PIL import Image
    import re

    # Load image
    try:
        image = Image.open(io.BytesIO(contents))
    except Exception as e:
        raise ValueError(f"Could not open image: {e}")

    # Convert to RGB if necessary
    if image.mode != "RGB":
        image = image.convert("RGB")

    # Run OCR with Romanian language
    try:
        raw_text = pytesseract.image_to_string(
            image,
            lang="ron+eng",
            config="--psm 6"  # Assume uniform block of text
        )
    except Exception as e:
        logger.error(f"Tesseract error: {e}")
        raw_text = ""

    # Parse extracted text
    result = _parse_receipt_text(raw_text)
    result.raw_text = raw_text

    return result


def _detect_vat_regime(text: str, receipt_date: Optional[datetime]) -> tuple[str, bool, List[float]]:
    """
    🎵 Detect VAT regime based on rates found and document date.
    Returns: (regime, uses_2026_rates, detected_rates)
    """
    import re

    detected_rates = set()

    # Look for VAT rate patterns
    vat_rate_patterns = [
        r"(\d{1,2})[%\s]*TVA",
        r"TVA[:\s]*(\d{1,2})[%]?",
        r"COTA[:\s]*(\d{1,2})[%]?",
        r"@(\d{1,2})[%]?",
        r"\bA\b.*?21[%]?",  # 2026 standard
        r"\bB\b.*?11[%]?",  # 2026 reduced
        r"\bA\b.*?19[%]?",  # Legacy standard
        r"\bB\b.*?9[%]?",   # Legacy reduced
    ]

    for pattern in vat_rate_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            if isinstance(match, str) and match.isdigit():
                rate = int(match)
                if rate in [21, 19, 11, 9, 5, 0]:
                    detected_rates.add(float(rate))

    # Specific 2026 rate detection
    if "21%" in text or "21 %" in text or re.search(r"TVA\s*21", text):
        detected_rates.add(21.0)
    if "11%" in text or "11 %" in text or re.search(r"TVA\s*11", text):
        detected_rates.add(11.0)

    # Determine regime
    uses_2026 = 21.0 in detected_rates or 11.0 in detected_rates

    if receipt_date:
        if receipt_date >= VAT_REFORM_DATE:
            regime = "2026" if receipt_date >= datetime(2026, 1, 1) else "2025-transitional"
        else:
            regime = "2024"
    else:
        # Infer from rates
        if uses_2026:
            regime = "2025-transitional"
        else:
            regime = "2024"

    return regime, uses_2026, list(detected_rates)


def _parse_vat_breakdown(text: str, uses_2026: bool) -> dict:
    """
    🎵 Extract VAT breakdown by rate category.
    """
    import re

    breakdown = {}

    # Pattern: TVA A: 10.50 or A 21% 10.50
    patterns = [
        r"(?:TVA\s*)?([ABCD])\s*:?\s*(\d+[.,]\d{2})",
        r"(\d{1,2})[%]?\s*:?\s*(\d+[.,]\d{2})\s*(?:RON|LEI)?",
    ]

    for pattern in patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches:
            code_or_rate, amount = match
            amount = float(amount.replace(",", "."))

            if code_or_rate.upper() in "ABCD":
                # Map code to rate
                rate_map = {"A": 21 if uses_2026 else 19, "B": 11 if uses_2026 else 9, "C": 5, "D": 0}
                rate = rate_map.get(code_or_rate.upper(), 19)
            else:
                rate = int(code_or_rate) if code_or_rate.isdigit() else 19

            if rate > 0:
                breakdown[rate] = breakdown.get(rate, 0) + amount

    return breakdown if breakdown else None


def _parse_receipt_text(text: str) -> ReceiptData:
    """
    🎵 Parse Romanian receipt text - Symphony for 2026 VAT compliance.

    Looks for common patterns in Romanian receipts:
    - CUI/CIF: RO12345678 or CUI: 12345678
    - Date formats: DD.MM.YYYY, DD/MM/YYYY
    - Totals: TOTAL, TOTAL DE PLATA
    - VAT: TVA, T.V.A. with 2026 rate detection (21%, 11%)
    """
    import re
    from datetime import datetime

    lines = text.split("\n")
    lines = [line.strip() for line in lines if line.strip()]

    result = ReceiptData(total=0.0, confidence=0.0)
    items = []

    # Extract CUI/CIF
    cui_patterns = [
        r"(?:CUI|CIF|C\.U\.I\.|C\.I\.F\.)[:\s]*(?:RO)?(\d{2,10})",
        r"RO\s*(\d{2,10})",
        r"(?:COD FISCAL)[:\s]*(\d{2,10})"
    ]
    for pattern in cui_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result.vendor_cui = f"RO{match.group(1)}"
            result.confidence += 0.15
            break

    # Extract date
    date_patterns = [
        r"(\d{2})[./](\d{2})[./](\d{4})",
        r"(\d{4})[./](\d{2})[./](\d{2})"
    ]
    for pattern in date_patterns:
        match = re.search(pattern, text)
        if match:
            try:
                groups = match.groups()
                if len(groups[0]) == 4:  # YYYY-MM-DD
                    result.receipt_date = datetime(
                        int(groups[0]), int(groups[1]), int(groups[2])
                    )
                else:  # DD-MM-YYYY
                    result.receipt_date = datetime(
                        int(groups[2]), int(groups[1]), int(groups[0])
                    )
                result.confidence += 0.15
            except:
                pass
            break

    # Extract receipt number
    receipt_patterns = [
        r"(?:BON|NR\.?|NUMAR|FACTURA)[:\s#]*([A-Z0-9-]+)",
        r"(?:CHITANTA|RECEIPT)[:\s#]*([A-Z0-9-]+)"
    ]
    for pattern in receipt_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            result.receipt_number = match.group(1)
            result.confidence += 0.1
            break

    # Extract total
    total_patterns = [
        r"(?:TOTAL|TOTAL DE PLATA|TOTAL GENERAL|DE PLATA)[:\s]*(\d+[.,]\d{2})",
        r"(?:SUMA)[:\s]*(\d+[.,]\d{2})"
    ]
    for pattern in total_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            total_str = match.group(1).replace(",", ".")
            result.total = float(total_str)
            result.confidence += 0.2
            break

    # Extract VAT
    vat_patterns = [
        r"(?:TVA|T\.V\.A\.|VAT)[:\s]*(\d+[.,]\d{2})",
    ]
    for pattern in vat_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            vat_str = match.group(1).replace(",", ".")
            result.vat_amount = float(vat_str)
            result.confidence += 0.1
            break

    # Extract subtotal
    subtotal_patterns = [
        r"(?:SUBTOTAL|SUB-TOTAL)[:\s]*(\d+[.,]\d{2})",
    ]
    for pattern in subtotal_patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            subtotal_str = match.group(1).replace(",", ".")
            result.subtotal = float(subtotal_str)
            result.confidence += 0.1
            break

    # Extract vendor name (usually first non-empty lines)
    for line in lines[:5]:
        # Skip lines that are likely not vendor name
        if re.search(r"(bon|fiscal|chitanta|factura|cui|cif|\d{2}[./]\d{2}[./]\d{4})", line, re.IGNORECASE):
            continue
        if len(line) > 3 and not line.isdigit():
            result.vendor_name = line
            result.confidence += 0.1
            break

    # 🎵 2026 VAT Regime Detection - Law 141/2025
    regime, uses_2026, detected_rates = _detect_vat_regime(text, result.receipt_date)
    result.fiscal_regime = regime
    result.uses_2026_rates = uses_2026
    result.detected_vat_rates = detected_rates

    # Extract VAT breakdown by rate
    result.vat_breakdown = _parse_vat_breakdown(text, uses_2026)
    if result.vat_breakdown:
        result.confidence += 0.1

    # Extract line items (simplified - looks for price patterns)
    # Enhanced to detect VAT codes (A=21%/19%, B=11%/9%, C=5%, D=0%)
    item_pattern = r"(.+?)\s+(\d+[.,]\d{2})\s*(?:LEI|RON)?(?:\s*([ABCD]))?"
    for line in lines:
        if re.search(r"(total|subtotal|tva|plata)", line, re.IGNORECASE):
            continue
        match = re.search(item_pattern, line, re.IGNORECASE)
        if match:
            desc = match.group(1).strip()
            price_str = match.group(2).replace(",", ".")
            price = float(price_str)
            vat_code = match.group(3).upper() if match.group(3) else None

            # Determine VAT rate from code
            vat_rate = None
            if vat_code:
                rate_map = {
                    "A": 21.0 if uses_2026 else 19.0,
                    "B": 11.0 if uses_2026 else 9.0,
                    "C": 5.0,
                    "D": 0.0
                }
                vat_rate = rate_map.get(vat_code)

            if desc and price > 0 and len(desc) > 2:
                items.append(ReceiptItem(
                    description=desc,
                    quantity=1.0,
                    unit_price=price,
                    total=price,
                    vat_code=vat_code,
                    vat_rate=vat_rate
                ))

    result.items = items[:20]  # Limit to 20 items

    # Add confidence boost for 2026 compliance detection
    if uses_2026:
        result.confidence += 0.1  # Bonus for detecting new rates

    # Cap confidence at 1.0
    result.confidence = min(result.confidence, 1.0)

    return result


@router.get("/vat-rates")
async def get_vat_rates(
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format to get applicable rates")
):
    """
    🎵 Get applicable VAT rates for a given date.
    Returns rates based on Law 141/2025 fiscal reform.
    """
    from datetime import datetime

    if date:
        try:
            check_date = datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        check_date = datetime.now()

    uses_2026 = check_date >= VAT_REFORM_DATE

    if check_date >= datetime(2026, 1, 1):
        regime = "2026"
    elif uses_2026:
        regime = "2025-transitional"
    else:
        regime = "2024"

    rates = {
        "date": check_date.strftime("%Y-%m-%d"),
        "fiscal_regime": regime,
        "uses_2026_rates": uses_2026,
        "reform_date": VAT_REFORM_DATE.strftime("%Y-%m-%d"),
        "rates": {
            "A": {
                "rate": 21.0 if uses_2026 else 19.0,
                "description": "Standard rate",
                "applies_to": "Most goods and services"
            },
            "B": {
                "rate": 11.0 if uses_2026 else 9.0,
                "description": "Reduced rate",
                "applies_to": "Food, water, medicines, hotels, restaurants"
            },
            "C": {
                "rate": 5.0,
                "description": "Super-reduced rate",
                "applies_to": "Social housing, cultural events, school supplies"
            },
            "D": {
                "rate": 0.0,
                "description": "Exempt/Zero rate",
                "applies_to": "Exports, intra-community supplies"
            }
        },
        "law_reference": "Law 141/2025 - Romanian Fiscal Code Reform"
    }

    return rates


@router.post("/validate-vat")
async def validate_vat_calculation(
    subtotal: float = Query(..., description="Subtotal amount without VAT"),
    vat_rate: float = Query(..., description="VAT rate (21, 11, 5, 0)"),
    declared_vat: float = Query(..., description="Declared VAT amount"),
    tolerance: float = Query(0.02, description="Tolerance for rounding differences")
):
    """
    🎵 Validate VAT calculation on a receipt/invoice.
    Checks if declared VAT matches expected based on 2026 rates.
    """
    expected_vat = round(subtotal * (vat_rate / 100), 2)
    difference = abs(declared_vat - expected_vat)
    is_valid = difference <= tolerance

    return {
        "is_valid": is_valid,
        "subtotal": subtotal,
        "vat_rate": vat_rate,
        "declared_vat": declared_vat,
        "expected_vat": expected_vat,
        "difference": round(difference, 2),
        "tolerance": tolerance,
        "total_with_vat": round(subtotal + expected_vat, 2),
        "status": "VALID" if is_valid else "DISCREPANCY_DETECTED"
    }


@router.post("/document")
async def process_document(
    file: UploadFile = File(...),
    document_type: str = Query("generic", description="Document type: invoice, contract, generic")
):
    """
    Process a general document (invoice, contract, etc.) and extract text.

    Supports: JPEG, PNG, PDF
    """
    allowed_types = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}"
        )

    contents = await file.read()

    try:
        import pytesseract
        from PIL import Image

        image = Image.open(io.BytesIO(contents))
        if image.mode != "RGB":
            image = image.convert("RGB")

        text = pytesseract.image_to_string(
            image,
            lang="ron+eng",
            config="--psm 3"
        )

        return {
            "success": True,
            "document_type": document_type,
            "text": text,
            "word_count": len(text.split()),
            "char_count": len(text)
        }

    except Exception as e:
        logger.error(f"Document OCR error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
