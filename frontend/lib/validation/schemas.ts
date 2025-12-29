import { z } from 'zod';
import { validateCUI, validateIBAN, validateCNP, validatePhoneRO } from './romanian';

/**
 * Zod Validation Schemas - DocumentIulia.ro
 * Type-safe form validation with Romanian-specific rules
 */

// Custom Romanian validators for Zod
const cuiSchema = z.string().refine(
  (val) => validateCUI(val).valid,
  (val) => ({ message: validateCUI(val).errorRo || 'CUI invalid' })
);

const ibanSchema = z.string().refine(
  (val) => validateIBAN(val).valid,
  (val) => ({ message: validateIBAN(val).errorRo || 'IBAN invalid' })
);

const cnpSchema = z.string().refine(
  (val) => validateCNP(val).valid,
  (val) => ({ message: validateCNP(val).errorRo || 'CNP invalid' })
);

const phoneSchema = z.string().refine(
  (val) => validatePhoneRO(val).valid,
  (val) => ({ message: validatePhoneRO(val).errorRo || 'Numar de telefon invalid' })
);

// Common field schemas
const emailSchema = z.string()
  .min(1, 'Email-ul este obligatoriu')
  .email('Format email invalid');

const requiredString = (fieldName: string) =>
  z.string().min(1, `${fieldName} este obligatoriu`);

const postalCodeSchema = z.string()
  .regex(/^\d{6}$/, 'Codul postal trebuie sa aiba 6 cifre');

// Client/Company schema
export const clientSchema = z.object({
  name: requiredString('Numele'),
  cui: cuiSchema.optional().or(z.literal('')),
  registrationNumber: z.string().optional(),
  iban: ibanSchema.optional().or(z.literal('')),
  bank: z.string().optional(),
  address: requiredString('Adresa'),
  city: requiredString('Orasul'),
  county: requiredString('Judetul'),
  postalCode: postalCodeSchema.optional().or(z.literal('')),
  country: z.string().default('Romania'),
  email: emailSchema.optional().or(z.literal('')),
  phone: phoneSchema.optional().or(z.literal('')),
  contactPerson: z.string().optional(),
});

export type ClientFormData = z.infer<typeof clientSchema>;

// Invoice item schema
export const invoiceItemSchema = z.object({
  description: requiredString('Descrierea'),
  quantity: z.number()
    .min(0.01, 'Cantitatea trebuie sa fie mai mare decat 0')
    .max(999999, 'Cantitatea este prea mare'),
  unit: z.string().default('buc'),
  unitPrice: z.number()
    .min(0, 'Pretul nu poate fi negativ')
    .max(99999999, 'Pretul este prea mare'),
  vatRate: z.number()
    .min(0, 'TVA nu poate fi negativa')
    .max(100, 'TVA nu poate depasi 100%'),
  discount: z.number()
    .min(0, 'Discountul nu poate fi negativ')
    .max(100, 'Discountul nu poate depasi 100%')
    .default(0),
});

export type InvoiceItemFormData = z.infer<typeof invoiceItemSchema>;

// Full invoice schema
export const invoiceSchema = z.object({
  series: requiredString('Seria'),
  number: requiredString('Numarul'),
  issuedAt: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    'Data emiterii invalida'
  ),
  dueDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    'Data scadentei invalida'
  ),
  deliveryDate: z.string().optional(),
  client: clientSchema,
  items: z.array(invoiceItemSchema)
    .min(1, 'Factura trebuie sa contina cel putin un produs/serviciu'),
  currency: z.enum(['RON', 'EUR', 'USD']).default('RON'),
  exchangeRate: z.number().optional(),
  notes: z.string().max(1000, 'Notele nu pot depasi 1000 caractere').optional(),
  paymentMethod: z.enum(['transfer', 'cash', 'card', 'other']).default('transfer'),
  sendToAnaf: z.boolean().default(false),
}).refine(
  (data) => new Date(data.dueDate) >= new Date(data.issuedAt),
  {
    message: 'Data scadentei nu poate fi inainte de data emiterii',
    path: ['dueDate'],
  }
);

