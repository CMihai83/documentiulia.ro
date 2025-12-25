import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// HSE Training & Certification Management Service
// Compliant with Romanian SSM (Legea 319/2006) and ISO 45001:2018

// Training Types per Romanian SSM legislation
export type TrainingType =
  | 'GENERAL_INDUCTION'       // Instructaj general introductiv
  | 'WORKPLACE_INDUCTION'     // Instructaj la locul de muncă
  | 'PERIODIC'                // Instructaj periodic
  | 'TASK_SPECIFIC'           // Instructaj specific
  | 'FIRST_AID'               // Prim ajutor
  | 'FIRE_SAFETY'             // PSI - Prevenirea și stingerea incendiilor
  | 'EMERGENCY_RESPONSE'      // Răspuns la urgențe
  | 'PPE_USAGE'               // Utilizare EIP
  | 'HAZMAT_HANDLING'         // Manipulare substanțe periculoase
  | 'CONFINED_SPACE'          // Spații închise
  | 'WORKING_AT_HEIGHT'       // Lucru la înălțime
  | 'ELECTRICAL_SAFETY'       // Securitate electrică
  | 'MANUAL_HANDLING'         // Manipulare manuală sarcini
  | 'MACHINE_OPERATION'       // Operare utilaje
  | 'FORKLIFT'                // Motostivuitor
  | 'CRANE_OPERATION'         // Operare macara
  | 'SUPERVISOR_SSM'          // Formare supervizor SSM
  | 'COMMITTEE_MEMBER'        // Membru CSSM
  | 'INTERNAL_AUDITOR'        // Auditor intern ISO 45001
  | 'MANAGEMENT_REVIEW';      // Analiza de management

export type TrainingStatus = 'DRAFT' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type CertificationType = 'INTERNAL' | 'EXTERNAL' | 'REGULATORY' | 'VENDOR';
export type CertificationStatus = 'ACTIVE' | 'EXPIRED' | 'EXPIRING_SOON' | 'REVOKED' | 'PENDING_RENEWAL';
export type CompetencyLevel = 'NONE' | 'AWARENESS' | 'BASIC' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
export type InductionPhase = 'NOT_STARTED' | 'GENERAL' | 'DEPARTMENT' | 'WORKPLACE' | 'COMPLETED';

export interface TrainingCourse {
  id: string;
  code: string;
  name: string;
  description: string;
  type: TrainingType;
  durationHours: number;
  validityMonths: number;  // How long certification is valid (per SSM legislation)
  mandatory: boolean;
  targetRoles: string[];   // Which job roles require this training
  prerequisites: string[]; // Course IDs required before this
  content: CourseContent;
  assessmentRequired: boolean;
  passingScore: number;    // Percentage required to pass
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

export interface CourseContent {
  modules: CourseModule[];
  totalDuration: number;
  materials: CourseMaterial[];
}

export interface CourseModule {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  content: string;
  videoUrl?: string;
  order: number;
}

export interface CourseMaterial {
  id: string;
  name: string;
  type: 'PDF' | 'VIDEO' | 'PRESENTATION' | 'DOCUMENT' | 'LINK';
  url: string;
  mandatory: boolean;
}

export interface TrainingSession {
  id: string;
  courseId: string;
  title: string;
  description: string;
  scheduledDate: Date;
  endDate: Date;
  location: string;
  locationId?: string;
  instructor: InstructorInfo;
  maxParticipants: number;
  participants: SessionParticipant[];
  status: TrainingStatus;
  language: 'RO' | 'EN';
  notes: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface InstructorInfo {
  id: string;
  name: string;
  email: string;
  qualifications: string[];
  internal: boolean;
  companyName?: string;
}

export interface SessionParticipant {
  employeeId: string;
  name: string;
  department: string;
  enrolledAt: Date;
  attended: boolean;
  attendanceTime?: Date;
  assessmentScore?: number;
  passed?: boolean;
  certificateId?: string;
  notes?: string;
}

export interface TrainingRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  courseId: string;
  courseName: string;
  sessionId?: string;
  trainingType: TrainingType;
  completedDate: Date;
  expiryDate: Date;
  score?: number;
  passed: boolean;
  instructorName: string;
  certificateNumber?: string;
  documentUrl?: string;
  notes: string;
}

export interface Certification {
  id: string;
  employeeId: string;
  employeeName: string;
  certificationName: string;
  certificationNumber: string;
  type: CertificationType;
  issuingBody: string;
  issueDate: Date;
  expiryDate: Date;
  status: CertificationStatus;
  relatedCourseId?: string;
  documentUrl?: string;
  reminderSent: boolean;
  renewalInProgress: boolean;
  notes: string;
}

export interface CompetencyMatrix {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  jobRole: string;
  competencies: CompetencyItem[];
  overallScore: number;
  lastAssessedAt: Date;
  nextAssessmentDue: Date;
}

export interface CompetencyItem {
  competencyId: string;
  competencyName: string;
  category: string;
  requiredLevel: CompetencyLevel;
  currentLevel: CompetencyLevel;
  gap: number;  // Negative means below required
  trainingNeeded: string[];  // Course IDs to address gap
  lastUpdated: Date;
  evidence: string[];
}

export interface InductionProgram {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: Date;
  targetCompletionDate: Date;
  currentPhase: InductionPhase;
  department: string;
  supervisor: string;
  hrContact: string;
  phases: InductionPhaseRecord[];
  documents: InductionDocument[];
  completedAt?: Date;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE' | 'EXTENDED';
}

export interface InductionPhaseRecord {
  phase: InductionPhase;
  name: string;
  description: string;
  trainings: string[];  // Training record IDs
  checklistItems: InductionChecklistItem[];
  startedAt?: Date;
  completedAt?: Date;
  signedOffBy?: string;
  notes: string;
}

export interface InductionChecklistItem {
  id: string;
  item: string;
  category: string;
  mandatory: boolean;
  completed: boolean;
  completedAt?: Date;
  completedBy?: string;
  evidence?: string;
}

export interface InductionDocument {
  id: string;
  name: string;
  type: 'POLICY_ACKNOWLEDGMENT' | 'EMERGENCY_CONTACTS' | 'PPE_ISSUE' | 'ACCESS_CARD' | 'IT_SETUP' | 'OTHER';
  signed: boolean;
  signedAt?: Date;
  documentUrl?: string;
}

export interface SSMTrainingLog {
  id: string;
  generatedAt: Date;
  period: { from: Date; to: Date };
  locationId?: string;
  locationName?: string;
  department?: string;
  entries: SSMLogEntry[];
  totalParticipants: number;
  totalHours: number;
  summary: SSMLogSummary;
  signature?: {
    preparedBy: string;
    approvedBy: string;
    date: Date;
  };
}

export interface SSMLogEntry {
  date: Date;
  trainingType: TrainingType;
  courseName: string;
  instructor: string;
  participants: {
    employeeId: string;
    name: string;
    department: string;
    signature: string;
  }[];
  durationHours: number;
  topics: string[];
  observations: string;
}

export interface SSMLogSummary {
  byTrainingType: Record<TrainingType, { count: number; hours: number; participants: number }>;
  byDepartment: Record<string, { count: number; hours: number }>;
  complianceRate: number;
}

export interface TrainingAlert {
  id: string;
  type: 'EXPIRING_CERTIFICATION' | 'OVERDUE_TRAINING' | 'INDUCTION_DELAY' | 'COMPETENCY_GAP' | 'PERIODIC_DUE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  employeeId?: string;
  employeeName?: string;
  message: string;
  dueDate?: Date;
  relatedEntityId?: string;
  relatedEntityType?: string;
  createdAt: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

export interface TrainingDashboard {
  totalEmployees: number;
  trainingCompliance: {
    compliant: number;
    nonCompliant: number;
    percentage: number;
  };
  upcomingSessions: number;
  expiringCertifications: {
    next30Days: number;
    next60Days: number;
    next90Days: number;
  };
  inductionsInProgress: number;
  averageCompetencyScore: number;
  trainingHoursThisMonth: number;
  alerts: TrainingAlert[];
}

@Injectable()
export class HSETrainingService {
  // In-memory storage for demonstration
  private courses: Map<string, TrainingCourse> = new Map();
  private sessions: Map<string, TrainingSession> = new Map();
  private trainingRecords: Map<string, TrainingRecord> = new Map();
  private certifications: Map<string, Certification> = new Map();
  private competencyMatrices: Map<string, CompetencyMatrix> = new Map();
  private inductionPrograms: Map<string, InductionProgram> = new Map();
  private alerts: Map<string, TrainingAlert> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeDefaultCourses();
  }

