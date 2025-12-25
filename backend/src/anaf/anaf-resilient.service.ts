/**
 * Resilient ANAF API Service with Circuit Breaker and Retry Logic
 * Sprint 41: Add Retry Mechanism for ANAF API
 *
 * Implements exponential backoff, circuit breaker pattern, and offline queuing
 * to handle ANAF API rate limits and downtime gracefully.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

// Circuit Breaker States
export enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Blocking requests
  HALF_OPEN = 'HALF_OPEN', // Testing recovery
}

// Request Types
export enum ANAFRequestType {
  CUI_VALIDATION = 'CUI_VALIDATION',
  SAFT_SUBMISSION = 'SAFT_SUBMISSION',
  EFACTURA_UPLOAD = 'EFACTURA_UPLOAD',
  EFACTURA_STATUS = 'EFACTURA_STATUS',
  SPV_DOWNLOAD = 'SPV_DOWNLOAD',
}

// Request Priority
export enum RequestPriority {
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
}

// Interfaces
export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeMs: number;
  halfOpenRequests: number;
}

export interface QueuedRequest {
  id: string;
  type: ANAFRequestType;
  priority: RequestPriority;
  payload: any;
  retryCount: number;
  createdAt: Date;
  lastAttemptAt?: Date;
  error?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface ANAFResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  retryCount: number;
  requestId: string;
  circuitState: CircuitState;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureAt?: Date;
  lastSuccessAt?: Date;
  nextRetryAt?: Date;
}

export interface RequestLog {
  id: string;
  type: ANAFRequestType;
  status: 'success' | 'failure' | 'retry';
  duration: number;
  retryCount: number;
  error?: string;
  timestamp: Date;
}

@Injectable()
export class ANAFResilientService implements OnModuleInit {
  private readonly logger = new Logger(ANAFResilientService.name);

  // Axios instance with interceptors
  private axiosInstance: AxiosInstance;

  // Circuit breaker state
  private circuitState: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureAt?: Date;
  private lastSuccessAt?: Date;
  private circuitOpenedAt?: Date;
  private halfOpenAttempts: number = 0;

  // Request queue for offline mode
  private requestQueue: Map<string, QueuedRequest> = new Map();
  private processingQueue: boolean = false;

  // Request logging
  private requestLogs: RequestLog[] = [];
  private requestIdCounter: number = 0;

  // Configuration
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelayMs: 1000,
    maxDelayMs: 30000,
    retryableStatuses: [408, 429, 500, 502, 503, 504],
  };

  private circuitConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeMs: 60000, // 1 minute
    halfOpenRequests: 3,
  };

  constructor(
    private configService: ConfigService,
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeAxiosInstance();
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('ANAF Resilient Service initialized');
    this.startQueueProcessor();
  }

  /**
   * Initialize Axios with retry interceptors
   */
  private initializeAxiosInstance(): void {
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Response interceptor for error handling
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.recordSuccess();
        return response;
      },
      async (error: AxiosError) => {
        this.recordFailure(error);
        throw error;
      },
    );
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `anaf-${++this.requestIdCounter}-${Date.now()}`;
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateDelay(retryCount: number): number {
    const delay = this.retryConfig.baseDelayMs * Math.pow(2, retryCount);
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    return Math.min(delay + jitter, this.retryConfig.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: AxiosError): boolean {
    if (!error.response) {
      // Network errors are retryable
      return true;
    }

    return this.retryConfig.retryableStatuses.includes(error.response.status);
  }

  /**
   * Record successful request
   */
  private recordSuccess(): void {
    this.successCount++;
    this.lastSuccessAt = new Date();

    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.circuitConfig.halfOpenRequests) {
        this.closeCircuit();
      }
    }
  }

  /**
   * Record failed request
   */
  private recordFailure(error: AxiosError): void {
    this.failureCount++;
    this.lastFailureAt = new Date();

    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.openCircuit();
    } else if (this.circuitState === CircuitState.CLOSED) {
      if (this.failureCount >= this.circuitConfig.failureThreshold) {
        this.openCircuit();
      }
    }
  }

  /**
   * Open circuit breaker
   */
  private openCircuit(): void {
    this.circuitState = CircuitState.OPEN;
    this.circuitOpenedAt = new Date();
    this.halfOpenAttempts = 0;

    this.logger.warn('Circuit breaker OPENED - ANAF API requests blocked');

    this.eventEmitter.emit('anaf.circuit.opened', {
      failureCount: this.failureCount,
      lastFailureAt: this.lastFailureAt,
    });

    // Schedule recovery check
    setTimeout(() => {
      this.tryHalfOpen();
    }, this.circuitConfig.recoveryTimeMs);
  }

  /**
   * Try half-open state
   */
  private tryHalfOpen(): void {
    if (this.circuitState === CircuitState.OPEN) {
      this.circuitState = CircuitState.HALF_OPEN;
      this.halfOpenAttempts = 0;
      this.logger.log('Circuit breaker HALF-OPEN - Testing ANAF API');

      this.eventEmitter.emit('anaf.circuit.half_open', {});
    }
  }

  /**
   * Close circuit breaker
   */
  private closeCircuit(): void {
    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    this.halfOpenAttempts = 0;

    this.logger.log('Circuit breaker CLOSED - ANAF API available');

    this.eventEmitter.emit('anaf.circuit.closed', {
      recoveryTime: Date.now() - (this.circuitOpenedAt?.getTime() || 0),
    });

    // Process queued requests
    this.processQueue();
  }

  /**
   * Check if circuit allows requests
   */
  private canMakeRequest(): boolean {
    if (this.circuitState === CircuitState.CLOSED) {
      return true;
    }

    if (this.circuitState === CircuitState.HALF_OPEN) {
      return this.halfOpenAttempts < this.circuitConfig.halfOpenRequests;
    }

    return false;
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<T>,
    requestType: ANAFRequestType,
    requestId: string,
  ): Promise<ANAFResponse<T>> {
    let retryCount = 0;
    let lastError: Error | null = null;

    while (retryCount <= this.retryConfig.maxRetries) {
      // Check circuit breaker
      if (!this.canMakeRequest()) {
        return {
          success: false,
          error: 'Circuit breaker is open - ANAF API temporarily unavailable',
          retryCount,
          requestId,
          circuitState: this.circuitState,
        };
      }

      const startTime = Date.now();

      try {
        const data = await requestFn();

        // Log success
        this.logRequest(requestId, requestType, 'success', Date.now() - startTime, retryCount);

        return {
          success: true,
          data,
          retryCount,
          requestId,
          circuitState: this.circuitState,
        };
      } catch (error) {
        lastError = error;
        const axiosError = error as AxiosError;

        // Log failure/retry
        this.logRequest(
          requestId,
          requestType,
          retryCount < this.retryConfig.maxRetries ? 'retry' : 'failure',
          Date.now() - startTime,
          retryCount,
          axiosError.message,
        );

        // Check if retryable
        if (!this.isRetryableError(axiosError)) {
          break;
        }

        retryCount++;

        if (retryCount <= this.retryConfig.maxRetries) {
          const delay = this.calculateDelay(retryCount);
          this.logger.warn(
            `ANAF ${requestType} failed, retrying in ${delay}ms (attempt ${retryCount}/${this.retryConfig.maxRetries})`,
          );
          await this.sleep(delay);
        }
      }
    }

    return {
      success: false,
      error: lastError?.message || 'Unknown error',
      retryCount,
      requestId,
      circuitState: this.circuitState,
    };
  }

  /**
   * Log request for monitoring
   */
  private logRequest(
    id: string,
    type: ANAFRequestType,
    status: 'success' | 'failure' | 'retry',
    duration: number,
    retryCount: number,
    error?: string,
  ): void {
    const log: RequestLog = {
      id,
      type,
      status,
      duration,
      retryCount,
      error,
      timestamp: new Date(),
    };

    this.requestLogs.push(log);

    // Keep only last 1000 logs
    if (this.requestLogs.length > 1000) {
      this.requestLogs = this.requestLogs.slice(-1000);
    }

    // Emit event for monitoring
    this.eventEmitter.emit('anaf.request.logged', log);
  }

  /**
   * Add request to offline queue
   */
  async queueRequest(
    type: ANAFRequestType,
    payload: any,
    priority: RequestPriority = RequestPriority.MEDIUM,
  ): Promise<string> {
    const id = this.generateRequestId();

    const queuedRequest: QueuedRequest = {
      id,
      type,
      priority,
      payload,
      retryCount: 0,
      createdAt: new Date(),
      status: 'pending',
    };

    this.requestQueue.set(id, queuedRequest);

    this.logger.log(`Request ${id} queued for type ${type}`);

    // Try to process immediately if circuit is closed
    if (this.circuitState === CircuitState.CLOSED) {
      this.processQueue();
    }

    return id;
  }

  /**
   * Process queued requests
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.requestQueue.size === 0) {
      return;
    }

    if (!this.canMakeRequest()) {
      this.logger.debug('Queue processing skipped - circuit is open');
      return;
    }

    this.processingQueue = true;

    try {
      // Sort by priority and creation time
      const sortedRequests = Array.from(this.requestQueue.values())
        .filter(r => r.status === 'pending')
        .sort((a, b) => {
          if (a.priority !== b.priority) {
            return a.priority - b.priority;
          }
          return a.createdAt.getTime() - b.createdAt.getTime();
        });

      for (const request of sortedRequests) {
        if (!this.canMakeRequest()) {
          break;
        }

        request.status = 'processing';
        request.lastAttemptAt = new Date();
        this.requestQueue.set(request.id, request);

        // Process based on type
        const result = await this.processQueuedRequest(request);

        if (result.success) {
          request.status = 'completed';
          this.requestQueue.delete(request.id);
        } else {
          request.retryCount++;
          request.error = result.error;

          if (request.retryCount >= this.retryConfig.maxRetries) {
            request.status = 'failed';
          } else {
            request.status = 'pending';
          }
          this.requestQueue.set(request.id, request);
        }

        // Small delay between queued requests
        await this.sleep(500);
      }
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Process individual queued request
   */
  private async processQueuedRequest(request: QueuedRequest): Promise<ANAFResponse> {
    switch (request.type) {
      case ANAFRequestType.CUI_VALIDATION:
        return this.validateCUI(request.payload.cui);

      case ANAFRequestType.SAFT_SUBMISSION:
        return this.submitSAFT(
          request.payload.xml,
          request.payload.cui,
          request.payload.period,
        );

      case ANAFRequestType.EFACTURA_UPLOAD:
        return this.uploadEFactura(
          request.payload.xml,
          request.payload.cui,
        );

      default:
        return {
          success: false,
          error: `Unknown request type: ${request.type}`,
          retryCount: 0,
          requestId: request.id,
          circuitState: this.circuitState,
        };
    }
  }

  /**
   * Start background queue processor
   */
  private startQueueProcessor(): void {
    // Process queue every 30 seconds
    setInterval(() => {
      this.processQueue();
    }, 30000);
  }

  // =================== PUBLIC API METHODS ===================

  /**
   * Validate Romanian CUI with retry
   */
  async validateCUI(cui: string): Promise<ANAFResponse<{
    valid: boolean;
    company?: { name: string; address: string; vatPayer: boolean };
  }>> {
    const requestId = this.generateRequestId();

    return this.executeWithRetry(
      async () => {
        const response = await this.axiosInstance.post(
          'https://webservicesp.anaf.ro/PlatitorTvaRest/api/v8/ws/tva',
          [{ cui: parseInt(cui.replace(/\D/g, '')), data: new Date().toISOString().split('T')[0] }],
        );

        const data = response.data.found?.[0];
        if (data) {
          return {
            valid: true,
            company: {
              name: data.denumire,
              address: data.adresa,
              vatPayer: data.scpTVA,
            },
          };
        }

        return { valid: false };
      },
      ANAFRequestType.CUI_VALIDATION,
      requestId,
    );
  }

  /**
   * Submit SAF-T D406 with retry
   */
  async submitSAFT(
    xml: string,
    cui: string,
    period: string,
  ): Promise<ANAFResponse<{ reference: string; status: string }>> {
    const requestId = this.generateRequestId();
    const apiKey = this.configService.get('ANAF_API_KEY');
    const spvUrl = this.configService.get('ANAF_SPV_URL') || 'https://api.anaf.ro/spv';

    return this.executeWithRetry(
      async () => {
        const response = await this.axiosInstance.post(
          `${spvUrl}/d406/upload`,
          xml,
          {
            params: { cif: cui, perioada: period },
            headers: {
              'Content-Type': 'application/xml',
              Authorization: `Bearer ${apiKey}`,
            },
          },
        );

        return {
          reference: response.data.indexIncarcare || response.data.id,
          status: 'submitted',
        };
      },
      ANAFRequestType.SAFT_SUBMISSION,
      requestId,
    );
  }

  /**
   * Upload e-Factura with retry
   */
  async uploadEFactura(
    xml: string,
    cui: string,
  ): Promise<ANAFResponse<{ uploadIndex: string; status: string }>> {
    const requestId = this.generateRequestId();
    const apiKey = this.configService.get('ANAF_API_KEY');
    const efacturaUrl = this.configService.get('ANAF_EFACTURA_URL') || 'https://api.anaf.ro/efactura';

    return this.executeWithRetry(
      async () => {
        const response = await this.axiosInstance.post(
          `${efacturaUrl}/upload`,
          xml,
          {
            params: { cif: cui, standard: 'UBL' },
            headers: {
              'Content-Type': 'application/xml',
              Authorization: `Bearer ${apiKey}`,
            },
          },
        );

        return {
          uploadIndex: response.data.index_incarcare,
          status: response.data.stare || 'uploaded',
        };
      },
      ANAFRequestType.EFACTURA_UPLOAD,
      requestId,
    );
  }

  /**
   * Get e-Factura status with retry
   */
  async getEFacturaStatus(
    uploadIndex: string,
    cui: string,
  ): Promise<ANAFResponse<{ status: string; message?: string; downloadId?: string }>> {
    const requestId = this.generateRequestId();
    const apiKey = this.configService.get('ANAF_API_KEY');
    const efacturaUrl = this.configService.get('ANAF_EFACTURA_URL') || 'https://api.anaf.ro/efactura';

    return this.executeWithRetry(
      async () => {
        const response = await this.axiosInstance.get(
          `${efacturaUrl}/status/${uploadIndex}`,
          {
            params: { cif: cui },
            headers: {
              Authorization: `Bearer ${apiKey}`,
            },
          },
        );

        return {
          status: response.data.stare,
          message: response.data.mesaj,
          downloadId: response.data.id_descarcare,
        };
      },
      ANAFRequestType.EFACTURA_STATUS,
      requestId,
    );
  }

  // =================== MONITORING & STATS ===================

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats(): CircuitBreakerStats {
    return {
      state: this.circuitState,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureAt: this.lastFailureAt,
      lastSuccessAt: this.lastSuccessAt,
      nextRetryAt: this.circuitState === CircuitState.OPEN && this.circuitOpenedAt
        ? new Date(this.circuitOpenedAt.getTime() + this.circuitConfig.recoveryTimeMs)
        : undefined,
    };
  }

  /**
   * Get request logs
   */
  getRequestLogs(limit: number = 100): RequestLog[] {
    return this.requestLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get queued requests
   */
  getQueuedRequests(): QueuedRequest[] {
    return Array.from(this.requestQueue.values());
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): {
    total: number;
    pending: number;
    processing: number;
    failed: number;
  } {
    const requests = Array.from(this.requestQueue.values());
    return {
      total: requests.length,
      pending: requests.filter(r => r.status === 'pending').length,
      processing: requests.filter(r => r.status === 'processing').length,
      failed: requests.filter(r => r.status === 'failed').length,
    };
  }

  /**
   * Force close circuit breaker (admin only)
   */
  forceCloseCircuit(): void {
    this.closeCircuit();
    this.logger.warn('Circuit breaker force closed by admin');
  }

  /**
   * Update retry configuration
   */
  updateRetryConfig(config: Partial<RetryConfig>): void {
    this.retryConfig = { ...this.retryConfig, ...config };
    this.logger.log('Retry configuration updated');
  }

  /**
   * Update circuit breaker configuration
   */
  updateCircuitConfig(config: Partial<CircuitBreakerConfig>): void {
    this.circuitConfig = { ...this.circuitConfig, ...config };
    this.logger.log('Circuit breaker configuration updated');
  }
}
