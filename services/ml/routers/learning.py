"""
Adaptive Learning Router - AI-powered course recommendations and learning paths
"""

from datetime import datetime
from typing import List, Optional, Dict
import random
from collections import defaultdict

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from loguru import logger

router = APIRouter()


# Learning style types
LEARNING_STYLES = ["visual", "auditory", "reading", "kinesthetic"]

# Topic relationships for Romanian accounting
TOPIC_PREREQUISITES = {
    "e-factura-avansat": ["e-factura-bazele", "xml-ubl"],
    "saft-raportare": ["contabilitate-bazele", "plan-conturi"],
    "tva-avansat": ["tva-bazele", "facturare"],
    "bilant-analiza": ["contabilitate-bazele", "registre"],
    "optimizare-fiscala": ["impozit-profit", "impozit-micro", "tva-bazele"],
}

# Topic difficulty progression
TOPIC_PROGRESSION = {
    "beginner": [
        "contabilitate-bazele",
        "facturare-electronica",
        "tva-bazele",
        "declaratii-fiscale",
    ],
    "intermediate": [
        "e-factura-implementare",
        "saft-d406",
        "contabilitate-stocuri",
        "analiza-financiara",
    ],
    "advanced": [
        "optimizare-fiscala",
        "audit-intern",
        "consolidare-financiara",
        "ifrs-adoptare",
    ],
}


class UserProfile(BaseModel):
    """User learning profile."""
    user_id: str
    completed_courses: List[str] = Field(default=[])
    completed_lessons: List[str] = Field(default=[])
    quiz_scores: Dict[str, float] = Field(default={})
    time_spent_minutes: int = Field(default=0)
    preferred_difficulty: str = Field(default="beginner")
    learning_style: Optional[str] = Field(default=None)
    weak_topics: List[str] = Field(default=[])
    strong_topics: List[str] = Field(default=[])


class CourseInfo(BaseModel):
    """Course information for recommendations."""
    course_id: str
    title: str
    category: str
    difficulty: str
    topics: List[str] = Field(default=[])
    duration_minutes: int = Field(default=60)
    prerequisites: List[str] = Field(default=[])


class RecommendationRequest(BaseModel):
    """Request for course recommendations."""
    user_profile: UserProfile
    available_courses: List[CourseInfo]
    max_recommendations: int = Field(default=5, ge=1, le=20)
    include_reasons: bool = Field(default=True)


class CourseRecommendation(BaseModel):
    """Individual course recommendation."""
    course_id: str
    title: str
    score: float
    reasons: List[str]
    estimated_completion_days: int
    difficulty_match: str
    prerequisites_met: bool


class RecommendationResult(BaseModel):
    """Recommendation results."""
    recommendations: List[CourseRecommendation]
    learning_path: List[str]
    skill_gaps: List[str]
    next_milestone: str
    generated_at: datetime


class QuizAnalysisRequest(BaseModel):
    """Request for quiz performance analysis."""
    user_id: str
    lesson_id: str
    questions: List[dict]
    answers: List[dict]
    time_spent_seconds: int


class QuizAnalysisResult(BaseModel):
    """Quiz analysis result."""
    score: float
    passed: bool
    weak_topics: List[str]
    strong_topics: List[str]
    recommendations: List[str]
    review_needed: bool
    estimated_mastery: float


class LearningPathRequest(BaseModel):
    """Request for personalized learning path."""
    user_profile: UserProfile
    goal: str  # e.g., "e-factura-expert", "contabil-certificat", "saft-specialist"
    available_time_weekly_hours: int = Field(default=5)
    target_completion_weeks: int = Field(default=12)


class LearningPath(BaseModel):
    """Personalized learning path."""
    goal: str
    total_courses: int
    total_duration_hours: int
    weekly_schedule: List[dict]
    milestones: List[dict]
    estimated_completion_date: str


