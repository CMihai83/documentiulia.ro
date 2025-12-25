import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  HSEService,
  RiskCategory,
  RiskLikelihood,
  RiskSeverity,
  RiskLevel,
  ControlHierarchy,
  ControlStatus,
  AssessmentStatus,
  HazardSource,
  PSSRStatus,
} from './hse.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HSEService', () => {
  let service: HSEService;
  let module: TestingModule;

  const mockPrismaService = {};
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        HSEService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<HSEService>(HSEService);
    service.resetState();
    jest.clearAllMocks();
  });

  describe('Locations', () => {
    it('should create a location', async () => {
      const location = await service.createLocation({
        name: 'Production Hall',
        type: 'BUILDING',
        address: 'Industrial Zone A',
      });

      expect(location.id).toBeDefined();
      expect(location.name).toBe('Production Hall');
      expect(location.type).toBe('BUILDING');
    });

    it('should require location name', async () => {
      await expect(
        service.createLocation({ type: 'ZONE' })
      ).rejects.toThrow(BadRequestException);
    });

    it('should get location by id', async () => {
      const created = await service.createLocation({ name: 'Warehouse' });
      const fetched = await service.getLocation(created.id);
      expect(fetched.name).toBe('Warehouse');
    });

    it('should throw NotFoundException for unknown location', async () => {
      await expect(service.getLocation('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should list locations', async () => {
      await service.createLocation({ name: 'Location A' });
      await service.createLocation({ name: 'Location B' });

      const locations = await service.listLocations();
      expect(locations.length).toBeGreaterThanOrEqual(3); // Including default HQ
    });

    it('should get location hierarchy', async () => {
      const parent = await service.createLocation({ name: 'Building A' });
      const child = await service.createLocation({ name: 'Floor 1', parentId: parent.id });

      const hierarchy = await service.getLocationHierarchy(child.id);
      expect(hierarchy.length).toBe(2);
      expect(hierarchy[0].name).toBe('Building A');
      expect(hierarchy[1].name).toBe('Floor 1');
    });

    it('should get location children', async () => {
      const parent = await service.createLocation({ name: 'Building B' });
      await service.createLocation({ name: 'Floor 1', parentId: parent.id });
      await service.createLocation({ name: 'Floor 2', parentId: parent.id });

      const children = await service.getLocationChildren(parent.id);
      expect(children.length).toBe(2);
    });
  });

  describe('Hazards', () => {
    it('should create a hazard', async () => {
      const hazard = await service.createHazard({
        name: 'Moving Machinery Parts',
        description: 'Exposed gears and belts on production line',
        category: RiskCategory.MECHANICAL,
        source: HazardSource.WORKPLACE_INSPECTION,
        potentialConsequences: ['Amputation', 'Laceration'],
        affectedPersons: ['Machine operators', 'Maintenance staff'],
      }, 'inspector-1');

      expect(hazard.id).toBeDefined();
      expect(hazard.name).toBe('Moving Machinery Parts');
      expect(hazard.category).toBe(RiskCategory.MECHANICAL);
      expect(hazard.status).toBe('ACTIVE');
    });

    it('should require hazard name and category', async () => {
      await expect(
        service.createHazard({ description: 'Test' }, 'inspector')
      ).rejects.toThrow(BadRequestException);
    });

    it('should get hazard by id', async () => {
      const created = await service.createHazard({
        name: 'Chemical Spill',
        category: RiskCategory.CHEMICAL,
      }, 'inspector-1');

      const fetched = await service.getHazard(created.id);
      expect(fetched.name).toBe('Chemical Spill');
    });

    it('should update hazard status', async () => {
      const hazard = await service.createHazard({
        name: 'Noise Exposure',
        category: RiskCategory.NOISE,
      }, 'inspector-1');

      const updated = await service.updateHazard(hazard.id, { status: 'CONTROLLED' });
      expect(updated.status).toBe('CONTROLLED');
    });

    it('should list hazards with filters', async () => {
      await service.createHazard({
        name: 'Electrical Shock',
        category: RiskCategory.ELECTRICAL,
      }, 'inspector-1');

      await service.createHazard({
        name: 'Fire Risk',
        category: RiskCategory.FIRE,
      }, 'inspector-1');

      const electricalHazards = await service.listHazards({ category: RiskCategory.ELECTRICAL });
      expect(electricalHazards.length).toBe(1);
      expect(electricalHazards[0].name).toBe('Electrical Shock');
    });

    it('should filter hazards by location', async () => {
      const location = await service.createLocation({ name: 'Test Location' });

      await service.createHazard({
        name: 'Local Hazard',
        category: RiskCategory.PHYSICAL,
        locationId: location.id,
      }, 'inspector-1');

      await service.createHazard({
        name: 'Other Hazard',
        category: RiskCategory.PHYSICAL,
      }, 'inspector-1');

      const localHazards = await service.listHazards({ locationId: location.id });
      expect(localHazards.length).toBe(1);
      expect(localHazards[0].name).toBe('Local Hazard');
    });

    it('should get hazard categories with Romanian SSM examples', async () => {
      const categories = await service.getHazardCategories();

      expect(categories.length).toBe(16);
      const mechanical = categories.find(c => c.category === RiskCategory.MECHANICAL);
      expect(mechanical?.examples).toContain('Organe în mișcare');
    });
  });

  describe('Risk Assessments', () => {
    let hazardId: string;

    beforeEach(async () => {
      const hazard = await service.createHazard({
        name: 'Test Hazard',
        category: RiskCategory.PHYSICAL,
      }, 'inspector-1');
      hazardId = hazard.id;
    });

    it('should create risk assessment with calculated scores', async () => {
      const assessment = await service.createRiskAssessment({
        title: 'Machine Safety Assessment',
        hazardId,
        assessor: { id: 'assessor-1', name: 'John Safety', role: 'HSE Manager' },
        initialLikelihood: RiskLikelihood.LIKELY,
        initialSeverity: RiskSeverity.MAJOR,
      });

      expect(assessment.id).toBeDefined();
      expect(assessment.initialRiskScore).toBe(16); // 4 * 4
      expect(assessment.initialRiskLevel).toBe(RiskLevel.CRITICAL);
      expect(assessment.status).toBe(AssessmentStatus.DRAFT);
    });

    it('should calculate correct risk levels', async () => {
      // Low risk (1x1=1)
      const low = await service.createRiskAssessment({
        title: 'Low Risk',
        hazardId,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.RARE,
        initialSeverity: RiskSeverity.NEGLIGIBLE,
      });
      expect(low.initialRiskLevel).toBe(RiskLevel.LOW);

      // Medium risk (3x3=9)
      const hazard2 = await service.createHazard({ name: 'H2', category: RiskCategory.FIRE }, 'i');
      const medium = await service.createRiskAssessment({
        title: 'Medium Risk',
        hazardId: hazard2.id,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.POSSIBLE,
        initialSeverity: RiskSeverity.MODERATE,
      });
      expect(medium.initialRiskLevel).toBe(RiskLevel.MEDIUM);

      // High risk (5x3=15)
      const hazard3 = await service.createHazard({ name: 'H3', category: RiskCategory.CHEMICAL }, 'i');
      const high = await service.createRiskAssessment({
        title: 'High Risk',
        hazardId: hazard3.id,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.ALMOST_CERTAIN,
        initialSeverity: RiskSeverity.MODERATE,
      });
      expect(high.initialRiskLevel).toBe(RiskLevel.HIGH);

      // Critical risk (5x5=25)
      const hazard4 = await service.createHazard({ name: 'H4', category: RiskCategory.ELECTRICAL }, 'i');
      const critical = await service.createRiskAssessment({
        title: 'Critical Risk',
        hazardId: hazard4.id,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.ALMOST_CERTAIN,
        initialSeverity: RiskSeverity.CATASTROPHIC,
      });
      expect(critical.initialRiskLevel).toBe(RiskLevel.CRITICAL);
    });

    it('should get risk assessment by id', async () => {
      const created = await service.createRiskAssessment({
        title: 'Test Assessment',
        hazardId,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.POSSIBLE,
        initialSeverity: RiskSeverity.MINOR,
      });

      const fetched = await service.getRiskAssessment(created.id);
      expect(fetched.title).toBe('Test Assessment');
    });

    it('should throw NotFoundException for unknown assessment', async () => {
      await expect(service.getRiskAssessment('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should update risk assessment', async () => {
      const assessment = await service.createRiskAssessment({
        title: 'Original',
        hazardId,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.LIKELY,
        initialSeverity: RiskSeverity.MODERATE,
      });

      const updated = await service.updateRiskAssessment(assessment.id, {
        title: 'Updated Title',
        description: 'Added description',
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.description).toBe('Added description');
    });

    it('should submit assessment for review', async () => {
      const assessment = await service.createRiskAssessment({
        title: 'For Review',
        hazardId,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.POSSIBLE,
        initialSeverity: RiskSeverity.MODERATE,
      });

      const submitted = await service.submitForReview(assessment.id);
      expect(submitted.status).toBe(AssessmentStatus.PENDING_REVIEW);
    });

    it('should not submit non-draft assessment', async () => {
      const assessment = await service.createRiskAssessment({
        title: 'Already Submitted',
        hazardId,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.POSSIBLE,
        initialSeverity: RiskSeverity.MODERATE,
      });

      await service.submitForReview(assessment.id);

      await expect(service.submitForReview(assessment.id)).rejects.toThrow(BadRequestException);
    });

    it('should approve assessment', async () => {
      const assessment = await service.createRiskAssessment({
        title: 'To Approve',
        hazardId,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.POSSIBLE,
        initialSeverity: RiskSeverity.MODERATE,
      });

      await service.submitForReview(assessment.id);

      const approved = await service.approveAssessment(assessment.id, {
        id: 'reviewer-1',
        name: 'Jane Manager',
        role: 'HSE Director',
      });

      expect(approved.status).toBe(AssessmentStatus.APPROVED);
      expect(approved.reviewers.length).toBe(1);
      expect(approved.reviewers[0].signedAt).toBeDefined();
    });

    it('should reject assessment with reason', async () => {
      const assessment = await service.createRiskAssessment({
        title: 'To Reject',
        hazardId,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.POSSIBLE,
        initialSeverity: RiskSeverity.MODERATE,
      });

      await service.submitForReview(assessment.id);

      const rejected = await service.rejectAssessment(
        assessment.id,
        { id: 'r', name: 'R', role: 'Manager' },
        'Missing control measures'
      );

      expect(rejected.status).toBe(AssessmentStatus.REQUIRES_UPDATE);
      expect(rejected.description).toContain('Missing control measures');
    });

    it('should list assessments with filters', async () => {
      const a1 = await service.createRiskAssessment({
        title: 'Assessment 1',
        hazardId,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.ALMOST_CERTAIN,
        initialSeverity: RiskSeverity.CATASTROPHIC,
      });

      const hazard2 = await service.createHazard({ name: 'H2', category: RiskCategory.FIRE }, 'i');
      await service.createRiskAssessment({
        title: 'Assessment 2',
        hazardId: hazard2.id,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.RARE,
        initialSeverity: RiskSeverity.NEGLIGIBLE,
      });

      const criticalOnly = await service.listRiskAssessments({ riskLevel: RiskLevel.CRITICAL });
      expect(criticalOnly.length).toBe(1);
      expect(criticalOnly[0].title).toBe('Assessment 1');
    });
  });

  describe('Control Measures', () => {
    let assessmentId: string;

    beforeEach(async () => {
      const hazard = await service.createHazard({
        name: 'Test Hazard',
        category: RiskCategory.MECHANICAL,
      }, 'inspector-1');

      const assessment = await service.createRiskAssessment({
        title: 'Test Assessment',
        hazardId: hazard.id,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.LIKELY,
        initialSeverity: RiskSeverity.MAJOR,
      });
      assessmentId = assessment.id;
    });

    it('should add control measure', async () => {
      const assessment = await service.addControlMeasure(assessmentId, {
        description: 'Install machine guard',
        hierarchy: ControlHierarchy.ENGINEERING,
        responsiblePerson: 'Maintenance Manager',
        targetDate: new Date('2025-03-01'),
        cost: 5000,
        currency: 'RON',
      });

      expect(assessment.controls.length).toBe(1);
      expect(assessment.controls[0].hierarchy).toBe(ControlHierarchy.ENGINEERING);
      expect(assessment.controls[0].status).toBe(ControlStatus.PLANNED);
    });

    it('should update control status to implemented', async () => {
      let assessment = await service.addControlMeasure(assessmentId, {
        description: 'Add warning signs',
        hierarchy: ControlHierarchy.ADMINISTRATIVE,
        responsiblePerson: 'Safety Officer',
        targetDate: new Date('2025-02-01'),
      });

      const controlId = assessment.controls[0].id;

      assessment = await service.updateControlStatus(assessmentId, controlId, ControlStatus.IMPLEMENTED);

      expect(assessment.controls[0].status).toBe(ControlStatus.IMPLEMENTED);
      expect(assessment.controls[0].implementedDate).toBeDefined();
    });

    it('should verify control and record verifier', async () => {
      let assessment = await service.addControlMeasure(assessmentId, {
        description: 'PPE requirement',
        hierarchy: ControlHierarchy.PPE,
        responsiblePerson: 'Supervisor',
        targetDate: new Date('2025-02-01'),
      });

      const controlId = assessment.controls[0].id;
      await service.updateControlStatus(assessmentId, controlId, ControlStatus.IMPLEMENTED);

      assessment = await service.updateControlStatus(
        assessmentId,
        controlId,
        ControlStatus.VERIFIED,
        'HSE Manager'
      );

      expect(assessment.controls[0].status).toBe(ControlStatus.VERIFIED);
      expect(assessment.controls[0].verifiedBy).toBe('HSE Manager');
      expect(assessment.controls[0].verifiedDate).toBeDefined();
    });

    it('should rate control effectiveness', async () => {
      let assessment = await service.addControlMeasure(assessmentId, {
        description: 'Ventilation system',
        hierarchy: ControlHierarchy.ENGINEERING,
        responsiblePerson: 'Facilities',
        targetDate: new Date('2025-02-01'),
      });

      const controlId = assessment.controls[0].id;

      assessment = await service.rateControlEffectiveness(
        assessmentId,
        controlId,
        4,
        'Effective but needs regular maintenance'
      );

      expect(assessment.controls[0].effectivenessRating).toBe(4);
      expect(assessment.controls[0].effectivenessNotes).toContain('regular maintenance');
    });

    it('should mark control ineffective for low rating', async () => {
      let assessment = await service.addControlMeasure(assessmentId, {
        description: 'Warning poster',
        hierarchy: ControlHierarchy.ADMINISTRATIVE,
        responsiblePerson: 'HR',
        targetDate: new Date('2025-02-01'),
      });

      const controlId = assessment.controls[0].id;

      assessment = await service.rateControlEffectiveness(assessmentId, controlId, 1, 'Not visible');

      expect(assessment.controls[0].status).toBe(ControlStatus.INEFFECTIVE);
    });

    it('should reject invalid effectiveness rating', async () => {
      const assessment = await service.addControlMeasure(assessmentId, {
        description: 'Test control',
        hierarchy: ControlHierarchy.PPE,
        responsiblePerson: 'Test',
        targetDate: new Date('2025-02-01'),
      });

      await expect(
        service.rateControlEffectiveness(assessmentId, assessment.controls[0].id, 10)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for unknown control', async () => {
      await expect(
        service.updateControlStatus(assessmentId, 'unknown-control', ControlStatus.IMPLEMENTED)
      ).rejects.toThrow(NotFoundException);
    });

    it('should get overdue controls', async () => {
      await service.addControlMeasure(assessmentId, {
        description: 'Overdue control',
        hierarchy: ControlHierarchy.ENGINEERING,
        responsiblePerson: 'Someone',
        targetDate: new Date('2024-01-01'), // Past date
      });

      const overdue = await service.getOverdueControls();
      expect(overdue.length).toBe(1);
      expect(overdue[0].control.description).toBe('Overdue control');
    });

    it('should recalculate residual risk when controls implemented', async () => {
      // Add high-hierarchy control (elimination)
      let assessment = await service.addControlMeasure(assessmentId, {
        description: 'Remove hazard source',
        hierarchy: ControlHierarchy.ELIMINATION,
        responsiblePerson: 'Engineering',
        targetDate: new Date('2025-03-01'),
      });

      const initialScore = assessment.residualRiskScore;
      const controlId = assessment.controls[0].id;

      // Implement and verify
      await service.updateControlStatus(assessmentId, controlId, ControlStatus.IMPLEMENTED);
      assessment = await service.updateControlStatus(assessmentId, controlId, ControlStatus.VERIFIED);

      // Rate effectiveness
      assessment = await service.rateControlEffectiveness(assessmentId, controlId, 5, 'Fully effective');

      // Residual risk should be reduced
      expect(assessment.residualRiskScore).toBeLessThan(initialScore);
    });
  });

  describe('PSSR (Pre-Startup Safety Review)', () => {
    let locationId: string;

    beforeEach(async () => {
      const location = await service.createLocation({
        name: 'New Production Line',
        type: 'ZONE',
      });
      locationId = location.id;
    });

    it('should create PSSR with checklist', async () => {
      const pssr = await service.createPSSR({
        title: 'Q1 2025 Safety Review',
        description: 'Annual PSSR for production line',
        locationId,
        scheduledDate: new Date('2025-03-01'),
        assessor: { id: 'a', name: 'Safety Officer', role: 'HSE' },
      });

      expect(pssr.id).toBeDefined();
      expect(pssr.status).toBe(PSSRStatus.SCHEDULED);
      expect(pssr.checklist.length).toBe(20); // Default checklist items
    });

    it('should get PSSR by id', async () => {
      const created = await service.createPSSR({
        title: 'Test PSSR',
        locationId,
        scheduledDate: new Date('2025-03-01'),
        assessor: { id: 'a', name: 'A', role: 'R' },
      });

      const fetched = await service.getPSSR(created.id);
      expect(fetched.title).toBe('Test PSSR');
    });

    it('should throw NotFoundException for unknown PSSR', async () => {
      await expect(service.getPSSR('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should update checklist item', async () => {
      const pssr = await service.createPSSR({
        title: 'Checklist Test',
        locationId,
        scheduledDate: new Date('2025-03-01'),
        assessor: { id: 'a', name: 'A', role: 'R' },
      });

      const itemId = pssr.checklist[0].id;

      const updated = await service.updatePSSRChecklist(pssr.id, itemId, 'YES', 'All guards in place');

      expect(updated.checklist[0].response).toBe('YES');
      expect(updated.checklist[0].comments).toBe('All guards in place');
      expect(updated.status).toBe(PSSRStatus.IN_PROGRESS);
    });

    it('should throw for unknown checklist item', async () => {
      const pssr = await service.createPSSR({
        title: 'Test',
        locationId,
        scheduledDate: new Date('2025-03-01'),
        assessor: { id: 'a', name: 'A', role: 'R' },
      });

      await expect(
        service.updatePSSRChecklist(pssr.id, 'unknown-item', 'YES')
      ).rejects.toThrow(NotFoundException);
    });

    it('should add finding to PSSR', async () => {
      const pssr = await service.createPSSR({
        title: 'Finding Test',
        locationId,
        scheduledDate: new Date('2025-03-01'),
        assessor: { id: 'a', name: 'A', role: 'R' },
      });

      const updated = await service.addPSSRFinding(pssr.id, {
        description: 'Missing fire extinguisher',
        severity: 'MAJOR',
        actionRequired: 'Install fire extinguisher within 7 days',
        responsiblePerson: 'Facilities Manager',
        dueDate: new Date('2025-03-08'),
      });

      expect(updated.findings.length).toBe(1);
      expect(updated.findings[0].severity).toBe('MAJOR');
      expect(updated.findings[0].status).toBe('OPEN');
    });

    it('should complete PSSR with result', async () => {
      const pssr = await service.createPSSR({
        title: 'Completion Test',
        locationId,
        scheduledDate: new Date('2025-03-01'),
        assessor: { id: 'a', name: 'A', role: 'R' },
      });

      // Answer all checklist items
      for (const item of pssr.checklist) {
        await service.updatePSSRChecklist(pssr.id, item.id, 'YES');
      }

      const completed = await service.completePSSR(pssr.id, 'PASS', [
        'Continue monthly inspections',
        'Update emergency procedures',
      ]);

      expect(completed.status).toBe(PSSRStatus.COMPLETED);
      expect(completed.overallResult).toBe('PASS');
      expect(completed.completedDate).toBeDefined();
      expect(completed.recommendations.length).toBe(2);
    });

    it('should not complete PSSR with pending items', async () => {
      const pssr = await service.createPSSR({
        title: 'Incomplete Test',
        locationId,
        scheduledDate: new Date('2025-03-01'),
        assessor: { id: 'a', name: 'A', role: 'R' },
      });

      await expect(
        service.completePSSR(pssr.id, 'PASS', [])
      ).rejects.toThrow(BadRequestException);
    });

    it('should list PSSRs with filters', async () => {
      await service.createPSSR({
        title: 'PSSR 1',
        locationId,
        scheduledDate: new Date('2025-03-01'),
        assessor: { id: 'a', name: 'A', role: 'R' },
      });

      const location2 = await service.createLocation({ name: 'Other Location' });
      await service.createPSSR({
        title: 'PSSR 2',
        locationId: location2.id,
        scheduledDate: new Date('2025-03-01'),
        assessor: { id: 'a', name: 'A', role: 'R' },
      });

      const filtered = await service.listPSSRs({ locationId });
      expect(filtered.length).toBe(1);
      expect(filtered[0].title).toBe('PSSR 1');
    });

    it('should identify overdue PSSRs', async () => {
      await service.createPSSR({
        title: 'Overdue PSSR',
        locationId,
        scheduledDate: new Date('2024-01-01'), // Past date
        assessor: { id: 'a', name: 'A', role: 'R' },
      });

      const overdue = await service.listPSSRs({ overdue: true });
      expect(overdue.length).toBe(1);
      expect(overdue[0].status).toBe(PSSRStatus.OVERDUE);
    });
  });

  describe('Risk Matrix', () => {
    it('should return complete 5x5 risk matrix', () => {
      const matrix = service.getRiskMatrix();

      expect(matrix.length).toBe(5);
      expect(matrix[0].length).toBe(5);

      // Check corner values
      expect(matrix[0][0].riskScore).toBe(1); // 1x1
      expect(matrix[4][4].riskScore).toBe(25); // 5x5

      // Check risk levels
      expect(matrix[0][0].riskLevel).toBe(RiskLevel.LOW);
      expect(matrix[4][4].riskLevel).toBe(RiskLevel.CRITICAL);
    });

    it('should include colors and actions', () => {
      const matrix = service.getRiskMatrix();

      expect(matrix[0][0].color).toBe('#22c55e'); // Green for low
      expect(matrix[4][4].color).toBe('#ef4444'); // Red for critical

      expect(matrix[0][0].action).toContain('Monitor');
      expect(matrix[4][4].action).toContain('Immediate');
    });

    it('should calculate risk levels correctly', () => {
      expect(service.calculateRiskLevel(1)).toBe(RiskLevel.LOW);
      expect(service.calculateRiskLevel(4)).toBe(RiskLevel.LOW);
      expect(service.calculateRiskLevel(5)).toBe(RiskLevel.MEDIUM);
      expect(service.calculateRiskLevel(9)).toBe(RiskLevel.MEDIUM);
      expect(service.calculateRiskLevel(10)).toBe(RiskLevel.HIGH);
      expect(service.calculateRiskLevel(15)).toBe(RiskLevel.HIGH);
      expect(service.calculateRiskLevel(16)).toBe(RiskLevel.CRITICAL);
      expect(service.calculateRiskLevel(25)).toBe(RiskLevel.CRITICAL);
    });
  });

  describe('Risk Register Summary', () => {
    it('should return summary statistics', async () => {
      const hazard = await service.createHazard({
        name: 'Test',
        category: RiskCategory.FIRE,
      }, 'inspector');

      await service.createRiskAssessment({
        title: 'Assessment',
        hazardId: hazard.id,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.LIKELY,
        initialSeverity: RiskSeverity.MAJOR,
      });

      const summary = await service.getRiskRegisterSummary();

      expect(summary.totalRisks).toBeGreaterThanOrEqual(1);
      expect(summary.byLevel).toBeDefined();
      expect(summary.byCategory).toBeDefined();
      expect(summary.byStatus).toBeDefined();
    });

    it('should count overdue controls and reviews', async () => {
      const hazard = await service.createHazard({
        name: 'Test',
        category: RiskCategory.MECHANICAL,
      }, 'inspector');

      const assessment = await service.createRiskAssessment({
        title: 'Overdue Test',
        hazardId: hazard.id,
        assessor: { id: 'a', name: 'A', role: 'R' },
        initialLikelihood: RiskLikelihood.POSSIBLE,
        initialSeverity: RiskSeverity.MODERATE,
      });

      // Add overdue control
      await service.addControlMeasure(assessment.id, {
        description: 'Overdue control',
        hierarchy: ControlHierarchy.ENGINEERING,
        responsiblePerson: 'Someone',
        targetDate: new Date('2024-01-01'),
      });

      const summary = await service.getRiskRegisterSummary();
      expect(summary.controlsOverdue).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Location Hazard Map', () => {
    it('should return hazard map for location', async () => {
      const location = await service.createLocation({ name: 'Test Area' });

      await service.createHazard({
        name: 'Hazard 1',
        category: RiskCategory.PHYSICAL,
        locationId: location.id,
      }, 'inspector');

      await service.createHazard({
        name: 'Hazard 2',
        category: RiskCategory.CHEMICAL,
        locationId: location.id,
      }, 'inspector');

      const map = await service.getLocationHazardMap(location.id);

      expect(map.locationId).toBe(location.id);
      expect(map.hazards.length).toBe(2);
      expect(map.location.name).toBe('Test Area');
    });
  });

  describe('ISO 45001 Compliance', () => {
    it('should return ISO 45001 clauses', () => {
      const clauses = service.getISO45001Clauses();

      expect(clauses.length).toBe(25);
      expect(clauses[0].clause).toBe('4.1');
      expect(clauses.some(c => c.clause === '6.1.2')).toBe(true);
    });

    it('should update compliance status', async () => {
      const updated = await service.updateISO45001Compliance(
        '6.1.2',
        'COMPLIANT',
        ['Risk register', 'Hazard identification procedure'],
        undefined,
        undefined
      );

      expect(updated.status).toBe('COMPLIANT');
      expect(updated.evidence.length).toBe(2);
    });

    it('should throw for unknown clause', async () => {
      await expect(
        service.updateISO45001Compliance('99.99', 'COMPLIANT', [])
      ).rejects.toThrow(NotFoundException);
    });

    it('should calculate compliance score', async () => {
      // Update some clauses
      await service.updateISO45001Compliance('4.1', 'COMPLIANT', ['Evidence']);
      await service.updateISO45001Compliance('4.2', 'PARTIALLY_COMPLIANT', ['Partial']);
      await service.updateISO45001Compliance('4.3', 'NON_COMPLIANT', []);

      const score = await service.getISO45001ComplianceScore();

      expect(score.compliant).toBeGreaterThanOrEqual(1);
      expect(score.partiallyCompliant).toBeGreaterThanOrEqual(1);
      expect(score.nonCompliant).toBeGreaterThanOrEqual(1);
      expect(score.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Control Hierarchy Guidance', () => {
    it('should return hierarchy guidance with examples', () => {
      const guidance = service.getControlHierarchyGuidance();

      expect(guidance.length).toBe(5);

      const elimination = guidance.find(g => g.hierarchy === ControlHierarchy.ELIMINATION);
      expect(elimination).toBeDefined();
      expect(elimination?.effectiveness).toContain('90%');
      expect(elimination?.examples.length).toBeGreaterThan(0);

      const ppe = guidance.find(g => g.hierarchy === ControlHierarchy.PPE);
      expect(ppe?.effectiveness).toContain('10%');
    });
  });
});