export type InvoiceFormData = z.infer<typeof invoiceSchema>;

// Employee schema for HR module
export const employeeSchema = z.object({
  firstName: requiredString('Prenumele'),
  lastName: requiredString('Numele'),
  cnp: cnpSchema,
  email: emailSchema,
  phone: phoneSchema,
  address: requiredString('Adresa'),
  city: requiredString('Orasul'),
  county: requiredString('Judetul'),
  postalCode: postalCodeSchema.optional().or(z.literal('')),
  department: requiredString('Departamentul'),
  position: requiredString('Functia'),
  contractType: z.enum(['full-time', 'part-time', 'contract', 'internship']),
  startDate: z.string().refine(
    (val) => !isNaN(Date.parse(val)),
    'Data angajarii invalida'
  ),
  endDate: z.string().optional(),
  salary: z.number()
    .min(0, 'Salariul nu poate fi negativ')
    .max(999999999, 'Salariul este prea mare'),
  bankAccount: ibanSchema.optional().or(z.literal('')),
});

export type EmployeeFormData = z.infer<typeof employeeSchema>;

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string()
    .min(8, 'Parola trebuie sa aiba cel putin 8 caractere')
    .regex(/[A-Z]/, 'Parola trebuie sa contina cel putin o litera mare')
    .regex(/[a-z]/, 'Parola trebuie sa contina cel putin o litera mica')
    .regex(/[0-9]/, 'Parola trebuie sa contina cel putin o cifra'),
  rememberMe: z.boolean().default(false),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Registration schema
export const registerSchema = loginSchema.extend({
  confirmPassword: z.string(),
  companyName: requiredString('Numele companiei'),
  companyCui: cuiSchema,
  acceptTerms: z.boolean().refine(
    (val) => val === true,
    'Trebuie sa acceptati termenii si conditiile'
  ),
}).refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Parolele nu corespund',
    path: ['confirmPassword'],
  }
);

export type RegisterFormData = z.infer<typeof registerSchema>;

// Contact form schema
export const contactSchema = z.object({
  name: requiredString('Numele'),
  email: emailSchema,
  phone: phoneSchema.optional().or(z.literal('')),
  subject: requiredString('Subiectul'),
  message: z.string()
    .min(10, 'Mesajul trebuie sa aiba cel putin 10 caractere')
    .max(5000, 'Mesajul nu poate depasi 5000 caractere'),
  acceptPrivacy: z.boolean().refine(
    (val) => val === true,
    'Trebuie sa acceptati politica de confidentialitate'
  ),
});

export type ContactFormData = z.infer<typeof contactSchema>;

// Document upload schema
export const documentUploadSchema = z.object({
  title: requiredString('Titlul'),
  type: z.enum(['invoice', 'contract', 'receipt', 'report', 'other']),
  file: z.instanceof(File)
    .refine((f) => f.size <= 10 * 1024 * 1024, 'Fisierul nu poate depasi 10MB')
    .refine(
      (f) => ['application/pdf', 'image/png', 'image/jpeg', 'application/xml'].includes(f.type),
      'Format invalid. Acceptam PDF, PNG, JPEG sau XML'
    ),
  tags: z.array(z.string()).optional(),
  description: z.string().max(500, 'Descrierea nu poate depasi 500 caractere').optional(),
});

export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;

// e-Factura submission schema
export const efacturaSchema = z.object({
  invoiceId: requiredString('ID-ul facturii'),
  submitToAnaf: z.boolean().default(true),
  testMode: z.boolean().default(false),
  notifyClient: z.boolean().default(true),
  clientEmail: emailSchema.optional(),
});

export type EfacturaFormData = z.infer<typeof efacturaSchema>;

// Export all schemas
export const schemas = {
  client: clientSchema,
  invoiceItem: invoiceItemSchema,
  invoice: invoiceSchema,
  employee: employeeSchema,
  login: loginSchema,
  register: registerSchema,
  contact: contactSchema,
  documentUpload: documentUploadSchema,
  efactura: efacturaSchema,
};

export default schemas;