def calculate_course_score(
    course: CourseInfo,
    profile: UserProfile,
) -> tuple[float, List[str]]:
    """Calculate recommendation score for a course."""
    score = 0.0
    reasons = []

    # Skip completed courses
    if course.course_id in profile.completed_courses:
        return 0.0, ["Curs deja completat"]

    # Difficulty match
    difficulty_order = ["beginner", "intermediate", "advanced"]
    user_level = difficulty_order.index(profile.preferred_difficulty) if profile.preferred_difficulty in difficulty_order else 0
    course_level = difficulty_order.index(course.difficulty) if course.difficulty in difficulty_order else 0

    if course_level == user_level:
        score += 30
        reasons.append("Nivel de dificultate potrivit")
    elif course_level == user_level + 1:
        score += 20
        reasons.append("Provocare moderată - nivel următor")
    elif course_level < user_level:
        score += 5
        reasons.append("Curs de recapitulare")
    else:
        score -= 10
        reasons.append("Prea avansat momentan")

    # Check prerequisites
    prerequisites_met = True
    for prereq in course.prerequisites:
        if prereq not in profile.completed_courses:
            prerequisites_met = False
            score -= 15
            reasons.append(f"Necesită: {prereq}")
            break

    if prerequisites_met and course.prerequisites:
        score += 20
        reasons.append("Toate prerequisitele îndeplinite")

    # Weak topic coverage
    for topic in course.topics:
        if topic in profile.weak_topics:
            score += 15
            reasons.append(f"Acoperă punct slab: {topic}")
            break

    # Category preference based on history
    if any(course.category in c for c in profile.completed_courses):
        score += 10
        reasons.append("În categoria preferată")

    # Time investment bonus for shorter courses
    if course.duration_minutes <= 60:
        score += 5
        reasons.append("Curs scurt - ușor de finalizat")

    # Engagement bonus
    if profile.time_spent_minutes > 0:
        avg_completion_rate = len(profile.completed_courses) / max(1, profile.time_spent_minutes / 60)
        if avg_completion_rate > 0.5:
            score += 10
            reasons.append("Rata bună de finalizare")

    return max(0, score), reasons


def generate_learning_path(
    goal: str,
    profile: UserProfile,
    available_hours: int,
) -> List[dict]:
    """Generate a personalized learning path."""
    paths = {
        "e-factura-expert": [
            {"course": "Introducere în e-Factura", "week": 1, "hours": 2},
            {"course": "XML și UBL 2.1", "week": 2, "hours": 3},
            {"course": "Integrare ANAF API", "week": 3, "hours": 4},
            {"course": "Automatizare e-Factura", "week": 4, "hours": 3},
            {"course": "Debugging și Erori", "week": 5, "hours": 2},
        ],
        "contabil-certificat": [
            {"course": "Bazele Contabilității", "week": 1, "hours": 4},
            {"course": "Plan de Conturi", "week": 2, "hours": 3},
            {"course": "Înregistrări Contabile", "week": 3, "hours": 4},
            {"course": "TVA și Fiscalitate", "week": 4, "hours": 4},
            {"course": "Bilanț și Raportare", "week": 5, "hours": 4},
            {"course": "SAF-T D406", "week": 6, "hours": 3},
        ],
        "saft-specialist": [
            {"course": "Introducere SAF-T", "week": 1, "hours": 2},
            {"course": "Structura Fișierului SAF-T", "week": 2, "hours": 4},
            {"course": "MasterFiles și Date de Bază", "week": 3, "hours": 3},
            {"course": "GeneralLedgerEntries", "week": 4, "hours": 4},
            {"course": "Validare și Transmitere", "week": 5, "hours": 3},
        ],
    }

    return paths.get(goal, paths["contabil-certificat"])


