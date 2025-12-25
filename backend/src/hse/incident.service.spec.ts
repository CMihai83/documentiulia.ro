import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  IncidentService,
  IncidentType,
  IncidentSeverity,
  IncidentStatus,
  InjuryType,
  BodyPart,
  RootCauseCategory,
  CAPAType,
  CAPAPriority,
  CAPAStatus,
} from './incident.service';
import { PrismaService } from '../prisma/prisma.service';

describe('IncidentService', () => {
  let service: IncidentService;
  let module: TestingModule;

  const mockPrismaService = {};
  const mockConfigService = {
    get: jest.fn(),
  };

  const testReporter = {
    id: 'emp-1',
    name: 'Ion Popescu',
    employeeId: 'EMP001',
    department: 'Production',
    jobTitle: 'Operator',
    contactEmail: 'ion.popescu@company.ro',
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        IncidentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<IncidentService>(IncidentService);
    service.resetState();
    jest.clearAllMocks();
  });

  describe('Incident Reporting', () => {
    it('should report a new incident', async () => {
      const incident = await service.reportIncident({
        type: IncidentType.NEAR_MISS,
        occurredAt: new Date(),
        locationDescription: 'Production Hall A',
        title: 'Near miss - falling object',
        description: 'A tool fell from overhead shelf, narrowly missing worker',
        reportedBy: testReporter,
      });

      expect(incident.id).toBeDefined();
      expect(incident.incidentNumber).toMatch(/^INC-\d{4}-\d{5}$/);
      expect(incident.status).toBe(IncidentStatus.REPORTED);
      expect(incident.type).toBe(IncidentType.NEAR_MISS);
    });

    it('should require title and description', async () => {
      await expect(
        service.reportIncident({
          type: IncidentType.INJURY,
          occurredAt: new Date(),
          locationDescription: 'Test',
          title: '',
          description: '',
          reportedBy: testReporter,
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should auto-classify severity for near miss as minor', async () => {
      const incident = await service.reportIncident({
        type: IncidentType.NEAR_MISS,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'Near miss event',
        description: 'Close call incident',
        reportedBy: testReporter,
      });

      expect(incident.severity).toBe(IncidentSeverity.MINOR);
    });

    it('should classify severity as serious for fracture', async () => {
      const incident = await service.reportIncident({
        type: IncidentType.INJURY,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'Fall injury',
        description: 'Worker fell and sustained fracture',
        reportedBy: testReporter,
        injuredPersons: [{
          ...testReporter,
          injuryType: InjuryType.FRACTURE,
          bodyParts: [BodyPart.ARM],
          treatmentProvided: 'First aid, sent to hospital',
          hospitalizedDays: 5,
          restrictedDuty: false,
          permanentDisability: false,
        }],
      });

      expect(incident.severity).toBe(IncidentSeverity.SERIOUS);
      expect(incident.recordable).toBe(true);
    });

    it('should classify severity as fatal when description indicates', async () => {
      const incident = await service.reportIncident({
        type: IncidentType.INJURY,
        occurredAt: new Date(),
        locationDescription: 'Construction site',
        title: 'Fatal fall',
        description: 'Worker deces from height',
        reportedBy: testReporter,
      });

      expect(incident.severity).toBe(IncidentSeverity.FATAL);
    });

    it('should get incident by id', async () => {
      const created = await service.reportIncident({
        type: IncidentType.PROPERTY_DAMAGE,
        occurredAt: new Date(),
        locationDescription: 'Warehouse',
        title: 'Forklift collision',
        description: 'Forklift hit storage rack',
        reportedBy: testReporter,
      });

      const fetched = await service.getIncident(created.id);
      expect(fetched.title).toBe('Forklift collision');
    });

    it('should throw NotFoundException for unknown incident', async () => {
      await expect(service.getIncident('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should get incident by number', async () => {
      const created = await service.reportIncident({
        type: IncidentType.FIRE,
        occurredAt: new Date(),
        locationDescription: 'Kitchen',
        title: 'Small fire',
        description: 'Grease fire in kitchen area',
        reportedBy: testReporter,
      });

      const fetched = await service.getIncidentByNumber(created.incidentNumber);
      expect(fetched.id).toBe(created.id);
    });

    it('should update incident', async () => {
      const incident = await service.reportIncident({
        type: IncidentType.UNSAFE_CONDITION,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'Wet floor',
        description: 'Slippery floor without warning sign',
        reportedBy: testReporter,
      });

      const updated = await service.updateIncident(incident.id, {
        immediateActions: ['Placed warning sign', 'Dried the floor'],
      });

      expect(updated.immediateActions.length).toBe(2);
    });

    it('should list incidents with filters', async () => {
      await service.reportIncident({
        type: IncidentType.INJURY,
        occurredAt: new Date(),
        locationDescription: 'Area A',
        title: 'Injury 1',
        description: 'Test injury',
        reportedBy: testReporter,
        department: 'Production',
      });

      await service.reportIncident({
        type: IncidentType.NEAR_MISS,
        occurredAt: new Date(),
        locationDescription: 'Area B',
        title: 'Near miss 1',
        description: 'Test near miss',
        reportedBy: testReporter,
        department: 'Maintenance',
      });

      const injuries = await service.listIncidents({ type: IncidentType.INJURY });
      expect(injuries.length).toBe(1);

      const production = await service.listIncidents({ department: 'Production' });
      expect(production.length).toBe(1);
    });

    it('should filter recordable incidents only', async () => {
      await service.reportIncident({
        type: IncidentType.INJURY,
        severity: IncidentSeverity.SERIOUS,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'Recordable',
        description: 'Serious injury',
        reportedBy: testReporter,
      });

      await service.reportIncident({
        type: IncidentType.NEAR_MISS,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'Non-recordable',
        description: 'Near miss',
        reportedBy: testReporter,
      });

      const recordable = await service.listIncidents({ recordableOnly: true });
      expect(recordable.length).toBe(1);
      expect(recordable[0].title).toBe('Recordable');
    });
  });

  describe('Media Attachments', () => {
    let incidentId: string;

    beforeEach(async () => {
      const incident = await service.reportIncident({
        type: IncidentType.PROPERTY_DAMAGE,
        occurredAt: new Date(),
        locationDescription: 'Test location',
        title: 'Test incident',
        description: 'Test description',
        reportedBy: testReporter,
      });
      incidentId = incident.id;
    });

    it('should add photo with AI analysis', async () => {
      const incident = await service.addPhoto(incidentId, {
        filename: 'damage.jpg',
        url: 'https://cdn.example.com/damage.jpg',
        mimeType: 'image/jpeg',
        size: 1024000,
        uploadedBy: 'investigator-1',
        description: 'Photo shows broken equipment',
      });

      expect(incident.photos.length).toBe(1);
      expect(incident.photos[0].aiAnalysis).toBeDefined();
      expect(incident.photos[0].aiAnalysis?.detectedHazards).toContain('Equipment damage');
    });

    it('should detect blood in photo description', async () => {
      const incident = await service.addPhoto(incidentId, {
        filename: 'injury.jpg',
        url: 'https://cdn.example.com/injury.jpg',
        mimeType: 'image/jpeg',
        size: 512000,
        uploadedBy: 'first-aider',
        description: 'Image shows blood on floor',
      });

      expect(incident.photos[0].aiAnalysis?.severityIndicators).toContain('Blood visible');
    });

    it('should add video', async () => {
      const incident = await service.addVideo(incidentId, {
        filename: 'cctv.mp4',
        url: 'https://cdn.example.com/cctv.mp4',
        mimeType: 'video/mp4',
        size: 50000000,
        uploadedBy: 'security',
      });

      expect(incident.videos.length).toBe(1);
    });

    it('should add document', async () => {
      const incident = await service.addDocument(incidentId, {
        filename: 'report.pdf',
        url: 'https://cdn.example.com/report.pdf',
        mimeType: 'application/pdf',
        size: 200000,
        uploadedBy: 'hse-manager',
      });

      expect(incident.documents.length).toBe(1);
    });
  });

  describe('Witness Statements', () => {
    let incidentId: string;

    beforeEach(async () => {
      const incident = await service.reportIncident({
        type: IncidentType.INJURY,
        occurredAt: new Date(),
        locationDescription: 'Workshop',
        title: 'Hand injury',
        description: 'Worker cut hand on machinery',
        reportedBy: testReporter,
      });
      incidentId = incident.id;
    });

    it('should add witness statement', async () => {
      const incident = await service.addWitnessStatement(incidentId, {
        witness: {
          id: 'wit-1',
          name: 'Maria Ionescu',
          department: 'Production',
        },
        statement: 'I saw the worker reach into the machine without stopping it first.',
        recordedBy: 'HSE Officer',
      });

      expect(incident.witnesses.length).toBe(1);
      expect(incident.witnesses[0].statement).toContain('reach into the machine');
    });

    it('should sign witness statement', async () => {
      let incident = await service.addWitnessStatement(incidentId, {
        witness: { id: 'wit-1', name: 'Test Witness' },
        statement: 'Test statement',
        recordedBy: 'Recorder',
      });

      const statementId = incident.witnesses[0].id;

      incident = await service.signWitnessStatement(incidentId, statementId, 'digital-signature-hash');

      expect(incident.witnesses[0].signature).toBe('digital-signature-hash');
    });

    it('should throw for unknown statement id', async () => {
      await expect(
        service.signWitnessStatement(incidentId, 'unknown', 'sig')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Investigation', () => {
    let incidentId: string;

    beforeEach(async () => {
      const incident = await service.reportIncident({
        type: IncidentType.INJURY,
        severity: IncidentSeverity.SERIOUS,
        occurredAt: new Date(),
        locationDescription: 'Assembly line',
        title: 'Finger injury',
        description: 'Worker finger caught in conveyor',
        reportedBy: testReporter,
      });
      incidentId = incident.id;
    });

    it('should start investigation', async () => {
      const incident = await service.startInvestigation(incidentId, {
        leadInvestigator: {
          id: 'inv-1',
          name: 'HSE Manager',
          jobTitle: 'Lead Investigator',
        },
        team: [
          { id: 'inv-2', name: 'Supervisor', jobTitle: 'Team member' },
        ],
        methodology: 'FIVE_WHY',
      });

      expect(incident.investigation).toBeDefined();
      expect(incident.investigation?.methodology).toBe('FIVE_WHY');
      expect(incident.status).toBe(IncidentStatus.UNDER_INVESTIGATION);
    });

    it('should not start investigation twice', async () => {
      await service.startInvestigation(incidentId, {
        leadInvestigator: { id: 'inv-1', name: 'Investigator' },
        methodology: 'FISHBONE',
      });

      await expect(
        service.startInvestigation(incidentId, {
          leadInvestigator: { id: 'inv-2', name: 'Another' },
          methodology: 'FIVE_WHY',
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should add investigation finding', async () => {
      await service.startInvestigation(incidentId, {
        leadInvestigator: { id: 'inv-1', name: 'Investigator' },
        methodology: 'COMBINED',
      });

      const incident = await service.addInvestigationFinding(incidentId, 'Guard was removed from machine');

      expect(incident.investigation?.findings.length).toBe(1);
    });

    it('should throw when adding finding without investigation', async () => {
      await expect(
        service.addInvestigationFinding(incidentId, 'Test finding')
      ).rejects.toThrow(BadRequestException);
    });

    it('should add timeline event', async () => {
      await service.startInvestigation(incidentId, {
        leadInvestigator: { id: 'inv-1', name: 'Investigator' },
        methodology: 'COMBINED',
      });

      const incident = await service.addTimelineEvent(incidentId, {
        timestamp: new Date('2025-01-15T10:30:00'),
        description: 'Worker started shift',
        source: 'Time clock records',
      });

      expect(incident.investigation?.timeline.length).toBe(1);
    });

    it('should complete investigation', async () => {
      await service.startInvestigation(incidentId, {
        leadInvestigator: { id: 'inv-1', name: 'Investigator' },
        methodology: 'COMBINED',
      });

      const incident = await service.completeInvestigation(incidentId, {
        contributingFactors: ['Inadequate training', 'Time pressure'],
        systemFailures: ['Missing guard', 'No interlock'],
        recommendations: ['Reinstall guard', 'Add interlock', 'Retrain staff'],
      });

      expect(incident.investigation?.completedAt).toBeDefined();
      expect(incident.investigation?.recommendations.length).toBe(3);
    });
  });

  describe('Root Cause Analysis', () => {
    let incidentId: string;

    beforeEach(async () => {
      const incident = await service.reportIncident({
        type: IncidentType.INJURY,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'Test incident',
        description: 'Test description',
        reportedBy: testReporter,
      });
      incidentId = incident.id;
    });

    it('should add root cause', async () => {
      // Need to start investigation first for status to change
      await service.startInvestigation(incidentId, {
        leadInvestigator: { id: 'inv-1', name: 'Investigator' },
        methodology: 'FIVE_WHY',
      });

      const incident = await service.addRootCause(incidentId, {
        category: RootCauseCategory.LACK_OF_KNOWLEDGE,
        description: 'Worker was not trained on machine operation',
        evidence: ['Training records checked', 'Supervisor interview'],
      });

      expect(incident.rootCauses.length).toBe(1);
      expect(incident.status).toBe(IncidentStatus.ROOT_CAUSE_IDENTIFIED);
    });

    it('should perform 5-Why analysis', async () => {
      const rootCause = await service.performFiveWhyAnalysis(incidentId,
        'Worker injured hand',
        [
          'Hand was in pinch point',
          'Guard was removed',
          'Guard was inconvenient to use',
          'Guard design was poor',
          'No user input during design',
        ]
      );

      expect(rootCause.fiveWhyChain?.length).toBe(6); // problem + 5 whys
      expect(rootCause.description).toContain('No user input');
    });

    it('should reject invalid 5-Why chain length', async () => {
      await expect(
        service.performFiveWhyAnalysis(incidentId, 'Problem', ['Why 1', 'Why 2'])
      ).rejects.toThrow(BadRequestException);
    });

    it('should perform Fishbone analysis', async () => {
      const rootCauses = await service.performFishboneAnalysis(incidentId, {
        manpower: ['Insufficient training', 'Fatigue'],
        machine: ['Guard missing', 'Equipment old'],
        method: ['Procedure outdated'],
        environment: ['Poor lighting'],
      });

      expect(rootCauses.length).toBe(6);

      const incident = await service.getIncident(incidentId);
      expect(incident.rootCauses.length).toBe(6);

      const manpowerCauses = rootCauses.filter(rc => rc.fishboneCategory === 'MANPOWER');
      expect(manpowerCauses.length).toBe(2);
    });
  });

  describe('CAPA (Corrective/Preventive Actions)', () => {
    let incidentId: string;
    let rootCauseId: string;

    beforeEach(async () => {
      const incident = await service.reportIncident({
        type: IncidentType.INJURY,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'Test incident',
        description: 'Test',
        reportedBy: testReporter,
      });
      incidentId = incident.id;

      const updated = await service.addRootCause(incidentId, {
        category: RootCauseCategory.INADEQUATE_MAINTENANCE,
        description: 'Machine not maintained properly',
        evidence: ['Maintenance log gaps'],
      });
      rootCauseId = updated.rootCauses[0].id;
    });

    it('should add CAPA', async () => {
      // Start investigation first for proper status flow
      await service.startInvestigation(incidentId, {
        leadInvestigator: { id: 'inv-1', name: 'Investigator' },
        methodology: 'COMBINED',
      });

      const incident = await service.addCAPA(incidentId, {
        type: CAPAType.CORRECTIVE,
        priority: CAPAPriority.HIGH,
        description: 'Repair machine and reinstall guard',
        rootCauseId,
        responsiblePerson: 'Maintenance Manager',
        targetDate: new Date('2025-02-01'),
        cost: 5000,
        currency: 'RON',
      });

      expect(incident.capas.length).toBe(1);
      expect(incident.capas[0].status).toBe(CAPAStatus.IDENTIFIED);
      // Status changes to CAPA_IN_PROGRESS only when ROOT_CAUSE_IDENTIFIED
      expect(incident.status).toBe(IncidentStatus.UNDER_INVESTIGATION);
    });

    it('should throw for invalid root cause reference', async () => {
      await expect(
        service.addCAPA(incidentId, {
          type: CAPAType.PREVENTIVE,
          priority: CAPAPriority.MEDIUM,
          description: 'Test',
          rootCauseId: 'invalid-id',
          responsiblePerson: 'Test',
          targetDate: new Date(),
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should update CAPA status', async () => {
      let incident = await service.addCAPA(incidentId, {
        type: CAPAType.CORRECTIVE,
        priority: CAPAPriority.HIGH,
        description: 'Fix issue',
        responsiblePerson: 'Manager',
        targetDate: new Date(),
      });

      const capaId = incident.capas[0].id;

      incident = await service.updateCAPAStatus(incidentId, capaId, CAPAStatus.IMPLEMENTED);
      expect(incident.capas[0].completedDate).toBeDefined();

      incident = await service.updateCAPAStatus(incidentId, capaId, CAPAStatus.VERIFIED, 'HSE Director');
      expect(incident.capas[0].verifiedBy).toBe('HSE Director');
    });

    it('should throw for unknown CAPA', async () => {
      await expect(
        service.updateCAPAStatus(incidentId, 'unknown', CAPAStatus.IMPLEMENTED)
      ).rejects.toThrow(NotFoundException);
    });

    it('should rate CAPA effectiveness', async () => {
      let incident = await service.addCAPA(incidentId, {
        type: CAPAType.PREVENTIVE,
        priority: CAPAPriority.MEDIUM,
        description: 'Implement new training program',
        responsiblePerson: 'Training Manager',
        targetDate: new Date(),
      });

      const capaId = incident.capas[0].id;

      incident = await service.rateCAPAEffectiveness(incidentId, capaId, 4, [
        'Training completed for all operators',
        'Quiz scores improved 30%',
      ]);

      expect(incident.capas[0].effectivenessRating).toBe(4);
      expect(incident.capas[0].evidence.length).toBe(2);
    });

    it('should reject invalid effectiveness rating', async () => {
      const incident = await service.addCAPA(incidentId, {
        type: CAPAType.CORRECTIVE,
        priority: CAPAPriority.LOW,
        description: 'Test',
        responsiblePerson: 'Test',
        targetDate: new Date(),
      });

      await expect(
        service.rateCAPAEffectiveness(incidentId, incident.capas[0].id, 10, [])
      ).rejects.toThrow(BadRequestException);
    });

    it('should get overdue CAPAs', async () => {
      await service.addCAPA(incidentId, {
        type: CAPAType.CORRECTIVE,
        priority: CAPAPriority.CRITICAL,
        description: 'Overdue action',
        responsiblePerson: 'Manager',
        targetDate: new Date('2024-01-01'), // Past date
      });

      const overdue = await service.getOverdueCAPAs();
      expect(overdue.length).toBe(1);
      expect(overdue[0].capa.status).toBe(CAPAStatus.OVERDUE);
    });
  });

  describe('Incident Closure', () => {
    let incidentId: string;

    beforeEach(async () => {
      // Create a fully investigated incident
      const incident = await service.reportIncident({
        type: IncidentType.INJURY,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'Test incident',
        description: 'Test',
        reportedBy: testReporter,
      });
      incidentId = incident.id;

      await service.startInvestigation(incidentId, {
        leadInvestigator: { id: 'inv-1', name: 'Investigator' },
        methodology: 'FIVE_WHY',
      });

      await service.completeInvestigation(incidentId, {
        contributingFactors: ['Factor 1'],
        systemFailures: ['Failure 1'],
        recommendations: ['Recommendation 1'],
      });

      await service.addRootCause(incidentId, {
        category: RootCauseCategory.UNSAFE_ACT,
        description: 'Root cause',
        evidence: ['Evidence'],
      });

      const withCAPA = await service.addCAPA(incidentId, {
        type: CAPAType.CORRECTIVE,
        priority: CAPAPriority.HIGH,
        description: 'CAPA',
        responsiblePerson: 'Manager',
        targetDate: new Date(),
      });

      const capaId = withCAPA.capas[0].id;
      await service.updateCAPAStatus(incidentId, capaId, CAPAStatus.VERIFIED, 'Verifier');
    });

    it('should close incident when all requirements met', async () => {
      const closed = await service.closeIncident(incidentId, 'HSE Director');

      expect(closed.status).toBe(IncidentStatus.CLOSED);
      expect(closed.closedAt).toBeDefined();
      expect(closed.closedBy).toBe('HSE Director');
    });

    it('should not close without completed investigation', async () => {
      const newIncident = await service.reportIncident({
        type: IncidentType.NEAR_MISS,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'New incident',
        description: 'Test',
        reportedBy: testReporter,
      });

      await expect(
        service.closeIncident(newIncident.id, 'Manager')
      ).rejects.toThrow(BadRequestException);
    });

    it('should not close with open CAPAs', async () => {
      const newIncident = await service.reportIncident({
        type: IncidentType.INJURY,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'New incident',
        description: 'Test',
        reportedBy: testReporter,
      });

      await service.startInvestigation(newIncident.id, {
        leadInvestigator: { id: 'inv', name: 'Inv' },
        methodology: 'COMBINED',
      });

      await service.completeInvestigation(newIncident.id, {
        contributingFactors: [],
        systemFailures: [],
        recommendations: [],
      });

      await service.addRootCause(newIncident.id, {
        category: RootCauseCategory.UNSAFE_CONDITION,
        description: 'Test',
        evidence: [],
      });

      await service.addCAPA(newIncident.id, {
        type: CAPAType.CORRECTIVE,
        priority: CAPAPriority.HIGH,
        description: 'Open CAPA',
        responsiblePerson: 'Manager',
        targetDate: new Date(),
      });

      await expect(
        service.closeIncident(newIncident.id, 'Manager')
      ).rejects.toThrow(BadRequestException);
    });

    it('should reopen closed incident', async () => {
      await service.closeIncident(incidentId, 'Manager');

      const reopened = await service.reopenIncident(incidentId, 'Similar incident occurred, need to review');

      expect(reopened.status).toBe(IncidentStatus.REOPENED);
      expect(reopened.closedAt).toBeUndefined();
    });

    it('should not reopen non-closed incident', async () => {
      await expect(
        service.reopenIncident(incidentId, 'Test')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Lost Time & Metrics', () => {
    it('should record lost time', async () => {
      const incident = await service.reportIncident({
        type: IncidentType.INJURY,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'LTI',
        description: 'Lost time injury',
        reportedBy: testReporter,
      });

      const updated = await service.recordLostTime(incident.id, {
        lostWorkDays: 5,
        restrictedWorkDays: 10,
      });

      expect(updated.lostWorkDays).toBe(5);
      expect(updated.restrictedWorkDays).toBe(10);
      expect(updated.recordable).toBe(true);
    });

    it('should calculate safety metrics', async () => {
      // Create some incidents
      await service.reportIncident({
        type: IncidentType.INJURY,
        severity: IncidentSeverity.SERIOUS,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'Recordable 1',
        description: 'Recordable injury',
        reportedBy: testReporter,
      });

      await service.reportIncident({
        type: IncidentType.NEAR_MISS,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'Near miss',
        description: 'Near miss event',
        reportedBy: testReporter,
      });

      const metrics = await service.calculateSafetyMetrics(
        new Date('2025-01-01'),
        new Date('2025-12-31'),
        100000, // 100,000 hours worked
      );

      expect(metrics.totalIncidents).toBe(2);
      expect(metrics.totalRecordableIncidents).toBe(1);
      expect(metrics.nearMisses).toBe(1);
      expect(metrics.TRIR).toBeGreaterThan(0);
      expect(metrics.hoursWorked).toBe(100000);
    });

    it('should calculate LTIR correctly', async () => {
      const incident = await service.reportIncident({
        type: IncidentType.INJURY,
        severity: IncidentSeverity.SERIOUS,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'LTI',
        description: 'Test',
        reportedBy: testReporter,
      });

      await service.recordLostTime(incident.id, {
        lostWorkDays: 10,
        restrictedWorkDays: 0,
      });

      const metrics = await service.calculateSafetyMetrics(
        new Date('2025-01-01'),
        new Date('2025-12-31'),
        200000,
      );

      // LTIR = (LTIs * 200,000) / hours worked
      // LTIR = (1 * 200,000) / 200,000 = 1.0
      expect(metrics.LTIR).toBe(1);
      expect(metrics.lostTimeIncidents).toBe(1);
    });
  });

  describe('Regulatory Reporting', () => {
    it('should mark incident reported to authorities', async () => {
      const incident = await service.reportIncident({
        type: IncidentType.INJURY,
        severity: IncidentSeverity.SERIOUS,
        occurredAt: new Date(),
        locationDescription: 'Test',
        title: 'Reportable incident',
        description: 'Test',
        reportedBy: testReporter,
      });

      const updated = await service.markReportedToAuthorities(incident.id, 'ITM-2025-001234');

      expect(updated.reportedToAuthorities).toBe(true);
      expect(updated.authorityReference).toBe('ITM-2025-001234');
    });

    it('should get reporting requirements for fatal', () => {
      const requirements = service.getReportingRequirements(IncidentSeverity.FATAL);

      expect(requirements.reportToITM).toBe(true);
      expect(requirements.reportToISCIR).toBe(true);
      expect(requirements.reportWithin).toBe('24h');
      expect(requirements.forms.length).toBeGreaterThan(0);
    });

    it('should get reporting requirements for minor', () => {
      const requirements = service.getReportingRequirements(IncidentSeverity.MINOR);

      expect(requirements.reportToITM).toBe(false);
      expect(requirements.reportToISCIR).toBe(false);
    });
  });

  describe('ISM Report Generation', () => {
    it('should generate ISM format report', async () => {
      const incident = await service.reportIncident({
        type: IncidentType.INJURY,
        severity: IncidentSeverity.SERIOUS,
        occurredAt: new Date('2025-01-15T10:30:00'),
        locationDescription: 'Main Production Hall',
        title: 'Worker injury on press',
        description: 'Worker hand caught in hydraulic press',
        immediateActions: ['First aid administered', 'Area secured'],
        reportedBy: testReporter,
      });

      await service.startInvestigation(incident.id, {
        leadInvestigator: { id: 'inv', name: 'HSE Manager' },
        methodology: 'COMBINED',
      });

      await service.completeInvestigation(incident.id, {
        contributingFactors: [],
        systemFailures: [],
        recommendations: ['Improve training', 'Add interlock'],
      });

      await service.addRootCause(incident.id, {
        category: RootCauseCategory.UNSAFE_ACT,
        description: 'Bypassed safety guard',
        evidence: [],
      });

      await service.addCAPA(incident.id, {
        type: CAPAType.CORRECTIVE,
        priority: CAPAPriority.HIGH,
        description: 'Reinstall guard with interlock',
        responsiblePerson: 'Maintenance',
        targetDate: new Date(),
      });

      await service.addCAPA(incident.id, {
        type: CAPAType.PREVENTIVE,
        priority: CAPAPriority.MEDIUM,
        description: 'Retrain all operators',
        responsiblePerson: 'Training',
        targetDate: new Date(),
      });

      const report = await service.generateISMReport(incident.id, 'Main Factory', 'ACME Industries');

      expect(report.reportNumber).toContain('ISM-');
      expect(report.company).toBe('ACME Industries');
      expect(report.vesselOrFacility).toBe('Main Factory');
      expect(report.rootCauses.length).toBe(1);
      expect(report.correctiveActions.length).toBe(1);
      expect(report.preventiveActions.length).toBe(1);
      expect(report.lessonsLearned.length).toBe(2);
    });
  });
});
