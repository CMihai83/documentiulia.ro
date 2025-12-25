import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FileValidationPipe, DocumentFileValidator } from '../common/pipes/file-validation.pipe';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Multer configuration for secure file uploads
const multerConfig = {
  storage: diskStorage({
    destination: './uploads/documents',
    filename: (req, file, callback) => {
      // Generate secure filename
      const uniqueSuffix = uuidv4();
      const ext = extname(file.originalname).toLowerCase();
      callback(null, `${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
    files: 1,
  },
  fileFilter: (
    req: Express.Request,
    file: Express.Multer.File,
    callback: (error: Error | null, acceptFile: boolean) => void,
  ) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
    ];
    if (allowedMimes.includes(file.mimetype)) {
      callback(null, true);
    } else {
      callback(new BadRequestException('Invalid file type'), false);
    }
  },
};

@ApiTags('documents')
@ApiBearerAuth()
@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.USER, UserRole.ADMIN, UserRole.ACCOUNTANT)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload document for OCR processing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Document file (PDF, JPEG, PNG, TIFF)',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', multerConfig))
  async upload(
    @UploadedFile(DocumentFileValidator) file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    return this.documentsService.uploadDocument(userId, {
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
    });
  }

  @Post(':id/ocr')
  @ApiOperation({ summary: 'Process document with OCR' })
  async processOCR(@Param('id') id: string, @Body() ocrData: any) {
    return this.documentsService.processWithOCR(id, ocrData);
  }

  @Get()
  @ApiOperation({ summary: 'Get all documents' })
  async getDocuments(@Query('userId') userId: string) {
    return this.documentsService.getDocuments(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  async getDocument(@Param('id') id: string) {
    return this.documentsService.getDocument(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete document (GDPR)' })
  async deleteDocument(@Param('id') id: string) {
    return this.documentsService.deleteDocument(id);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get document statistics' })
  async getDocumentStats(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }
    return this.documentsService.getDocumentStats(userId);
  }

  @Get('upload-progress')
  @ApiOperation({ summary: 'Get active upload progress and recent completions' })
  async getUploadProgress(@Request() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }
    return this.documentsService.getUploadProgress(userId);
  }

  @Post('batch-upload')
  @ApiOperation({ summary: 'Upload multiple documents at once' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
          description: 'Multiple document files (max 10)',
        },
      },
    },
  })
  @UseInterceptors(FilesInterceptor('files', 10, multerConfig))
  async batchUpload(
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: any,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    const fileData = files.map((file) => ({
      filename: file.filename,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
    }));

    return this.documentsService.batchUpload(userId, fileData);
  }

  @Get('batch/:batchId')
  @ApiOperation({ summary: 'Get batch upload status' })
  async getBatchStatus(@Request() req: any, @Param('batchId') batchId: string) {
    const userId = req.user?.id;
    if (!userId) {
      throw new BadRequestException('User ID required');
    }

    const status = await this.documentsService.getBatchStatus(userId, batchId);
    if (!status) {
      throw new NotFoundException('Batch not found');
    }
    return status;
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update document processing status' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
        },
        ocrData: { type: 'object' },
        extractedText: { type: 'string' },
        confidence: { type: 'number' },
        error: { type: 'string' },
      },
      required: ['status'],
    },
  })
  async updateStatus(
    @Param('id') id: string,
    @Body()
    body: {
      status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
      ocrData?: any;
      extractedText?: string;
      confidence?: number;
      error?: string;
    },
  ) {
    return this.documentsService.updateProcessingStatus(id, body.status, {
      ocrData: body.ocrData,
      extractedText: body.extractedText,
      confidence: body.confidence,
      error: body.error,
    });
  }
}
