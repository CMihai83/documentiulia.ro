#!/usr/bin/env python3
"""
Advanced OCR Engine with Template-Based Document Processing
For documentiulia.ro Receipt/Invoice Processing

Features:
- Template-based region extraction
- Advanced image preprocessing
- Confidence scoring
- Romanian text support
- Receipt/Invoice parsing
"""

import cv2
import pytesseract
import numpy as np
import json
import os
import sys
import re
from PIL import Image
from dataclasses import dataclass, asdict
from typing import Dict, List, Optional, Tuple
from datetime import datetime


@dataclass
class DocumentRegion:
    """Defines a region in a document template"""
    name: str
    coordinates: Tuple[int, int, int, int]  # x1, y1, x2, y2 (relative percentages 0-100)
    confidence_threshold: float = 0.6
    data_type: str = "text"  # text, number, date, currency, phone
    preprocessing: str = "standard"  # standard, high_contrast, noise_reduction
    tesseract_config: str = ""

    def to_dict(self):
        return asdict(self)


class DocumentTemplate:
    """Template for document structure"""

    def __init__(self, template_name: str, document_type: str = "receipt"):
        self.name = template_name
        self.document_type = document_type
        self.regions: Dict[str, DocumentRegion] = {}
        self.created_at = datetime.now().isoformat()

    def add_region(self, region: DocumentRegion):
        self.regions[region.name] = region

    def remove_region(self, region_name: str):
        if region_name in self.regions:
            del self.regions[region_name]

    def save_template(self, file_path: str):
        template_data = {
            'name': self.name,
            'document_type': self.document_type,
            'created_at': self.created_at,
            'regions': {
                name: region.to_dict()
                for name, region in self.regions.items()
            }
        }
        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(template_data, f, indent=2, ensure_ascii=False)

    @classmethod
    def load_template(cls, file_path: str) -> 'DocumentTemplate':
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        template = cls(data['name'], data.get('document_type', 'receipt'))
        template.created_at = data.get('created_at', datetime.now().isoformat())

        for name, region_data in data.get('regions', {}).items():
            region = DocumentRegion(
                name=name,
                coordinates=tuple(region_data['coordinates']),
                confidence_threshold=region_data.get('confidence_threshold', 0.6),
                data_type=region_data.get('data_type', 'text'),
                preprocessing=region_data.get('preprocessing', 'standard'),
                tesseract_config=region_data.get('tesseract_config', '')
            )
            template.add_region(region)

        return template


