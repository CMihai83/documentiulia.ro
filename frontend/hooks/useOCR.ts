'use client';

import { useState, useCallback } from 'react';
import { api } from '@/lib/api';

// Types matching backend DTOs
export enum DocumentType {
  INVOICE = 'INVOICE',
  RECEIPT = 'RECEIPT',
  CONTRACT = 'CONTRACT',
  OTHER = 'OTHER',
}

export enum OCRStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED',
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ExtractedField {
  fieldName: string;
  value?: string;
  confidence: number;
  boundingBox?: BoundingBox;
}

export interface ExtractedInvoiceFields {
  invoiceNumber?: ExtractedField;
  invoiceDate?: ExtractedField;
  dueDate?: ExtractedField;
  supplierName?: ExtractedField;
  supplierCui?: ExtractedField;
  supplierAddress?: ExtractedField;
  customerName?: ExtractedField;
  customerCui?: ExtractedField;
  customerAddress?: ExtractedField;
  netAmount?: ExtractedField;
  vatRate?: ExtractedField;
  vatAmount?: ExtractedField;
  grossAmount?: ExtractedField;
  currency?: ExtractedField;
  receiptNumber?: ExtractedField;
  cashRegisterNo?: ExtractedField;
  contractNumber?: ExtractedField;
  effectiveDate?: ExtractedField;
  [key: string]: ExtractedField | undefined;
}

export interface OCRResult {
  documentId: string;
  status: OCRStatus;
  templateId?: string;
  documentType: DocumentType;
  overallConfidence: number;
  fields: ExtractedInvoiceFields;
  rawText?: string;
  processingTimeMs?: number;
  errorMessage?: string;
}

export interface ProcessOCROptions {
  templateId?: string;
  documentType?: DocumentType;
  language?: string;
}

export interface CorrectedField {
  fieldName: string;
  originalValue?: string;
  correctedValue: string;
}

export interface CorrectOCRRequest {
  corrections: CorrectedField[];
  saveAsTemplate?: boolean;
  templateName?: string;
}

export interface OCRTemplate {
  id: string;
  name: string;
  description?: string;
  documentType: DocumentType;
  language: string;
  zones?: Record<string, BoundingBox>;
  aiPrompt?: string;
  matchPatterns?: Record<string, string>;
  isSystem: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  description?: string;
  documentType: DocumentType;
  language?: string;
  zones?: Record<string, BoundingBox>;
  aiPrompt?: string;
  matchPatterns?: Record<string, string>;
}

// Hook for OCR processing
export function useOCRProcess() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OCRResult | null>(null);

  const processDocument = useCallback(async (documentId: string, options?: ProcessOCROptions) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<OCRResult>(`/ocr/process/${documentId}`, options || {});
      if (response.error || !response.data) {
        throw new Error(response.error || 'OCR processing failed');
      }
      setResult(response.data);
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OCR processing failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const processBatch = useCallback(async (documentIds: string[], templateId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<OCRResult[]>('/ocr/process-batch', { documentIds, templateId });
      if (response.error || !response.data) {
        throw new Error(response.error || 'Batch OCR processing failed');
      }
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Batch OCR processing failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { processDocument, processBatch, loading, error, result };
}

// Hook for checking OCR status
export function useOCRStatus() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStatus = useCallback(async (documentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<{ status: OCRStatus; result?: OCRResult }>(`/ocr/status/${documentId}`);
      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to get OCR status');
      }
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get OCR status';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { getStatus, loading, error };
}

// Hook for submitting corrections
export function useOCRCorrections() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitCorrections = useCallback(async (documentId: string, corrections: CorrectOCRRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/ocr/correct/${documentId}`, corrections);
      if (response.error) {
        throw new Error(response.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit corrections';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const convertToInvoice = useCallback(async (documentId: string, options?: { customerId?: string; partnerId?: string; asDraft?: boolean }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(`/ocr/convert-to-invoice/${documentId}`, options || {});
      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to convert to invoice');
      }
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to convert to invoice';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { submitCorrections, convertToInvoice, loading, error };
}

// Hook for template management
export function useTemplates() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<OCRTemplate[]>([]);

  const fetchTemplates = useCallback(async (documentType?: DocumentType, language?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (documentType) params.append('documentType', documentType);
      if (language) params.append('language', language);
      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get<OCRTemplate[]>(`/templates${query}`);
      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to fetch templates');
      }
      setTemplates(response.data);
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch templates';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getTemplate = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<OCRTemplate>(`/templates/${id}`);
      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to get template');
      }
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get template';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (template: CreateTemplateRequest) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<OCRTemplate>('/templates', template);
      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to create template');
      }
      const newTemplate = response.data;
      setTemplates(prev => [...prev, newTemplate]);
      return newTemplate;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create template';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateTemplate = useCallback(async (id: string, updates: Partial<CreateTemplateRequest>) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.put<OCRTemplate>(`/templates/${id}`, updates);
      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to update template');
      }
      const updatedTemplate = response.data;
      setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t));
      return updatedTemplate;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update template';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTemplate = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.delete(`/templates/${id}`);
      if (response.error) {
        throw new Error(response.error);
      }
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete template';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const autoMatchTemplate = useCallback(async (documentId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post<{ template: OCRTemplate | null; confidence: number }>('/templates/auto-match', { documentId });
      if (response.error || !response.data) {
        throw new Error(response.error || 'Failed to auto-match template');
      }
      return response.data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to auto-match template';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    templates,
    fetchTemplates,
    getTemplate,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    autoMatchTemplate,
    loading,
    error,
  };
}