  private initializeDefaultCourses(): void {
    // Romanian SSM mandatory courses per Legea 319/2006
    const mandatoryCourses: Partial<TrainingCourse>[] = [
      {
        code: 'SSM-GI-001',
        name: 'Instructaj General Introductiv SSM',
        description: 'Instructaj obligatoriu la angajare conform art. 20 Legea 319/2006',
        type: 'GENERAL_INDUCTION',
        durationHours: 8,
        validityMonths: 0,  // One-time at hiring
        mandatory: true,
        targetRoles: ['ALL'],
        prerequisites: [],
        assessmentRequired: true,
        passingScore: 70,
      },
      {
        code: 'SSM-WI-001',
        name: 'Instructaj la Locul de Muncă',
        description: 'Instructaj specific postului de lucru',
        type: 'WORKPLACE_INDUCTION',
        durationHours: 4,
        validityMonths: 0,  // One-time per position
        mandatory: true,
        targetRoles: ['ALL'],
        prerequisites: ['SSM-GI-001'],
        assessmentRequired: true,
        passingScore: 70,
      },
      {
        code: 'SSM-PER-001',
        name: 'Instructaj Periodic SSM',
        description: 'Instructaj periodic trimestrial/semestrial conform legislației',
        type: 'PERIODIC',
        durationHours: 2,
        validityMonths: 3,  // Quarterly for hazardous, 6 months for others
        mandatory: true,
        targetRoles: ['ALL'],
        prerequisites: ['SSM-GI-001', 'SSM-WI-001'],
        assessmentRequired: true,
        passingScore: 70,
      },
      {
        code: 'PSI-001',
        name: 'Prevenirea și Stingerea Incendiilor',
        description: 'Instructaj PSI conform Legea 307/2006',
        type: 'FIRE_SAFETY',
        durationHours: 4,
        validityMonths: 12,
        mandatory: true,
        targetRoles: ['ALL'],
        prerequisites: [],
        assessmentRequired: true,
        passingScore: 70,
      },
      {
        code: 'FA-001',
        name: 'Prim Ajutor de Bază',
        description: 'Curs de prim ajutor conform standardelor',
        type: 'FIRST_AID',
        durationHours: 16,
        validityMonths: 24,
        mandatory: false,
        targetRoles: ['FIRST_AIDER', 'SUPERVISOR', 'MANAGER'],
        prerequisites: [],
        assessmentRequired: true,
        passingScore: 80,
      },
      {
        code: 'WAH-001',
        name: 'Lucru la Înălțime',
        description: 'Autorizare lucru la înălțime peste 2m',
        type: 'WORKING_AT_HEIGHT',
        durationHours: 16,
        validityMonths: 24,
        mandatory: false,
        targetRoles: ['MAINTENANCE', 'CONSTRUCTION', 'TECHNICIAN'],
        prerequisites: ['SSM-GI-001'],
        assessmentRequired: true,
        passingScore: 80,
      },
      {
        code: 'FORK-001',
        name: 'Operator Motostivuitor',
        description: 'Autorizare ISCIR pentru operare motostivuitor',
        type: 'FORKLIFT',
        durationHours: 40,
        validityMonths: 24,
        mandatory: false,
        targetRoles: ['WAREHOUSE', 'LOGISTICS'],
        prerequisites: ['SSM-GI-001'],
        assessmentRequired: true,
        passingScore: 85,
      },
      {
        code: 'ELEC-001',
        name: 'Securitate Electrică',
        description: 'Autorizare ANRE pentru lucrări electrice',
        type: 'ELECTRICAL_SAFETY',
        durationHours: 40,
        validityMonths: 24,
        mandatory: false,
        targetRoles: ['ELECTRICIAN', 'MAINTENANCE'],
        prerequisites: ['SSM-GI-001'],
        assessmentRequired: true,
        passingScore: 85,
      },
    ];

    mandatoryCourses.forEach((course, index) => {
      const id = `course-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
      this.courses.set(id, {
        id,
        ...course,
        content: {
          modules: [],
          totalDuration: course.durationHours! * 60,
          materials: [],
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      } as TrainingCourse);
    });
  }

  // Reset state for testing
  resetState(): void {
    this.courses.clear();
    this.sessions.clear();
    this.trainingRecords.clear();
    this.certifications.clear();
    this.competencyMatrices.clear();
    this.inductionPrograms.clear();
    this.alerts.clear();
    this.initializeDefaultCourses();
  }

  // ===== COURSE MANAGEMENT =====

  async createCourse(data: {
    code: string;
    name: string;
    description: string;
    type: TrainingType;
    durationHours: number;
    validityMonths: number;
    mandatory: boolean;
    targetRoles: string[];
    prerequisites?: string[];
    assessmentRequired: boolean;
    passingScore: number;
  }): Promise<TrainingCourse> {
    const id = `course-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const course: TrainingCourse = {
      id,
      code: data.code,
      name: data.name,
      description: data.description,
      type: data.type,
      durationHours: data.durationHours,
      validityMonths: data.validityMonths,
      mandatory: data.mandatory,
      targetRoles: data.targetRoles,
      prerequisites: data.prerequisites || [],
      content: {
        modules: [],
        totalDuration: data.durationHours * 60,
        materials: [],
      },
      assessmentRequired: data.assessmentRequired,
      passingScore: data.passingScore,
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
    };

    this.courses.set(id, course);
    return course;
  }

  async getCourse(courseId: string): Promise<TrainingCourse | null> {
    return this.courses.get(courseId) || null;
  }

  async listCourses(filters?: {
    type?: TrainingType;
    mandatory?: boolean;
    role?: string;
    active?: boolean;
  }): Promise<TrainingCourse[]> {
    let courses = Array.from(this.courses.values());

    if (filters) {
      if (filters.type) {
        courses = courses.filter(c => c.type === filters.type);
      }
      if (filters.mandatory !== undefined) {
        courses = courses.filter(c => c.mandatory === filters.mandatory);
      }
      if (filters.role) {
        courses = courses.filter(c =>
          c.targetRoles.includes('ALL') || c.targetRoles.includes(filters.role!)
        );
      }
      if (filters.active !== undefined) {
        courses = courses.filter(c => c.isActive === filters.active);
      }
    }

    return courses;
  }

  async updateCourse(courseId: string, data: Partial<TrainingCourse>): Promise<TrainingCourse> {
    const course = this.courses.get(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const updated = {
      ...course,
      ...data,
      id: course.id,
      createdAt: course.createdAt,
      updatedAt: new Date(),
    };

    this.courses.set(courseId, updated);
    return updated;
  }

  async addModuleToCourse(courseId: string, module: Omit<CourseModule, 'id'>): Promise<TrainingCourse> {
    const course = this.courses.get(courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const moduleId = `module-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    course.content.modules.push({
      id: moduleId,
      ...module,
    });
    course.content.totalDuration = course.content.modules.reduce((sum, m) => sum + m.durationMinutes, 0);
    course.updatedAt = new Date();

    return course;
  }

  // ===== TRAINING SESSIONS =====

  async createSession(data: {
    courseId: string;
    title: string;
    description: string;
    scheduledDate: Date;
    endDate: Date;
    location: string;
    locationId?: string;
    instructor: InstructorInfo;
    maxParticipants: number;
    language?: 'RO' | 'EN';
    notes?: string;
  }): Promise<TrainingSession> {
    const course = this.courses.get(data.courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const session: TrainingSession = {
      id,
      courseId: data.courseId,
      title: data.title || course.name,
      description: data.description || course.description,
      scheduledDate: data.scheduledDate,
      endDate: data.endDate,
      location: data.location,
      locationId: data.locationId,
      instructor: data.instructor,
      maxParticipants: data.maxParticipants,
      participants: [],
      status: 'SCHEDULED',
      language: data.language || 'RO',
      notes: data.notes || '',
      createdAt: new Date(),
    };

    this.sessions.set(id, session);
    return session;
  }

  async getSession(sessionId: string): Promise<TrainingSession | null> {
    return this.sessions.get(sessionId) || null;
  }

  async listSessions(filters?: {
    courseId?: string;
    status?: TrainingStatus;
    fromDate?: Date;
    toDate?: Date;
    instructorId?: string;
  }): Promise<TrainingSession[]> {
    let sessions = Array.from(this.sessions.values());

    if (filters) {
      if (filters.courseId) {
        sessions = sessions.filter(s => s.courseId === filters.courseId);
      }
      if (filters.status) {
        sessions = sessions.filter(s => s.status === filters.status);
      }
      if (filters.fromDate) {
        sessions = sessions.filter(s => s.scheduledDate >= filters.fromDate!);
      }
      if (filters.toDate) {
        sessions = sessions.filter(s => s.scheduledDate <= filters.toDate!);
      }
      if (filters.instructorId) {
        sessions = sessions.filter(s => s.instructor.id === filters.instructorId);
      }
    }

    return sessions.sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  async enrollParticipant(sessionId: string, participant: Omit<SessionParticipant, 'enrolledAt' | 'attended'>): Promise<TrainingSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (session.participants.length >= session.maxParticipants) {
      throw new Error('Session is full');
    }

    if (session.participants.some(p => p.employeeId === participant.employeeId)) {
      throw new Error('Participant already enrolled');
    }

    session.participants.push({
      ...participant,
      enrolledAt: new Date(),
      attended: false,
    });

    return session;
  }

  async recordAttendance(sessionId: string, employeeId: string, attended: boolean): Promise<TrainingSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const participant = session.participants.find(p => p.employeeId === employeeId);
    if (!participant) {
      throw new Error('Participant not found in session');
    }

    participant.attended = attended;
    if (attended) {
      participant.attendanceTime = new Date();
    }

    return session;
  }

  async recordAssessmentResult(sessionId: string, employeeId: string, score: number): Promise<{ participant: SessionParticipant; trainingRecord?: TrainingRecord }> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const course = this.courses.get(session.courseId);
    if (!course) {
      throw new Error('Course not found');
    }

    const participant = session.participants.find(p => p.employeeId === employeeId);
    if (!participant) {
      throw new Error('Participant not found');
    }

    participant.assessmentScore = score;
    participant.passed = score >= course.passingScore;

    // If passed and attended, create training record
    let trainingRecord: TrainingRecord | undefined;
    if (participant.passed && participant.attended) {
      trainingRecord = await this.createTrainingRecord({
        employeeId: participant.employeeId,
        employeeName: participant.name,
        courseId: course.id,
        courseName: course.name,
        sessionId: session.id,
        trainingType: course.type,
        score: score,
        passed: true,
        instructorName: session.instructor.name,
        notes: '',
      });
      participant.certificateId = trainingRecord.certificateNumber;
    }

    return { participant, trainingRecord };
  }

  async completeSession(sessionId: string): Promise<TrainingSession> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.status = 'COMPLETED';
    session.completedAt = new Date();

    return session;
  }

  // ===== TRAINING RECORDS =====

  async createTrainingRecord(data: {
    employeeId: string;
    employeeName: string;
    courseId: string;
    courseName: string;
    sessionId?: string;
    trainingType: TrainingType;
    score?: number;
    passed: boolean;
    instructorName: string;
    notes: string;
  }): Promise<TrainingRecord> {
    const course = this.courses.get(data.courseId);
    const id = `record-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const completedDate = new Date();
    let expiryDate = new Date(completedDate);

    if (course && course.validityMonths > 0) {
      expiryDate.setMonth(expiryDate.getMonth() + course.validityMonths);
    } else {
      // For one-time trainings, set far future expiry
      expiryDate.setFullYear(expiryDate.getFullYear() + 100);
    }

    const certificateNumber = data.passed
      ? `CERT-${data.trainingType.substr(0, 3)}-${Date.now().toString(36).toUpperCase()}`
      : undefined;

    const record: TrainingRecord = {
      id,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      courseId: data.courseId,
      courseName: data.courseName,
      sessionId: data.sessionId,
      trainingType: data.trainingType,
      completedDate,
      expiryDate,
      score: data.score,
      passed: data.passed,
      instructorName: data.instructorName,
      certificateNumber,
      notes: data.notes,
    };

    this.trainingRecords.set(id, record);

    // Also create a certification if passed
    if (data.passed && certificateNumber) {
      await this.createCertification({
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        certificationName: data.courseName,
        certificationNumber: certificateNumber,
        type: 'INTERNAL',
        issuingBody: 'DocumentIulia HSE',
        issueDate: completedDate,
        expiryDate,
        relatedCourseId: data.courseId,
        notes: '',
      });
    }

    return record;
  }

  async getTrainingRecord(recordId: string): Promise<TrainingRecord | null> {
    return this.trainingRecords.get(recordId) || null;
  }

  async getEmployeeTrainingHistory(employeeId: string): Promise<TrainingRecord[]> {
    return Array.from(this.trainingRecords.values())
      .filter(r => r.employeeId === employeeId)
      .sort((a, b) => b.completedDate.getTime() - a.completedDate.getTime());
  }

  async getExpiringTrainings(daysAhead: number = 30): Promise<TrainingRecord[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    return Array.from(this.trainingRecords.values())
      .filter(r => r.passed && r.expiryDate <= cutoffDate && r.expiryDate > new Date())
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
  }

  // ===== CERTIFICATIONS =====

  async createCertification(data: {
    employeeId: string;
    employeeName: string;
    certificationName: string;
    certificationNumber: string;
    type: CertificationType;
    issuingBody: string;
    issueDate: Date;
    expiryDate: Date;
    relatedCourseId?: string;
    documentUrl?: string;
    notes: string;
  }): Promise<Certification> {
    const id = `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const now = new Date();
    const daysToExpiry = Math.ceil((data.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let status: CertificationStatus = 'ACTIVE';
    if (data.expiryDate < now) {
      status = 'EXPIRED';
    } else if (daysToExpiry <= 30) {
      status = 'EXPIRING_SOON';
    }

    const certification: Certification = {
      id,
      ...data,
      status,
      reminderSent: false,
      renewalInProgress: false,
    };

    this.certifications.set(id, certification);
    return certification;
  }

  async getCertification(certId: string): Promise<Certification | null> {
    return this.certifications.get(certId) || null;
  }

  async getEmployeeCertifications(employeeId: string): Promise<Certification[]> {
    return Array.from(this.certifications.values())
      .filter(c => c.employeeId === employeeId)
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
  }

  async getExpiringCertifications(daysAhead: number = 30): Promise<Certification[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    return Array.from(this.certifications.values())
      .filter(c => c.status !== 'REVOKED' && c.expiryDate <= cutoffDate && c.expiryDate > new Date())
      .sort((a, b) => a.expiryDate.getTime() - b.expiryDate.getTime());
  }

  async updateCertificationStatus(certId: string, status: CertificationStatus): Promise<Certification> {
    const cert = this.certifications.get(certId);
    if (!cert) {
      throw new Error('Certification not found');
    }

    cert.status = status;
    return cert;
  }

  async markRenewalInProgress(certId: string): Promise<Certification> {
    const cert = this.certifications.get(certId);
    if (!cert) {
      throw new Error('Certification not found');
    }

    cert.renewalInProgress = true;
    cert.status = 'PENDING_RENEWAL';
    return cert;
  }

  // ===== COMPETENCY MATRIX =====

  async createCompetencyMatrix(data: {
    employeeId: string;
    employeeName: string;
    department: string;
    jobRole: string;
    competencies: Omit<CompetencyItem, 'lastUpdated'>[];
  }): Promise<CompetencyMatrix> {
    const id = `matrix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();

    const competencies = data.competencies.map(c => ({
      ...c,
      lastUpdated: now,
    }));

    const overallScore = this.calculateOverallScore(competencies);
    const nextAssessment = new Date();
    nextAssessment.setMonth(nextAssessment.getMonth() + 12);  // Annual assessment

    const matrix: CompetencyMatrix = {
      id,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      department: data.department,
      jobRole: data.jobRole,
      competencies,
      overallScore,
      lastAssessedAt: now,
      nextAssessmentDue: nextAssessment,
    };

    this.competencyMatrices.set(id, matrix);
    return matrix;
  }

  private calculateOverallScore(competencies: CompetencyItem[]): number {
    if (competencies.length === 0) return 0;

    const levelValues: Record<CompetencyLevel, number> = {
      'NONE': 0,
      'AWARENESS': 1,
      'BASIC': 2,
      'INTERMEDIATE': 3,
      'ADVANCED': 4,
      'EXPERT': 5,
    };

    const totalRequired = competencies.reduce((sum, c) => sum + levelValues[c.requiredLevel], 0);
    const totalCurrent = competencies.reduce((sum, c) => sum + levelValues[c.currentLevel], 0);

    return totalRequired > 0 ? Math.round((totalCurrent / totalRequired) * 100) : 100;
  }

  async getCompetencyMatrix(employeeId: string): Promise<CompetencyMatrix | null> {
    return Array.from(this.competencyMatrices.values())
      .find(m => m.employeeId === employeeId) || null;
  }

  async updateCompetency(
    employeeId: string,
    competencyId: string,
    currentLevel: CompetencyLevel,
    evidence?: string[],
  ): Promise<CompetencyMatrix> {
    const matrix = await this.getCompetencyMatrix(employeeId);
    if (!matrix) {
      throw new Error('Competency matrix not found');
    }

    const competency = matrix.competencies.find(c => c.competencyId === competencyId);
    if (!competency) {
      throw new Error('Competency not found');
    }

    const levelValues: Record<CompetencyLevel, number> = {
      'NONE': 0,
      'AWARENESS': 1,
      'BASIC': 2,
      'INTERMEDIATE': 3,
      'ADVANCED': 4,
      'EXPERT': 5,
    };

    competency.currentLevel = currentLevel;
    competency.gap = levelValues[currentLevel] - levelValues[competency.requiredLevel];
    competency.lastUpdated = new Date();
    if (evidence) {
      competency.evidence = [...competency.evidence, ...evidence];
    }

    matrix.overallScore = this.calculateOverallScore(matrix.competencies);
    matrix.lastAssessedAt = new Date();

    return matrix;
  }

  async getCompetencyGaps(department?: string): Promise<{ employeeId: string; employeeName: string; gaps: CompetencyItem[] }[]> {
    let matrices = Array.from(this.competencyMatrices.values());

    if (department) {
      matrices = matrices.filter(m => m.department === department);
    }

    return matrices
      .map(m => ({
        employeeId: m.employeeId,
        employeeName: m.employeeName,
        gaps: m.competencies.filter(c => c.gap < 0),
      }))
      .filter(r => r.gaps.length > 0);
  }

  // ===== INDUCTION PROGRAMS =====

  async createInductionProgram(data: {
    employeeId: string;
    employeeName: string;
    startDate: Date;
    department: string;
    supervisor: string;
    hrContact: string;
    targetCompletionDays?: number;
  }): Promise<InductionProgram> {
    const id = `induction-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const targetCompletionDate = new Date(data.startDate);
    targetCompletionDate.setDate(targetCompletionDate.getDate() + (data.targetCompletionDays || 30));

    // Standard Romanian SSM induction checklist
    const standardChecklist: InductionChecklistItem[] = [
      // General phase items
      { id: 'GEN-01', item: 'Primire badge acces și cheie', category: 'GENERAL', mandatory: true, completed: false },
      { id: 'GEN-02', item: 'Tur de orientare în clădire', category: 'GENERAL', mandatory: true, completed: false },
      { id: 'GEN-03', item: 'Prezentare echipă și colegi', category: 'GENERAL', mandatory: true, completed: false },
      { id: 'GEN-04', item: 'Instruire utilizare echipamente IT', category: 'GENERAL', mandatory: true, completed: false },
      { id: 'GEN-05', item: 'Semnare regulament intern', category: 'GENERAL', mandatory: true, completed: false },
      // Department phase items
      { id: 'DEP-01', item: 'Prezentare proceduri departament', category: 'DEPARTMENT', mandatory: true, completed: false },
      { id: 'DEP-02', item: 'Instruire echipamente specifice', category: 'DEPARTMENT', mandatory: true, completed: false },
      { id: 'DEP-03', item: 'Atribuire mentor', category: 'DEPARTMENT', mandatory: true, completed: false },
      // Workplace phase items
      { id: 'WP-01', item: 'Identificare riscuri specifice post', category: 'WORKPLACE', mandatory: true, completed: false },
      { id: 'WP-02', item: 'Distribuire și instruire EIP', category: 'WORKPLACE', mandatory: true, completed: false },
      { id: 'WP-03', item: 'Verificare înțelegere proceduri urgență', category: 'WORKPLACE', mandatory: true, completed: false },
      { id: 'WP-04', item: 'Semnare fișă post SSM', category: 'WORKPLACE', mandatory: true, completed: false },
    ];

    const program: InductionProgram = {
      id,
      employeeId: data.employeeId,
      employeeName: data.employeeName,
      startDate: data.startDate,
      targetCompletionDate,
      currentPhase: 'NOT_STARTED',
      department: data.department,
      supervisor: data.supervisor,
      hrContact: data.hrContact,
      phases: [
        {
          phase: 'GENERAL',
          name: 'Instructaj General Introductiv',
          description: 'Prima zi - orientare generală și documentație',
          trainings: [],
          checklistItems: standardChecklist.filter(i => i.category === 'GENERAL'),
          notes: '',
        },
        {
          phase: 'DEPARTMENT',
          name: 'Instructaj Departament',
          description: 'Prima săptămână - integrare în echipă',
          trainings: [],
          checklistItems: standardChecklist.filter(i => i.category === 'DEPARTMENT'),
          notes: '',
        },
        {
          phase: 'WORKPLACE',
          name: 'Instructaj la Locul de Muncă',
          description: 'SSM specific postului conform Legea 319/2006',
          trainings: [],
          checklistItems: standardChecklist.filter(i => i.category === 'WORKPLACE'),
          notes: '',
        },
      ],
      documents: [
        { id: 'doc-1', name: 'Politica SSM', type: 'POLICY_ACKNOWLEDGMENT', signed: false },
        { id: 'doc-2', name: 'Contacte de urgență', type: 'EMERGENCY_CONTACTS', signed: false },
        { id: 'doc-3', name: 'Fișa de distribuire EIP', type: 'PPE_ISSUE', signed: false },
        { id: 'doc-4', name: 'Formular badge acces', type: 'ACCESS_CARD', signed: false },
      ],
      status: 'IN_PROGRESS',
    };

    this.inductionPrograms.set(id, program);
    return program;
  }

  async getInductionProgram(programId: string): Promise<InductionProgram | null> {
    return this.inductionPrograms.get(programId) || null;
  }

  async getEmployeeInduction(employeeId: string): Promise<InductionProgram | null> {
    return Array.from(this.inductionPrograms.values())
      .find(p => p.employeeId === employeeId) || null;
  }

  async advanceInductionPhase(programId: string, signedOffBy: string): Promise<InductionProgram> {
    const program = this.inductionPrograms.get(programId);
    if (!program) {
      throw new Error('Induction program not found');
    }

    const phaseOrder: InductionPhase[] = ['NOT_STARTED', 'GENERAL', 'DEPARTMENT', 'WORKPLACE', 'COMPLETED'];
    const currentIndex = phaseOrder.indexOf(program.currentPhase);

    if (currentIndex >= phaseOrder.length - 1) {
      throw new Error('Induction already completed');
    }

    // Mark current phase as completed
    const currentPhaseRecord = program.phases.find(p => p.phase === program.currentPhase);
    if (currentPhaseRecord) {
      currentPhaseRecord.completedAt = new Date();
      currentPhaseRecord.signedOffBy = signedOffBy;
    }

    // Advance to next phase
    const nextPhase = phaseOrder[currentIndex + 1];
    program.currentPhase = nextPhase;

    // Start next phase if not completed
    if (nextPhase !== 'COMPLETED') {
      const nextPhaseRecord = program.phases.find(p => p.phase === nextPhase);
      if (nextPhaseRecord) {
        nextPhaseRecord.startedAt = new Date();
      }
    } else {
      program.completedAt = new Date();
      program.status = 'COMPLETED';
    }

    return program;
  }

  async completeChecklistItem(programId: string, itemId: string, completedBy: string, evidence?: string): Promise<InductionProgram> {
    const program = this.inductionPrograms.get(programId);
    if (!program) {
      throw new Error('Induction program not found');
    }

    for (const phase of program.phases) {
      const item = phase.checklistItems.find(i => i.id === itemId);
      if (item) {
        item.completed = true;
        item.completedAt = new Date();
        item.completedBy = completedBy;
        if (evidence) {
          item.evidence = evidence;
        }
        break;
      }
    }

    return program;
  }

  async signInductionDocument(programId: string, documentId: string): Promise<InductionProgram> {
    const program = this.inductionPrograms.get(programId);
    if (!program) {
      throw new Error('Induction program not found');
    }

    const doc = program.documents.find(d => d.id === documentId);
    if (!doc) {
      throw new Error('Document not found');
    }

    doc.signed = true;
    doc.signedAt = new Date();

    return program;
  }

  async linkTrainingToInduction(programId: string, phase: InductionPhase, trainingRecordId: string): Promise<InductionProgram> {
    const program = this.inductionPrograms.get(programId);
    if (!program) {
      throw new Error('Induction program not found');
    }

    const phaseRecord = program.phases.find(p => p.phase === phase);
    if (!phaseRecord) {
      throw new Error('Phase not found');
    }

    if (!phaseRecord.trainings.includes(trainingRecordId)) {
      phaseRecord.trainings.push(trainingRecordId);
    }

    return program;
  }

  async getOverdueInductions(): Promise<InductionProgram[]> {
    const now = new Date();
    return Array.from(this.inductionPrograms.values())
      .filter(p => p.status === 'IN_PROGRESS' && p.targetCompletionDate < now)
      .sort((a, b) => a.targetCompletionDate.getTime() - b.targetCompletionDate.getTime());
  }

  // ===== SSM TRAINING LOG GENERATION =====

  async generateSSMTrainingLog(
    period: { from: Date; to: Date },
    locationId?: string,
    department?: string,
  ): Promise<SSMTrainingLog> {
    const records = Array.from(this.trainingRecords.values())
      .filter(r => {
        const inPeriod = r.completedDate >= period.from && r.completedDate <= period.to;
        return inPeriod;
      });

    // Group by training type
    const byType: Record<TrainingType, { count: number; hours: number; participants: number }> = {} as any;
    const byDepartment: Record<string, { count: number; hours: number }> = {};

    const entries: SSMLogEntry[] = [];
    let totalHours = 0;

    // Get course details for each record
    for (const record of records) {
      const course = this.courses.get(record.courseId);
      if (!course) continue;

      // Update type stats
      if (!byType[record.trainingType]) {
        byType[record.trainingType] = { count: 0, hours: 0, participants: 0 };
      }
      byType[record.trainingType].count++;
      byType[record.trainingType].hours += course.durationHours;
      byType[record.trainingType].participants++;
      totalHours += course.durationHours;

      // Create entry
      entries.push({
        date: record.completedDate,
        trainingType: record.trainingType,
        courseName: record.courseName,
        instructor: record.instructorName,
        participants: [{
          employeeId: record.employeeId,
          name: record.employeeName,
          department: 'N/A',  // Would come from employee data
          signature: record.passed ? 'SIGNED' : 'N/A',
        }],
        durationHours: course.durationHours,
        topics: course.description ? [course.description] : [],
        observations: record.notes,
      });
    }

    // Calculate compliance rate
    const totalEmployees = new Set(records.map(r => r.employeeId)).size;
    const passedRecords = records.filter(r => r.passed).length;
    const complianceRate = totalEmployees > 0 ? (passedRecords / records.length) * 100 : 100;

    const log: SSMTrainingLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      generatedAt: new Date(),
      period,
      locationId,
      department,
      entries,
      totalParticipants: totalEmployees,
      totalHours,
      summary: {
        byTrainingType: byType,
        byDepartment,
        complianceRate: Math.round(complianceRate * 100) / 100,
      },
    };

    return log;
  }

  // ===== ALERTS & DASHBOARD =====

  async generateAlerts(): Promise<TrainingAlert[]> {
    const alerts: TrainingAlert[] = [];
    const now = new Date();

    // Check expiring certifications
    const expiringCerts = await this.getExpiringCertifications(30);
    for (const cert of expiringCerts) {
      const daysToExpiry = Math.ceil((cert.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const severity = daysToExpiry <= 7 ? 'CRITICAL' : daysToExpiry <= 14 ? 'HIGH' : 'MEDIUM';

      const alert: TrainingAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'EXPIRING_CERTIFICATION',
        severity,
        employeeId: cert.employeeId,
        employeeName: cert.employeeName,
        message: `Certificarea "${cert.certificationName}" expiră în ${daysToExpiry} zile`,
        dueDate: cert.expiryDate,
        relatedEntityId: cert.id,
        relatedEntityType: 'Certification',
        createdAt: now,
        acknowledged: false,
      };
      alerts.push(alert);
      this.alerts.set(alert.id, alert);
    }

    // Check overdue inductions
    const overdueInductions = await this.getOverdueInductions();
    for (const induction of overdueInductions) {
      const alert: TrainingAlert = {
        id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'INDUCTION_DELAY',
        severity: 'HIGH',
        employeeId: induction.employeeId,
        employeeName: induction.employeeName,
        message: `Programul de inducție depășește termenul limită`,
        dueDate: induction.targetCompletionDate,
        relatedEntityId: induction.id,
        relatedEntityType: 'InductionProgram',
        createdAt: now,
        acknowledged: false,
      };
      alerts.push(alert);
      this.alerts.set(alert.id, alert);
    }

    // Check competency gaps
    const gaps = await this.getCompetencyGaps();
    for (const employee of gaps) {
      const criticalGaps = employee.gaps.filter(g => g.gap <= -2);
      if (criticalGaps.length > 0) {
        const alert: TrainingAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: 'COMPETENCY_GAP',
          severity: 'MEDIUM',
          employeeId: employee.employeeId,
          employeeName: employee.employeeName,
          message: `${criticalGaps.length} competențe sub nivelul necesar`,
          relatedEntityType: 'CompetencyMatrix',
          createdAt: now,
          acknowledged: false,
        };
        alerts.push(alert);
        this.alerts.set(alert.id, alert);
      }
    }

    return alerts;
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<TrainingAlert> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error('Alert not found');
    }

    alert.acknowledged = true;
    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    return alert;
  }

  async getTrainingDashboard(): Promise<TrainingDashboard> {
    const now = new Date();
    const uniqueEmployees = new Set<string>();
    const compliantEmployees = new Set<string>();

    // Get all employees from records
    for (const record of this.trainingRecords.values()) {
      uniqueEmployees.add(record.employeeId);
      if (record.passed && record.expiryDate > now) {
        compliantEmployees.add(record.employeeId);
      }
    }

    // Count expiring certifications
    const certs = Array.from(this.certifications.values()).filter(c => c.status !== 'REVOKED');
    const next30 = certs.filter(c => {
      const days = Math.ceil((c.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days > 0 && days <= 30;
    }).length;
    const next60 = certs.filter(c => {
      const days = Math.ceil((c.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days > 30 && days <= 60;
    }).length;
    const next90 = certs.filter(c => {
      const days = Math.ceil((c.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return days > 60 && days <= 90;
    }).length;

    // Count upcoming sessions
    const upcomingSessions = Array.from(this.sessions.values())
      .filter(s => s.status === 'SCHEDULED' && s.scheduledDate > now).length;

    // Count inductions in progress
    const inductionsInProgress = Array.from(this.inductionPrograms.values())
      .filter(p => p.status === 'IN_PROGRESS').length;

    // Calculate average competency score
    const matrices = Array.from(this.competencyMatrices.values());
    const avgCompetency = matrices.length > 0
      ? Math.round(matrices.reduce((sum, m) => sum + m.overallScore, 0) / matrices.length)
      : 0;

    // Calculate training hours this month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let trainingHours = 0;
    for (const record of this.trainingRecords.values()) {
      if (record.completedDate >= monthStart) {
        const course = this.courses.get(record.courseId);
        if (course) {
          trainingHours += course.durationHours;
        }
      }
    }

    // Get unacknowledged alerts
    const alerts = Array.from(this.alerts.values())
      .filter(a => !a.acknowledged)
      .sort((a, b) => {
        const severityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      });

    const totalEmployees = uniqueEmployees.size || 1;
    const compliant = compliantEmployees.size;

    return {
      totalEmployees,
      trainingCompliance: {
        compliant,
        nonCompliant: totalEmployees - compliant,
        percentage: Math.round((compliant / totalEmployees) * 100),
      },
      upcomingSessions,
      expiringCertifications: {
        next30Days: next30,
        next60Days: next60,
        next90Days: next90,
      },
      inductionsInProgress,
      averageCompetencyScore: avgCompetency,
      trainingHoursThisMonth: trainingHours,
      alerts,
    };
  }

  // ===== UTILITY METHODS =====

  async getTrainingRequirementsForRole(role: string): Promise<TrainingCourse[]> {
    return Array.from(this.courses.values())
      .filter(c => c.isActive && (c.targetRoles.includes('ALL') || c.targetRoles.includes(role)));
  }

  async checkEmployeeCompliance(employeeId: string, role: string): Promise<{
    compliant: boolean;
    missingTrainings: TrainingCourse[];
    expiringTrainings: TrainingRecord[];
    overallStatus: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT';
  }> {
    const requiredCourses = await this.getTrainingRequirementsForRole(role);
    const employeeRecords = await this.getEmployeeTrainingHistory(employeeId);
    const now = new Date();

    const missingTrainings: TrainingCourse[] = [];
    const expiringTrainings: TrainingRecord[] = [];

    for (const course of requiredCourses) {
      if (!course.mandatory) continue;

      const record = employeeRecords.find(r => r.courseId === course.id && r.passed);
      if (!record) {
        missingTrainings.push(course);
      } else if (record.expiryDate <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        expiringTrainings.push(record);
      }
    }

    let overallStatus: 'COMPLIANT' | 'AT_RISK' | 'NON_COMPLIANT' = 'COMPLIANT';
    if (missingTrainings.length > 0) {
      overallStatus = 'NON_COMPLIANT';
    } else if (expiringTrainings.length > 0) {
      overallStatus = 'AT_RISK';
    }

    return {
      compliant: missingTrainings.length === 0,
      missingTrainings,
      expiringTrainings,
      overallStatus,
    };
  }
}
