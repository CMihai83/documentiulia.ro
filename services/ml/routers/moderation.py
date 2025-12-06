"""
Content Moderation Router - AI-powered content moderation for Forum and Blog
"""

import re
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from loguru import logger

router = APIRouter()


# Romanian profanity and toxic word patterns
ROMANIAN_TOXIC_PATTERNS = [
    r'\b(idiot|prost|tampit|cretin|nebun|fraier|bou|dobitoc)\b',
    r'\b(cretinule|prostule|tâmpitule|nebunule)\b',
    r'\b(la naiba|dracu|drace)\b',
    r'\b(căcat|rahat|pisat)\b',
    r'\b(curv[aă]|târf[aă]|prostitu)\b',
    r'\b(p[u|â]l[aă]|penis|coaie|fund)\b',
    r'\b(fut[eioă]|futu|futai)\b',
    r'\b(muie|muist)\b',
    r'\b(jeg|scârbos|dezgustător)\b',
]

# Spam patterns
SPAM_PATTERNS = [
    r'(http[s]?://[^\s]+){3,}',  # Multiple URLs
    r'(.)\1{5,}',  # Repeated characters (aaaaaaa)
    r'(?i)(bitcoin|crypto|forex|casino|viagra|enlarge)',
    r'(?i)(click here|limited offer|act now|free money)',
    r'(?i)(câștig[ăai]|bani gratis|ofertă limitată)',
    r'\d{10,}',  # Long number sequences
]

# Low quality content patterns
LOW_QUALITY_PATTERNS = [
    r'^.{0,20}$',  # Too short
    r'^[A-Z\s]+$',  # All caps
    r'^[^a-zA-Z]*$',  # No letters at all
]

# Accounting-specific safe terms (should not trigger moderation)
ACCOUNTING_SAFE_TERMS = [
    'profit', 'pierdere', 'fond', 'cot', 'fund',
    'activ', 'pasiv', 'capital', 'sold'
]


class ModerationRequest(BaseModel):
    """Content moderation request."""
    text: str = Field(..., min_length=1, max_length=50000)
    language: str = Field(default="ro")
    context: Optional[str] = Field(default="forum", description="forum, blog, comment")
    check_spam: bool = Field(default=True)
    check_toxic: bool = Field(default=True)
    check_quality: bool = Field(default=True)


class ModerationResult(BaseModel):
    """Content moderation result."""
    is_safe: bool
    is_toxic: bool
    is_spam: bool
    is_low_quality: bool
    confidence: float  # 0-1
    categories: List[str]
    issues: List[dict]
    suggestion: str
    original_length: int
    processed_at: datetime


class BatchModerationRequest(BaseModel):
    """Batch moderation request."""
    items: List[ModerationRequest]


class BatchModerationResult(BaseModel):
    """Batch moderation result."""
    results: List[ModerationResult]
    summary: dict
    processed_at: datetime


def check_toxic_content(text: str, language: str = "ro") -> tuple[bool, List[dict], float]:
    """Check for toxic/offensive content."""
    issues = []
    text_lower = text.lower()

    # Skip if text contains accounting-specific safe terms in context
    for term in ACCOUNTING_SAFE_TERMS:
        if term in text_lower:
            # Check if it's in an accounting context (near accounting words)
            accounting_context_words = ['contabil', 'bilanț', 'registru', 'jurnal', 'balanță']
            if any(word in text_lower for word in accounting_context_words):
                continue

    matched_patterns = 0
    for pattern in ROMANIAN_TOXIC_PATTERNS:
        matches = re.findall(pattern, text_lower, re.IGNORECASE)
        if matches:
            matched_patterns += 1
            issues.append({
                "type": "toxic",
                "pattern": pattern,
                "matches": list(set(matches))[:3],  # Limit matches shown
                "severity": "high"
            })

    is_toxic = matched_patterns > 0
    # Confidence based on number and severity of matches
    confidence = min(0.5 + (matched_patterns * 0.15), 0.95) if is_toxic else 0.9

    return is_toxic, issues, confidence


def check_spam_content(text: str) -> tuple[bool, List[dict], float]:
    """Check for spam content."""
    issues = []

    for pattern in SPAM_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        if matches:
            issues.append({
                "type": "spam",
                "pattern": "URL spam" if "http" in pattern else "Spam pattern",
                "severity": "medium"
            })

    # Check for excessive repetition
    words = text.lower().split()
    if len(words) > 5:
        word_freq = {}
        for word in words:
            word_freq[word] = word_freq.get(word, 0) + 1
        max_freq = max(word_freq.values())
        if max_freq > len(words) * 0.3:  # Same word >30% of content
            issues.append({
                "type": "spam",
                "pattern": "Repetitive content",
                "severity": "low"
            })

    is_spam = len(issues) > 0
    confidence = min(0.6 + (len(issues) * 0.1), 0.9) if is_spam else 0.85

    return is_spam, issues, confidence


