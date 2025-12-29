-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER', 'ADMIN', 'ACCOUNTANT', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CARD', 'CASH', 'CHECK', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentRecordStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "TimesheetStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PartnerType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'BOTH');

-- CreateEnum
CREATE TYPE "SpvStatus" AS ENUM ('PENDING', 'ACTIVE', 'EXPIRED', 'REVOKED', 'ERROR');

-- CreateEnum
CREATE TYPE "SpvMessageType" AS ENUM ('EFACTURA_RECEIVED', 'EFACTURA_RESPONSE', 'EFACTURA_ERROR', 'SAFT_RESPONSE', 'SAFT_ERROR', 'NOTIFICATION', 'DEADLINE_REMINDER', 'OTHER');

-- CreateEnum
CREATE TYPE "SpvMessageStatus" AS ENUM ('UNREAD', 'READ', 'PROCESSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SpvSubmissionType" AS ENUM ('EFACTURA_SEND', 'EFACTURA_DOWNLOAD', 'SAFT_D406', 'CUI_VALIDATION', 'VAT_CHECK');

-- CreateEnum
CREATE TYPE "SpvSubmissionStatus" AS ENUM ('PENDING', 'PROCESSING', 'ACCEPTED', 'REJECTED', 'ERROR', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('VAN', 'LARGE_VAN', 'SMALL_TRUCK', 'CARGO_BIKE');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('AVAILABLE', 'IN_USE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'RETIRED');

-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('DIESEL', 'PETROL', 'ELECTRIC', 'HYBRID', 'CNG');

-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'PARTIAL', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DeliveryStopStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DELIVERED', 'ATTEMPTED', 'FAILED', 'RETURNED');

-- CreateEnum
CREATE TYPE "DeliveryFailureReason" AS ENUM ('RECIPIENT_ABSENT', 'WRONG_ADDRESS', 'REFUSED', 'DAMAGED', 'ACCESS_ISSUE', 'WEATHER', 'VEHICLE_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('OIL_CHANGE', 'TIRE_ROTATION', 'BRAKE_SERVICE', 'TUV_INSPECTION', 'REPAIR', 'SCHEDULED_SERVICE', 'UNSCHEDULED_REPAIR', 'CLEANING', 'OTHER');

-- CreateEnum
CREATE TYPE "CourierProvider" AS ENUM ('DPD', 'GLS', 'DHL', 'UPS', 'HERMES');

-- CreateEnum
CREATE TYPE "GeofenceType" AS ENUM ('CIRCLE', 'POLYGON');

-- CreateEnum
CREATE TYPE "GeofenceEventType" AS ENUM ('ENTER', 'EXIT');

-- CreateEnum
CREATE TYPE "HRContractType" AS ENUM ('HR_FULL_TIME', 'HR_PART_TIME', 'HR_FIXED_TERM', 'HR_INDEFINITE', 'HR_INTERNSHIP', 'HR_APPRENTICESHIP', 'HR_TELEWORK', 'HR_SEASONAL');

-- CreateEnum
CREATE TYPE "HRContractStatus" AS ENUM ('DRAFT', 'PENDING_SIGNATURE', 'ACTIVE', 'SUSPENDED', 'TERMINATED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "HRFormType" AS ENUM ('LEAVE_REQUEST', 'MEDICAL_LEAVE', 'PERFORMANCE_REVIEW', 'EXIT_INTERVIEW', 'ONBOARDING', 'TRAINING_REQUEST', 'EXPENSE_CLAIM', 'OVERTIME_REQUEST', 'REMOTE_WORK_REQUEST', 'EQUIPMENT_REQUEST');

-- CreateEnum
CREATE TYPE "HRFormStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HSEIncidentType" AS ENUM ('INJURY', 'NEAR_MISS', 'PROPERTY_DAMAGE', 'ENVIRONMENTAL', 'FIRE', 'CHEMICAL_SPILL', 'EQUIPMENT_FAILURE', 'SECURITY', 'HSE_OTHER');

-- CreateEnum
CREATE TYPE "HSEIncidentSeverity" AS ENUM ('HSE_LOW', 'HSE_MEDIUM', 'HSE_HIGH', 'HSE_CRITICAL');

-- CreateEnum
CREATE TYPE "HSEIncidentStatus" AS ENUM ('REPORTED', 'UNDER_INVESTIGATION', 'CORRECTIVE_ACTION', 'RESOLVED', 'CLOSED');

-- CreateEnum
CREATE TYPE "HSERiskLevel" AS ENUM ('VERY_LOW', 'LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateEnum
CREATE TYPE "HSERiskStatus" AS ENUM ('RISK_DRAFT', 'RISK_ACTIVE', 'RISK_UNDER_REVIEW', 'RISK_ARCHIVED');

-- CreateEnum
CREATE TYPE "HSESafetyTrainingType" AS ENUM ('SSM_INDUCTION', 'SSM_PERIODIC', 'FIRE_SAFETY', 'FIRST_AID', 'CHEMICAL_HANDLING', 'EQUIPMENT_OPERATION', 'PPE_USAGE', 'EMERGENCY_RESPONSE', 'ERGONOMICS', 'TRAINING_CUSTOM');

-- CreateEnum
CREATE TYPE "LMSCourseCategory" AS ENUM ('EXCEL_VBA', 'PROJECT_MANAGEMENT', 'MBA_STRATEGY', 'LEAN_OPERATIONS', 'FINANCE_OPS', 'HR_COMPLIANCE', 'HSE_SAFETY', 'ACCOUNTING', 'TAX_COMPLIANCE', 'SOFT_SKILLS');

-- CreateEnum
CREATE TYPE "LMSCourseLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "LMSCourseStatus" AS ENUM ('LMS_DRAFT', 'LMS_REVIEW', 'LMS_PUBLISHED', 'LMS_ARCHIVED');

-- CreateEnum
CREATE TYPE "LMSLessonType" AS ENUM ('VIDEO', 'TEXT', 'QUIZ', 'EXERCISE', 'SIMULATION', 'DOWNLOAD');

-- CreateEnum
CREATE TYPE "FreelancerAvailability" AS ENUM ('AVAILABLE', 'PARTIALLY_AVAILABLE', 'NOT_AVAILABLE', 'ON_PROJECT');

-- CreateEnum
CREATE TYPE "FreelanceBudgetType" AS ENUM ('FIXED', 'HOURLY', 'DAILY', 'MILESTONE');

-- CreateEnum
CREATE TYPE "FreelanceProjectStatus" AS ENUM ('PROJECT_DRAFT', 'PROJECT_OPEN', 'PROJECT_IN_PROGRESS', 'PROJECT_ON_HOLD', 'PROJECT_COMPLETED', 'PROJECT_CANCELLED');

-- CreateEnum
CREATE TYPE "FreelanceMilestoneStatus" AS ENUM ('MILESTONE_PENDING', 'MILESTONE_IN_PROGRESS', 'MILESTONE_SUBMITTED', 'MILESTONE_APPROVED', 'MILESTONE_PAID', 'MILESTONE_DISPUTED');

-- CreateEnum
CREATE TYPE "FreelancerContractType" AS ENUM ('PROJECT_BASED', 'RETAINER', 'HOURLY_CONTRACT', 'CONSULTING');

-- CreateEnum
CREATE TYPE "BlogArticleStatus" AS ENUM ('BLOG_DRAFT', 'BLOG_REVIEW', 'BLOG_PUBLISHED', 'BLOG_ARCHIVED');

-- CreateEnum
CREATE TYPE "DemoContractType" AS ENUM ('DEMO_FULL_TIME', 'DEMO_PART_TIME', 'DEMO_CONTRACT');

-- CreateEnum
CREATE TYPE "DemoEmployeeStatus" AS ENUM ('DEMO_ACTIVE', 'DEMO_ON_LEAVE', 'DEMO_TERMINATED');

-- CreateEnum
CREATE TYPE "StockMovementType" AS ENUM ('IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN');

-- CreateEnum
CREATE TYPE "StockAlertType" AS ENUM ('LOW_STOCK', 'OUT_OF_STOCK', 'OVERSTOCK', 'EXPIRING_SOON');

-- CreateEnum
CREATE TYPE "StockAlertStatus" AS ENUM ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED');

-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('SERVICE', 'SALE', 'PURCHASE', 'LEASE', 'EMPLOYMENT', 'FRAMEWORK', 'NDA', 'OTHER');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED', 'RENEWED');

-- CreateEnum
CREATE TYPE "SimulationStatus" AS ENUM ('SIM_ACTIVE', 'SIM_PAUSED', 'SIM_COMPLETED', 'SIM_FAILED', 'SIM_ABANDONED');

-- CreateEnum
CREATE TYPE "SimulationDifficulty" AS ENUM ('SIM_TUTORIAL', 'SIM_EASY', 'SIM_NORMAL', 'SIM_HARD', 'SIM_EXPERT');

-- CreateEnum
CREATE TYPE "SimDecisionCategory" AS ENUM ('SIM_FINANCIAL', 'SIM_OPERATIONS', 'SIM_HR', 'SIM_MARKETING', 'SIM_COMPLIANCE', 'SIM_GROWTH', 'SIM_RISK');

-- CreateEnum
CREATE TYPE "SimEventType" AS ENUM ('SIM_MARKET_CHANGE', 'SIM_REGULATION_CHANGE', 'SIM_ECONOMIC_SHOCK', 'SIM_OPPORTUNITY', 'SIM_CRISIS', 'SIM_AUDIT', 'SIM_CUSTOMER_EVENT', 'SIM_EMPLOYEE_EVENT', 'SIM_SUPPLIER_EVENT', 'SIM_COMPETITION');

-- CreateEnum
CREATE TYPE "SimEventSeverity" AS ENUM ('SEVERITY_LOW', 'SEVERITY_MEDIUM', 'SEVERITY_HIGH', 'SEVERITY_CRITICAL');

-- CreateEnum
CREATE TYPE "SimScenarioType" AS ENUM ('SCENARIO_FREEPLAY', 'SCENARIO_TUTORIAL', 'SCENARIO_CHALLENGE', 'SCENARIO_CRISIS_SURVIVAL', 'SCENARIO_GROWTH_RACE', 'SCENARIO_COMPLIANCE_TEST');

-- AlterEnum
ALTER TYPE "Tier" ADD VALUE 'ENTERPRISE';

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "baseCurrency" TEXT NOT NULL DEFAULT 'RON',
ADD COLUMN     "baseGrossAmount" DECIMAL(12,2),
ADD COLUMN     "baseNetAmount" DECIMAL(12,2),
ADD COLUMN     "baseVatAmount" DECIMAL(12,2),
ADD COLUMN     "exchangeRate" DECIMAL(12,6),
ADD COLUMN     "externalRef" TEXT,
ADD COLUMN     "isRecurring" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "partnerId" TEXT,
ADD COLUMN     "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
ADD COLUMN     "recurringInvoiceId" TEXT;

-- AlterTable
ALTER TABLE "OCRTemplate" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "SAFTReport" ADD COLUMN     "organizationId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activeOrganizationId" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "emailVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "mfaBackupCodes" TEXT[],
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaEnabledAt" TIMESTAMP(3),
ADD COLUMN     "mfaSecret" TEXT,
ADD COLUMN     "notificationPreferences" JSONB NOT NULL DEFAULT '{"email":{"invoiceReminders":true,"overdueAlerts":true,"complianceDeadlines":true,"weeklyReports":true,"systemAlerts":true}}';

-- AlterTable
ALTER TABLE "VATReport" ADD COLUMN     "organizationId" TEXT;

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "cui" TEXT,
    "regCom" TEXT,
    "address" TEXT,
    "city" TEXT,
    "county" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Romania',
    "postalCode" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "maxUsers" INTEGER NOT NULL DEFAULT 1,
    "maxInvoices" INTEGER NOT NULL DEFAULT 10,
    "maxDocuments" INTEGER NOT NULL DEFAULT 50,
    "defaultVatRate" DECIMAL(5,2) NOT NULL DEFAULT 21,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'RON',
    "invoicePrefix" TEXT,
    "invoiceCounter" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "activatedAt" TIMESTAMP(3),
    "deactivatedAt" TIMESTAMP(3),
    "spvConnected" BOOLEAN NOT NULL DEFAULT false,
    "sagaConnected" BOOLEAN NOT NULL DEFAULT false,
    "sagaAccessToken" TEXT,
    "sagaRefreshToken" TEXT,
    "sagaTokenExpiresAt" TIMESTAMP(3),
    "sagaTokenScope" TEXT,
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "canManageUsers" BOOLEAN NOT NULL DEFAULT false,
    "canManageInvoices" BOOLEAN NOT NULL DEFAULT true,
    "canManageDocuments" BOOLEAN NOT NULL DEFAULT true,
    "canViewReports" BOOLEAN NOT NULL DEFAULT true,
    "canSubmitAnaf" BOOLEAN NOT NULL DEFAULT false,
    "canExportData" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationInvitation" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "invitedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "enabledModules" JSONB NOT NULL DEFAULT '["dashboard","analytics","invoices","finance","crm","hr"]',
    "moduleOrder" JSONB NOT NULL DEFAULT '[]',
    "collapsedSections" JSONB NOT NULL DEFAULT '[]',
    "sidebarCollapsed" BOOLEAN NOT NULL DEFAULT false,
    "compactMode" BOOLEAN NOT NULL DEFAULT false,
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "dashboardWidgets" JSONB NOT NULL DEFAULT '["overview","cashFlow","vatChart","recentInvoices","alerts"]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "description" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "status" "PaymentRecordStatus" NOT NULL DEFAULT 'COMPLETED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VatD300Declaration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cui" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "outputTaxableBase19" DECIMAL(14,2) NOT NULL,
    "outputVat19" DECIMAL(14,2) NOT NULL,
    "outputTaxableBase9" DECIMAL(14,2) NOT NULL,
    "outputVat9" DECIMAL(14,2) NOT NULL,
    "outputTaxableBase5" DECIMAL(14,2) NOT NULL,
    "outputVat5" DECIMAL(14,2) NOT NULL,
    "exemptWithDeduction" DECIMAL(14,2) NOT NULL,
    "exemptWithoutDeduction" DECIMAL(14,2) NOT NULL,
    "reverseChargeBase" DECIMAL(14,2) NOT NULL,
    "intraCommunityDeliveries" DECIMAL(14,2) NOT NULL,
    "exports" DECIMAL(14,2) NOT NULL,
    "inputVat19" DECIMAL(14,2) NOT NULL,
    "inputVat9" DECIMAL(14,2) NOT NULL,
    "inputVat5" DECIMAL(14,2) NOT NULL,
    "importVat" DECIMAL(14,2) NOT NULL,
    "intraCommunityAcquisitionsBase" DECIMAL(14,2) NOT NULL,
    "intraCommunityAcquisitionsVat" DECIMAL(14,2) NOT NULL,
    "reverseChargeInputVat" DECIMAL(14,2) NOT NULL,
    "totalOutputVat" DECIMAL(14,2) NOT NULL,
    "totalInputVat" DECIMAL(14,2) NOT NULL,
    "vatPayable" DECIMAL(14,2) NOT NULL,
    "intraCommunityTransactions" JSONB,
    "notes" TEXT,
    "legalRepresentativeName" TEXT,
    "legalRepresentativeCnp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "anafReferenceNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VatD300Declaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VatD394Declaration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cui" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "quarter" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "acquisitions" JSONB,
    "totalAcquisitionsBase" DECIMAL(14,2) NOT NULL,
    "totalAcquisitionsVat" DECIMAL(14,2) NOT NULL,
    "deliveries" JSONB,
    "totalDeliveriesValue" DECIMAL(14,2) NOT NULL,
    "servicesProvided" JSONB,
    "totalServicesProvidedValue" DECIMAL(14,2) NOT NULL,
    "servicesReceived" JSONB,
    "totalServicesReceivedBase" DECIMAL(14,2) NOT NULL,
    "totalServicesReceivedVat" DECIMAL(14,2) NOT NULL,
    "triangularSimplification" DECIMAL(14,2),
    "triangularDeliveries" DECIMAL(14,2),
    "triangularAcquisitions" DECIMAL(14,2),
    "acquisitionsCorrectionsBase" DECIMAL(14,2),
    "acquisitionsCorrectionsVat" DECIMAL(14,2),
    "deliveriesCorrectionsValue" DECIMAL(14,2),
    "servicesProvidedCorrectionsValue" DECIMAL(14,2),
    "servicesReceivedCorrectionsBase" DECIMAL(14,2),
    "servicesReceivedCorrectionsVat" DECIMAL(14,2),
    "viesValidated" BOOLEAN NOT NULL DEFAULT false,
    "viesValidationDate" TEXT,
    "invalidVatIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "monthlyD300Ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isReconciled" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "isAmendment" BOOLEAN NOT NULL DEFAULT false,
    "originalDeclarationNumber" TEXT,
    "legalRepresentativeName" TEXT,
    "legalRepresentativeCnp" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submittedAt" TIMESTAMP(3),
    "anafReferenceNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VatD394Declaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SrlRegistration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "companyType" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "alternativeName1" TEXT,
    "alternativeName2" TEXT,
    "county" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "sector" TEXT,
    "street" TEXT NOT NULL,
    "streetNumber" TEXT NOT NULL,
    "building" TEXT,
    "staircase" TEXT,
    "floor" TEXT,
    "apartment" TEXT,
    "postalCode" TEXT NOT NULL,
    "shareCapital" DECIMAL(14,2) NOT NULL,
    "totalShares" INTEGER NOT NULL,
    "shareNominalValue" DECIMAL(14,2) NOT NULL,
    "businessPurpose" TEXT NOT NULL,
    "companyDuration" INTEGER NOT NULL DEFAULT 99,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "notes" TEXT,
    "registrationFee" DECIMAL(10,2) NOT NULL,
    "onrcFee" DECIMAL(10,2) NOT NULL,
    "serviceFee" DECIMAL(10,2) NOT NULL,
    "cui" TEXT,
    "registrationNumber" TEXT,
    "onrcReferenceNumber" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SrlRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shareholder" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnp" TEXT,
    "cui" TEXT,
    "address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "shares" INTEGER NOT NULL,
    "contribution" DECIMAL(14,2) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Shareholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Administrator" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cnp" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "isSoleAdministrator" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Administrator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyActivity" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "caenCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PfaRegistration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "cnp" TEXT NOT NULL,
    "idCardNumber" TEXT NOT NULL,
    "idCardIssuedBy" TEXT NOT NULL,
    "idCardIssuedDate" TIMESTAMP(3) NOT NULL,
    "county" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "sector" TEXT,
    "street" TEXT NOT NULL,
    "streetNumber" TEXT NOT NULL,
    "building" TEXT,
    "staircase" TEXT,
    "floor" TEXT,
    "apartment" TEXT,
    "postalCode" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "tradeName" TEXT,
    "activityType" TEXT NOT NULL,
    "activityDescription" TEXT NOT NULL,
    "businessAddress" TEXT,
    "needsCommercialSpace" BOOLEAN NOT NULL DEFAULT false,
    "expectedEmployees" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "registrationFee" DECIMAL(10,2) NOT NULL,
    "anafFee" DECIMAL(10,2) NOT NULL,
    "serviceFee" DECIMAL(10,2) NOT NULL,
    "cui" TEXT,
    "anafReferenceNumber" TEXT,
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PfaRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PfaActivity" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "caenCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PfaActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Timesheet" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "workedHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "routeId" TEXT,
    "notes" TEXT,
    "status" "TimesheetStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Timesheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Partner" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "cui" TEXT,
    "regCom" TEXT,
    "address" TEXT,
    "city" TEXT,
    "county" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Romania',
    "postalCode" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "contactPerson" TEXT,
    "bankName" TEXT,
    "bankAccount" TEXT,
    "type" "PartnerType" NOT NULL DEFAULT 'CUSTOMER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "invoiceCount" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Consent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DSRRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT,
    "additionalDetails" TEXT,
    "ipAddress" TEXT,
    "adminNotes" TEXT,
    "rejectionReason" TEXT,
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DSRRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpvToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "cui" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenType" TEXT NOT NULL DEFAULT 'Bearer',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "refreshExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "status" "SpvStatus" NOT NULL DEFAULT 'PENDING',
    "lastUsedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpvToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpvMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "cui" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "messageType" "SpvMessageType" NOT NULL,
    "subject" TEXT NOT NULL,
    "content" TEXT,
    "xmlContent" TEXT,
    "relatedInvoice" TEXT,
    "relatedSaft" TEXT,
    "uploadIndex" TEXT,
    "status" "SpvMessageStatus" NOT NULL DEFAULT 'UNREAD',
    "readAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "anafCreatedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpvMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpvSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "cui" TEXT NOT NULL,
    "submissionType" "SpvSubmissionType" NOT NULL,
    "uploadIndex" TEXT NOT NULL,
    "documentId" TEXT,
    "documentType" TEXT,
    "period" TEXT,
    "xmlHash" TEXT,
    "xmlSize" INTEGER,
    "status" "SpvSubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "anafStatus" TEXT,
    "anafMessages" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCheckedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SpvSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "licensePlate" TEXT NOT NULL,
    "vin" TEXT,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "year" INTEGER,
    "type" "VehicleType" NOT NULL DEFAULT 'VAN',
    "maxPayloadKg" DECIMAL(10,2),
    "cargoVolumeM3" DECIMAL(10,2),
    "fuelType" "FuelType" NOT NULL DEFAULT 'DIESEL',
    "currentLat" DECIMAL(10,7),
    "currentLng" DECIMAL(10,7),
    "lastLocationAt" TIMESTAMP(3),
    "status" "VehicleStatus" NOT NULL DEFAULT 'AVAILABLE',
    "mileage" INTEGER,
    "nextServiceDate" TIMESTAMP(3),
    "lastServiceDate" TIMESTAMP(3),
    "insuranceExpiry" TIMESTAMP(3),
    "tuvExpiry" TIMESTAMP(3),
    "assignedDriverId" TEXT,
    "monthlyLeaseCost" DECIMAL(10,2),
    "insuranceCost" DECIMAL(10,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryRoute" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "routeName" TEXT,
    "routeDate" DATE NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "totalStops" INTEGER NOT NULL DEFAULT 0,
    "completedStops" INTEGER NOT NULL DEFAULT 0,
    "totalParcels" INTEGER NOT NULL DEFAULT 0,
    "deliveredParcels" INTEGER NOT NULL DEFAULT 0,
    "failedDeliveries" INTEGER NOT NULL DEFAULT 0,
    "plannedDistanceKm" DECIMAL(10,2),
    "actualDistanceKm" DECIMAL(10,2),
    "plannedDurationMin" INTEGER,
    "actualDurationMin" INTEGER,
    "plannedStartTime" TIMESTAMP(3),
    "actualStartTime" TIMESTAMP(3),
    "plannedEndTime" TIMESTAMP(3),
    "actualEndTime" TIMESTAMP(3),
    "status" "RouteStatus" NOT NULL DEFAULT 'PLANNED',
    "deliveryZone" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryRoute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeliveryStop" (
    "id" TEXT NOT NULL,
    "routeId" TEXT NOT NULL,
    "stopOrder" INTEGER NOT NULL,
    "recipientName" TEXT NOT NULL,
    "recipientPhone" TEXT,
    "recipientEmail" TEXT,
    "streetAddress" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'München',
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "parcelCount" INTEGER NOT NULL DEFAULT 1,
    "trackingNumbers" TEXT[],
    "status" "DeliveryStopStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedArrival" TIMESTAMP(3),
    "actualArrival" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "signature" TEXT,
    "photoUrl" TEXT,
    "recipientNote" TEXT,
    "failureReason" "DeliveryFailureReason",
    "failureNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryStop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "driverId" TEXT,
    "fuelType" "FuelType" NOT NULL,
    "liters" DECIMAL(10,2) NOT NULL,
    "pricePerLiter" DECIMAL(10,3) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "odometerReading" INTEGER NOT NULL,
    "stationName" TEXT,
    "stationAddress" TEXT,
    "fueledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceLog" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "description" TEXT NOT NULL,
    "odometerReading" INTEGER,
    "partsCost" DECIMAL(10,2),
    "laborCost" DECIMAL(10,2),
    "totalCost" DECIMAL(10,2),
    "vendorName" TEXT,
    "vendorAddress" TEXT,
    "invoiceNumber" TEXT,
    "serviceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nextServiceDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourierDelivery" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trackingNumber" TEXT NOT NULL,
    "provider" "CourierProvider" NOT NULL,
    "status" TEXT NOT NULL,
    "recipientName" TEXT,
    "recipientAddress" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "amount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourierDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiclePosition" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "altitude" DECIMAL(10,2),
    "speed" DECIMAL(10,2),
    "heading" INTEGER,
    "accuracy" DECIMAL(10,2),
    "ignition" BOOLEAN NOT NULL DEFAULT true,
    "engineRunning" BOOLEAN NOT NULL DEFAULT true,
    "routeId" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VehiclePosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Geofence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "GeofenceType" NOT NULL DEFAULT 'CIRCLE',
    "centerLat" DECIMAL(10,7),
    "centerLng" DECIMAL(10,7),
    "radiusMeters" INTEGER,
    "polygonPoints" JSONB,
    "alertOnEntry" BOOLEAN NOT NULL DEFAULT true,
    "alertOnExit" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "deliveryZone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Geofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeofenceEvent" (
    "id" TEXT NOT NULL,
    "geofenceId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "eventType" "GeofenceEventType" NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeofenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRContract" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "HRContractType" NOT NULL,
    "status" "HRContractStatus" NOT NULL DEFAULT 'DRAFT',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "probationEnd" TIMESTAMP(3),
    "salary" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "workHours" INTEGER NOT NULL DEFAULT 40,
    "position" TEXT NOT NULL,
    "department" TEXT,
    "nonCompete" BOOLEAN NOT NULL DEFAULT false,
    "telework" BOOLEAN NOT NULL DEFAULT false,
    "teleworkDays" INTEGER,
    "signedAt" TIMESTAMP(3),
    "signatureUrl" TEXT,
    "signedByEmployee" BOOLEAN NOT NULL DEFAULT false,
    "signedByEmployer" BOOLEAN NOT NULL DEFAULT false,
    "revisalSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "revisalId" TEXT,
    "revisalStatus" TEXT,
    "templateId" TEXT,
    "templateVersion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HRContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRContractAmendment" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "changes" JSONB NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HRContractAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HRForm" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT,
    "type" "HRFormType" NOT NULL,
    "title" TEXT NOT NULL,
    "status" "HRFormStatus" NOT NULL DEFAULT 'DRAFT',
    "data" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectedAt" TIMESTAMP(3),
    "rejectedBy" TEXT,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HRForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HSEIncident" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "type" "HSEIncidentType" NOT NULL,
    "severity" "HSEIncidentSeverity" NOT NULL,
    "status" "HSEIncidentStatus" NOT NULL DEFAULT 'REPORTED',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "siteId" TEXT,
    "photoUrls" TEXT[],
    "videoUrls" TEXT[],
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "rootCause" TEXT,
    "correctiveActions" TEXT,
    "preventiveActions" TEXT,
    "employeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HSEIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HSERiskAssessment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "department" TEXT,
    "processArea" TEXT,
    "hazards" JSONB NOT NULL,
    "riskLevel" "HSERiskLevel" NOT NULL,
    "likelihood" INTEGER NOT NULL,
    "impact" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "existingControls" TEXT,
    "proposedControls" TEXT,
    "residualRisk" "HSERiskLevel",
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewDueAt" TIMESTAMP(3) NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "status" "HSERiskStatus" NOT NULL DEFAULT 'RISK_DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HSERiskAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HSESafetyTraining" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "trainingType" "HSESafetyTrainingType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "linkedToPayroll" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HSESafetyTraining_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LMSCourse" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "LMSCourseCategory" NOT NULL,
    "level" "LMSCourseLevel" NOT NULL DEFAULT 'BEGINNER',
    "thumbnailUrl" TEXT,
    "duration" INTEGER NOT NULL,
    "price" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "language" TEXT NOT NULL DEFAULT 'ro',
    "tags" TEXT[],
    "status" "LMSCourseStatus" NOT NULL DEFAULT 'LMS_DRAFT',
    "publishedAt" TIMESTAMP(3),
    "hasCertificate" BOOLEAN NOT NULL DEFAULT true,
    "certificateTemplate" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LMSCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LMSCourseModule" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LMSCourseModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LMSLesson" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "type" "LMSLessonType" NOT NULL,
    "videoUrl" TEXT,
    "content" TEXT,
    "duration" INTEGER NOT NULL,
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LMSLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LMSEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "certificateIssuedAt" TIMESTAMP(3),
    "quizScore" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LMSEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LMSLessonProgress" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "watchedDuration" INTEGER,
    "lastPosition" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "bestScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LMSLessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelancerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "skills" TEXT[],
    "categories" TEXT[],
    "experience" INTEGER,
    "portfolioUrl" TEXT,
    "linkedinUrl" TEXT,
    "bio" TEXT,
    "availability" "FreelancerAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "hourlyRate" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "preferredWorkType" TEXT[],
    "rating" DOUBLE PRECISION DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "pfaNumber" TEXT,
    "cui" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelancerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelanceProjectAssignment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "skills" TEXT[],
    "budget" DECIMAL(10,2),
    "budgetType" "FreelanceBudgetType" NOT NULL DEFAULT 'FIXED',
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "status" "FreelanceProjectStatus" NOT NULL DEFAULT 'PROJECT_DRAFT',
    "freelancerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelanceProjectAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelanceProjectMilestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "FreelanceMilestoneStatus" NOT NULL DEFAULT 'MILESTONE_PENDING',
    "escrowHeld" BOOLEAN NOT NULL DEFAULT false,
    "releasedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreelanceProjectMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelancerContract" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "type" "FreelancerContractType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "rate" DECIMAL(10,2) NOT NULL,
    "rateType" "FreelanceBudgetType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "ndaSigned" BOOLEAN NOT NULL DEFAULT false,
    "ndaSignedAt" TIMESTAMP(3),
    "ipClause" BOOLEAN NOT NULL DEFAULT false,
    "status" "HRContractStatus" NOT NULL DEFAULT 'DRAFT',
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FreelancerContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreelanceTimeEntry" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "description" TEXT,
    "screenshotUrl" TEXT,
    "activityLevel" DOUBLE PRECISION,
    "billed" BOOLEAN NOT NULL DEFAULT false,
    "invoiceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FreelanceTimeEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "threadCount" INTEGER NOT NULL DEFAULT 0,
    "postCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumThread" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "replyCount" INTEGER NOT NULL DEFAULT 0,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "lastReplyAt" TIMESTAMP(3),
    "lastReplyBy" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ForumPost" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "replyToId" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "isAccepted" BOOLEAN NOT NULL DEFAULT false,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ForumPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogArticle" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT NOT NULL,
    "authorId" TEXT,
    "authorName" TEXT NOT NULL,
    "authorBio" TEXT,
    "featuredImageUrl" TEXT,
    "readTime" INTEGER,
    "tags" TEXT[],
    "status" "BlogArticleStatus" NOT NULL DEFAULT 'BLOG_DRAFT',
    "publishedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "shareCount" INTEGER NOT NULL DEFAULT 0,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "seoKeywords" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoBusiness" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cui" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "employeeCount" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(15,2),
    "description" TEXT,
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoBusiness_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoBusinessContact" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoBusinessContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoEmployee" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "hireDate" TIMESTAMP(3) NOT NULL,
    "salary" DECIMAL(10,2) NOT NULL,
    "contractType" "DemoContractType" NOT NULL DEFAULT 'DEMO_FULL_TIME',
    "status" "DemoEmployeeStatus" NOT NULL DEFAULT 'DEMO_ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DemoEmployee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" TEXT,
    "xmlSent" TEXT,
    "xmlReceived" TEXT,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationIntegration" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "credentials" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "settings" JSONB DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationIntegration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringInvoice" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "partnerId" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "nextRunDate" TIMESTAMP(3) NOT NULL,
    "lastRunDate" TIMESTAMP(3),
    "dayOfMonth" INTEGER,
    "dayOfWeek" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "autoSend" BOOLEAN NOT NULL DEFAULT false,
    "autoSubmitSpv" BOOLEAN NOT NULL DEFAULT false,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 19,
    "items" JSONB NOT NULL,
    "notes" TEXT,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "seriesName" TEXT,
    "generatedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT NOT NULL,
    "code" TEXT,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit" TEXT NOT NULL DEFAULT 'buc',
    "unitPrice" DECIMAL(12,4) NOT NULL,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 19,
    "discount" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "vatAmount" DECIMAL(12,2) NOT NULL,
    "grossAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "brand" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'buc',
    "purchasePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "salePrice" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vatRate" DECIMAL(5,2) NOT NULL DEFAULT 19,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "currentStock" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "reservedStock" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "minStockLevel" DECIMAL(12,4) NOT NULL DEFAULT 0,
    "maxStockLevel" DECIMAL(12,4),
    "barcode" TEXT,
    "location" TEXT,
    "supplier" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "previousStock" DECIMAL(12,4) NOT NULL,
    "newStock" DECIMAL(12,4) NOT NULL,
    "reference" TEXT,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "unitCost" DECIMAL(12,2),
    "notes" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAlert" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "StockAlertType" NOT NULL,
    "threshold" DECIMAL(12,4) NOT NULL,
    "currentLevel" DECIMAL(12,4) NOT NULL,
    "status" "StockAlertStatus" NOT NULL DEFAULT 'ACTIVE',
    "acknowledgedAt" TIMESTAMP(3),
    "acknowledgedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "StockAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "contractNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ContractType" NOT NULL DEFAULT 'SERVICE',
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "partnerId" TEXT,
    "partnerName" TEXT NOT NULL,
    "partnerCui" TEXT,
    "partnerAddress" TEXT,
    "totalValue" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RON',
    "paymentTerms" TEXT,
    "billingFrequency" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "signedAt" TIMESTAMP(3),
    "terminatedAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT false,
    "renewalPeriodMonths" INTEGER,
    "renewalNoticesDays" INTEGER,
    "documentId" TEXT,
    "attachments" JSONB,
    "linkedInvoiceIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isCompliant" BOOLEAN NOT NULL DEFAULT true,
    "complianceNotes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactSubmission" (
    "id" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "subject" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "notes" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContactSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ErrorLog" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT NOT NULL DEFAULT '',
    "type" TEXT NOT NULL,
    "componentStack" TEXT DEFAULT '',
    "url" TEXT DEFAULT '',
    "userAgent" TEXT DEFAULT '',
    "userId" TEXT DEFAULT 'anonymous',
    "source" TEXT NOT NULL DEFAULT 'frontend',
    "metadata" TEXT DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationGame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currentMonth" INTEGER NOT NULL DEFAULT 1,
    "currentYear" INTEGER NOT NULL DEFAULT 2025,
    "status" "SimulationStatus" NOT NULL DEFAULT 'SIM_ACTIVE',
    "difficulty" "SimulationDifficulty" NOT NULL DEFAULT 'SIM_NORMAL',
    "healthScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "financialScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "operationsScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "complianceScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "growthScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "scenarioId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationState" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "cash" DECIMAL(14,2) NOT NULL DEFAULT 50000,
    "revenue" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "expenses" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "profit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "receivables" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "payables" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "inventory" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "equipment" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "loans" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "employees" INTEGER NOT NULL DEFAULT 1,
    "capacity" DOUBLE PRECISION NOT NULL DEFAULT 100,
    "utilization" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "quality" DOUBLE PRECISION NOT NULL DEFAULT 80,
    "marketShare" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "customerCount" INTEGER NOT NULL DEFAULT 10,
    "reputation" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "taxOwed" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "vatBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "penaltiesRisk" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "auditRisk" DOUBLE PRECISION NOT NULL DEFAULT 5,
    "metricsSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationDecision" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "category" "SimDecisionCategory" NOT NULL,
    "type" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "impactSummary" TEXT,
    "impactMetrics" JSONB,
    "relatedCourseId" TEXT,
    "relatedLessonId" TEXT,
    "aiRecommendation" TEXT,
    "wasSuccessful" BOOLEAN,
    "outcomeNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationEvent" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "type" "SimEventType" NOT NULL,
    "severity" "SimEventSeverity" NOT NULL DEFAULT 'SEVERITY_MEDIUM',
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" JSONB NOT NULL,
    "responseOptions" JSONB,
    "playerChoice" TEXT,
    "outcome" TEXT,
    "outcomeImpact" JSONB,
    "deadline" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationAchievement" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "xpReward" INTEGER NOT NULL DEFAULT 100,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SimulationScenario" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "titleEn" TEXT,
    "description" TEXT NOT NULL,
    "descriptionEn" TEXT,
    "difficulty" "SimulationDifficulty" NOT NULL,
    "initialState" JSONB NOT NULL,
    "objectives" JSONB NOT NULL,
    "timeLimit" INTEGER,
    "type" "SimScenarioType" NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 500,
    "badgeId" TEXT,
    "relatedCourseIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SimulationScenario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_cui_key" ON "Organization"("cui");

-- CreateIndex
CREATE INDEX "Organization_slug_idx" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_cui_idx" ON "Organization"("cui");

-- CreateIndex
CREATE INDEX "Organization_isActive_idx" ON "Organization"("isActive");

-- CreateIndex
CREATE INDEX "OrganizationMember_userId_idx" ON "OrganizationMember"("userId");

-- CreateIndex
CREATE INDEX "OrganizationMember_organizationId_idx" ON "OrganizationMember"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationMember_role_idx" ON "OrganizationMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationMember_userId_organizationId_key" ON "OrganizationMember"("userId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_token_key" ON "OrganizationInvitation"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_token_idx" ON "OrganizationInvitation"("token");

-- CreateIndex
CREATE INDEX "OrganizationInvitation_status_idx" ON "OrganizationInvitation"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInvitation_organizationId_email_key" ON "OrganizationInvitation"("organizationId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardPreferences_userId_key" ON "DashboardPreferences"("userId");

-- CreateIndex
CREATE INDEX "DashboardPreferences_userId_idx" ON "DashboardPreferences"("userId");

-- CreateIndex
CREATE INDEX "Payment_invoiceId_idx" ON "Payment"("invoiceId");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "Payment_method_idx" ON "Payment"("method");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_invoiceId_idx" ON "Payment"("paymentDate", "invoiceId");

-- CreateIndex
CREATE INDEX "Payment_status_paymentDate_idx" ON "Payment"("status", "paymentDate");

-- CreateIndex
CREATE INDEX "VatD300Declaration_userId_idx" ON "VatD300Declaration"("userId");

-- CreateIndex
CREATE INDEX "VatD300Declaration_cui_idx" ON "VatD300Declaration"("cui");

-- CreateIndex
CREATE INDEX "VatD300Declaration_year_month_idx" ON "VatD300Declaration"("year", "month");

-- CreateIndex
CREATE INDEX "VatD300Declaration_status_idx" ON "VatD300Declaration"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VatD300Declaration_userId_cui_month_year_key" ON "VatD300Declaration"("userId", "cui", "month", "year");

-- CreateIndex
CREATE INDEX "VatD394Declaration_userId_idx" ON "VatD394Declaration"("userId");

-- CreateIndex
CREATE INDEX "VatD394Declaration_cui_idx" ON "VatD394Declaration"("cui");

-- CreateIndex
CREATE INDEX "VatD394Declaration_year_quarter_idx" ON "VatD394Declaration"("year", "quarter");

-- CreateIndex
CREATE INDEX "VatD394Declaration_status_idx" ON "VatD394Declaration"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VatD394Declaration_userId_cui_quarter_year_key" ON "VatD394Declaration"("userId", "cui", "quarter", "year");

-- CreateIndex
CREATE INDEX "SrlRegistration_userId_idx" ON "SrlRegistration"("userId");

-- CreateIndex
CREATE INDEX "SrlRegistration_status_idx" ON "SrlRegistration"("status");

-- CreateIndex
CREATE INDEX "SrlRegistration_cui_idx" ON "SrlRegistration"("cui");

-- CreateIndex
CREATE INDEX "Shareholder_registrationId_idx" ON "Shareholder"("registrationId");

-- CreateIndex
CREATE INDEX "Administrator_registrationId_idx" ON "Administrator"("registrationId");

-- CreateIndex
CREATE INDEX "CompanyActivity_registrationId_idx" ON "CompanyActivity"("registrationId");

-- CreateIndex
CREATE INDEX "CompanyActivity_caenCode_idx" ON "CompanyActivity"("caenCode");

-- CreateIndex
CREATE UNIQUE INDEX "PfaRegistration_cnp_key" ON "PfaRegistration"("cnp");

-- CreateIndex
CREATE INDEX "PfaRegistration_userId_idx" ON "PfaRegistration"("userId");

-- CreateIndex
CREATE INDEX "PfaRegistration_status_idx" ON "PfaRegistration"("status");

-- CreateIndex
CREATE INDEX "PfaRegistration_cnp_idx" ON "PfaRegistration"("cnp");

-- CreateIndex
CREATE INDEX "PfaRegistration_cui_idx" ON "PfaRegistration"("cui");

-- CreateIndex
CREATE INDEX "PfaActivity_registrationId_idx" ON "PfaActivity"("registrationId");

-- CreateIndex
CREATE INDEX "Timesheet_employeeId_idx" ON "Timesheet"("employeeId");

-- CreateIndex
CREATE INDEX "Timesheet_date_idx" ON "Timesheet"("date");

-- CreateIndex
CREATE INDEX "Timesheet_status_idx" ON "Timesheet"("status");

-- CreateIndex
CREATE INDEX "Partner_userId_idx" ON "Partner"("userId");

-- CreateIndex
CREATE INDEX "Partner_organizationId_idx" ON "Partner"("organizationId");

-- CreateIndex
CREATE INDEX "Partner_type_idx" ON "Partner"("type");

-- CreateIndex
CREATE INDEX "Partner_name_idx" ON "Partner"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Partner_userId_cui_key" ON "Partner"("userId", "cui");

-- CreateIndex
CREATE INDEX "Consent_userId_idx" ON "Consent"("userId");

-- CreateIndex
CREATE INDEX "Consent_purpose_idx" ON "Consent"("purpose");

-- CreateIndex
CREATE UNIQUE INDEX "Consent_userId_purpose_key" ON "Consent"("userId", "purpose");

-- CreateIndex
CREATE INDEX "DSRRequest_userId_idx" ON "DSRRequest"("userId");

-- CreateIndex
CREATE INDEX "DSRRequest_status_idx" ON "DSRRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SpvToken_userId_key" ON "SpvToken"("userId");

-- CreateIndex
CREATE INDEX "SpvToken_organizationId_idx" ON "SpvToken"("organizationId");

-- CreateIndex
CREATE INDEX "SpvToken_cui_idx" ON "SpvToken"("cui");

-- CreateIndex
CREATE INDEX "SpvToken_status_idx" ON "SpvToken"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SpvMessage_messageId_key" ON "SpvMessage"("messageId");

-- CreateIndex
CREATE INDEX "SpvMessage_userId_idx" ON "SpvMessage"("userId");

-- CreateIndex
CREATE INDEX "SpvMessage_organizationId_idx" ON "SpvMessage"("organizationId");

-- CreateIndex
CREATE INDEX "SpvMessage_cui_idx" ON "SpvMessage"("cui");

-- CreateIndex
CREATE INDEX "SpvMessage_status_idx" ON "SpvMessage"("status");

-- CreateIndex
CREATE INDEX "SpvMessage_messageType_idx" ON "SpvMessage"("messageType");

-- CreateIndex
CREATE INDEX "SpvMessage_anafCreatedAt_idx" ON "SpvMessage"("anafCreatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SpvSubmission_uploadIndex_key" ON "SpvSubmission"("uploadIndex");

-- CreateIndex
CREATE INDEX "SpvSubmission_userId_idx" ON "SpvSubmission"("userId");

-- CreateIndex
CREATE INDEX "SpvSubmission_organizationId_idx" ON "SpvSubmission"("organizationId");

-- CreateIndex
CREATE INDEX "SpvSubmission_cui_idx" ON "SpvSubmission"("cui");

-- CreateIndex
CREATE INDEX "SpvSubmission_status_idx" ON "SpvSubmission"("status");

-- CreateIndex
CREATE INDEX "SpvSubmission_submissionType_idx" ON "SpvSubmission"("submissionType");

-- CreateIndex
CREATE INDEX "SpvSubmission_uploadIndex_idx" ON "SpvSubmission"("uploadIndex");

-- CreateIndex
CREATE INDEX "SpvSubmission_submittedAt_idx" ON "SpvSubmission"("submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_licensePlate_key" ON "Vehicle"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "Vehicle_vin_key" ON "Vehicle"("vin");

-- CreateIndex
CREATE INDEX "Vehicle_userId_idx" ON "Vehicle"("userId");

-- CreateIndex
CREATE INDEX "Vehicle_organizationId_idx" ON "Vehicle"("organizationId");

-- CreateIndex
CREATE INDEX "Vehicle_licensePlate_idx" ON "Vehicle"("licensePlate");

-- CreateIndex
CREATE INDEX "Vehicle_status_idx" ON "Vehicle"("status");

-- CreateIndex
CREATE INDEX "Vehicle_assignedDriverId_idx" ON "Vehicle"("assignedDriverId");

-- CreateIndex
CREATE INDEX "DeliveryRoute_userId_idx" ON "DeliveryRoute"("userId");

-- CreateIndex
CREATE INDEX "DeliveryRoute_organizationId_idx" ON "DeliveryRoute"("organizationId");

-- CreateIndex
CREATE INDEX "DeliveryRoute_vehicleId_idx" ON "DeliveryRoute"("vehicleId");

-- CreateIndex
CREATE INDEX "DeliveryRoute_driverId_idx" ON "DeliveryRoute"("driverId");

-- CreateIndex
CREATE INDEX "DeliveryRoute_routeDate_idx" ON "DeliveryRoute"("routeDate");

-- CreateIndex
CREATE INDEX "DeliveryRoute_status_idx" ON "DeliveryRoute"("status");

-- CreateIndex
CREATE INDEX "DeliveryStop_routeId_idx" ON "DeliveryStop"("routeId");

-- CreateIndex
CREATE INDEX "DeliveryStop_status_idx" ON "DeliveryStop"("status");

-- CreateIndex
CREATE INDEX "DeliveryStop_postalCode_idx" ON "DeliveryStop"("postalCode");

-- CreateIndex
CREATE INDEX "FuelLog_vehicleId_idx" ON "FuelLog"("vehicleId");

-- CreateIndex
CREATE INDEX "FuelLog_fueledAt_idx" ON "FuelLog"("fueledAt");

-- CreateIndex
CREATE INDEX "MaintenanceLog_vehicleId_idx" ON "MaintenanceLog"("vehicleId");

-- CreateIndex
CREATE INDEX "MaintenanceLog_serviceDate_idx" ON "MaintenanceLog"("serviceDate");

-- CreateIndex
CREATE INDEX "MaintenanceLog_type_idx" ON "MaintenanceLog"("type");

-- CreateIndex
CREATE INDEX "CourierDelivery_userId_idx" ON "CourierDelivery"("userId");

-- CreateIndex
CREATE INDEX "CourierDelivery_provider_idx" ON "CourierDelivery"("provider");

-- CreateIndex
CREATE INDEX "CourierDelivery_status_idx" ON "CourierDelivery"("status");

-- CreateIndex
CREATE INDEX "CourierDelivery_createdAt_idx" ON "CourierDelivery"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CourierDelivery_trackingNumber_provider_key" ON "CourierDelivery"("trackingNumber", "provider");

-- CreateIndex
CREATE INDEX "VehiclePosition_vehicleId_idx" ON "VehiclePosition"("vehicleId");

-- CreateIndex
CREATE INDEX "VehiclePosition_recordedAt_idx" ON "VehiclePosition"("recordedAt");

-- CreateIndex
CREATE INDEX "VehiclePosition_routeId_idx" ON "VehiclePosition"("routeId");

-- CreateIndex
CREATE INDEX "Geofence_userId_idx" ON "Geofence"("userId");

-- CreateIndex
CREATE INDEX "Geofence_organizationId_idx" ON "Geofence"("organizationId");

-- CreateIndex
CREATE INDEX "Geofence_isActive_idx" ON "Geofence"("isActive");

-- CreateIndex
CREATE INDEX "GeofenceEvent_geofenceId_idx" ON "GeofenceEvent"("geofenceId");

-- CreateIndex
CREATE INDEX "GeofenceEvent_vehicleId_idx" ON "GeofenceEvent"("vehicleId");

-- CreateIndex
CREATE INDEX "GeofenceEvent_occurredAt_idx" ON "GeofenceEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "HRContract_userId_idx" ON "HRContract"("userId");

-- CreateIndex
CREATE INDEX "HRContract_employeeId_idx" ON "HRContract"("employeeId");

-- CreateIndex
CREATE INDEX "HRContract_status_idx" ON "HRContract"("status");

-- CreateIndex
CREATE INDEX "HRContractAmendment_contractId_idx" ON "HRContractAmendment"("contractId");

-- CreateIndex
CREATE INDEX "HRForm_userId_idx" ON "HRForm"("userId");

-- CreateIndex
CREATE INDEX "HRForm_type_idx" ON "HRForm"("type");

-- CreateIndex
CREATE INDEX "HRForm_status_idx" ON "HRForm"("status");

-- CreateIndex
CREATE INDEX "HSEIncident_userId_idx" ON "HSEIncident"("userId");

-- CreateIndex
CREATE INDEX "HSEIncident_severity_idx" ON "HSEIncident"("severity");

-- CreateIndex
CREATE INDEX "HSEIncident_status_idx" ON "HSEIncident"("status");

-- CreateIndex
CREATE INDEX "HSERiskAssessment_userId_idx" ON "HSERiskAssessment"("userId");

-- CreateIndex
CREATE INDEX "HSERiskAssessment_riskLevel_idx" ON "HSERiskAssessment"("riskLevel");

-- CreateIndex
CREATE INDEX "HSERiskAssessment_status_idx" ON "HSERiskAssessment"("status");

-- CreateIndex
CREATE INDEX "HSESafetyTraining_userId_idx" ON "HSESafetyTraining"("userId");

-- CreateIndex
CREATE INDEX "HSESafetyTraining_employeeId_idx" ON "HSESafetyTraining"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "LMSCourse_slug_key" ON "LMSCourse"("slug");

-- CreateIndex
CREATE INDEX "LMSCourse_category_idx" ON "LMSCourse"("category");

-- CreateIndex
CREATE INDEX "LMSCourse_status_idx" ON "LMSCourse"("status");

-- CreateIndex
CREATE INDEX "LMSCourseModule_courseId_idx" ON "LMSCourseModule"("courseId");

-- CreateIndex
CREATE INDEX "LMSLesson_moduleId_idx" ON "LMSLesson"("moduleId");

-- CreateIndex
CREATE INDEX "LMSEnrollment_userId_idx" ON "LMSEnrollment"("userId");

-- CreateIndex
CREATE INDEX "LMSEnrollment_courseId_idx" ON "LMSEnrollment"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "LMSEnrollment_userId_courseId_key" ON "LMSEnrollment"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "LMSLessonProgress_enrollmentId_lessonId_key" ON "LMSLessonProgress"("enrollmentId", "lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "FreelancerProfile_email_key" ON "FreelancerProfile"("email");

-- CreateIndex
CREATE INDEX "FreelancerProfile_userId_idx" ON "FreelancerProfile"("userId");

-- CreateIndex
CREATE INDEX "FreelancerProfile_availability_idx" ON "FreelancerProfile"("availability");

-- CreateIndex
CREATE INDEX "FreelanceProjectAssignment_userId_idx" ON "FreelanceProjectAssignment"("userId");

-- CreateIndex
CREATE INDEX "FreelanceProjectAssignment_freelancerId_idx" ON "FreelanceProjectAssignment"("freelancerId");

-- CreateIndex
CREATE INDEX "FreelanceProjectAssignment_status_idx" ON "FreelanceProjectAssignment"("status");

-- CreateIndex
CREATE INDEX "FreelanceProjectMilestone_projectId_idx" ON "FreelanceProjectMilestone"("projectId");

-- CreateIndex
CREATE INDEX "FreelancerContract_freelancerId_idx" ON "FreelancerContract"("freelancerId");

-- CreateIndex
CREATE INDEX "FreelanceTimeEntry_projectId_idx" ON "FreelanceTimeEntry"("projectId");

-- CreateIndex
CREATE INDEX "FreelanceTimeEntry_freelancerId_idx" ON "FreelanceTimeEntry"("freelancerId");

-- CreateIndex
CREATE UNIQUE INDEX "ForumCategory_slug_key" ON "ForumCategory"("slug");

-- CreateIndex
CREATE INDEX "ForumCategory_isActive_idx" ON "ForumCategory"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ForumThread_slug_key" ON "ForumThread"("slug");

-- CreateIndex
CREATE INDEX "ForumThread_categoryId_idx" ON "ForumThread"("categoryId");

-- CreateIndex
CREATE INDEX "ForumThread_authorId_idx" ON "ForumThread"("authorId");

-- CreateIndex
CREATE INDEX "ForumThread_isPinned_idx" ON "ForumThread"("isPinned");

-- CreateIndex
CREATE INDEX "ForumPost_threadId_idx" ON "ForumPost"("threadId");

-- CreateIndex
CREATE INDEX "ForumPost_authorId_idx" ON "ForumPost"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "BlogCategory_slug_key" ON "BlogCategory"("slug");

-- CreateIndex
CREATE INDEX "BlogCategory_isActive_idx" ON "BlogCategory"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "BlogArticle_slug_key" ON "BlogArticle"("slug");

-- CreateIndex
CREATE INDEX "BlogArticle_categoryId_idx" ON "BlogArticle"("categoryId");

-- CreateIndex
CREATE INDEX "BlogArticle_authorId_idx" ON "BlogArticle"("authorId");

-- CreateIndex
CREATE INDEX "BlogArticle_status_idx" ON "BlogArticle"("status");

-- CreateIndex
CREATE INDEX "BlogArticle_publishedAt_idx" ON "BlogArticle"("publishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "DemoBusiness_cui_key" ON "DemoBusiness"("cui");

-- CreateIndex
CREATE INDEX "DemoBusiness_industry_idx" ON "DemoBusiness"("industry");

-- CreateIndex
CREATE INDEX "DemoBusinessContact_businessId_idx" ON "DemoBusinessContact"("businessId");

-- CreateIndex
CREATE INDEX "DemoEmployee_businessId_idx" ON "DemoEmployee"("businessId");

-- CreateIndex
CREATE INDEX "DemoEmployee_department_idx" ON "DemoEmployee"("department");

-- CreateIndex
CREATE INDEX "SyncLog_userId_idx" ON "SyncLog"("userId");

-- CreateIndex
CREATE INDEX "SyncLog_service_idx" ON "SyncLog"("service");

-- CreateIndex
CREATE INDEX "SyncLog_entityType_idx" ON "SyncLog"("entityType");

-- CreateIndex
CREATE INDEX "SyncLog_status_idx" ON "SyncLog"("status");

-- CreateIndex
CREATE INDEX "SyncLog_syncedAt_idx" ON "SyncLog"("syncedAt");

-- CreateIndex
CREATE INDEX "OrganizationIntegration_organizationId_idx" ON "OrganizationIntegration"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationIntegration_provider_idx" ON "OrganizationIntegration"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationIntegration_organizationId_provider_key" ON "OrganizationIntegration"("organizationId", "provider");

-- CreateIndex
CREATE INDEX "RecurringInvoice_organizationId_idx" ON "RecurringInvoice"("organizationId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_partnerId_idx" ON "RecurringInvoice"("partnerId");

-- CreateIndex
CREATE INDEX "RecurringInvoice_isActive_idx" ON "RecurringInvoice"("isActive");

-- CreateIndex
CREATE INDEX "RecurringInvoice_nextRunDate_idx" ON "RecurringInvoice"("nextRunDate");

-- CreateIndex
CREATE INDEX "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId");

-- CreateIndex
CREATE INDEX "Product_userId_idx" ON "Product"("userId");

-- CreateIndex
CREATE INDEX "Product_organizationId_idx" ON "Product"("organizationId");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_isActive_idx" ON "Product"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Product_userId_code_key" ON "Product"("userId", "code");

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "StockMovement"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_type_idx" ON "StockMovement"("type");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "StockAlert_productId_idx" ON "StockAlert"("productId");

-- CreateIndex
CREATE INDEX "StockAlert_userId_idx" ON "StockAlert"("userId");

-- CreateIndex
CREATE INDEX "StockAlert_status_idx" ON "StockAlert"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Contract_documentId_key" ON "Contract"("documentId");

-- CreateIndex
CREATE INDEX "Contract_userId_idx" ON "Contract"("userId");

-- CreateIndex
CREATE INDEX "Contract_partnerId_idx" ON "Contract"("partnerId");

-- CreateIndex
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

-- CreateIndex
CREATE INDEX "Contract_type_idx" ON "Contract"("type");

-- CreateIndex
CREATE INDEX "Contract_startDate_idx" ON "Contract"("startDate");

-- CreateIndex
CREATE INDEX "Contract_endDate_idx" ON "Contract"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "ContactSubmission_referenceId_key" ON "ContactSubmission"("referenceId");

-- CreateIndex
CREATE INDEX "ContactSubmission_email_idx" ON "ContactSubmission"("email");

-- CreateIndex
CREATE INDEX "ContactSubmission_status_idx" ON "ContactSubmission"("status");

-- CreateIndex
CREATE INDEX "ContactSubmission_createdAt_idx" ON "ContactSubmission"("createdAt");

-- CreateIndex
CREATE INDEX "ErrorLog_createdAt_idx" ON "ErrorLog"("createdAt");

-- CreateIndex
CREATE INDEX "ErrorLog_type_idx" ON "ErrorLog"("type");

-- CreateIndex
CREATE INDEX "ErrorLog_userId_idx" ON "ErrorLog"("userId");

-- CreateIndex
CREATE INDEX "ErrorLog_source_idx" ON "ErrorLog"("source");

-- CreateIndex
CREATE INDEX "SimulationGame_userId_idx" ON "SimulationGame"("userId");

-- CreateIndex
CREATE INDEX "SimulationGame_status_idx" ON "SimulationGame"("status");

-- CreateIndex
CREATE INDEX "SimulationGame_scenarioId_idx" ON "SimulationGame"("scenarioId");

-- CreateIndex
CREATE INDEX "SimulationState_gameId_idx" ON "SimulationState"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationState_gameId_month_year_key" ON "SimulationState"("gameId", "month", "year");

-- CreateIndex
CREATE INDEX "SimulationDecision_gameId_idx" ON "SimulationDecision"("gameId");

-- CreateIndex
CREATE INDEX "SimulationDecision_category_idx" ON "SimulationDecision"("category");

-- CreateIndex
CREATE INDEX "SimulationEvent_gameId_idx" ON "SimulationEvent"("gameId");

-- CreateIndex
CREATE INDEX "SimulationEvent_type_idx" ON "SimulationEvent"("type");

-- CreateIndex
CREATE INDEX "SimulationAchievement_gameId_idx" ON "SimulationAchievement"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationAchievement_gameId_achievementId_key" ON "SimulationAchievement"("gameId", "achievementId");

-- CreateIndex
CREATE UNIQUE INDEX "SimulationScenario_slug_key" ON "SimulationScenario"("slug");

-- CreateIndex
CREATE INDEX "SimulationScenario_type_idx" ON "SimulationScenario"("type");

-- CreateIndex
CREATE INDEX "SimulationScenario_difficulty_idx" ON "SimulationScenario"("difficulty");

-- CreateIndex
CREATE INDEX "SimulationScenario_isActive_idx" ON "SimulationScenario"("isActive");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_idx" ON "AuditLog"("organizationId");

-- CreateIndex
CREATE INDEX "AuditLog_userId_entity_createdAt_idx" ON "AuditLog"("userId", "entity", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_organizationId_action_createdAt_idx" ON "AuditLog"("organizationId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "Document_organizationId_idx" ON "Document"("organizationId");

-- CreateIndex
CREATE INDEX "Employee_organizationId_idx" ON "Employee"("organizationId");

-- CreateIndex
CREATE INDEX "Invoice_organizationId_idx" ON "Invoice"("organizationId");

-- CreateIndex
CREATE INDEX "Invoice_paymentStatus_idx" ON "Invoice"("paymentStatus");

-- CreateIndex
CREATE INDEX "Invoice_userId_type_invoiceDate_idx" ON "Invoice"("userId", "type", "invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_userId_invoiceDate_type_idx" ON "Invoice"("userId", "invoiceDate", "type");

-- CreateIndex
CREATE INDEX "Invoice_userId_type_partnerName_idx" ON "Invoice"("userId", "type", "partnerName");

-- CreateIndex
CREATE INDEX "Invoice_userId_paymentStatus_invoiceDate_idx" ON "Invoice"("userId", "paymentStatus", "invoiceDate");

-- CreateIndex
CREATE INDEX "Invoice_currency_userId_invoiceDate_idx" ON "Invoice"("currency", "userId", "invoiceDate");

-- CreateIndex
CREATE INDEX "OCRTemplate_organizationId_idx" ON "OCRTemplate"("organizationId");

-- CreateIndex
CREATE INDEX "SAFTReport_organizationId_idx" ON "SAFTReport"("organizationId");

-- CreateIndex
CREATE INDEX "SAFTReport_status_period_idx" ON "SAFTReport"("status", "period");

-- CreateIndex
CREATE INDEX "SAFTReport_userId_status_submittedAt_idx" ON "SAFTReport"("userId", "status", "submittedAt");

-- CreateIndex
CREATE INDEX "SAFTReport_organizationId_period_status_idx" ON "SAFTReport"("organizationId", "period", "status");

-- CreateIndex
CREATE INDEX "SAFTReport_reportType_status_idx" ON "SAFTReport"("reportType", "status");

-- CreateIndex
CREATE INDEX "User_activeOrganizationId_idx" ON "User"("activeOrganizationId");

-- CreateIndex
CREATE INDEX "VATReport_organizationId_idx" ON "VATReport"("organizationId");

-- CreateIndex
CREATE INDEX "VATReport_period_userId_idx" ON "VATReport"("period", "userId");

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardPreferences" ADD CONSTRAINT "DashboardPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_recurringInvoiceId_fkey" FOREIGN KEY ("recurringInvoiceId") REFERENCES "RecurringInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VATReport" ADD CONSTRAINT "VATReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SAFTReport" ADD CONSTRAINT "SAFTReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VatD300Declaration" ADD CONSTRAINT "VatD300Declaration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VatD394Declaration" ADD CONSTRAINT "VatD394Declaration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SrlRegistration" ADD CONSTRAINT "SrlRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shareholder" ADD CONSTRAINT "Shareholder_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "SrlRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Administrator" ADD CONSTRAINT "Administrator_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "SrlRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyActivity" ADD CONSTRAINT "CompanyActivity_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "SrlRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PfaRegistration" ADD CONSTRAINT "PfaRegistration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PfaActivity" ADD CONSTRAINT "PfaActivity_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "PfaRegistration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Timesheet" ADD CONSTRAINT "Timesheet_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Partner" ADD CONSTRAINT "Partner_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DSRRequest" ADD CONSTRAINT "DSRRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OCRTemplate" ADD CONSTRAINT "OCRTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpvToken" ADD CONSTRAINT "SpvToken_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpvMessage" ADD CONSTRAINT "SpvMessage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpvSubmission" ADD CONSTRAINT "SpvSubmission_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_assignedDriverId_fkey" FOREIGN KEY ("assignedDriverId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRoute" ADD CONSTRAINT "DeliveryRoute_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryRoute" ADD CONSTRAINT "DeliveryRoute_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeliveryStop" ADD CONSTRAINT "DeliveryStop_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "DeliveryRoute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelLog" ADD CONSTRAINT "FuelLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceLog" ADD CONSTRAINT "MaintenanceLog_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePosition" ADD CONSTRAINT "VehiclePosition_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceEvent" ADD CONSTRAINT "GeofenceEvent_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "Geofence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRContract" ADD CONSTRAINT "HRContract_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRContractAmendment" ADD CONSTRAINT "HRContractAmendment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "HRContract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HRForm" ADD CONSTRAINT "HRForm_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HSEIncident" ADD CONSTRAINT "HSEIncident_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HSESafetyTraining" ADD CONSTRAINT "HSESafetyTraining_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LMSCourseModule" ADD CONSTRAINT "LMSCourseModule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LMSCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LMSLesson" ADD CONSTRAINT "LMSLesson_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "LMSCourseModule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LMSEnrollment" ADD CONSTRAINT "LMSEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "LMSCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LMSLessonProgress" ADD CONSTRAINT "LMSLessonProgress_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "LMSEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LMSLessonProgress" ADD CONSTRAINT "LMSLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LMSLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceProjectAssignment" ADD CONSTRAINT "FreelanceProjectAssignment_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceProjectMilestone" ADD CONSTRAINT "FreelanceProjectMilestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FreelanceProjectAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelancerContract" ADD CONSTRAINT "FreelancerContract_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "FreelancerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FreelanceTimeEntry" ADD CONSTRAINT "FreelanceTimeEntry_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "FreelanceProjectAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumThread" ADD CONSTRAINT "ForumThread_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ForumCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "ForumThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ForumPost" ADD CONSTRAINT "ForumPost_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ForumPost"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BlogArticle" ADD CONSTRAINT "BlogArticle_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BlogCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoBusinessContact" ADD CONSTRAINT "DemoBusinessContact_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "DemoBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DemoEmployee" ADD CONSTRAINT "DemoEmployee_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "DemoBusiness"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationIntegration" ADD CONSTRAINT "OrganizationIntegration_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringInvoice" ADD CONSTRAINT "RecurringInvoice_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceItem" ADD CONSTRAINT "InvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAlert" ADD CONSTRAINT "StockAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationGame" ADD CONSTRAINT "SimulationGame_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "SimulationScenario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationState" ADD CONSTRAINT "SimulationState_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SimulationGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationDecision" ADD CONSTRAINT "SimulationDecision_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SimulationGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationEvent" ADD CONSTRAINT "SimulationEvent_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SimulationGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationAchievement" ADD CONSTRAINT "SimulationAchievement_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "SimulationGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
