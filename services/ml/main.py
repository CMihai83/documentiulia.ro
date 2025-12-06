"""
DocumentIulia.ro ML Service
FastAPI service for Receipt OCR and Document Processing
"""

import os
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from loguru import logger

from routers import ocr, forecast, anomaly, document_ai, forecasting, ai_assistant, moderation, content, learning, fiscal_alerts, treaty_optimizer, esg_calculator, dividend_forecaster, rag_assistant, micro_saft, hr_intelligence, eu_funds, blog
from services.ocr_service import OCRService
from config import settings

# Configure logging
logger.add(
    "logs/ml_service.log",
    rotation="10 MB",
    retention="7 days",
    level="INFO"
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown."""
    # Startup
    logger.info("Starting ML Service...")

    # Initialize OCR service
    app.state.ocr_service = OCRService()
    await app.state.ocr_service.initialize()

    logger.info("ML Service started successfully")

    yield

    # Shutdown
    logger.info("Shutting down ML Service...")


# Create FastAPI app
app = FastAPI(
    title="DocumentIulia ML Service",
    description="AI/ML services for receipt OCR, forecasting, and anomaly detection",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(ocr.router, prefix="/api/v1/ocr", tags=["OCR"])
app.include_router(forecast.router, prefix="/api/v1/forecast", tags=["Forecasting"])
app.include_router(anomaly.router, prefix="/api/v1/anomaly", tags=["Anomaly Detection"])
app.include_router(document_ai.router, prefix="/api/v1/document-ai", tags=["Document AI"])
app.include_router(forecasting.router, prefix="/api/v1/forecasting", tags=["Financial Forecasting"])
app.include_router(ai_assistant.router, prefix="/api/v1/assistant", tags=["AI Assistant"])
app.include_router(moderation.router, prefix="/api/v1/moderation", tags=["Content Moderation"])
app.include_router(content.router, prefix="/api/v1/content", tags=["Content Generation"])
app.include_router(learning.router, prefix="/api/v1/learning", tags=["Adaptive Learning"])
app.include_router(fiscal_alerts.router, prefix="/api/v1/fiscal", tags=["Fiscal Alerts"])
app.include_router(treaty_optimizer.router, prefix="/api/v1/treaties", tags=["Treaty Optimizer"])
app.include_router(esg_calculator.router, prefix="/api/v1/esg", tags=["ESG Calculator"])
app.include_router(dividend_forecaster.router, prefix="/api/v1/dividends", tags=["Dividend Forecaster"])
app.include_router(rag_assistant.router, prefix="/api/v1/rag", tags=["RAG Assistant"])
app.include_router(micro_saft.router, prefix="/api/v1/micro-saft", tags=["Micro SAF-T"])
app.include_router(hr_intelligence.router, prefix="/api/v1/hr", tags=["HR Intelligence"])
app.include_router(eu_funds.router, prefix="/api/v1/funds", tags=["EU Funds"])
app.include_router(blog.router, prefix="/api/v1/blog", tags=["Blog AI"])


# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "documentiulia-ml",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "DocumentIulia ML Service",
        "version": "3.0.0",
        "endpoints": {
            "ocr": "/api/v1/ocr",
            "forecast": "/api/v1/forecast",
            "anomaly": "/api/v1/anomaly",
            "document_ai": "/api/v1/document-ai",
            "forecasting": "/api/v1/forecasting",
            "assistant": "/api/v1/assistant",
            "moderation": "/api/v1/moderation",
            "content": "/api/v1/content",
            "learning": "/api/v1/learning",
            "fiscal": "/api/v1/fiscal",
            "treaties": "/api/v1/treaties",
            "esg": "/api/v1/esg",
            "dividends": "/api/v1/dividends",
            "rag": "/api/v1/rag",
            "micro-saft": "/api/v1/micro-saft",
            "hr": "/api/v1/hr",
            "funds": "/api/v1/funds",
            "blog": "/api/v1/blog",
        },
        "docs": "/docs",
        "features": [
            "LayoutLMv3 Document Understanding",
            "Prophet Financial Forecasting",
            "RAG AI Assistant for Romanian Fiscal Law",
            "2026 Fiscal Reform Alerts & ANAF Scraper",
            "Treaty Optimizer (UK/Andorra/Cyprus)",
            "ESG Calculator & Carbon Footprint",
            "Dividend & Excise Tax Forecaster (2026 10% compliance)",
            "Treaty/AIC RAG Knowledge Base Q&A",
            "Micro SAF-T D406 Generator for PFA/PFI",
            "AI HR ATS with 99% Match Accuracy & Bias-Free Hiring",
            "EU Funds Scanner (PNRR, Cohesion, InvestEU)",
            "AI Blog Generator with SEO & Content Calendar"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
