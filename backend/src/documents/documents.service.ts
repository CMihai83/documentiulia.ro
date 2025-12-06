import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private prisma: PrismaService) {}

  async uploadDocument(userId: string, file: { filename: string; url: string; type: string; size: number }) {
    return this.prisma.document.create({
      data: {
        userId,
        filename: file.filename,
        fileUrl: file.url,
        fileType: file.type,
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
}
