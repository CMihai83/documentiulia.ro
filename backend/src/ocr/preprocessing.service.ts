import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument } from 'pdf-lib';

export interface PreprocessingOptions {
  deskew?: boolean;
  enhanceContrast?: boolean;
  removeNoise?: boolean;
  resize?: { width?: number; height?: number };
  outputFormat?: 'jpeg' | 'png';
}

export interface PreprocessedResult {
  outputPath: string;
  width: number;
  height: number;
  format: string;
  pages?: number;
}

@Injectable()
export class PreprocessingService {
  private readonly logger = new Logger(PreprocessingService.name);
  private readonly uploadDir = process.env.UPLOAD_DIR || '/tmp/ocr-uploads';

  constructor() {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async preprocessImage(
    inputPath: string,
    options: PreprocessingOptions = {},
  ): Promise<PreprocessedResult> {
    const ext = path.extname(inputPath).toLowerCase();

    // Handle PDF files
    if (ext === '.pdf') {
      return this.extractPdfFirstPage(inputPath, options);
    }

    // Handle image files
    const outputFormat = options.outputFormat || 'jpeg';
    const outputName = `processed_${Date.now()}.${outputFormat}`;
    const outputPath = path.join(this.uploadDir, outputName);

    try {
      let pipeline = sharp(inputPath);

      // Auto-rotate based on EXIF
      pipeline = pipeline.rotate();

      // Enhance contrast if requested
      if (options.enhanceContrast) {
        pipeline = pipeline.normalize();
      }

      // Remove noise with mild blur + sharpen
      if (options.removeNoise) {
        pipeline = pipeline.blur(0.5).sharpen();
      }

      // Resize if specified
      if (options.resize) {
        pipeline = pipeline.resize(options.resize.width, options.resize.height, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Convert to grayscale for better OCR (optional)
      // pipeline = pipeline.grayscale();

      // Output
      if (outputFormat === 'jpeg') {
        pipeline = pipeline.jpeg({ quality: 90 });
      } else {
        pipeline = pipeline.png();
      }

      await pipeline.toFile(outputPath);

      // Get metadata
      const metadata = await sharp(outputPath).metadata();

      this.logger.log(`Preprocessed image: ${inputPath} -> ${outputPath}`);

      return {
        outputPath,
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: outputFormat,
      };
    } catch (error) {
      this.logger.error(`Image preprocessing failed: ${error.message}`);
      throw new BadRequestException(`Failed to preprocess image: ${error.message}`);
    }
  }

  async extractPdfFirstPage(
    pdfPath: string,
    options: PreprocessingOptions = {},
  ): Promise<PreprocessedResult> {
    try {
      const pdfBytes = fs.readFileSync(pdfPath);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pageCount = pdfDoc.getPageCount();

      if (pageCount === 0) {
        throw new BadRequestException('PDF has no pages');
      }

      // For PDF, we need to render to image
      // pdf-lib doesn't render, so we return info and let OCR handle the PDF directly
      // In production, you'd use pdf-poppler or similar

      this.logger.log(`PDF has ${pageCount} pages`);

      // For now, return the PDF path and let Claude Vision handle it
      // Claude can process PDFs directly as of recent updates

      return {
        outputPath: pdfPath,
        width: 0,
        height: 0,
        format: 'pdf',
        pages: pageCount,
      };
    } catch (error) {
      this.logger.error(`PDF preprocessing failed: ${error.message}`);
      throw new BadRequestException(`Failed to preprocess PDF: ${error.message}`);
    }
  }

  async convertToBase64(filePath: string): Promise<{ data: string; mediaType: string }> {
    const ext = path.extname(filePath).toLowerCase();
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');

    let mediaType: string;
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        mediaType = 'image/jpeg';
        break;
      case '.png':
        mediaType = 'image/png';
        break;
      case '.gif':
        mediaType = 'image/gif';
        break;
      case '.webp':
        mediaType = 'image/webp';
        break;
      case '.pdf':
        mediaType = 'application/pdf';
        break;
      default:
        throw new BadRequestException(`Unsupported file type: ${ext}`);
    }

    return { data: base64, mediaType };
  }

  async optimizeForOCR(inputPath: string): Promise<PreprocessedResult> {
    return this.preprocessImage(inputPath, {
      enhanceContrast: true,
      removeNoise: true,
      resize: { width: 2000 }, // Optimal size for OCR
      outputFormat: 'png',
    });
  }

  async cleanup(filePath: string): Promise<void> {
    try {
      if (fs.existsSync(filePath) && filePath.startsWith(this.uploadDir)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Cleaned up: ${filePath}`);
      }
    } catch (error) {
      this.logger.warn(`Failed to cleanup ${filePath}: ${error.message}`);
    }
  }

  async getImageInfo(filePath: string): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }> {
    const stats = fs.statSync(filePath);
    const metadata = await sharp(filePath).metadata();

    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
      format: metadata.format || 'unknown',
      size: stats.size,
    };
  }
}