class ImagePreprocessor:
    """Advanced image preprocessing for OCR"""

    @staticmethod
    def to_grayscale(image: np.ndarray) -> np.ndarray:
        if len(image.shape) == 3:
            return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        return image

    @staticmethod
    def denoise(image: np.ndarray) -> np.ndarray:
        """Remove noise while preserving edges"""
        return cv2.fastNlMeansDenoising(image, None, 10, 7, 21)

    @staticmethod
    def enhance_contrast(image: np.ndarray) -> np.ndarray:
        """Enhance contrast using CLAHE"""
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        return clahe.apply(image)

    @staticmethod
    def binarize(image: np.ndarray, method: str = 'otsu') -> np.ndarray:
        """Convert to binary using various methods"""
        if method == 'otsu':
            _, binary = cv2.threshold(image, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        elif method == 'adaptive':
            binary = cv2.adaptiveThreshold(
                image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 11, 2
            )
        else:
            _, binary = cv2.threshold(image, 127, 255, cv2.THRESH_BINARY)
        return binary

    @staticmethod
    def deskew(image: np.ndarray) -> np.ndarray:
        """Correct image skew"""
        coords = np.column_stack(np.where(image > 0))
        if len(coords) == 0:
            return image
        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle
        if abs(angle) < 0.5:
            return image
        (h, w) = image.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        return cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

    @staticmethod
    def remove_shadows(image: np.ndarray) -> np.ndarray:
        """Remove shadows from document images"""
        rgb_planes = cv2.split(image) if len(image.shape) == 3 else [image]
        result_planes = []
        for plane in rgb_planes:
            dilated = cv2.dilate(plane, np.ones((7, 7), np.uint8))
            bg = cv2.medianBlur(dilated, 21)
            diff = 255 - cv2.absdiff(plane, bg)
            result_planes.append(cv2.normalize(diff, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX))
        return cv2.merge(result_planes) if len(result_planes) > 1 else result_planes[0]

    @staticmethod
    def sharpen(image: np.ndarray) -> np.ndarray:
        """Sharpen image for better text clarity"""
        kernel = np.array([[-1, -1, -1],
                          [-1,  9, -1],
                          [-1, -1, -1]])
        return cv2.filter2D(image, -1, kernel)

    def preprocess_standard(self, image: np.ndarray) -> np.ndarray:
        """Standard preprocessing pipeline"""
        gray = self.to_grayscale(image)
        denoised = self.denoise(gray)
        enhanced = self.enhance_contrast(denoised)
        binary = self.binarize(enhanced, 'otsu')
        return binary

    def preprocess_high_contrast(self, image: np.ndarray) -> np.ndarray:
        """High contrast preprocessing for faded documents"""
        gray = self.to_grayscale(image)
        shadows_removed = self.remove_shadows(gray)
        enhanced = self.enhance_contrast(shadows_removed)
        sharpened = self.sharpen(enhanced)
        binary = self.binarize(sharpened, 'adaptive')
        return binary

    def preprocess_receipt(self, image: np.ndarray) -> np.ndarray:
        """Specialized preprocessing for thermal receipts and photos"""
        gray = self.to_grayscale(image)

        # Check if image is a photo (larger dimensions, color noise)
        h, w = gray.shape[:2]
        is_photo = h > 1500 or w > 1500

        if is_photo:
            # For photos: remove shadows first, then enhance
            shadows_removed = self.remove_shadows(gray)
            # Stronger denoising for camera photos
            denoised = cv2.fastNlMeansDenoising(shadows_removed, None, 15, 7, 21)
            # CLAHE for better contrast
            enhanced = self.enhance_contrast(denoised)
            # Sharpen to improve text edges
            sharpened = self.sharpen(enhanced)
            # Adaptive threshold with larger block for photo
            binary = cv2.adaptiveThreshold(
                sharpened, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 21, 5
            )
        else:
            # Original processing for scanned receipts
            denoised = cv2.medianBlur(gray, 3)
            enhanced = self.enhance_contrast(denoised)
            binary = cv2.adaptiveThreshold(
                enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                cv2.THRESH_BINARY, 15, 4
            )

        # Clean up small noise
        kernel = np.ones((2, 2), np.uint8)
        cleaned = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        return cleaned


class AdvancedOCRProcessor:
    """Main OCR processing engine"""

    def __init__(self, templates_dir: str = None):
        self.preprocessor = ImagePreprocessor()
        self.templates: Dict[str, DocumentTemplate] = {}
        self.templates_dir = templates_dir or os.path.dirname(os.path.abspath(__file__)) + '/templates'

        # Ensure templates directory exists
        os.makedirs(self.templates_dir, exist_ok=True)

        # Load existing templates
        self._load_templates()

        # Create default templates
        self._create_default_templates()

    def _load_templates(self):
        """Load all templates from templates directory"""
        if os.path.exists(self.templates_dir):
            for filename in os.listdir(self.templates_dir):
                if filename.endswith('.json'):
                    try:
                        template = DocumentTemplate.load_template(
                            os.path.join(self.templates_dir, filename)
                        )
                        self.templates[template.name] = template
                    except Exception as e:
                        print(f"Error loading template {filename}: {e}", file=sys.stderr)

    def _create_default_templates(self):
        """Create default templates for common document types"""
        # Romanian Receipt Template
        if 'romanian_receipt' not in self.templates:
            template = DocumentTemplate('romanian_receipt', 'receipt')
            # Full document scan (coordinates as percentages)
            template.add_region(DocumentRegion('full_text', (0, 0, 100, 100), 0.5, 'text', 'receipt'))
            template.save_template(os.path.join(self.templates_dir, 'romanian_receipt.json'))
            self.templates['romanian_receipt'] = template

        # Invoice Template
        if 'invoice' not in self.templates:
            template = DocumentTemplate('invoice', 'invoice')
            template.add_region(DocumentRegion('header', (0, 0, 100, 20), 0.6, 'text'))
            template.add_region(DocumentRegion('details', (0, 20, 100, 70), 0.5, 'text'))
            template.add_region(DocumentRegion('totals', (50, 70, 100, 100), 0.6, 'currency'))
            template.save_template(os.path.join(self.templates_dir, 'invoice.json'))
            self.templates['invoice'] = template

    def register_template(self, template: DocumentTemplate):
        """Register a new template"""
        self.templates[template.name] = template
        template.save_template(os.path.join(self.templates_dir, f'{template.name}.json'))

    def get_tesseract_config(self, region: DocumentRegion) -> str:
        """Get appropriate Tesseract configuration"""
        base_config = '--oem 3 --psm 6'

        # Add language support
        lang_config = '-l ron+eng'

        # Add data type specific whitelist
        whitelists = {
            'number': '-c tessedit_char_whitelist=0123456789.,',
            'currency': '-c tessedit_char_whitelist=0123456789.,RONLEIEUR ',
            'date': '-c tessedit_char_whitelist=0123456789./-',
            'phone': '-c tessedit_char_whitelist=0123456789+()- ',
        }

        whitelist = whitelists.get(region.data_type, '')
        custom_config = region.tesseract_config

        return f'{base_config} {lang_config} {whitelist} {custom_config}'.strip()

    def extract_region_text(self, image: np.ndarray, region: DocumentRegion) -> Dict:
        """Extract text from a specific region with confidence"""
        h, w = image.shape[:2]

        # Convert percentage coordinates to pixels
        x1 = int(w * region.coordinates[0] / 100)
        y1 = int(h * region.coordinates[1] / 100)
        x2 = int(w * region.coordinates[2] / 100)
        y2 = int(h * region.coordinates[3] / 100)

        # Extract region of interest
        roi = image[y1:y2, x1:x2]

        if roi.size == 0:
            return {'text': '', 'confidence': 0, 'raw_words': []}

        # Apply preprocessing based on region settings
        if region.preprocessing == 'high_contrast':
            roi_processed = self.preprocessor.preprocess_high_contrast(roi)
        elif region.preprocessing == 'receipt':
            roi_processed = self.preprocessor.preprocess_receipt(roi)
        else:
            roi_processed = self.preprocessor.preprocess_standard(roi)

        # Get Tesseract configuration
        config = self.get_tesseract_config(region)

        # Extract with detailed data
        try:
            data = pytesseract.image_to_data(
                roi_processed,
                output_type=pytesseract.Output.DICT,
                config=config
            )
        except Exception as e:
            return {'text': '', 'confidence': 0, 'error': str(e), 'raw_words': []}

        # Filter by confidence
        confident_words = []
        confidences = []

        for i, conf in enumerate(data['conf']):
            try:
                conf_val = int(conf)
            except:
                continue

            if conf_val > region.confidence_threshold * 100:
                word = str(data['text'][i]).strip()
                if word:
                    confident_words.append({
                        'text': word,
                        'confidence': conf_val / 100,
                        'bbox': (data['left'][i], data['top'][i],
                                data['width'][i], data['height'][i])
                    })
                    confidences.append(conf_val)

        extracted_text = ' '.join([w['text'] for w in confident_words])
        avg_confidence = sum(confidences) / len(confidences) / 100 if confidences else 0

        return {
            'text': extracted_text,
            'confidence': avg_confidence,
            'word_count': len(confident_words),
            'raw_words': confident_words
        }

    def process_document(self, image_path: str, template_name: str = 'romanian_receipt') -> Dict:
        """Process a document using specified template"""
        if template_name not in self.templates:
            # Fall back to full text extraction
            template_name = 'romanian_receipt'

        # Load image
        image = cv2.imread(image_path)
        if image is None:
            return {'success': False, 'error': f'Could not load image: {image_path}'}

        template = self.templates[template_name]

        results = {
            'success': True,
            'template': template_name,
            'document_type': template.document_type,
            'file': os.path.basename(image_path),
            'image_size': {'width': image.shape[1], 'height': image.shape[0]},
            'regions': {},
            'overall_confidence': 0,
            'parsed_data': {}
        }

        # Try multiple OCR strategies for better results
        best_text = ''
        best_confidence = 0
        best_result = None

        # Strategy 1: Standard extraction
        for region_name, region in template.regions.items():
            region_result = self.extract_region_text(image, region)
            results['regions'][region_name] = region_result

        # Strategy 2: Try different PSM modes for photos
        h, w = image.shape[:2]
        if h > 1500 or w > 1500:
            psm_modes = [6, 4, 3, 11]  # Different page segmentation modes
            for psm in psm_modes:
                try:
                    alt_result = self._extract_with_psm(image, psm)
                    if alt_result['confidence'] > best_confidence:
                        best_confidence = alt_result['confidence']
                        best_text = alt_result['text']
                        best_result = alt_result
                except:
                    continue

        # Use best result
        region_result = results['regions'].get('full_text', {})
        if best_result and best_confidence > region_result.get('confidence', 0):
            results['regions']['full_text'] = best_result

        confidences = [r.get('confidence', 0) for r in results['regions'].values() if r.get('confidence', 0) > 0]
        results['overall_confidence'] = sum(confidences) / len(confidences) if confidences else 0

        # Parse extracted data
        full_text = results['regions'].get('full_text', {}).get('text', '')
        if not full_text:
            full_text = ' '.join([r.get('text', '') for r in results['regions'].values()])

        results['parsed_data'] = self.parse_receipt_data(full_text)
        results['full_text'] = full_text

        return results

    def _extract_with_psm(self, image: np.ndarray, psm: int) -> Dict:
        """Extract text with specific page segmentation mode"""
        preprocessed = self.preprocessor.preprocess_receipt(image)
        config = f'--oem 3 --psm {psm} -l ron+eng'

        try:
            data = pytesseract.image_to_data(
                preprocessed,
                output_type=pytesseract.Output.DICT,
                config=config
            )
        except:
            return {'text': '', 'confidence': 0}

        confident_words = []
        confidences = []

        for i, conf in enumerate(data['conf']):
            try:
                conf_val = int(conf)
            except:
                continue
            if conf_val > 40:  # Lower threshold for challenging images
                word = str(data['text'][i]).strip()
                if word and len(word) > 1:
                    confident_words.append(word)
                    confidences.append(conf_val)

        return {
            'text': ' '.join(confident_words),
            'confidence': sum(confidences) / len(confidences) / 100 if confidences else 0,
            'word_count': len(confident_words)
        }

    def parse_receipt_data(self, text: str) -> Dict:
        """Parse receipt/invoice text to extract structured data"""
        data = {
            'vendor_name': None,
            'date': None,
            'time': None,
            'total': None,
            'subtotal': None,
            'tax': None,
            'tax_rate': None,
            'currency': 'RON',
            'receipt_number': None,
            'fiscal_code': None,
            'items': [],
            'payment_method': None,
            'client_name': None,
            'client_cui': None
        }

        # Clean and normalize text
        text_clean = self._clean_ocr_text(text)
        lines = [l.strip() for l in text_clean.split('\n') if l.strip()]

        # Extract vendor name - look for S.C., S.R.L., S.A. patterns
        vendor_patterns = [
            r'S\.?C\.?\s+([A-Z\s]+(?:S\.?R\.?L\.?|S\.?A\.?))',
            r'(OMV|PETROM|KAUFLAND|LIDL|MEGA\s*IMAGE|CARREFOUR|PROFI|PENNY)[A-Z\s]*',
            r'^([A-Z][A-Z\s]{3,}(?:S\.?R\.?L\.?|S\.?A\.?|INC|CO))',
        ]
        for pattern in vendor_patterns:
            match = re.search(pattern, text_clean, re.IGNORECASE)
            if match:
                data['vendor_name'] = match.group(1).strip() if match.group(1) else match.group(0).strip()
                break

        # If no vendor found, use first significant line
        if not data['vendor_name']:
            for line in lines[:5]:
                if len(line) > 5 and not re.match(r'^[\d\s.,:/-]+$', line):
                    data['vendor_name'] = line[:50]
                    break

        # Extract fiscal code (CUI/CIF) - before extracting totals to avoid confusion
        cui_patterns = [
            r'C\.?I\.?F\.?[:\s]*(?:RO)?(\d{6,10})',
            r'CUI[:\s]*(?:RO)?(\d{6,10})',
            r'COD\s+FISCAL[:\s]*(?:RO)?(\d{6,10})',
            r'(?:RO)(\d{8})\b',  # Romanian CUI format
        ]
        for pattern in cui_patterns:
            match = re.search(pattern, text_clean, re.IGNORECASE)
            if match:
                data['fiscal_code'] = match.group(1)
                break

        # Extract client info
        client_match = re.search(r'(?:NUME\s+)?CLIENT[:\s]*([A-Z\s]+(?:S\.?R\.?L\.?|S\.?A\.?)?)', text_clean, re.IGNORECASE)
        if client_match:
            data['client_name'] = client_match.group(1).strip()

        client_cui = re.search(r'CLIENT\s+C\.?U\.?I\.?[:\s/]*(?:RO)?(\d{6,10})', text_clean, re.IGNORECASE)
        if client_cui:
            data['client_cui'] = client_cui.group(1)

        # Extract date - look for Romanian format DD.MM.YYYY
        # First try exact patterns
        exact_date_patterns = [
            r'(\d{2})[./-](\d{2})[./-](\d{4})',  # DD.MM.YYYY
            r'(\d{4})[./-](\d{2})[./-](\d{2})',  # YYYY.MM.DD
        ]
        for pattern in exact_date_patterns:
            matches = re.findall(pattern, text_clean)
            for match in matches:
                try:
                    p1, p2, p3 = int(match[0]), int(match[1]), int(match[2])
                    if p1 > 1000:  # YYYY-MM-DD format
                        date_str = f"{p1}-{str(p2).zfill(2)}-{str(p3).zfill(2)}"
                    else:  # DD-MM-YYYY format
                        date_str = f"{p3}-{str(p2).zfill(2)}-{str(p1).zfill(2)}"
                    if self._is_valid_date(date_str):
                        data['date'] = date_str
                        break
                except:
                    continue
            if data['date']:
                break

        # Try fragmented patterns if no date found
        if not data['date']:
            # Special case: "025. 11.07" means 2025-11-07 (OCR dropped the "2")
            # Pattern looks for 025 or similar followed by month.day
            frag_patterns_special = [
                r'0?(\d{2,3})[.\s]+(\d{1,2})[.\s]+(\d{2})\s+\d{1,2}',  # 025. 11.07 17
                r'0(\d{2})[.\s]+(\d{1,2})\.(\d{2})\b',  # 025. 11.07
            ]
            for pat in frag_patterns_special:
                frag_match = re.search(pat, text_clean)
                if frag_match:
                    year_part = frag_match.group(1)
                    month = frag_match.group(2)
                    day = frag_match.group(3)
                    # Extract last 2 digits for year (025 -> 25 -> 2025, or 25 -> 25 -> 2025)
                    year = f"20{year_part[-2:]}"
                    date_str = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                    if self._is_valid_date(date_str):
                        data['date'] = date_str
                        break

            if not data['date']:
                frag_patterns = [
                    # Pattern: "07. 11. 2025" with spaces
                    (r'(\d{1,2})[./-]\s*(\d{1,2})[./-]\s*20(\d{2})', 'dmy'),
                    # Pattern: "2025. 11. 07"
                    (r'20(\d{2})[.\s]+(\d{1,2})[.\s]+(\d{1,2})', 'ymd'),
                ]
                for pattern, format_type in frag_patterns:
                    matches = re.findall(pattern, text_clean)
                    for match in matches:
                        try:
                            p1, p2, p3 = match[0], match[1], match[2]
                            if format_type == 'dmy':
                                date_str = f"20{p3}-{p2.zfill(2)}-{p1.zfill(2)}"
                            elif format_type == 'ymd':
                                date_str = f"20{p1}-{p2.zfill(2)}-{p3.zfill(2)}"
                            else:
                                continue
                            if self._is_valid_date(date_str):
                                data['date'] = date_str
                                break
                        except:
                            continue
                    if data['date']:
                        break

        # Extract time - prefer valid times (hour < 24)
        time_matches = re.findall(r'(\d{1,2}):(\d{2})(?::(\d{2}))?', text_clean)
        for match in time_matches:
            hour, minute = int(match[0]), int(match[1])
            if 0 <= hour <= 23 and 0 <= minute <= 59:
                if match[2]:
                    data['time'] = f"{match[0]}:{match[1]}:{match[2]}"
                else:
                    data['time'] = f"{match[0]}:{match[1]}"
                break

        # Extract total amount - IMPROVED for Romanian receipts
        # Look for TOTAL followed by a reasonable decimal amount (not year/ID)
        total_patterns = [
            r'TOTAL[S:\s]*(\d{1,6}[.,]\d{2})\s*(?:RON|LEI|A)?',
            r'TOTAL\s+(?:DE\s+)?PLATA[:\s]*(\d{1,6}[.,]\d{2})',
            r'CARTE\s+CREDIT[:\s]*(\d{1,6}[.,]\d{2})',
            r'SUMA[:\s]*(\d{1,6}[.,]\d{2})',
            r'DE\s+PLATA[:\s]*(\d{1,6}[.,]\d{2})',
            # Fragmented patterns for poor OCR
            r'(\d{2,3}[.,]\d{2})\s*(?:RON|LEI|A)\b',
            r'(\d{2,3}[.,]\d{2})\s*[xX*]\s*\d',  # Price near quantity
        ]

        total_candidates = []
        for pattern in total_patterns:
            matches = re.findall(pattern, text_clean, re.IGNORECASE)
            for match in matches:
                try:
                    amount = float(match.replace(',', '.'))
                    # Filter out unlikely totals (years like 2025, IDs like 1903289)
                    if 0.50 <= amount <= 9999.99 and not self._is_year_or_id(amount):
                        total_candidates.append(amount)
                except:
                    continue

        # If no total found yet, search for any reasonable decimal amount
        if not total_candidates:
            # Find all decimal amounts in text
            all_amounts = re.findall(r'(\d{2,4})[.,](\d{2})\b', text_clean)
            for parts in all_amounts:
                try:
                    amount = float(f"{parts[0]}.{parts[1]}")
                    if 5.0 <= amount <= 9999.99 and not self._is_year_or_id(amount):
                        total_candidates.append(amount)
                except:
                    continue

        if total_candidates:
            # Use the most common total (appears multiple times) or the largest reasonable one
            from collections import Counter
            total_counts = Counter(total_candidates)
            most_common = total_counts.most_common(1)[0]
            if most_common[1] > 1:
                data['total'] = most_common[0]
            else:
                # If no duplicates, find the most likely total (larger amounts more likely to be totals)
                valid_amounts = [a for a in total_candidates if 10 <= a <= 9999.99]
                if valid_amounts:
                    data['total'] = max(valid_amounts)
                elif total_candidates:
                    # Use largest amount found
                    data['total'] = max(total_candidates)

        # Extract TVA (tax) with amount validation
        tva_patterns = [
            r'TOTAL\s+TAXE[:\s]*(\d{1,6}[.,]\d{2})',
            r'TVA[:\s]*(\d{1,6}[.,]\d{2})',
            r'T\.?V\.?A\.?[:\s]*(\d{1,6}[.,]\d{2})',
            r'A-\d+[.,]?\d*%[:\s]*(\d{1,6}[.,]\d{2})',
        ]
        for pattern in tva_patterns:
            match = re.search(pattern, text_clean, re.IGNORECASE)
            if match:
                tax_amount = float(match.group(1).replace(',', '.'))
                if 0.01 <= tax_amount <= 99999.99:
                    data['tax'] = tax_amount
                    break

        # Extract tax rate
        rate_patterns = [
            r'A-(\d{1,2})[.,]?\d*%',
            r'(\d{1,2})\s*%\s*TVA',
            r'TVA\s*(\d{1,2})\s*%',
        ]
        for pattern in rate_patterns:
            match = re.search(pattern, text_clean, re.IGNORECASE)
            if match:
                rate = int(match.group(1))
                if 1 <= rate <= 30:  # Valid tax rates
                    data['tax_rate'] = rate
                    break

        # Extract receipt/fiscal number
        receipt_patterns = [
            r'NUMAR\s+TRANZACTIE[:\s]*(\d+)',
            r'NR\.?\s*POS[:\s]*(\d+)',
            r'BON\s+FISCAL\s*#?\s*(\d+)',
            r'(?:NR|NUMAR)[.:\s]*(\d{4,})',
        ]
        for pattern in receipt_patterns:
            match = re.search(pattern, text_clean, re.IGNORECASE)
            if match:
                data['receipt_number'] = match.group(1)
                break

        # Detect payment method
        text_upper = text_clean.upper()
        if any(word in text_upper for word in ['VISA', 'MASTERCARD', 'CONTACTLESS', 'CARD', 'POS', 'CREDIT']):
            data['payment_method'] = 'card'
        elif any(word in text_upper for word in ['NUMERAR', 'CASH', 'BANI']):
            data['payment_method'] = 'cash'

        # Extract line items with quantity and unit price
        item_patterns = [
            # Pattern: "* 8 OMV MAXXMOTION DIESEL ARCTIC 28.0691 L X 8.53 239,43"
            r'\*?\s*\d*\s*([A-Z][A-Z\s]+)\s+(\d+[.,]\d+)\s*L?\s*[xX*]\s*(\d+[.,]\d+)\s+(\d+[.,]\d+)',
            # Pattern: "Product name    123,45"
            r'^([A-Za-z][A-Za-z\s]{2,30}?)\s{2,}(\d{1,6}[.,]\d{2})\s*$',
        ]

        for line in lines:
            for pattern in item_patterns:
                match = re.match(pattern, line.strip())
                if match:
                    groups = match.groups()
                    if len(groups) == 4:  # With quantity and unit price
                        item_name = groups[0].strip()
                        quantity = float(groups[1].replace(',', '.'))
                        unit_price = float(groups[2].replace(',', '.'))
                        total_price = float(groups[3].replace(',', '.'))
                        if not self._is_excluded_item(item_name):
                            data['items'].append({
                                'name': item_name,
                                'quantity': quantity,
                                'unit_price': unit_price,
                                'price': total_price
                            })
                    elif len(groups) == 2:  # Just name and price
                        item_name = groups[0].strip()
                        item_price = float(groups[1].replace(',', '.'))
                        if not self._is_excluded_item(item_name) and 0.01 <= item_price <= 9999.99:
                            data['items'].append({
                                'name': item_name,
                                'price': item_price
                            })
                    break

        return data

    def _clean_ocr_text(self, text: str) -> str:
        """Clean OCR artifacts and normalize text"""
        # Replace common OCR errors
        replacements = [
            (r'[|l](?=\d)', '1'),  # | or l before digit -> 1
            (r'(?<=\d)[|l]', '1'),  # | or l after digit -> 1
            (r'O(?=\d)', '0'),  # O before digit -> 0
            (r'(?<=\d)O', '0'),  # O after digit -> 0
            (r'\s+', ' '),  # Multiple spaces -> single space
        ]
        result = text
        for pattern, replacement in replacements:
            result = re.sub(pattern, replacement, result)
        return result

    def _is_year_or_id(self, amount: float) -> bool:
        """Check if amount looks like a year or transaction ID"""
        int_amount = int(amount)
        # Years (1900-2099)
        if 1900 <= int_amount <= 2099:
            return True
        # Large transaction IDs (6+ digits with no decimals that aren't .00)
        if int_amount >= 100000 and amount == float(int_amount):
            return True
        return False

    def _is_valid_date(self, date_str: str) -> bool:
        """Validate date string"""
        if not date_str:
            return False
        try:
            parts = date_str.split('-')
            if len(parts) != 3:
                return False
            year, month, day = int(parts[0]), int(parts[1]), int(parts[2])
            return 2000 <= year <= 2030 and 1 <= month <= 12 and 1 <= day <= 31
        except:
            return False

    def _is_excluded_item(self, name: str) -> bool:
        """Check if item name should be excluded from items list"""
        excluded = ['TOTAL', 'TVA', 'SUMA', 'PLATA', 'REST', 'TAXE', 'SUBTOTAL',
                   'CREDIT', 'DEBIT', 'CASIER', 'NUMERAR', 'CARD', 'BON', 'FISCAL']
        name_upper = name.upper()
        return any(word in name_upper for word in excluded)

    def _normalize_date(self, date_str: str) -> str:
        """Normalize date string to YYYY-MM-DD format"""
        date_str = date_str.replace('/', '-').replace('.', '-')
        parts = date_str.split('-')

        if len(parts) != 3:
            return date_str

        # Determine format
        if len(parts[0]) == 4:
            # YYYY-MM-DD
            return date_str
        elif len(parts[2]) == 4:
            # DD-MM-YYYY
            return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
        else:
            # DD-MM-YY
            year = '20' + parts[2] if int(parts[2]) < 50 else '19' + parts[2]
            return f"{year}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"

    def process_batch(self, image_paths: List[str], template_name: str = 'romanian_receipt') -> List[Dict]:
        """Process multiple documents"""
        results = []
        for path in image_paths:
            result = self.process_document(path, template_name)
            results.append(result)
        return results


class DataValidator:
    """Validate and clean extracted data"""

    @staticmethod
    def validate_date(date_str: str) -> bool:
        if not date_str:
            return False
        try:
            datetime.strptime(date_str, '%Y-%m-%d')
            return True
        except:
            return False

    @staticmethod
    def validate_amount(amount) -> bool:
        if amount is None:
            return False
        try:
            float(amount)
            return True
        except:
            return False

    @staticmethod
    def clean_text(text: str, data_type: str = 'text') -> str:
        if not text:
            return ''

        cleaners = {
            'number': lambda x: re.sub(r'[^\d.,]', '', x),
            'currency': lambda x: re.sub(r'[^\d.,]', '', x),
            'date': lambda x: re.sub(r'[^\d./-]', '', x),
            'phone': lambda x: re.sub(r'[^\d+()-]', '', x),
            'text': lambda x: ' '.join(x.split())
        }

        cleaner = cleaners.get(data_type, cleaners['text'])
        return cleaner(text)


def main():
    """CLI interface for OCR processing"""
    import argparse

    parser = argparse.ArgumentParser(description='Advanced OCR Document Processor')
    parser.add_argument('image', help='Path to image file')
    parser.add_argument('--template', '-t', default='romanian_receipt', help='Template name')
    parser.add_argument('--output', '-o', help='Output JSON file')
    parser.add_argument('--templates-dir', help='Templates directory')

    args = parser.parse_args()

    # Initialize processor
    processor = AdvancedOCRProcessor(args.templates_dir)

    # Process document
    result = processor.process_document(args.image, args.template)

    # Output
    output_json = json.dumps(result, indent=2, ensure_ascii=False)

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output_json)
        print(f"Results saved to {args.output}")
    else:
        print(output_json)

    return 0 if result.get('success') else 1


if __name__ == '__main__':
    sys.exit(main())
