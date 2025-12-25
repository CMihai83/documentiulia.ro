import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';

export interface FileValidationOptions {
  maxSizeBytes?: number;
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/webp',
  'application/xml',
  'text/xml',
];
const DEFAULT_ALLOWED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.tiff',
  '.tif',
  '.webp',
  '.xml',
];

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly options: Required<FileValidationOptions>;

  constructor(options: FileValidationOptions = {}) {
    this.options = {
      maxSizeBytes: options.maxSizeBytes ?? DEFAULT_MAX_SIZE,
      allowedMimeTypes: options.allowedMimeTypes ?? DEFAULT_ALLOWED_MIME_TYPES,
      allowedExtensions: options.allowedExtensions ?? DEFAULT_ALLOWED_EXTENSIONS,
    };
  }

  transform(file: Express.Multer.File, metadata: ArgumentMetadata) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file size
    if (file.size > this.options.maxSizeBytes) {
      const maxMB = Math.round(this.options.maxSizeBytes / (1024 * 1024));
      throw new BadRequestException(
        `File size exceeds maximum allowed (${maxMB}MB)`,
      );
    }

    // Validate MIME type
    if (!this.options.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.options.allowedMimeTypes.join(', ')}`,
      );
    }

    // Validate file extension
    const extension = this.getFileExtension(file.originalname).toLowerCase();
    if (!this.options.allowedExtensions.includes(extension)) {
      throw new BadRequestException(
        `Invalid file extension. Allowed extensions: ${this.options.allowedExtensions.join(', ')}`,
      );
    }

    // Check for potential malicious content in filename
    if (this.containsMaliciousPatterns(file.originalname)) {
      throw new BadRequestException('Invalid filename');
    }

    return file;
  }

  private getFileExtension(filename: string): string {
    const lastDot = filename.lastIndexOf('.');
    return lastDot !== -1 ? filename.substring(lastDot) : '';
  }

  private containsMaliciousPatterns(filename: string): boolean {
    // Check for path traversal attempts
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return true;
    }

    // Check for null bytes
    if (filename.includes('\0')) {
      return true;
    }

    // Check for double extensions (e.g., file.pdf.exe)
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.dll', '.js'];
    for (const ext of dangerousExtensions) {
      if (filename.toLowerCase().endsWith(ext)) {
        return true;
      }
    }

    return false;
  }
}

// Preset validators for common use cases
export const DocumentFileValidator = new FileValidationPipe({
  maxSizeBytes: 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png', '.tiff', '.tif'],
});

export const InvoiceFileValidator = new FileValidationPipe({
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  allowedExtensions: ['.pdf', '.jpg', '.jpeg', '.png'],
});

export const XmlFileValidator = new FileValidationPipe({
  maxSizeBytes: 50 * 1024 * 1024, // 50MB for SAF-T XML
  allowedMimeTypes: ['application/xml', 'text/xml'],
  allowedExtensions: ['.xml'],
});