def identify_skill_gaps(profile: UserProfile) -> List[str]:
    """Identify skill gaps based on quiz performance."""
    gaps = []

    # Check for low scores in specific topics
    for topic, score in profile.quiz_scores.items():
        if score < 0.6:
            gaps.append(topic)

    # Add weak topics
    for topic in profile.weak_topics:
        if topic not in gaps:
            gaps.append(topic)

    # Check progression gaps
    for difficulty in ["beginner", "intermediate"]:
        expected_topics = TOPIC_PROGRESSION.get(difficulty, [])
        for topic in expected_topics:
            if topic not in profile.strong_topics and topic not in gaps:
                gaps.append(topic)

    return gaps[:5]  # Return top 5 gaps


@router.post("/recommend", response_model=RecommendationResult)
async def get_recommendations(request: RecommendationRequest):
    """
    Get personalized course recommendations based on user profile.

    Considers:
    - Completed courses and lessons
    - Quiz performance
    - Learning style
    - Difficulty preferences
    - Prerequisites
    """
    try:
        recommendations = []

        for course in request.available_courses:
            score, reasons = calculate_course_score(course, request.user_profile)

            if score > 0:
                # Estimate completion time
                daily_minutes = 30  # Assume 30 min/day
                estimated_days = max(1, course.duration_minutes // daily_minutes)

                recommendations.append(CourseRecommendation(
                    course_id=course.course_id,
                    title=course.title,
                    score=round(score, 2),
                    reasons=reasons if request.include_reasons else [],
                    estimated_completion_days=estimated_days,
                    difficulty_match="potrivit" if score > 50 else "provocare",
                    prerequisites_met=all(
                        p in request.user_profile.completed_courses
                        for p in course.prerequisites
                    ),
                ))

        # Sort by score
        recommendations.sort(key=lambda x: x.score, reverse=True)
        recommendations = recommendations[:request.max_recommendations]

        # Generate learning path
        learning_path = [r.course_id for r in recommendations[:3]]

        # Identify skill gaps
        skill_gaps = identify_skill_gaps(request.user_profile)

        # Next milestone
        completed_count = len(request.user_profile.completed_courses)
        milestones = ["Începător", "Practicant", "Competent", "Expert", "Master"]
        next_milestone = milestones[min(completed_count // 3, 4)]

        return RecommendationResult(
            recommendations=recommendations,
            learning_path=learning_path,
            skill_gaps=skill_gaps,
            next_milestone=next_milestone,
            generated_at=datetime.now(),
        )

    except Exception as e:
        logger.error(f"Recommendation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-quiz", response_model=QuizAnalysisResult)
async def analyze_quiz_performance(request: QuizAnalysisRequest):
    """
    Analyze quiz performance and provide learning recommendations.

    Identifies:
    - Strong and weak topics
    - Areas needing review
    - Personalized suggestions
    """
    try:
        correct = 0
        weak_topics = []
        strong_topics = []
        topic_scores = defaultdict(list)

        for i, (question, answer) in enumerate(zip(request.questions, request.answers)):
            is_correct = answer.get("selected") == question.get("correct_answer")
            topic = question.get("topic", "general")

            if is_correct:
                correct += 1
                topic_scores[topic].append(1)
            else:
                topic_scores[topic].append(0)

        # Calculate score
        total = len(request.questions)
        score = correct / total if total > 0 else 0
        passed = score >= 0.7

        # Identify weak and strong topics
        for topic, scores in topic_scores.items():
            avg_score = sum(scores) / len(scores)
            if avg_score < 0.6:
                weak_topics.append(topic)
            elif avg_score >= 0.8:
                strong_topics.append(topic)

        # Generate recommendations
        recommendations = []
        if not passed:
            recommendations.append("Revizuiți lecția înainte de a continua")
        if weak_topics:
            recommendations.append(f"Concentrați-vă pe: {', '.join(weak_topics)}")
        if request.time_spent_seconds < len(request.questions) * 30:
            recommendations.append("Încercați să alocați mai mult timp pentru fiecare întrebare")

        # Estimate mastery
        estimated_mastery = score * 0.7 + (0.3 if passed else 0)

        return QuizAnalysisResult(
            score=round(score, 2),
            passed=passed,
            weak_topics=weak_topics,
            strong_topics=strong_topics,
            recommendations=recommendations,
            review_needed=not passed or len(weak_topics) > 0,
            estimated_mastery=round(estimated_mastery, 2),
        )

    except Exception as e:
        logger.error(f"Quiz analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/learning-path", response_model=LearningPath)
async def generate_personalized_path(request: LearningPathRequest):
    """
    Generate a personalized learning path based on goals and availability.
    """
    try:
        weekly_schedule = generate_learning_path(
            request.goal,
            request.user_profile,
            request.available_time_weekly_hours,
        )

        total_courses = len(weekly_schedule)
        total_hours = sum(item["hours"] for item in weekly_schedule)

        # Generate milestones
        milestones = [
            {"week": 1, "milestone": "Completare introducere", "reward": "Badge Începător"},
            {"week": total_courses // 2, "milestone": "Jumătate din parcurs", "reward": "Badge Dedicat"},
            {"week": total_courses, "milestone": "Finalizare curs", "reward": f"Certificat {request.goal}"},
        ]

        # Calculate estimated completion
        weeks_needed = max(request.target_completion_weeks, total_courses)
        completion_date = datetime.now()
        from datetime import timedelta
        completion_date += timedelta(weeks=weeks_needed)

        return LearningPath(
            goal=request.goal,
            total_courses=total_courses,
            total_duration_hours=total_hours,
            weekly_schedule=weekly_schedule,
            milestones=milestones,
            estimated_completion_date=completion_date.strftime("%Y-%m-%d"),
        )

    except Exception as e:
        logger.error(f"Learning path error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect-style")
async def detect_learning_style(
    quiz_responses: List[dict],
):
    """
    Detect user's learning style based on preferences quiz.

    Returns one of: visual, auditory, reading, kinesthetic
    """
    try:
        style_scores = {style: 0 for style in LEARNING_STYLES}

        for response in quiz_responses:
            style = response.get("style")
            if style in style_scores:
                style_scores[style] += response.get("score", 1)

        # Find dominant style
        dominant_style = max(style_scores, key=style_scores.get)

        # Calculate percentages
        total = sum(style_scores.values()) or 1
        style_percentages = {
            style: round((score / total) * 100, 1)
            for style, score in style_scores.items()
        }

        return {
            "dominant_style": dominant_style,
            "style_percentages": style_percentages,
            "recommendations": get_style_recommendations(dominant_style),
        }

    except Exception as e:
        logger.error(f"Learning style detection error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


def get_style_recommendations(style: str) -> List[str]:
    """Get learning recommendations based on style."""
    recommendations = {
        "visual": [
            "Preferați cursuri cu diagrame și infografice",
            "Folosiți mind maps pentru a organiza informațiile",
            "Vizualizați procesele contabile ca diagrame de flux",
        ],
        "auditory": [
            "Ascultați lecțiile audio în timpul navetei",
            "Participați la webinarii live",
            "Discutați conceptele cu colegii",
        ],
        "reading": [
            "Citiți documentația oficială ANAF",
            "Faceți notițe în timpul cursurilor",
            "Creați rezumate scrise ale lecțiilor",
        ],
        "kinesthetic": [
            "Exersați cu exemple practice",
            "Folosiți simulatoare e-Factura",
            "Aplicați imediat cunoștințele în situații reale",
        ],
    }

    return recommendations.get(style, recommendations["reading"])


@router.get("/stats/{user_id}")
async def get_learning_stats(user_id: str):
    """
    Get learning statistics for a user.
    """
    # In production, this would fetch from database
    return {
        "user_id": user_id,
        "total_courses_completed": 4,
        "total_lessons_completed": 23,
        "total_time_spent_hours": 12.5,
        "average_quiz_score": 0.82,
        "current_streak_days": 7,
        "longest_streak_days": 14,
        "badges_earned": ["Începător", "Dedicat", "e-Factura Basic"],
        "certificates": ["Introducere e-Factura"],
        "skill_level": "Intermediate",
        "weekly_goal_progress": 0.75,
    }
