import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private prisma: PrismaService) {}

  async uploadDocument(
    userId: string,
    file: {
      filename: string;
      originalname: string;
      mimetype: string;
      size: number;
      path: string;
    },
  ) {
    return this.prisma.document.create({
      data: {
        userId,
        filename: file.originalname,
        fileUrl: `/uploads/documents/${file.filename}`,
        fileType: file.mimetype,
        fileSize: file.size,
        status: 'PENDING',
      },
    });
  }

  async processWithOCR(documentId: string, ocrData: any) {
    // In production, this would call LayoutLMv3 or similar
    return this.prisma.document.update({
      where: { id: documentId },
      data: {
        status: 'COMPLETED',
        ocrData,
        extractedText: ocrData.text,
        confidence: ocrData.confidence,
        processedAt: new Date(),
      },
    });
  }

  async getDocuments(userId: string) {
    return this.prisma.document.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocument(id: string) {
    return this.prisma.document.findUnique({
      where: { id },
    });
  }

  async deleteDocument(id: string) {
    this.logger.log(`Deleting document ${id} (GDPR request)`);
    await this.prisma.document.delete({
      where: { id },
    });
    return { success: true, message: 'Document deleted permanently' };
  }

  async getDocumentStats(userId: string) {
    const [total, byStatus] = await Promise.all([
      this.prisma.document.count({ where: { userId } }),
      this.prisma.document.groupBy({
        by: ['status'],
        where: { userId },
        _count: true,
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => ({
          ...acc,
          [item.status.toLowerCase()]: item._count,
        }),
        {},
      ),
    };
  }

  /**
   * Get active uploads with progress tracking
   */
  async getUploadProgress(userId: string) {
    const activeUploads = await this.prisma.document.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        filename: true,
        fileType: true,
        fileSize: true,
        status: true,
        createdAt: true,
        processedAt: true,
        confidence: true,
      },
    });

    // Calculate progress for each document
    const uploads = activeUploads.map((doc) => {
      let progress = 0;
      let stage = 'uploading';
      let estimatedTimeRemaining: number | null = null;

      if (doc.status === 'PENDING') {
        progress = 25;
        stage = 'queued';
        estimatedTimeRemaining = 30; // seconds
      } else if (doc.status === 'PROCESSING') {
        progress = 60;
        stage = 'ocr_processing';
        estimatedTimeRemaining = 15; // seconds
      }

      return {
        ...doc,
        progress,
        stage,
        estimatedTimeRemaining,
        elapsedTime: Math.floor((Date.now() - new Date(doc.createdAt).getTime()) / 1000),
      };
    });

    // Get recent completed/failed documents (last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const recentCompleted = await this.prisma.document.findMany({
      where: {
        userId,
        status: { in: ['COMPLETED', 'FAILED'] },
        processedAt: { gte: fiveMinutesAgo },
      },
      orderBy: { processedAt: 'desc' },
      take: 10,
      select: {
        id: true,
        filename: true,
        fileType: true,
        fileSize: true,
        status: true,
        createdAt: true,
        processedAt: true,
        confidence: true,
      },
    });

    const completed = recentCompleted.map((doc) => ({
      ...doc,
      progress: 100,
      stage: doc.status === 'COMPLETED' ? 'completed' : 'failed',
      processingTime: doc.processedAt
        ? Math.floor((new Date(doc.processedAt).getTime() - new Date(doc.createdAt).getTime()) / 1000)
        : null,
    }));

    return {
      activeUploads: uploads,
      recentCompleted: completed,
      summary: {
        pending: uploads.filter((u) => u.status === 'PENDING').length,
        processing: uploads.filter((u) => u.status === 'PROCESSING').length,
        completedRecently: completed.filter((c) => c.status === 'COMPLETED').length,
        failedRecently: completed.filter((c) => c.status === 'FAILED').length,
      },
    };
  }

  /**
   * Update document processing status
   */
  async updateProcessingStatus(
    documentId: string,
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED',
    data?: {
      ocrData?: any;
      extractedText?: string;
      confidence?: number;
      error?: string;
    },
  ) {
    const updateData: any = { status };

    if (status === 'COMPLETED' || status === 'FAILED') {
      updateData.processedAt = new Date();
    }

    if (data?.ocrData) updateData.ocrData = data.ocrData;
    if (data?.extractedText) updateData.extractedText = data.extractedText;
    if (data?.confidence) updateData.confidence = data.confidence;

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: updateData,
    });

    this.logger.log(`Document ${documentId} status updated to ${status}`);
    return updated;
  }

  /**
   * Batch upload multiple documents
   */
  async batchUpload(
    userId: string,
    files: Array<{
      filename: string;
      originalname: string;
      mimetype: string;
      size: number;
      path: string;
    }>,
  ) {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const results = [];

    for (const file of files) {
      const doc = await this.prisma.document.create({
        data: {
          userId,
          filename: file.originalname,
          fileUrl: `/uploads/documents/${file.filename}`,
          fileType: file.mimetype,
          fileSize: file.size,
          status: 'PENDING',
          ocrData: { batchId },
        },
      });
      results.push(doc);
    }

    this.logger.log(`Batch upload ${batchId}: ${files.length} files queued`);

    return {
      batchId,
      totalFiles: files.length,
      documents: results,
      status: 'queued',
    };
  }

  /**
   * Get batch upload status
   */
  async getBatchStatus(userId: string, batchId: string) {
    const documents = await this.prisma.document.findMany({
      where: {
        userId,
        ocrData: {
          path: ['batchId'],
          equals: batchId,
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (documents.length === 0) {
      return null;
    }

    const statusCounts = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
    };

    documents.forEach((doc) => {
      statusCounts[doc.status.toLowerCase() as keyof typeof statusCounts]++;
    });

    const totalProgress = documents.reduce((sum, doc) => {
      if (doc.status === 'COMPLETED') return sum + 100;
      if (doc.status === 'FAILED') return sum + 100;
      if (doc.status === 'PROCESSING') return sum + 60;
      return sum + 25; // PENDING
    }, 0);

    return {
      batchId,
      totalFiles: documents.length,
      progress: Math.round(totalProgress / documents.length),
      statusCounts,
      isComplete: statusCounts.pending === 0 && statusCounts.processing === 0,
      documents: documents.map((doc) => ({
        id: doc.id,
        filename: doc.filename,
        status: doc.status,
        confidence: doc.confidence,
      })),
    };
  }
}