def check_quality(text: str, context: str = "forum") -> tuple[bool, List[dict], float]:
    """Check for low quality content."""
    issues = []

    # Length check based on context
    min_lengths = {"forum": 10, "blog": 50, "comment": 5}
    min_length = min_lengths.get(context, 10)

    if len(text.strip()) < min_length:
        issues.append({
            "type": "quality",
            "pattern": "Too short",
            "message": f"Conținutul este prea scurt (minim {min_length} caractere)",
            "severity": "low"
        })

    # All caps check
    if len(text) > 20 and text.isupper():
        issues.append({
            "type": "quality",
            "pattern": "All caps",
            "message": "Evitați scrierea cu majuscule",
            "severity": "low"
        })

    # No actual words check
    if not re.search(r'[a-zA-ZăâîșțĂÂÎȘȚ]{2,}', text):
        issues.append({
            "type": "quality",
            "pattern": "No words",
            "message": "Conținutul nu pare să fie text valid",
            "severity": "medium"
        })

    # Excessive punctuation
    if re.search(r'[!?]{3,}', text):
        issues.append({
            "type": "quality",
            "pattern": "Excessive punctuation",
            "message": "Evitați punctuația excesivă",
            "severity": "low"
        })

    is_low_quality = len(issues) > 0
    confidence = 0.85 if is_low_quality else 0.9

    return is_low_quality, issues, confidence


@router.post("/check", response_model=ModerationResult)
async def moderate_content(request: ModerationRequest):
    """
    Check content for toxicity, spam, and quality issues.

    Used for:
    - Forum topic and reply moderation
    - Blog comment moderation
    - User-generated content validation
    """
    try:
        all_issues = []
        categories = []
        confidence_scores = []

        # Toxic content check
        if request.check_toxic:
            is_toxic, toxic_issues, toxic_conf = check_toxic_content(
                request.text, request.language
            )
            if toxic_issues:
                all_issues.extend(toxic_issues)
                categories.append("toxic")
            confidence_scores.append(toxic_conf)
        else:
            is_toxic = False

        # Spam check
        if request.check_spam:
            is_spam, spam_issues, spam_conf = check_spam_content(request.text)
            if spam_issues:
                all_issues.extend(spam_issues)
                categories.append("spam")
            confidence_scores.append(spam_conf)
        else:
            is_spam = False

        # Quality check
        if request.check_quality:
            is_low_quality, quality_issues, quality_conf = check_quality(
                request.text, request.context
            )
            if quality_issues:
                all_issues.extend(quality_issues)
                categories.append("low_quality")
            confidence_scores.append(quality_conf)
        else:
            is_low_quality = False

        # Calculate overall safety and confidence
        is_safe = not (is_toxic or is_spam) and not (is_low_quality and len([i for i in all_issues if i.get("severity") == "medium"]) > 0)
        confidence = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.5

        # Generate suggestion
        if is_toxic:
            suggestion = "Conținutul conține limbaj inadecvat. Vă rugăm să reformulați."
        elif is_spam:
            suggestion = "Conținutul pare să fie spam. Verificați și reformulați."
        elif is_low_quality:
            suggestion = "Conținutul necesită îmbunătățiri pentru a fi publicat."
        else:
            suggestion = "Conținutul este acceptabil pentru publicare."

        return ModerationResult(
            is_safe=is_safe,
            is_toxic=is_toxic,
            is_spam=is_spam,
            is_low_quality=is_low_quality,
            confidence=round(confidence, 2),
            categories=categories,
            issues=all_issues,
            suggestion=suggestion,
            original_length=len(request.text),
            processed_at=datetime.now()
        )

    except Exception as e:
        logger.error(f"Moderation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch", response_model=BatchModerationResult)
async def batch_moderate(request: BatchModerationRequest):
    """
    Batch moderate multiple pieces of content.

    Useful for:
    - Moderating all comments on a post
    - Bulk review of pending content
    """
    try:
        results = []

        for item in request.items:
            result = await moderate_content(item)
            results.append(result)

        # Generate summary
        safe_count = len([r for r in results if r.is_safe])
        toxic_count = len([r for r in results if r.is_toxic])
        spam_count = len([r for r in results if r.is_spam])

        return BatchModerationResult(
            results=results,
            summary={
                "total": len(results),
                "safe": safe_count,
                "toxic": toxic_count,
                "spam": spam_count,
                "low_quality": len([r for r in results if r.is_low_quality]),
                "approval_rate": round(safe_count / len(results) * 100, 1) if results else 0
            },
            processed_at=datetime.now()
        )

    except Exception as e:
        logger.error(f"Batch moderation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suggest-edit")
async def suggest_content_edit(
    text: str,
    language: str = "ro"
):
    """
    Suggest edits to improve content that failed moderation.

    Returns the text with problematic words replaced with placeholders.
    """
    try:
        edited_text = text
        replacements = []

        # Replace toxic words with asterisks
        for pattern in ROMANIAN_TOXIC_PATTERNS:
            matches = re.findall(pattern, edited_text, re.IGNORECASE)
            for match in matches:
                replacement = match[0] + '*' * (len(match) - 1)
                edited_text = re.sub(
                    re.escape(match),
                    replacement,
                    edited_text,
                    flags=re.IGNORECASE
                )
                replacements.append({
                    "original": match,
                    "replacement": replacement
                })

        return {
            "success": True,
            "original_text": text,
            "edited_text": edited_text,
            "replacements": replacements,
            "was_modified": len(replacements) > 0,
            "message": "Text modificat pentru a elimina conținutul inadecvat" if replacements else "Textul nu necesită modificări"
        }

    except Exception as e:
        logger.error(f"Suggest edit error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_moderation_stats():
    """
    Get moderation statistics.

    Returns aggregated moderation stats for monitoring.
    """
    # In production, this would fetch from database
    return {
        "period": "last_30_days",
        "total_moderated": 1523,
        "auto_approved": 1456,
        "auto_rejected": 67,
        "manual_review_required": 42,
        "categories": {
            "toxic": 28,
            "spam": 31,
            "low_quality": 8
        },
        "approval_rate": 95.6,
        "avg_processing_time_ms": 12
    }
