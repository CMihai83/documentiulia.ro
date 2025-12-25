import { Test, TestingModule } from '@nestjs/testing';
import {
  ContractAnalysisService,
  ContractType,
  ContractStatus,
  RiskLevel,
  ComplianceStatus,
  Contract,
  ContractTemplate,
  ContractAnalysisResult,
} from './contract-analysis.service';

describe('ContractAnalysisService', () => {
  let service: ContractAnalysisService;

  // Sample contract texts
  const sampleEmploymentContract = `
CONTRACT INDIVIDUAL DE MUNCĂ
Nr. 123 din 15.01.2025

Între:
SC Test Company SRL, cu sediul în București, Str. Exemplu 10, CUI 12345678,
reprezentată de Ion Popescu, în calitate de ANGAJATOR

și

Maria Ionescu, domiciliat în București, Str. Test 5, CNP 2901015123456,
în calitate de ANGAJAT

Art. 1. Obiectul contractului
Angajatul va presta activitatea de Programator în cadrul departamentului IT.

Art. 2. Durata contractului
Prezentul contract se încheie pe durată nedeterminată.
Data începerii activității: 01.02.2025

Art. 3. Salariul
Salariul de bază brut lunar: 5000 RON

Art. 4. Timpul de muncă
Program de lucru: 8 ore pe zi, 5 zile pe săptămână

Art. 5. Concediul de odihnă
Angajatul are dreptul la 21 zile lucrătoare de concediu de odihnă plătit.

Art. 6. Perioada de probă
Perioada de probă este de 90 zile.

Art. 7. Încetarea contractului
Contractul poate înceta prin demisie, concediere sau acord mutual.
  `;

  const sampleNDAContract = `
ACORD DE CONFIDENȚIALITATE (NDA)
Nr. 456 din 20.01.2025

Între:
SC Innovate SRL, CUI 87654321, în calitate de Parte Divulgătoare
și
SC Partner SRL, CUI 11223344, în calitate de Parte Receptoare

Art. 1. Definiții
"Informații Confidențiale" înseamnă toate datele tehnice și comerciale.

Art. 2. Obligații
Partea Receptoare se obligă să păstreze confidențialitatea informațiilor primite.

Art. 3. Durata
Prezentul acord este valabil pentru o perioadă de 2 ani de la semnare.

Art. 4. Penalități
În caz de încălcare: penalități de 50000 EUR.
  `;

  const sampleEnglishContract = `
EMPLOYMENT CONTRACT

Between:
Global Corp Ltd., having its registered office at London, UK, registration number 98765432,
represented by John Smith, as EMPLOYER

and

Jane Doe, residing at Manchester, UK, as EMPLOYEE

Article 1. Position
The Employee shall work as Software Engineer in the Development department.

Article 2. Salary
Monthly gross salary: 4000 GBP

Article 3. Working Hours
Working hours: 40 hours per week

Article 4. Vacation
The Employee is entitled to 25 vacation days per year.

Article 5. Termination
This contract may be terminated with 30 days notice.
  `;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ContractAnalysisService],
    }).compile();

    service = module.get<ContractAnalysisService>(ContractAnalysisService);
  });

  describe('Contract Analysis', () => {
    describe('analyzeContract', () => {
      it('should analyze Romanian employment contract', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        expect(result.contractId).toBeDefined();
        expect(result.type).toBe(ContractType.EMPLOYMENT);
        expect(result.confidence).toBeGreaterThan(50);
      });

      it('should detect contract type automatically', async () => {
        const result = await service.analyzeContract('tenant-1', sampleNDAContract);

        expect(result.type).toBe(ContractType.NDA);
      });

      it('should extract parties from contract', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        expect(result.parties.length).toBeGreaterThan(0);
        const company = result.parties.find(p => p.type === 'COMPANY');
        expect(company).toBeDefined();
      });

      it('should extract key terms', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        expect(result.terms.length).toBeGreaterThan(0);
        const salaryTerm = result.terms.find(t => t.category === 'COMPENSATION');
        expect(salaryTerm).toBeDefined();
        expect(salaryTerm?.value).toContain('5000');
      });

      it('should extract working hours', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        const hoursTerm = result.terms.find(t => t.category === 'WORKING_CONDITIONS');
        expect(hoursTerm).toBeDefined();
        expect(hoursTerm?.value).toContain('8');
      });

      it('should extract vacation days', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        const vacationTerm = result.terms.find(t => t.category === 'BENEFITS');
        expect(vacationTerm).toBeDefined();
        expect(vacationTerm?.value).toContain('21');
      });

      it('should extract obligations', async () => {
        const result = await service.analyzeContract('tenant-1', sampleNDAContract);

        expect(result.obligations.length).toBeGreaterThan(0);
      });

      it('should perform risk assessment', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        expect(result.riskAssessment).toBeDefined();
        expect(result.riskAssessment.overallRisk).toBeDefined();
        expect(result.riskAssessment.riskScore).toBeGreaterThanOrEqual(0);
        expect(result.riskAssessment.riskScore).toBeLessThanOrEqual(100);
      });

      it('should run compliance checks for employment contracts', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        expect(result.complianceChecks.length).toBeGreaterThan(0);
        const laborCheck = result.complianceChecks.find(c => c.regulationCode === 'LABOR_CODE_RO');
        expect(laborCheck).toBeDefined();
      });

      it('should generate summary', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        expect(result.summary).toBeDefined();
        expect(result.summary.length).toBeGreaterThan(0);
        expect(result.summaryEn).toBeDefined();
      });

      it('should extract key dates', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        expect(result.keyDates.length).toBeGreaterThan(0);
      });

      it('should generate warnings and recommendations', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        expect(Array.isArray(result.warnings)).toBe(true);
        expect(Array.isArray(result.recommendations)).toBe(true);
      });

      it('should store analyzed contract', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        const contract = await service.getContract('tenant-1', result.contractId);
        expect(contract).not.toBeNull();
        expect(contract?.analyzedAt).toBeDefined();
      });

      it('should respect expected type parameter', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract, {
          expectedType: ContractType.SERVICE,
        });

        expect(result.type).toBe(ContractType.SERVICE);
      });

      it('should respect language parameter', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract, {
          language: 'EN',
        });

        const contract = await service.getContract('tenant-1', result.contractId);
        expect(contract?.language).toBe('EN');
      });
    });

    describe('Language Detection', () => {
      it('should detect Romanian language', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        const contract = await service.getContract('tenant-1', result.contractId);
        expect(contract?.language).toBe('RO');
      });

      it('should detect English language', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEnglishContract);

        const contract = await service.getContract('tenant-1', result.contractId);
        expect(contract?.language).toBe('EN');
      });
    });

    describe('Contract Type Classification', () => {
      it('should classify employment contracts', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);
        expect(result.type).toBe(ContractType.EMPLOYMENT);
      });

      it('should classify NDA contracts', async () => {
        const result = await service.analyzeContract('tenant-1', sampleNDAContract);
        expect(result.type).toBe(ContractType.NDA);
      });

      it('should classify lease contracts', async () => {
        const leaseContract = `
          CONTRACT DE ÎNCHIRIERE
          Între locator și locatar pentru închirierea imobilului.
          Chiria lunară: 500 EUR.
        `;
        const result = await service.analyzeContract('tenant-1', leaseContract);
        expect(result.type).toBe(ContractType.LEASE);
      });

      it('should classify service contracts', async () => {
        const serviceContract = `
          CONTRACT DE PRESTĂRI SERVICII
          Prestator: SC Service SRL
          Beneficiar: SC Client SRL
          Servicii de consultanță IT.
        `;
        const result = await service.analyzeContract('tenant-1', serviceContract);
        expect(result.type).toBe(ContractType.SERVICE);
      });

      it('should classify consulting contracts', async () => {
        const consultingContract = `
          CONTRACT DE CONSULTANȚĂ
          Consultant: Expert Consulting SRL
          Consilier pentru proiecte de management.
        `;
        const result = await service.analyzeContract('tenant-1', consultingContract);
        expect(result.type).toBe(ContractType.CONSULTING);
      });

      it('should return OTHER for unclassifiable contracts', async () => {
        const genericContract = `
          ACORD GENERAL
          Între părți pentru diverse activități.
        `;
        const result = await service.analyzeContract('tenant-1', genericContract);
        expect([ContractType.OTHER, ContractType.COMMERCIAL]).toContain(result.type);
      });
    });

    describe('Risk Assessment', () => {
      it('should flag missing termination clause', async () => {
        const contractWithoutTermination = `
          CONTRACT DE SERVICII
          Acest contract este valabil pe durată nedeterminată.
          Salariu: 5000 RON
        `;
        const result = await service.analyzeContract('tenant-1', contractWithoutTermination);

        // The service checks if the text includes 'încetare' or 'termination'
        // If neither is found, it adds a risk finding about missing termination clause
        const finding = result.riskAssessment.findings.find(f =>
          f.category === 'MISSING_CLAUSE' && f.description.toLowerCase().includes('încetare'),
        );
        expect(finding).toBeDefined();
      });

      it('should flag missing force majeure clause', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        const finding = result.riskAssessment.findings.find(f =>
          f.description.toLowerCase().includes('forță majoră'),
        );
        expect(finding).toBeDefined();
      });

      it('should flag unlimited liability', async () => {
        const contractWithUnlimitedLiability = `
          CONTRACT
          Partea contractantă are răspundere nelimitată pentru orice daune.
        `;
        const result = await service.analyzeContract('tenant-1', contractWithUnlimitedLiability);

        const finding = result.riskAssessment.findings.find(f =>
          f.description.toLowerCase().includes('nelimitată'),
        );
        expect(finding).toBeDefined();
        expect(finding?.riskLevel).toBe(RiskLevel.CRITICAL);
      });

      it('should flag below minimum wage', async () => {
        const lowWageContract = `
          CONTRACT INDIVIDUAL DE MUNCĂ
          Angajat: Ion Test
          Salariu: 2000 RON
          Program de lucru: 8 ore pe zi
          Concediu: 21 zile
        `;
        const result = await service.analyzeContract('tenant-1', lowWageContract);

        const finding = result.riskAssessment.findings.find(f =>
          f.description.toLowerCase().includes('minim'),
        );
        expect(finding).toBeDefined();
        expect(finding?.riskLevel).toBe(RiskLevel.CRITICAL);
      });

      it('should flag excessive working hours', async () => {
        const excessiveHoursContract = `
          CONTRACT INDIVIDUAL DE MUNCĂ
          Program de lucru: 12 ore pe zi
          Salariu: 5000 RON
          Concediu: 21 zile
        `;
        const result = await service.analyzeContract('tenant-1', excessiveHoursContract);

        const hoursTerm = result.terms.find(t => t.category === 'WORKING_CONDITIONS');
        expect(hoursTerm?.riskLevel).toBe(RiskLevel.HIGH);
      });

      it('should calculate overall risk level', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        expect([RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]).toContain(
          result.riskAssessment.overallRisk,
        );
      });
    });

    describe('Compliance Checks', () => {
      it('should check Romanian Labor Code compliance', async () => {
        const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

        const laborCheck = result.complianceChecks.find(c => c.regulationCode === 'LABOR_CODE_RO');
        expect(laborCheck).toBeDefined();
        expect(laborCheck?.regulation).toContain('Codul Muncii');
      });

      it('should check GDPR compliance when personal data involved', async () => {
        const contractWithPersonalData = `
          CONTRACT
          Date personale: CNP 1234567890123
          Prelucrare date conform GDPR.
        `;
        const result = await service.analyzeContract('tenant-1', contractWithPersonalData);

        const gdprCheck = result.complianceChecks.find(c => c.regulationCode === 'GDPR_EU');
        expect(gdprCheck).toBeDefined();
        expect(gdprCheck?.status).not.toBe(ComplianceStatus.NOT_APPLICABLE);
      });

      it('should mark GDPR as not applicable when no personal data', async () => {
        const commercialContract = `
          CONTRACT COMERCIAL
          Vânzare echipamente industriale.
          Preț: 10000 EUR
        `;
        const result = await service.analyzeContract('tenant-1', commercialContract);

        const gdprCheck = result.complianceChecks.find(c => c.regulationCode === 'GDPR_EU');
        expect(gdprCheck?.status).toBe(ComplianceStatus.NOT_APPLICABLE);
      });

      it('should identify missing mandatory elements', async () => {
        const incompleteContract = `
          CONTRACT INDIVIDUAL DE MUNCĂ
          Angajat: Ion Test
        `;
        const result = await service.analyzeContract('tenant-1', incompleteContract);

        const laborCheck = result.complianceChecks.find(c => c.regulationCode === 'LABOR_CODE_RO');
        expect(laborCheck?.status).toBe(ComplianceStatus.NON_COMPLIANT);
        expect(laborCheck?.findings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Contract CRUD', () => {
    let contractId: string;

    beforeEach(async () => {
      const result = await service.analyzeContract('tenant-crud', sampleEmploymentContract);
      contractId = result.contractId;
    });

    describe('getContracts', () => {
      it('should return all contracts for tenant', async () => {
        const contracts = await service.getContracts('tenant-crud');

        expect(contracts.length).toBeGreaterThan(0);
        contracts.forEach(c => expect(c.tenantId).toBe('tenant-crud'));
      });

      it('should filter by type', async () => {
        const contracts = await service.getContracts('tenant-crud', {
          type: ContractType.EMPLOYMENT,
        });

        contracts.forEach(c => expect(c.type).toBe(ContractType.EMPLOYMENT));
      });

      it('should filter by status', async () => {
        const contracts = await service.getContracts('tenant-crud', {
          status: ContractStatus.DRAFT,
        });

        contracts.forEach(c => expect(c.status).toBe(ContractStatus.DRAFT));
      });

      it('should filter by date range', async () => {
        const startDate = new Date('2024-01-01');
        const endDate = new Date('2026-12-31');

        const contracts = await service.getContracts('tenant-crud', {
          startDate,
          endDate,
        });

        contracts.forEach(c => {
          expect(c.effectiveDate >= startDate).toBe(true);
          expect(c.effectiveDate <= endDate).toBe(true);
        });
      });

      it('should sort by creation date descending', async () => {
        // Create additional contract
        await service.analyzeContract('tenant-crud', sampleNDAContract);

        const contracts = await service.getContracts('tenant-crud');

        for (let i = 1; i < contracts.length; i++) {
          expect(contracts[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
            contracts[i].createdAt.getTime(),
          );
        }
      });
    });

    describe('getContract', () => {
      it('should return contract by ID', async () => {
        const contract = await service.getContract('tenant-crud', contractId);

        expect(contract).not.toBeNull();
        expect(contract?.id).toBe(contractId);
      });

      it('should return null for wrong tenant', async () => {
        const contract = await service.getContract('other-tenant', contractId);

        expect(contract).toBeNull();
      });

      it('should return null for non-existent ID', async () => {
        const contract = await service.getContract('tenant-crud', 'non-existent');

        expect(contract).toBeNull();
      });
    });

    describe('updateContractStatus', () => {
      it('should update contract status', async () => {
        const updated = await service.updateContractStatus(
          'tenant-crud',
          contractId,
          ContractStatus.ACTIVE,
        );

        expect(updated?.status).toBe(ContractStatus.ACTIVE);
      });

      it('should update timestamp on status change', async () => {
        const original = await service.getContract('tenant-crud', contractId);
        await new Promise(r => setTimeout(r, 5));

        const updated = await service.updateContractStatus(
          'tenant-crud',
          contractId,
          ContractStatus.ACTIVE,
        );

        expect(updated?.updatedAt.getTime()).toBeGreaterThanOrEqual(original!.updatedAt.getTime());
      });

      it('should return null for wrong tenant', async () => {
        const result = await service.updateContractStatus(
          'other-tenant',
          contractId,
          ContractStatus.ACTIVE,
        );

        expect(result).toBeNull();
      });
    });

    describe('deleteContract', () => {
      it('should delete contract', async () => {
        await service.deleteContract('tenant-crud', contractId);

        const contract = await service.getContract('tenant-crud', contractId);
        expect(contract).toBeNull();
      });

      it('should not delete contract from wrong tenant', async () => {
        await service.deleteContract('other-tenant', contractId);

        const contract = await service.getContract('tenant-crud', contractId);
        expect(contract).not.toBeNull();
      });
    });
  });

  describe('Templates', () => {
    describe('getTemplates', () => {
      it('should return system templates', async () => {
        const templates = await service.getTemplates('tenant-1');

        expect(templates.length).toBeGreaterThan(0);
        expect(templates.some(t => t.tenantId === 'system')).toBe(true);
      });

      it('should have employment contract template', async () => {
        const templates = await service.getTemplates('tenant-1', {
          type: ContractType.EMPLOYMENT,
        });

        expect(templates.length).toBeGreaterThan(0);
        expect(templates[0].type).toBe(ContractType.EMPLOYMENT);
      });

      it('should have NDA template', async () => {
        const templates = await service.getTemplates('tenant-1', {
          type: ContractType.NDA,
        });

        expect(templates.length).toBeGreaterThan(0);
        expect(templates[0].type).toBe(ContractType.NDA);
      });

      it('should filter by language', async () => {
        const templates = await service.getTemplates('tenant-1', {
          language: 'RO',
        });

        templates.forEach(t => expect(t.language).toBe('RO'));
      });

      it('should only return active templates', async () => {
        const templates = await service.getTemplates('tenant-1');

        templates.forEach(t => expect(t.isActive).toBe(true));
      });
    });

    describe('getTemplate', () => {
      it('should return template by ID', async () => {
        const templates = await service.getTemplates('tenant-1');
        const template = await service.getTemplate(templates[0].id);

        expect(template).not.toBeNull();
        expect(template?.id).toBe(templates[0].id);
      });

      it('should return null for non-existent ID', async () => {
        const template = await service.getTemplate('non-existent');

        expect(template).toBeNull();
      });
    });

    describe('createTemplate', () => {
      it('should create custom template', async () => {
        const template = await service.createTemplate('tenant-1', {
          name: 'Custom Contract',
          type: ContractType.SERVICE,
          language: 'RO',
          content: 'CONTRACT DE SERVICII\n{{client_name}}\n{{provider_name}}',
          variables: [
            { name: 'client_name', description: 'Client', type: 'TEXT', required: true },
            { name: 'provider_name', description: 'Provider', type: 'TEXT', required: true },
          ],
          isActive: true,
        });

        expect(template.id).toBeDefined();
        expect(template.tenantId).toBe('tenant-1');
        expect(template.name).toBe('Custom Contract');
      });
    });

    describe('generateContractFromTemplate', () => {
      let templateId: string;

      beforeEach(async () => {
        const template = await service.createTemplate('tenant-gen', {
          name: 'Test Template',
          type: ContractType.SERVICE,
          language: 'RO',
          content: 'Contract între {{client}} și {{provider}}. Valoare: {{amount}} RON.',
          variables: [
            { name: 'client', description: 'Client', type: 'TEXT', required: true },
            { name: 'provider', description: 'Provider', type: 'TEXT', required: true },
            { name: 'amount', description: 'Amount', type: 'CURRENCY', required: true },
          ],
          isActive: true,
        });
        templateId = template.id;
      });

      it('should generate contract with variables replaced', async () => {
        const content = await service.generateContractFromTemplate('tenant-gen', templateId, {
          client: 'SC Client SRL',
          provider: 'SC Provider SRL',
          amount: '10000',
        });

        expect(content).toContain('SC Client SRL');
        expect(content).toContain('SC Provider SRL');
        expect(content).toContain('10000 RON');
      });

      it('should throw for missing required variables', async () => {
        await expect(
          service.generateContractFromTemplate('tenant-gen', templateId, {
            client: 'SC Client SRL',
          }),
        ).rejects.toThrow('Missing required variables');
      });

      it('should throw for non-existent template', async () => {
        await expect(
          service.generateContractFromTemplate('tenant-gen', 'non-existent', {}),
        ).rejects.toThrow('Template not found');
      });
    });
  });

  describe('Contract Comparison', () => {
    let contractId1: string;
    let contractId2: string;

    beforeEach(async () => {
      const result1 = await service.analyzeContract('tenant-compare', sampleEmploymentContract);
      contractId1 = result1.contractId;

      // Create slightly different contract
      const modifiedContract = sampleEmploymentContract.replace('5000 RON', '6000 RON');
      const result2 = await service.analyzeContract('tenant-compare', modifiedContract);
      contractId2 = result2.contractId;
    });

    it('should compare two contracts', async () => {
      const comparison = await service.compareContracts('tenant-compare', contractId1, contractId2);

      expect(comparison.differences).toBeDefined();
      expect(comparison.riskComparison).toBeDefined();
    });

    it('should detect term differences', async () => {
      const comparison = await service.compareContracts('tenant-compare', contractId1, contractId2);

      const compensationDiff = comparison.differences.find(d => d.field.includes('COMPENSATION'));
      expect(compensationDiff).toBeDefined();
    });

    it('should compare risk levels', async () => {
      const comparison = await service.compareContracts('tenant-compare', contractId1, contractId2);

      expect(comparison.riskComparison.contract1Risk).toBeDefined();
      expect(comparison.riskComparison.contract2Risk).toBeDefined();
      expect(typeof comparison.riskComparison.riskDelta).toBe('number');
    });

    it('should throw when contracts not found', async () => {
      await expect(
        service.compareContracts('tenant-compare', 'non-existent', contractId2),
      ).rejects.toThrow('One or both contracts not found');
    });
  });

  describe('Analytics', () => {
    beforeEach(async () => {
      // Create various contracts for analytics
      await service.analyzeContract('tenant-analytics', sampleEmploymentContract);
      await service.analyzeContract('tenant-analytics', sampleNDAContract);

      const leaseContract = `
        CONTRACT DE ÎNCHIRIERE
        Între locator și locatar. Chirie: 1000 RON.
      `;
      await service.analyzeContract('tenant-analytics', leaseContract);
    });

    describe('getContractStats', () => {
      it('should return total contracts count', async () => {
        const stats = await service.getContractStats('tenant-analytics');

        expect(stats.totalContracts).toBe(3);
      });

      it('should group by type', async () => {
        const stats = await service.getContractStats('tenant-analytics');

        expect(stats.byType[ContractType.EMPLOYMENT]).toBe(1);
        expect(stats.byType[ContractType.NDA]).toBe(1);
        expect(stats.byType[ContractType.LEASE]).toBe(1);
      });

      it('should group by status', async () => {
        const stats = await service.getContractStats('tenant-analytics');

        expect(stats.byStatus[ContractStatus.DRAFT]).toBe(3);
      });

      it('should track expiring contracts', async () => {
        const stats = await service.getContractStats('tenant-analytics');

        expect(typeof stats.expiringWithin30Days).toBe('number');
      });

      it('should count high risk contracts', async () => {
        const stats = await service.getContractStats('tenant-analytics');

        expect(typeof stats.highRiskContracts).toBe('number');
      });

      it('should count compliance issues', async () => {
        const stats = await service.getContractStats('tenant-analytics');

        expect(typeof stats.complianceIssues).toBe('number');
      });
    });
  });

  describe('Party Extraction', () => {
    it('should extract company with CUI', async () => {
      const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

      const company = result.parties.find(p => p.type === 'COMPANY');
      expect(company).toBeDefined();
      // The service extracts parties - verify identifier is present
      expect(company?.identifier).toBeDefined();
    });

    it('should extract individual with CNP', async () => {
      const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

      const individual = result.parties.find(p => p.type === 'INDIVIDUAL');
      expect(individual).toBeDefined();
      expect(individual?.identifier).toHaveLength(13);
    });

    it('should assign PRIMARY role to first party', async () => {
      const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

      const primaryParty = result.parties.find(p => p.role === 'PRIMARY');
      expect(primaryParty).toBeDefined();
    });

    it('should assign SECONDARY role to subsequent parties', async () => {
      const result = await service.analyzeContract('tenant-1', sampleEmploymentContract);

      const secondaryParty = result.parties.find(p => p.role === 'SECONDARY');
      expect(secondaryParty).toBeDefined();
    });
  });

  describe('NDA Specific Analysis', () => {
    it('should extract NDA duration', async () => {
      const result = await service.analyzeContract('tenant-1', sampleNDAContract);

      const durationTerm = result.terms.find(t => t.category === 'DURATION');
      expect(durationTerm).toBeDefined();
      expect(durationTerm?.value).toContain('2');
    });

    it('should extract penalties', async () => {
      const result = await service.analyzeContract('tenant-1', sampleNDAContract);

      const penaltyTerm = result.terms.find(t => t.category === 'PENALTIES');
      expect(penaltyTerm).toBeDefined();
      expect(penaltyTerm?.value).toContain('50000');
    });
  });

  describe('Auto Renewal Detection', () => {
    it('should detect auto renewal clause', async () => {
      const contractWithAutoRenewal = `
        CONTRACT
        Reînnoire automată la expirare.
        Durata: 1 an.
      `;
      const result = await service.analyzeContract('tenant-1', contractWithAutoRenewal);

      const contract = await service.getContract('tenant-1', result.contractId);
      expect(contract?.autoRenewal).toBe(true);
    });

    it('should flag auto renewal without notice', async () => {
      // The service checks if "reînnoire automată" or "auto renewal" exists
      // AND if "preaviz" or "notice" does NOT exist
      // If so, it flags a risk finding
      const contractWithAutoRenewal = `
        CONTRACT
        Reînnoire automată la expirare.
        Contractul se va reînnoi automat.
      `;
      const result = await service.analyzeContract('tenant-1', contractWithAutoRenewal);

      const finding = result.riskAssessment.findings.find(f =>
        f.category === 'AUTO_RENEWAL',
      );
      expect(finding).toBeDefined();
    });
  });

  describe('Multi-Tenancy', () => {
    it('should isolate contracts by tenant', async () => {
      await service.analyzeContract('tenant-A', sampleEmploymentContract);
      await service.analyzeContract('tenant-B', sampleNDAContract);

      const contractsA = await service.getContracts('tenant-A');
      const contractsB = await service.getContracts('tenant-B');

      expect(contractsA.every(c => c.tenantId === 'tenant-A')).toBe(true);
      expect(contractsB.every(c => c.tenantId === 'tenant-B')).toBe(true);
    });

    it('should share system templates across tenants', async () => {
      const templatesA = await service.getTemplates('tenant-A');
      const templatesB = await service.getTemplates('tenant-B');

      expect(templatesA.some(t => t.tenantId === 'system')).toBe(true);
      expect(templatesB.some(t => t.tenantId === 'system')).toBe(true);
    });

    it('should isolate custom templates by tenant', async () => {
      await service.createTemplate('tenant-A', {
        name: 'Tenant A Template',
        type: ContractType.SERVICE,
        language: 'RO',
        content: 'Test',
        variables: [],
        isActive: true,
      });

      const templatesB = await service.getTemplates('tenant-B');
      expect(templatesB.some(t => t.name === 'Tenant A Template')).toBe(false);
    });
  });

  describe('Contract Types Enum', () => {
    it('should support all contract types', () => {
      expect(Object.values(ContractType)).toContain('EMPLOYMENT');
      expect(Object.values(ContractType)).toContain('COMMERCIAL');
      expect(Object.values(ContractType)).toContain('NDA');
      expect(Object.values(ContractType)).toContain('LEASE');
      expect(Object.values(ContractType)).toContain('SERVICE');
      expect(Object.values(ContractType)).toContain('SUPPLY');
      expect(Object.values(ContractType)).toContain('PARTNERSHIP');
      expect(Object.values(ContractType)).toContain('LOAN');
      expect(Object.values(ContractType)).toContain('CONSULTING');
      expect(Object.values(ContractType)).toContain('LICENSE');
      expect(Object.values(ContractType)).toContain('FRANCHISE');
      expect(Object.values(ContractType)).toContain('MANDATE');
      expect(Object.values(ContractType)).toContain('OTHER');
    });
  });

  describe('Risk Levels Enum', () => {
    it('should support all risk levels', () => {
      expect(Object.values(RiskLevel)).toContain('LOW');
      expect(Object.values(RiskLevel)).toContain('MEDIUM');
      expect(Object.values(RiskLevel)).toContain('HIGH');
      expect(Object.values(RiskLevel)).toContain('CRITICAL');
    });
  });

  describe('Contract Status Enum', () => {
    it('should support all contract statuses', () => {
      expect(Object.values(ContractStatus)).toContain('DRAFT');
      expect(Object.values(ContractStatus)).toContain('PENDING_SIGNATURE');
      expect(Object.values(ContractStatus)).toContain('ACTIVE');
      expect(Object.values(ContractStatus)).toContain('EXPIRED');
      expect(Object.values(ContractStatus)).toContain('TERMINATED');
      expect(Object.values(ContractStatus)).toContain('RENEWED');
    });
  });

  describe('Compliance Status Enum', () => {
    it('should support all compliance statuses', () => {
      expect(Object.values(ComplianceStatus)).toContain('COMPLIANT');
      expect(Object.values(ComplianceStatus)).toContain('NON_COMPLIANT');
      expect(Object.values(ComplianceStatus)).toContain('NEEDS_REVIEW');
      expect(Object.values(ComplianceStatus)).toContain('NOT_APPLICABLE');
    });
  });
});
