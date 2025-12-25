import { WinstonModuleOptions, utilities } from 'nest-winston';
import * as winston from 'winston';
import * as DailyRotateFile from 'winston-daily-rotate-file';

const isProduction = process.env.NODE_ENV === 'production';

// Custom format for structured logging
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

// Console format for development
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.ms(),
  utilities.format.nestLike('DocumentIulia', {
    colors: true,
    prettyPrint: true,
  }),
);

// Daily rotate file transport for production
const dailyRotateTransport = new DailyRotateFile({
  filename: '/var/log/documentiulia/backend-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '30d',
  format: structuredFormat,
});

// Error-specific daily rotate transport
const errorRotateTransport = new DailyRotateFile({
  filename: '/var/log/documentiulia/error-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '90d',
  level: 'error',
  format: structuredFormat,
});

// ANAF/Compliance audit log (keep for 7 years per Romanian regulations)
const auditRotateTransport = new DailyRotateFile({
  filename: '/var/log/documentiulia/audit-%DATE%.log',
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '50m',
  maxFiles: '2555d', // ~7 years
  format: structuredFormat,
});

export const winstonConfig: WinstonModuleOptions = {
  transports: isProduction
    ? [
        // Production: structured JSON logs to files
        dailyRotateTransport,
        errorRotateTransport,
        auditRotateTransport,
        // Also log to console for container/systemd capture
        new winston.transports.Console({
          level: 'info',
          format: structuredFormat,
        }),
      ]
    : [
        // Development: pretty console output
        new winston.transports.Console({
          level: 'debug',
          format: consoleFormat,
        }),
      ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: '/var/log/documentiulia/exceptions.log',
      format: structuredFormat,
    }),
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: '/var/log/documentiulia/rejections.log',
      format: structuredFormat,
    }),
  ],
};

// Custom logger for ANAF compliance audit trail
export const auditLogger = winston.createLogger({
  level: 'info',
  format: structuredFormat,
  defaultMeta: { service: 'documentiulia-audit' },
  transports: [auditRotateTransport],
});

// Helper function for audit logging
export function logAudit(
  action: string,
  userId: string,
  details: Record<string, any>,
) {
  auditLogger.info({
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details,
  });
}

// ANAF-specific audit actions
export const AuditActions = {
  SAFT_GENERATED: 'SAFT_GENERATED',
  SAFT_SUBMITTED: 'SAFT_SUBMITTED',
  EFACTURA_GENERATED: 'EFACTURA_GENERATED',
  EFACTURA_SUBMITTED: 'EFACTURA_SUBMITTED',
  VAT_REPORT_GENERATED: 'VAT_REPORT_GENERATED',
  VAT_REPORT_SUBMITTED: 'VAT_REPORT_SUBMITTED',
  INVOICE_CREATED: 'INVOICE_CREATED',
  INVOICE_MODIFIED: 'INVOICE_MODIFIED',
  INVOICE_DELETED: 'INVOICE_DELETED',
  USER_LOGIN: 'USER_LOGIN',
  USER_LOGOUT: 'USER_LOGOUT',
  GDPR_EXPORT: 'GDPR_EXPORT',
  GDPR_DELETE: 'GDPR_DELETE',
} as const;
