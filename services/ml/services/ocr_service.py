"""
OCR Service - Receipt and Document Processing
"""

import os
import io
import re
from typing import Optional, Dict, Any, List
from datetime import datetime
from dataclasses import dataclass

from PIL import Image
from loguru import logger

try:
    import pytesseract
except ImportError:
    pytesseract = None
    logger.warning("pytesseract not installed - OCR functionality limited")


@dataclass
class ExtractedReceipt:
    """Structured receipt data."""
    vendor_name: Optional[str] = None
    vendor_cui: Optional[str] = None
    vendor_address: Optional[str] = None
    receipt_number: Optional[str] = None
    receipt_date: Optional[datetime] = None
    items: List[Dict] = None
    subtotal: Optional[float] = None
    vat_amount: Optional[float] = None
    total: float = 0.0
    payment_method: Optional[str] = None
    currency: str = "RON"
    raw_text: str = ""
    confidence: float = 0.0

    def __post_init__(self):
        if self.items is None:
            self.items = []


class OCRService:
    """
    OCR Service for processing receipts and documents.

    Supports:
    - Romanian fiscal receipts (bonuri fiscale)
    - Invoices (facturi)
    - General documents
    """

    def __init__(self):
        self.tesseract_available = pytesseract is not None
        self.tesseract_lang = "ron+eng"
        self._initialized = False

    async def initialize(self):
        """Initialize the OCR service."""
        if self._initialized:
            return

        # Check Tesseract availability
        if self.tesseract_available:
            try:
                version = pytesseract.get_tesseract_version()
                logger.info(f"Tesseract version: {version}")

                # Check for Romanian language data
                langs = pytesseract.get_languages()
                if "ron" not in langs:
                    logger.warning("Romanian language pack not installed for Tesseract")
                    self.tesseract_lang = "eng"
                else:
                    logger.info("Romanian OCR support available")

            except Exception as e:
                logger.error(f"Tesseract initialization error: {e}")
                self.tesseract_available = False
        else:
            logger.warning("Tesseract not available - using fallback text extraction")

        self._initialized = True

    async def process_receipt(
        self,
        image_bytes: bytes,
        filename: str = "receipt.jpg"
    ) -> ExtractedReceipt:
        """
        Process a receipt image and extract structured data.

        Args:
            image_bytes: Raw image bytes
            filename: Original filename for type detection

        Returns:
            ExtractedReceipt with parsed data
        """
        if not self._initialized:
            await self.initialize()

        # Load and preprocess image
        image = self._load_image(image_bytes)
        if image is None:
            raise ValueError("Could not load image")

        # Preprocess for better OCR
        processed_image = self._preprocess_image(image)

        # Run OCR
        raw_text = self._run_ocr(processed_image)

        # Parse extracted text
        result = self._parse_receipt_text(raw_text)

        return result

    def _load_image(self, image_bytes: bytes) -> Optional[Image.Image]:
        """Load image from bytes."""
        try:
            image = Image.open(io.BytesIO(image_bytes))
            # Convert to RGB if necessary
            if image.mode != "RGB":
                image = image.convert("RGB")
            return image
        except Exception as e:
            logger.error(f"Image load error: {e}")
            return None

    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """Preprocess image for better OCR results."""
        try:
            # Resize if too large
            max_size = 2000
            if max(image.size) > max_size:
                ratio = max_size / max(image.size)
                new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
                image = image.resize(new_size, Image.Resampling.LANCZOS)

            # Convert to grayscale for better OCR
            # image = image.convert('L')

            return image

        except Exception as e:
            logger.warning(f"Image preprocessing error: {e}")
            return image

    def _run_ocr(self, image: Image.Image) -> str:
        """Run OCR on preprocessed image."""
        if not self.tesseract_available:
            return ""

        try:
            text = pytesseract.image_to_string(
                image,
                lang=self.tesseract_lang,
                config="--psm 6 --oem 3"
            )
            return text

        except Exception as e:
            logger.error(f"OCR error: {e}")
            return ""

    def _parse_receipt_text(self, text: str) -> ExtractedReceipt:
        """
        Parse Romanian receipt text and extract structured data.

        Handles common Romanian receipt patterns:
        - Bon fiscal format
        - Invoice format
        - Multiple date formats
        - CUI/CIF patterns
        """
        result = ExtractedReceipt(raw_text=text)
        lines = [line.strip() for line in text.split("\n") if line.strip()]

        # Extract CUI/CIF
        result.vendor_cui = self._extract_cui(text)
        if result.vendor_cui:
            result.confidence += 0.15

        # Extract date
        result.receipt_date = self._extract_date(text)
        if result.receipt_date:
            result.confidence += 0.15

        # Extract receipt number
        result.receipt_number = self._extract_receipt_number(text)
        if result.receipt_number:
            result.confidence += 0.1

        # Extract total
        result.total = self._extract_total(text)
        if result.total > 0:
            result.confidence += 0.2

        # Extract VAT
        result.vat_amount = self._extract_vat(text)
        if result.vat_amount:
            result.confidence += 0.1

        # Extract subtotal
        result.subtotal = self._extract_subtotal(text)
        if result.subtotal:
            result.confidence += 0.1

        # Extract vendor name
        result.vendor_name = self._extract_vendor_name(lines)
        if result.vendor_name:
            result.confidence += 0.1

        # Extract line items
        result.items = self._extract_items(lines)
        if result.items:
            result.confidence += 0.1

        # Cap confidence at 1.0
        result.confidence = min(result.confidence, 1.0)

        return result

    def _extract_cui(self, text: str) -> Optional[str]:
        """Extract CUI/CIF from text."""
        patterns = [
            r"(?:CUI|CIF|C\.U\.I\.|C\.I\.F\.)[:\s]*(?:RO)?(\d{2,10})",
            r"(?:COD\s*FISCAL)[:\s]*(?:RO)?(\d{2,10})",
            r"RO\s*(\d{2,10})\b",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                cui = match.group(1)
                # Validate length
                if 2 <= len(cui) <= 10:
                    return f"RO{cui}"

        return None

    def _extract_date(self, text: str) -> Optional[datetime]:
        """Extract date from text."""
        patterns = [
            (r"(\d{2})[./](\d{2})[./](\d{4})", "DMY"),
            (r"(\d{4})[./](\d{2})[./](\d{2})", "YMD"),
            (r"(\d{2})-(\d{2})-(\d{4})", "DMY"),
        ]

        for pattern, format_type in patterns:
            match = re.search(pattern, text)
            if match:
                try:
                    groups = match.groups()
                    if format_type == "YMD":
                        return datetime(int(groups[0]), int(groups[1]), int(groups[2]))
                    else:  # DMY
                        return datetime(int(groups[2]), int(groups[1]), int(groups[0]))
                except ValueError:
                    continue

        return None

    def _extract_receipt_number(self, text: str) -> Optional[str]:
        """Extract receipt/invoice number."""
        patterns = [
            r"(?:BON\s*(?:NR\.?|FISCAL)?)[:\s#]*([A-Z0-9-]+)",
            r"(?:NR\.?\s*(?:BON|FACTURA|CHITANTA))[:\s#]*([A-Z0-9-]+)",
            r"(?:FACTURA)[:\s#]*([A-Z0-9-]+)",
            r"(?:CHITANTA)[:\s#]*([A-Z0-9-]+)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()

        return None

    def _extract_total(self, text: str) -> float:
        """Extract total amount."""
        patterns = [
            r"(?:TOTAL|TOTAL\s*DE\s*PLATA|TOTAL\s*GENERAL)[:\s]*(\d+[.,]\d{2})",
            r"(?:DE\s*PLATA|SUMA)[:\s]*(\d+[.,]\d{2})",
            r"(?:TOTAL)[:\s]*(\d+[.,]\d{2})\s*(?:RON|LEI)?",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    amount_str = match.group(1).replace(",", ".")
                    return float(amount_str)
                except ValueError:
                    continue

        return 0.0

    def _extract_vat(self, text: str) -> Optional[float]:
        """Extract VAT amount."""
        patterns = [
            r"(?:TVA|T\.V\.A\.|VAT)[:\s]*(\d+[.,]\d{2})",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1).replace(",", "."))
                except ValueError:
                    continue

        return None

    def _extract_subtotal(self, text: str) -> Optional[float]:
        """Extract subtotal amount."""
        patterns = [
            r"(?:SUBTOTAL|SUB-TOTAL|TOTAL\s*FARA\s*TVA)[:\s]*(\d+[.,]\d{2})",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    return float(match.group(1).replace(",", "."))
                except ValueError:
                    continue

        return None

    def _extract_vendor_name(self, lines: List[str]) -> Optional[str]:
        """Extract vendor name from first lines."""
        # Skip lines that are likely not vendor names
        skip_patterns = [
            r"bon\s*fiscal",
            r"chitanta",
            r"factura",
            r"cui|cif",
            r"\d{2}[./]\d{2}[./]\d{4}",
            r"^\d+$",
            r"^-+$",
            r"^=+$",
        ]

        for line in lines[:7]:  # Check first 7 lines
            line_lower = line.lower()

            # Skip if matches skip patterns
            should_skip = False
            for pattern in skip_patterns:
                if re.search(pattern, line_lower):
                    should_skip = True
                    break

            if should_skip:
                continue

            # Check if line looks like a name (has letters, reasonable length)
            if len(line) >= 3 and re.search(r"[A-Za-z]", line):
                # Clean up
                cleaned = re.sub(r"^\W+|\W+$", "", line)
                if len(cleaned) >= 3:
                    return cleaned

        return None

    def _extract_items(self, lines: List[str]) -> List[Dict]:
        """Extract line items from receipt."""
        items = []

        # Pattern: description followed by price
        item_pattern = r"(.+?)\s+(\d+[.,]\d{2})\s*(?:LEI|RON)?$"

        for line in lines:
            # Skip header/footer lines
            if re.search(r"(total|subtotal|tva|plata|bon|fiscal|cui)", line, re.IGNORECASE):
                continue

            match = re.search(item_pattern, line)
            if match:
                desc = match.group(1).strip()
                price_str = match.group(2).replace(",", ".")

                try:
                    price = float(price_str)
                    if price > 0 and len(desc) >= 2:
                        items.append({
                            "description": desc,
                            "quantity": 1.0,
                            "unit_price": price,
                            "total": price
                        })
                except ValueError:
                    continue

        return items[:20]  # Limit to 20 items

    async def process_document(
        self,
        image_bytes: bytes,
        document_type: str = "generic"
    ) -> Dict[str, Any]:
        """
        Process a general document and extract text.

        Args:
            image_bytes: Raw image bytes
            document_type: Type of document (invoice, contract, generic)

        Returns:
            Dict with extracted text and metadata
        """
        if not self._initialized:
            await self.initialize()

        image = self._load_image(image_bytes)
        if image is None:
            raise ValueError("Could not load image")

        processed_image = self._preprocess_image(image)
        raw_text = self._run_ocr(processed_image)

        return {
            "document_type": document_type,
            "text": raw_text,
            "word_count": len(raw_text.split()),
            "char_count": len(raw_text),
            "lines": len([l for l in raw_text.split("\n") if l.strip()])
        }
