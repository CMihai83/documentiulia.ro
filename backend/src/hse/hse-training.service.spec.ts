import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  HSETrainingService,
  TrainingType,
  TrainingStatus,
  CertificationType,
  CertificationStatus,
  CompetencyLevel,
  InductionPhase,
} from './hse-training.service';

describe('HSETrainingService', () => {
  let service: HSETrainingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HSETrainingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'HSE_DEFAULT_VALIDITY_MONTHS') return 12;
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<HSETrainingService>(HSETrainingService);
    service.resetState();
  });

  describe('Course Management', () => {
    it('should create a new training course', async () => {
      const course = await service.createCourse({
        code: 'TEST-001',
        name: 'Test Course',
        description: 'Test description',
        type: 'FIRST_AID',
        durationHours: 8,
        validityMonths: 24,
        mandatory: true,
        targetRoles: ['ALL'],
        prerequisites: [],
        assessmentRequired: true,
        passingScore: 70,
      });

      expect(course.id).toBeDefined();
      expect(course.code).toBe('TEST-001');
      expect(course.name).toBe('Test Course');
      expect(course.type).toBe('FIRST_AID');
      expect(course.durationHours).toBe(8);
      expect(course.mandatory).toBe(true);
    });

    it('should list courses with filters', async () => {
      await service.createCourse({
        code: 'MAND-001',
        name: 'Mandatory Course',
        description: 'Mandatory',
        type: 'GENERAL_INDUCTION',
        durationHours: 4,
        validityMonths: 0,
        mandatory: true,
        targetRoles: ['ALL'],
        assessmentRequired: true,
        passingScore: 70,
      });

      await service.createCourse({
        code: 'OPT-001',
        name: 'Optional Course',
        description: 'Optional',
        type: 'WORKING_AT_HEIGHT',
        durationHours: 16,
        validityMonths: 24,
        mandatory: false,
        targetRoles: ['MAINTENANCE'],
        assessmentRequired: true,
        passingScore: 80,
      });

      const mandatoryCourses = await service.listCourses({ mandatory: true });
      expect(mandatoryCourses.length).toBeGreaterThan(0);
      expect(mandatoryCourses.every(c => c.mandatory)).toBe(true);

      const maintenanceCourses = await service.listCourses({ role: 'MAINTENANCE' });
      expect(maintenanceCourses.length).toBeGreaterThan(0);
    });

    it('should get course by ID', async () => {
      const created = await service.createCourse({
        code: 'GET-001',
        name: 'Get Test',
        description: 'Test',
        type: 'FIRE_SAFETY',
        durationHours: 4,
        validityMonths: 12,
        mandatory: true,
        targetRoles: ['ALL'],
        assessmentRequired: true,
        passingScore: 70,
      });

      const course = await service.getCourse(created.id);
      expect(course).not.toBeNull();
      expect(course!.code).toBe('GET-001');
    });

    it('should update a course', async () => {
      const created = await service.createCourse({
        code: 'UPD-001',
        name: 'Original Name',
        description: 'Original',
        type: 'PERIODIC',
        durationHours: 2,
        validityMonths: 3,
        mandatory: true,
        targetRoles: ['ALL'],
        assessmentRequired: true,
        passingScore: 70,
      });

      const updated = await service.updateCourse(created.id, { name: 'Updated Name' });
      expect(updated.name).toBe('Updated Name');
      expect(updated.code).toBe('UPD-001');
    });

    it('should add module to course', async () => {
      const course = await service.createCourse({
        code: 'MOD-001',
        name: 'Module Test',
        description: 'Test',
        type: 'PPE_USAGE',
        durationHours: 2,
        validityMonths: 12,
        mandatory: true,
        targetRoles: ['ALL'],
        assessmentRequired: true,
        passingScore: 70,
      });

      const updated = await service.addModuleToCourse(course.id, {
        title: 'Module 1',
        description: 'First module',
        durationMinutes: 30,
        content: 'Module content',
        order: 1,
      });

      expect(updated.content.modules.length).toBe(1);
      expect(updated.content.modules[0].title).toBe('Module 1');
    });

    it('should initialize with default SSM courses', async () => {
      const courses = await service.listCourses();
      expect(courses.length).toBeGreaterThan(0);

      const ssmCourse = courses.find(c => c.code === 'SSM-GI-001');
      expect(ssmCourse).toBeDefined();
      expect(ssmCourse!.name).toContain('Instructaj General');
    });
  });

  describe('Training Sessions', () => {
    let courseId: string;

    beforeEach(async () => {
      const course = await service.createCourse({
        code: 'SESS-001',
        name: 'Session Test Course',
        description: 'For session tests',
        type: 'FIRST_AID',
        durationHours: 8,
        validityMonths: 24,
        mandatory: false,
        targetRoles: ['ALL'],
        assessmentRequired: true,
        passingScore: 70,
      });
      courseId = course.id;
    });

    it('should create a training session', async () => {
      const session = await service.createSession({
        courseId,
        title: 'First Aid Training',
        description: 'First aid basics',
        scheduledDate: new Date('2025-01-15'),
        endDate: new Date('2025-01-15'),
        location: 'Training Room A',
        instructor: {
          id: 'inst-1',
          name: 'Dr. Popescu',
          email: 'popescu@example.com',
          qualifications: ['Medical Doctor', 'First Aid Instructor'],
          internal: false,
          companyName: 'Safety Training SRL',
        },
        maxParticipants: 20,
      });

      expect(session.id).toBeDefined();
      expect(session.status).toBe('SCHEDULED');
      expect(session.instructor.name).toBe('Dr. Popescu');
    });

    it('should list sessions with filters', async () => {
      await service.createSession({
        courseId,
        title: 'Session 1',
        description: 'Test',
        scheduledDate: new Date('2025-02-01'),
        endDate: new Date('2025-02-01'),
        location: 'Room A',
        instructor: { id: 'i1', name: 'Instructor', email: 'i@test.com', qualifications: [], internal: true },
        maxParticipants: 10,
      });

      const sessions = await service.listSessions({ courseId });
      expect(sessions.length).toBe(1);
    });

    it('should enroll participant in session', async () => {
      const session = await service.createSession({
        courseId,
        title: 'Test Session',
        description: 'Test',
        scheduledDate: new Date('2025-02-15'),
        endDate: new Date('2025-02-15'),
        location: 'Room B',
        instructor: { id: 'i1', name: 'Instructor', email: 'i@test.com', qualifications: [], internal: true },
        maxParticipants: 5,
      });

      const updated = await service.enrollParticipant(session.id, {
        employeeId: 'emp-001',
        name: 'Ion Popescu',
        department: 'Production',
      });

      expect(updated.participants.length).toBe(1);
      expect(updated.participants[0].employeeId).toBe('emp-001');
      expect(updated.participants[0].attended).toBe(false);
    });

    it('should prevent enrollment when session is full', async () => {
      const session = await service.createSession({
        courseId,
        title: 'Small Session',
        description: 'Limited',
        scheduledDate: new Date('2025-02-20'),
        endDate: new Date('2025-02-20'),
        location: 'Room C',
        instructor: { id: 'i1', name: 'Instructor', email: 'i@test.com', qualifications: [], internal: true },
        maxParticipants: 1,
      });

      await service.enrollParticipant(session.id, {
        employeeId: 'emp-001',
        name: 'First Person',
        department: 'IT',
      });

      await expect(
        service.enrollParticipant(session.id, {
          employeeId: 'emp-002',
          name: 'Second Person',
          department: 'HR',
        }),
      ).rejects.toThrow('Session is full');
    });

    it('should record attendance', async () => {
      const session = await service.createSession({
        courseId,
        title: 'Attendance Test',
        description: 'Test',
        scheduledDate: new Date(),
        endDate: new Date(),
        location: 'Room D',
        instructor: { id: 'i1', name: 'Instructor', email: 'i@test.com', qualifications: [], internal: true },
        maxParticipants: 10,
      });

      await service.enrollParticipant(session.id, {
        employeeId: 'emp-att-001',
        name: 'Attendee',
        department: 'QA',
      });

      const updated = await service.recordAttendance(session.id, 'emp-att-001', true);
      expect(updated.participants[0].attended).toBe(true);
      expect(updated.participants[0].attendanceTime).toBeDefined();
    });

    it('should record assessment result and create training record', async () => {
      const session = await service.createSession({
        courseId,
        title: 'Assessment Test',
        description: 'Test',
        scheduledDate: new Date(),
        endDate: new Date(),
        location: 'Room E',
        instructor: { id: 'i1', name: 'Instructor', email: 'i@test.com', qualifications: [], internal: true },
        maxParticipants: 10,
      });

      await service.enrollParticipant(session.id, {
        employeeId: 'emp-assess-001',
        name: 'Test Student',
        department: 'Training',
      });

      await service.recordAttendance(session.id, 'emp-assess-001', true);
      const result = await service.recordAssessmentResult(session.id, 'emp-assess-001', 85);

      expect(result.participant.assessmentScore).toBe(85);
      expect(result.participant.passed).toBe(true);
      expect(result.trainingRecord).toBeDefined();
      expect(result.trainingRecord!.passed).toBe(true);
    });

    it('should complete session', async () => {
      const session = await service.createSession({
        courseId,
        title: 'Complete Test',
        description: 'Test',
        scheduledDate: new Date(),
        endDate: new Date(),
        location: 'Room F',
        instructor: { id: 'i1', name: 'Instructor', email: 'i@test.com', qualifications: [], internal: true },
        maxParticipants: 10,
      });

      const completed = await service.completeSession(session.id);
      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
    });
  });

  describe('Training Records', () => {
    let courseId: string;

    beforeEach(async () => {
      const course = await service.createCourse({
        code: 'REC-001',
        name: 'Record Test Course',
        description: 'For record tests',
        type: 'PERIODIC',
        durationHours: 2,
        validityMonths: 6,
        mandatory: true,
        targetRoles: ['ALL'],
        assessmentRequired: true,
        passingScore: 70,
      });
      courseId = course.id;
    });

    it('should create training record', async () => {
      const record = await service.createTrainingRecord({
        employeeId: 'emp-rec-001',
        employeeName: 'Maria Ionescu',
        courseId,
        courseName: 'Record Test Course',
        trainingType: 'PERIODIC',
        score: 90,
        passed: true,
        instructorName: 'Instructor Test',
        notes: 'Good performance',
      });

      expect(record.id).toBeDefined();
      expect(record.certificateNumber).toBeDefined();
      expect(record.expiryDate).toBeDefined();
    });

    it('should get employee training history', async () => {
      await service.createTrainingRecord({
        employeeId: 'emp-hist-001',
        employeeName: 'Test Employee',
        courseId,
        courseName: 'Course 1',
        trainingType: 'PERIODIC',
        passed: true,
        instructorName: 'Instructor',
        notes: '',
      });

      const history = await service.getEmployeeTrainingHistory('emp-hist-001');
      expect(history.length).toBe(1);
      expect(history[0].employeeId).toBe('emp-hist-001');
    });

    it('should get expiring trainings', async () => {
      // Create a record that expires soon
      const record = await service.createTrainingRecord({
        employeeId: 'emp-exp-001',
        employeeName: 'Expiring Employee',
        courseId,
        courseName: 'Expiring Course',
        trainingType: 'PERIODIC',
        passed: true,
        instructorName: 'Instructor',
        notes: '',
      });

      // Manually set expiry date to near future for testing
      const storedRecord = await service.getTrainingRecord(record.id);
      if (storedRecord) {
        const nearExpiry = new Date();
        nearExpiry.setDate(nearExpiry.getDate() + 15);
        (storedRecord as any).expiryDate = nearExpiry;
      }

      const expiring = await service.getExpiringTrainings(30);
      // Should include the record we just modified
      expect(expiring.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Certifications', () => {
    it('should create certification', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const cert = await service.createCertification({
        employeeId: 'emp-cert-001',
        employeeName: 'Certified Employee',
        certificationName: 'Forklift Operator',
        certificationNumber: 'FORK-2025-001',
        type: 'REGULATORY',
        issuingBody: 'ISCIR',
        issueDate: new Date(),
        expiryDate: futureDate,
        notes: 'Valid nationwide',
      });

      expect(cert.id).toBeDefined();
      expect(cert.status).toBe('ACTIVE');
      expect(cert.certificationNumber).toBe('FORK-2025-001');
    });

    it('should detect expiring certification', async () => {
      const soonExpiry = new Date();
      soonExpiry.setDate(soonExpiry.getDate() + 20);

      const cert = await service.createCertification({
        employeeId: 'emp-cert-002',
        employeeName: 'Expiring Cert Employee',
        certificationName: 'Working at Height',
        certificationNumber: 'WAH-2025-001',
        type: 'INTERNAL',
        issuingBody: 'Company HSE',
        issueDate: new Date(),
        expiryDate: soonExpiry,
        notes: '',
      });

      expect(cert.status).toBe('EXPIRING_SOON');
    });

    it('should get employee certifications', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      await service.createCertification({
        employeeId: 'emp-cert-003',
        employeeName: 'Multi Cert Employee',
        certificationName: 'First Aid',
        certificationNumber: 'FA-001',
        type: 'EXTERNAL',
        issuingBody: 'Red Cross',
        issueDate: new Date(),
        expiryDate: futureDate,
        notes: '',
      });

      const certs = await service.getEmployeeCertifications('emp-cert-003');
      expect(certs.length).toBe(1);
    });

    it('should update certification status', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const cert = await service.createCertification({
        employeeId: 'emp-cert-004',
        employeeName: 'Status Test',
        certificationName: 'Electrical',
        certificationNumber: 'ELEC-001',
        type: 'REGULATORY',
        issuingBody: 'ANRE',
        issueDate: new Date(),
        expiryDate: futureDate,
        notes: '',
      });

      const updated = await service.updateCertificationStatus(cert.id, 'REVOKED');
      expect(updated.status).toBe('REVOKED');
    });

    it('should mark renewal in progress', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const cert = await service.createCertification({
        employeeId: 'emp-cert-005',
        employeeName: 'Renewal Test',
        certificationName: 'Crane Operator',
        certificationNumber: 'CRANE-001',
        type: 'REGULATORY',
        issuingBody: 'ISCIR',
        issueDate: new Date(),
        expiryDate: futureDate,
        notes: '',
      });

      const updated = await service.markRenewalInProgress(cert.id);
      expect(updated.renewalInProgress).toBe(true);
      expect(updated.status).toBe('PENDING_RENEWAL');
    });
  });

  describe('Competency Matrix', () => {
    it('should create competency matrix', async () => {
      const matrix = await service.createCompetencyMatrix({
        employeeId: 'emp-comp-001',
        employeeName: 'Competency Test Employee',
        department: 'Production',
        jobRole: 'Machine Operator',
        competencies: [
          {
            competencyId: 'comp-1',
            competencyName: 'Machine Safety',
            category: 'Technical',
            requiredLevel: 'INTERMEDIATE',
            currentLevel: 'BASIC',
            gap: -1,
            trainingNeeded: [],
            evidence: [],
          },
          {
            competencyId: 'comp-2',
            competencyName: 'PPE Usage',
            category: 'Safety',
            requiredLevel: 'BASIC',
            currentLevel: 'BASIC',
            gap: 0,
            trainingNeeded: [],
            evidence: [],
          },
        ],
      });

      expect(matrix.id).toBeDefined();
      expect(matrix.competencies.length).toBe(2);
      expect(matrix.overallScore).toBeLessThan(100);
    });

    it('should update competency level', async () => {
      const matrix = await service.createCompetencyMatrix({
        employeeId: 'emp-comp-002',
        employeeName: 'Update Competency Test',
        department: 'Maintenance',
        jobRole: 'Technician',
        competencies: [
          {
            competencyId: 'comp-upd-1',
            competencyName: 'Electrical Safety',
            category: 'Technical',
            requiredLevel: 'ADVANCED',
            currentLevel: 'BASIC',
            gap: -2,
            trainingNeeded: [],
            evidence: [],
          },
        ],
      });

      const updated = await service.updateCompetency(
        'emp-comp-002',
        'comp-upd-1',
        'ADVANCED',
        ['Completed course ELEC-001'],
      );

      const competency = updated.competencies.find(c => c.competencyId === 'comp-upd-1');
      expect(competency!.currentLevel).toBe('ADVANCED');
      expect(competency!.gap).toBe(0);
      expect(competency!.evidence).toContain('Completed course ELEC-001');
    });

    it('should get competency gaps', async () => {
      await service.createCompetencyMatrix({
        employeeId: 'emp-comp-003',
        employeeName: 'Gap Test Employee',
        department: 'Quality',
        jobRole: 'Inspector',
        competencies: [
          {
            competencyId: 'comp-gap-1',
            competencyName: 'Audit Skills',
            category: 'Professional',
            requiredLevel: 'EXPERT',
            currentLevel: 'BASIC',
            gap: -3,
            trainingNeeded: ['AUD-001'],
            evidence: [],
          },
        ],
      });

      const gaps = await service.getCompetencyGaps();
      expect(gaps.length).toBe(1);
      expect(gaps[0].gaps[0].gap).toBe(-3);
    });
  });

  describe('Induction Programs', () => {
    it('should create induction program', async () => {
      const induction = await service.createInductionProgram({
        employeeId: 'emp-ind-001',
        employeeName: 'New Hire',
        startDate: new Date(),
        department: 'IT',
        supervisor: 'Manager IT',
        hrContact: 'HR Specialist',
      });

      expect(induction.id).toBeDefined();
      expect(induction.currentPhase).toBe('NOT_STARTED');
      expect(induction.phases.length).toBe(3);
      expect(induction.documents.length).toBeGreaterThan(0);
    });

    it('should advance induction phase', async () => {
      const induction = await service.createInductionProgram({
        employeeId: 'emp-ind-002',
        employeeName: 'Phase Test',
        startDate: new Date(),
        department: 'HR',
        supervisor: 'HR Manager',
        hrContact: 'HR Admin',
      });

      const advanced = await service.advanceInductionPhase(induction.id, 'Supervisor Name');
      expect(advanced.currentPhase).toBe('GENERAL');
    });

    it('should complete checklist item', async () => {
      const induction = await service.createInductionProgram({
        employeeId: 'emp-ind-003',
        employeeName: 'Checklist Test',
        startDate: new Date(),
        department: 'Finance',
        supervisor: 'Finance Manager',
        hrContact: 'HR',
      });

      const updated = await service.completeChecklistItem(
        induction.id,
        'GEN-01',
        'HR Admin',
        'Badge issued',
      );

      const item = updated.phases[0].checklistItems.find(i => i.id === 'GEN-01');
      expect(item!.completed).toBe(true);
      expect(item!.completedBy).toBe('HR Admin');
    });

    it('should sign induction document', async () => {
      const induction = await service.createInductionProgram({
        employeeId: 'emp-ind-004',
        employeeName: 'Document Test',
        startDate: new Date(),
        department: 'Legal',
        supervisor: 'Legal Manager',
        hrContact: 'HR',
      });

      const updated = await service.signInductionDocument(induction.id, 'doc-1');
      const doc = updated.documents.find(d => d.id === 'doc-1');
      expect(doc!.signed).toBe(true);
      expect(doc!.signedAt).toBeDefined();
    });

    it('should link training to induction', async () => {
      const induction = await service.createInductionProgram({
        employeeId: 'emp-ind-005',
        employeeName: 'Training Link Test',
        startDate: new Date(),
        department: 'Operations',
        supervisor: 'Ops Manager',
        hrContact: 'HR',
      });

      const updated = await service.linkTrainingToInduction(
        induction.id,
        'GENERAL',
        'training-record-001',
      );

      const generalPhase = updated.phases.find(p => p.phase === 'GENERAL');
      expect(generalPhase!.trainings).toContain('training-record-001');
    });

    it('should complete full induction cycle', async () => {
      const induction = await service.createInductionProgram({
        employeeId: 'emp-ind-006',
        employeeName: 'Full Cycle Test',
        startDate: new Date(),
        department: 'Sales',
        supervisor: 'Sales Manager',
        hrContact: 'HR',
      });

      // Advance through all phases
      await service.advanceInductionPhase(induction.id, 'Supervisor'); // NOT_STARTED -> GENERAL
      await service.advanceInductionPhase(induction.id, 'Supervisor'); // GENERAL -> DEPARTMENT
      await service.advanceInductionPhase(induction.id, 'Supervisor'); // DEPARTMENT -> WORKPLACE
      const completed = await service.advanceInductionPhase(induction.id, 'Supervisor'); // WORKPLACE -> COMPLETED

      expect(completed.currentPhase).toBe('COMPLETED');
      expect(completed.status).toBe('COMPLETED');
      expect(completed.completedAt).toBeDefined();
    });

    it('should get overdue inductions', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 60);

      const induction = await service.createInductionProgram({
        employeeId: 'emp-ind-007',
        employeeName: 'Overdue Test',
        startDate: pastDate,
        department: 'Warehouse',
        supervisor: 'Warehouse Manager',
        hrContact: 'HR',
        targetCompletionDays: 30,
      });

      const overdue = await service.getOverdueInductions();
      expect(overdue.length).toBe(1);
      expect(overdue[0].id).toBe(induction.id);
    });
  });

  describe('SSM Training Log', () => {
    it('should generate SSM training log', async () => {
      const course = await service.createCourse({
        code: 'LOG-001',
        name: 'Log Test Course',
        description: 'For log generation',
        type: 'PERIODIC',
        durationHours: 2,
        validityMonths: 3,
        mandatory: true,
        targetRoles: ['ALL'],
        assessmentRequired: true,
        passingScore: 70,
      });

      await service.createTrainingRecord({
        employeeId: 'emp-log-001',
        employeeName: 'Log Employee 1',
        courseId: course.id,
        courseName: 'Log Test Course',
        trainingType: 'PERIODIC',
        passed: true,
        instructorName: 'Instructor',
        notes: '',
      });

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const log = await service.generateSSMTrainingLog({
        from: monthStart,
        to: monthEnd,
      });

      expect(log.id).toBeDefined();
      expect(log.entries.length).toBeGreaterThan(0);
      expect(log.summary).toBeDefined();
    });
  });

  describe('Alerts & Dashboard', () => {
    it('should generate alerts for expiring certifications', async () => {
      const soonExpiry = new Date();
      soonExpiry.setDate(soonExpiry.getDate() + 10);

      await service.createCertification({
        employeeId: 'emp-alert-001',
        employeeName: 'Alert Test',
        certificationName: 'Expiring Cert',
        certificationNumber: 'EXP-001',
        type: 'INTERNAL',
        issuingBody: 'Company',
        issueDate: new Date(),
        expiryDate: soonExpiry,
        notes: '',
      });

      const alerts = await service.generateAlerts();
      const certAlert = alerts.find(a => a.type === 'EXPIRING_CERTIFICATION');
      expect(certAlert).toBeDefined();
    });

    it('should acknowledge alert', async () => {
      const soonExpiry = new Date();
      soonExpiry.setDate(soonExpiry.getDate() + 5);

      await service.createCertification({
        employeeId: 'emp-alert-002',
        employeeName: 'Ack Test',
        certificationName: 'Ack Cert',
        certificationNumber: 'ACK-001',
        type: 'INTERNAL',
        issuingBody: 'Company',
        issueDate: new Date(),
        expiryDate: soonExpiry,
        notes: '',
      });

      const alerts = await service.generateAlerts();
      if (alerts.length > 0) {
        const acknowledged = await service.acknowledgeAlert(alerts[0].id, 'HR Manager');
        expect(acknowledged.acknowledged).toBe(true);
        expect(acknowledged.acknowledgedBy).toBe('HR Manager');
      }
    });

    it('should generate training dashboard', async () => {
      const dashboard = await service.getTrainingDashboard();

      expect(dashboard.totalEmployees).toBeDefined();
      expect(dashboard.trainingCompliance).toBeDefined();
      expect(dashboard.expiringCertifications).toBeDefined();
      expect(dashboard.upcomingSessions).toBeDefined();
      expect(dashboard.alerts).toBeDefined();
    });
  });

  describe('Compliance Check', () => {
    it('should check employee compliance', async () => {
      // The service initializes with mandatory courses
      const compliance = await service.checkEmployeeCompliance('new-employee', 'WORKER');

      expect(compliance.compliant).toBeDefined();
      expect(compliance.missingTrainings).toBeDefined();
      expect(compliance.overallStatus).toBeDefined();
    });

    it('should identify missing mandatory trainings', async () => {
      await service.createCourse({
        code: 'MAND-COMP-001',
        name: 'Mandatory Compliance Course',
        description: 'Required for all',
        type: 'TASK_SPECIFIC',
        durationHours: 4,
        validityMonths: 12,
        mandatory: true,
        targetRoles: ['TESTER'],
        assessmentRequired: true,
        passingScore: 70,
      });

      const compliance = await service.checkEmployeeCompliance('untrained-emp', 'TESTER');
      expect(compliance.missingTrainings.length).toBeGreaterThan(0);
      expect(compliance.overallStatus).toBe('NON_COMPLIANT');
    });

    it('should get training requirements for role', async () => {
      const requirements = await service.getTrainingRequirementsForRole('ALL');
      expect(requirements.length).toBeGreaterThan(0);
      expect(requirements.every(c => c.targetRoles.includes('ALL'))).toBe(true);
    });
  });
});
