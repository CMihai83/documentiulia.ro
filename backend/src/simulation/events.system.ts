/**
 * Event System
 * 50+ Random Business Events with impacts and responses
 * Based on Grok AI recommendations - Sprint 25
 */

export type EventType =
  | 'MARKET_CHANGE'
  | 'REGULATION_CHANGE'
  | 'ECONOMIC_SHOCK'
  | 'OPPORTUNITY'
  | 'CRISIS'
  | 'AUDIT'
  | 'CUSTOMER_EVENT'
  | 'EMPLOYEE_EVENT'
  | 'SUPPLIER_EVENT'
  | 'COMPETITION'
  | 'TECHNOLOGY';

export type EventSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface EventResponse {
  id: string;
  label: string;
  labelRo: string;
  description: string;
  descriptionRo: string;
  impacts: Record<string, number>;
  chainEvents?: string[]; // IDs of events that may trigger
  requirements?: string[];
}

export interface SimulationEvent {
  id: string;
  type: EventType;
  severity: EventSeverity;
  title: string;
  titleRo: string;
  description: string;
  descriptionRo: string;
  triggerConditions: string[];
  baseProbability: number;
  deadline?: number; // Turns to respond
  responses: EventResponse[];
  relatedCourseId?: string;
}

// =====================================================
// MARKET EVENTS (10)
// =====================================================

export const MARKET_EVENTS: SimulationEvent[] = [
  {
    id: 'MARKET_EXPANSION',
    type: 'MARKET_CHANGE',
    severity: 'MEDIUM',
    title: 'New Market Segment',
    titleRo: 'Segment de Piață Nou',
    description: 'A new market segment has opened up, offering potential for growth.',
    descriptionRo: 'Un nou segment de piață s-a deschis, oferind potențial de creștere.',
    triggerConditions: ['reputation > 60', 'marketShare > 5'],
    baseProbability: 0.05,
    responses: [
      {
        id: 'enter_market',
        label: 'Enter New Market',
        labelRo: 'Intră pe Piața Nouă',
        description: 'Invest resources to enter the new segment',
        descriptionRo: 'Investește resurse pentru a intra pe noul segment',
        impacts: { cash: -30000, marketSize: 50, customerCount: 20, reputation: 3 },
        chainEvents: ['COMPETITION_RESPONSE'],
      },
      {
        id: 'research_first',
        label: 'Research First',
        labelRo: 'Cercetează Întâi',
        description: 'Study the market before committing',
        descriptionRo: 'Studiază piața înainte de a te angaja',
        impacts: { cash: -5000, quality: 2 },
      },
      {
        id: 'ignore',
        label: 'Ignore Opportunity',
        labelRo: 'Ignoră Oportunitatea',
        description: 'Focus on current market',
        descriptionRo: 'Concentrează-te pe piața curentă',
        impacts: { reputation: -1 },
      },
    ],
  },
  {
    id: 'COMPETITOR_PRICE_WAR',
    type: 'COMPETITION',
    severity: 'HIGH',
    title: 'Price War Started',
    titleRo: 'Război al Prețurilor',
    description: 'A major competitor has drastically cut prices.',
    descriptionRo: 'Un competitor major a redus drastic prețurile.',
    triggerConditions: ['marketShare > 10'],
    baseProbability: 0.04,
    deadline: 2,
    responses: [
      {
        id: 'match_prices',
        label: 'Match Prices',
        labelRo: 'Aliniază Prețurile',
        description: 'Lower prices to compete',
        descriptionRo: 'Scade prețurile pentru a concura',
        impacts: { price: -15, revenue: -10, customerCount: 5 },
      },
      {
        id: 'differentiate',
        label: 'Differentiate on Quality',
        labelRo: 'Diferențiere prin Calitate',
        description: 'Emphasize quality over price',
        descriptionRo: 'Pune accent pe calitate în loc de preț',
        impacts: { quality: 5, reputation: 3, customerCount: -3 },
      },
      {
        id: 'niche_focus',
        label: 'Focus on Niche',
        labelRo: 'Concentrare pe Nișă',
        description: 'Target premium customers only',
        descriptionRo: 'Țintește doar clienții premium',
        impacts: { price: 10, customerCount: -10, reputation: 5 },
      },
    ],
    relatedCourseId: 'pricing-strategy',
  },
  {
    id: 'MARKET_TREND_SHIFT',
    type: 'MARKET_CHANGE',
    severity: 'MEDIUM',
    title: 'Market Trend Shift',
    titleRo: 'Schimbare Tendință Piață',
    description: 'Customer preferences are changing in your industry.',
    descriptionRo: 'Preferințele clienților se schimbă în industria ta.',
    triggerConditions: ['month === 1 || month === 7'],
    baseProbability: 0.08,
    responses: [
      {
        id: 'adapt_quickly',
        label: 'Adapt Quickly',
        labelRo: 'Adaptare Rapidă',
        description: 'Invest in adapting products/services',
        descriptionRo: 'Investește în adaptarea produselor/serviciilor',
        impacts: { cash: -15000, quality: 5, reputation: 5 },
      },
      {
        id: 'gradual_change',
        label: 'Gradual Change',
        labelRo: 'Schimbare Graduală',
        description: 'Slowly transition to new trends',
        descriptionRo: 'Tranziție lentă către noile tendințe',
        impacts: { cash: -5000, quality: 2 },
      },
      {
        id: 'stay_course',
        label: 'Stay the Course',
        labelRo: 'Menține Cursul',
        description: 'Stick with current approach',
        descriptionRo: 'Păstrează abordarea curentă',
        impacts: { reputation: -3, customerCount: -5 },
      },
    ],
  },
  {
    id: 'SEASONAL_BOOM',
    type: 'MARKET_CHANGE',
    severity: 'LOW',
    title: 'Seasonal Demand Surge',
    titleRo: 'Cerere Sezonieră Crescută',
    description: 'Seasonal factors are boosting demand in your sector.',
    descriptionRo: 'Factorii sezonieri cresc cererea în sectorul tău.',
    triggerConditions: ['month === 11 || month === 12'],
    baseProbability: 0.15,
    responses: [
      {
        id: 'maximize_capacity',
        label: 'Maximize Capacity',
        labelRo: 'Maximizează Capacitatea',
        description: 'Increase production to meet demand',
        descriptionRo: 'Crește producția pentru a satisface cererea',
        impacts: { utilization: 95, revenue: 20, morale: -5 },
      },
      {
        id: 'steady_pace',
        label: 'Steady Pace',
        labelRo: 'Ritm Constant',
        description: 'Maintain normal operations',
        descriptionRo: 'Menține operațiunile normale',
        impacts: { reputation: 2 },
      },
    ],
  },
  {
    id: 'MARKET_SATURATION',
    type: 'MARKET_CHANGE',
    severity: 'MEDIUM',
    title: 'Market Saturation',
    titleRo: 'Saturare Piață',
    description: 'Your market is becoming saturated with competitors.',
    descriptionRo: 'Piața ta devine saturată cu competitori.',
    triggerConditions: ['marketShare > 15'],
    baseProbability: 0.03,
    responses: [
      {
        id: 'innovate',
        label: 'Innovate Products',
        labelRo: 'Inovează Produsele',
        description: 'Develop new offerings',
        descriptionRo: 'Dezvoltă noi oferte',
        impacts: { cash: -40000, quality: 10, reputation: 5 },
      },
      {
        id: 'expand_geo',
        label: 'Expand Geographically',
        labelRo: 'Extindere Geografică',
        description: 'Enter new geographic markets',
        descriptionRo: 'Intră pe piețe geografice noi',
        impacts: { cash: -50000, marketSize: 100, customerCount: 30 },
      },
      {
        id: 'cost_leader',
        label: 'Become Cost Leader',
        labelRo: 'Devino Lider de Cost',
        description: 'Focus on operational efficiency',
        descriptionRo: 'Concentrează-te pe eficiența operațională',
        impacts: { expenses: -10, price: -5, quality: -2 },
      },
    ],
  },
  {
    id: 'MAJOR_CONTRACT',
    type: 'OPPORTUNITY',
    severity: 'HIGH',
    title: 'Major Contract Available',
    titleRo: 'Contract Mare Disponibil',
    description: 'A large company wants to sign a significant contract with you.',
    descriptionRo: 'O companie mare dorește să semneze un contract semnificativ.',
    triggerConditions: ['reputation > 70', 'quality > 75'],
    baseProbability: 0.04,
    deadline: 3,
    responses: [
      {
        id: 'accept_full',
        label: 'Accept Full Contract',
        labelRo: 'Acceptă Contractul Complet',
        description: 'Commit to the full scope',
        descriptionRo: 'Angajează-te la întreaga amploare',
        impacts: { revenue: 50000, utilization: 30, employees: 2, cash: -10000 },
        chainEvents: ['CAPACITY_STRAIN'],
      },
      {
        id: 'negotiate',
        label: 'Negotiate Terms',
        labelRo: 'Negociază Termenii',
        description: 'Try to get better conditions',
        descriptionRo: 'Încearcă să obții condiții mai bune',
        impacts: { revenue: 35000, utilization: 15 },
      },
      {
        id: 'decline',
        label: 'Politely Decline',
        labelRo: 'Refuză Politicos',
        description: 'Not ready for this scale',
        descriptionRo: 'Nu ești pregătit pentru această scară',
        impacts: { reputation: -2 },
      },
    ],
  },
  {
    id: 'CUSTOMER_DEMAND_SPIKE',
    type: 'CUSTOMER_EVENT',
    severity: 'MEDIUM',
    title: 'Demand Spike',
    titleRo: 'Creștere Bruscă a Cererii',
    description: 'Customer demand has suddenly increased by 50%.',
    descriptionRo: 'Cererea clienților a crescut brusc cu 50%.',
    triggerConditions: ['utilization < 70', 'reputation > 60'],
    baseProbability: 0.05,
    responses: [
      {
        id: 'scale_up',
        label: 'Scale Up Operations',
        labelRo: 'Scalează Operațiunile',
        description: 'Increase capacity to meet demand',
        descriptionRo: 'Crește capacitatea pentru a satisface cererea',
        impacts: { employees: 1, equipment: 20000, capacity: 30, cash: -25000 },
      },
      {
        id: 'overtime',
        label: 'Use Overtime',
        labelRo: 'Folosește Ore Suplimentare',
        description: 'Have current staff work extra hours',
        descriptionRo: 'Angajații actuali lucrează ore extra',
        impacts: { utilization: 95, morale: -10, quality: -3, revenue: 15 },
      },
      {
        id: 'waitlist',
        label: 'Create Waitlist',
        labelRo: 'Creează Listă de Așteptare',
        description: 'Accept orders but delay delivery',
        descriptionRo: 'Acceptă comenzi dar întârzie livrarea',
        impacts: { customerCount: 10, reputation: -2 },
      },
    ],
  },
  {
    id: 'COMPETITOR_EXITS',
    type: 'COMPETITION',
    severity: 'MEDIUM',
    title: 'Competitor Exits Market',
    titleRo: 'Competitor Iese de pe Piață',
    description: 'A major competitor has closed down.',
    descriptionRo: 'Un competitor major s-a închis.',
    triggerConditions: ['marketShare > 5'],
    baseProbability: 0.02,
    responses: [
      {
        id: 'acquire_customers',
        label: 'Acquire Their Customers',
        labelRo: 'Preia Clienții Lor',
        description: 'Launch campaign targeting their customers',
        descriptionRo: 'Lansează campanie țintind clienții lor',
        impacts: { cash: -10000, customerCount: 30, marketShare: 3 },
      },
      {
        id: 'acquire_staff',
        label: 'Hire Their Staff',
        labelRo: 'Angajează Personalul Lor',
        description: 'Recruit talented employees',
        descriptionRo: 'Recrutează angajați talentați',
        impacts: { employees: 2, quality: 5, cash: -15000 },
      },
      {
        id: 'do_nothing',
        label: 'Let Market Adjust',
        labelRo: 'Lasă Piața să se Ajusteze',
        description: 'Wait for organic growth',
        descriptionRo: 'Așteaptă creșterea organică',
        impacts: { customerCount: 10 },
      },
    ],
  },
  {
    id: 'CURRENCY_FLUCTUATION',
    type: 'ECONOMIC_SHOCK',
    severity: 'MEDIUM',
    title: 'Currency Fluctuation',
    titleRo: 'Fluctuație Valutară',
    description: 'The RON has weakened against EUR, affecting import costs.',
    descriptionRo: 'RON-ul a slăbit față de EUR, afectând costurile de import.',
    triggerConditions: ['industry !== "IT"'],
    baseProbability: 0.06,
    responses: [
      {
        id: 'hedge',
        label: 'Hedge Currency Risk',
        labelRo: 'Acoperire Risc Valutar',
        description: 'Use financial instruments to protect',
        descriptionRo: 'Folosește instrumente financiare pentru protecție',
        impacts: { cash: -5000, expenses: -3 },
      },
      {
        id: 'local_suppliers',
        label: 'Switch to Local Suppliers',
        labelRo: 'Schimbă la Furnizori Locali',
        description: 'Reduce import dependency',
        descriptionRo: 'Reduce dependența de importuri',
        impacts: { quality: -3, expenses: -5, payables: -20 },
      },
      {
        id: 'absorb_cost',
        label: 'Absorb Cost Increase',
        labelRo: 'Absoarbe Creșterea Costurilor',
        description: 'Maintain prices, reduce margin',
        descriptionRo: 'Menține prețurile, reduce marja',
        impacts: { expenses: 8, profit: -10 },
      },
    ],
  },
  {
    id: 'VIRAL_MARKETING',
    type: 'OPPORTUNITY',
    severity: 'MEDIUM',
    title: 'Content Goes Viral',
    titleRo: 'Conținut Viral',
    description: 'Your marketing content has gone viral on social media!',
    descriptionRo: 'Conținutul tău de marketing a devenit viral pe social media!',
    triggerConditions: ['reputation > 50'],
    baseProbability: 0.02,
    responses: [
      {
        id: 'capitalize',
        label: 'Capitalize Immediately',
        labelRo: 'Capitalizează Imediat',
        description: 'Launch follow-up campaign',
        descriptionRo: 'Lansează campanie de continuare',
        impacts: { cash: -15000, customerCount: 50, reputation: 10 },
      },
      {
        id: 'organic',
        label: 'Let It Grow Organically',
        labelRo: 'Lasă să Crească Organic',
        description: 'Dont push additional marketing',
        descriptionRo: 'Nu adăuga marketing suplimentar',
        impacts: { customerCount: 25, reputation: 5 },
      },
    ],
  },
];

// =====================================================
// REGULATORY EVENTS (10)
// =====================================================

export const REGULATORY_EVENTS: SimulationEvent[] = [
  {
    id: 'TAX_AUDIT',
    type: 'AUDIT',
    severity: 'HIGH',
    title: 'ANAF Tax Audit',
    titleRo: 'Control Fiscal ANAF',
    description: 'Your company has been selected for a tax audit.',
    descriptionRo: 'Firma ta a fost selectată pentru control fiscal.',
    triggerConditions: ['auditRisk > 15'],
    baseProbability: 0.08,
    deadline: 3,
    responses: [
      {
        id: 'full_cooperation',
        label: 'Full Cooperation',
        labelRo: 'Cooperare Totală',
        description: 'Fully cooperate with auditors',
        descriptionRo: 'Cooperează complet cu auditorii',
        impacts: { cash: -3000, auditRisk: -15, complianceScore: 10 },
      },
      {
        id: 'hire_consultant',
        label: 'Hire Tax Consultant',
        labelRo: 'Angajează Consultant Fiscal',
        description: 'Get professional help for the audit',
        descriptionRo: 'Obține ajutor profesional pentru control',
        impacts: { cash: -8000, auditRisk: -20, penaltiesRisk: -10 },
      },
      {
        id: 'minimal_response',
        label: 'Minimal Response',
        labelRo: 'Răspuns Minim',
        description: 'Provide only what is legally required',
        descriptionRo: 'Furnizează doar ce este legal necesar',
        impacts: { auditRisk: 5, penaltiesRisk: 10, reputation: -3 },
        chainEvents: ['PENALTY_NOTICE'],
      },
    ],
    relatedCourseId: 'conformitate-legala-firme-noi',
  },
  {
    id: 'NEW_REGULATION',
    type: 'REGULATION_CHANGE',
    severity: 'MEDIUM',
    title: 'New Industry Regulation',
    titleRo: 'Reglementare Nouă în Industrie',
    description: 'New regulations require changes to your operations.',
    descriptionRo: 'Noile reglementări necesită schimbări în operațiuni.',
    triggerConditions: ['month === 1 || month === 7'],
    baseProbability: 0.06,
    responses: [
      {
        id: 'proactive_comply',
        label: 'Proactive Compliance',
        labelRo: 'Conformitate Proactivă',
        description: 'Immediately implement all requirements',
        descriptionRo: 'Implementează imediat toate cerințele',
        impacts: { cash: -10000, complianceScore: 15, reputation: 3 },
      },
      {
        id: 'wait_deadline',
        label: 'Wait Until Deadline',
        labelRo: 'Așteaptă până la Termen',
        description: 'Implement closer to the deadline',
        descriptionRo: 'Implementează mai aproape de termen',
        impacts: { cash: -5000, complianceScore: 5, penaltiesRisk: 5 },
      },
      {
        id: 'lobby',
        label: 'Join Industry Lobby',
        labelRo: 'Participă la Lobby Industrial',
        description: 'Work with industry to modify regulation',
        descriptionRo: 'Lucrează cu industria pentru modificarea reglementării',
        impacts: { cash: -3000, reputation: 2 },
      },
    ],
  },
  {
    id: 'VAT_CHANGE',
    type: 'REGULATION_CHANGE',
    severity: 'HIGH',
    title: 'VAT Rate Change',
    titleRo: 'Schimbare Cotă TVA',
    description: 'The government has announced VAT rate changes.',
    descriptionRo: 'Guvernul a anunțat schimbări ale cotei TVA.',
    triggerConditions: ['month === 8', 'year >= 2025'],
    baseProbability: 1.0, // Certain in August 2025+
    responses: [
      {
        id: 'update_systems',
        label: 'Update All Systems',
        labelRo: 'Actualizează Toate Sistemele',
        description: 'Immediately update pricing and invoicing',
        descriptionRo: 'Actualizează imediat prețurile și facturarea',
        impacts: { cash: -2000, complianceScore: 10, price: 2 },
      },
      {
        id: 'absorb_increase',
        label: 'Absorb VAT Increase',
        labelRo: 'Absoarbe Creșterea TVA',
        description: 'Keep same prices, reduce margin',
        descriptionRo: 'Menține aceleași prețuri, reduce marja',
        impacts: { profit: -5, customerSatisfaction: 5 },
      },
    ],
  },
  {
    id: 'LABOR_LAW_CHANGE',
    type: 'REGULATION_CHANGE',
    severity: 'MEDIUM',
    title: 'Labor Law Amendment',
    titleRo: 'Modificare Legislație Muncii',
    description: 'New labor laws require updated employment contracts.',
    descriptionRo: 'Noile legi ale muncii necesită actualizarea contractelor.',
    triggerConditions: ['employees > 3'],
    baseProbability: 0.04,
    responses: [
      {
        id: 'update_contracts',
        label: 'Update All Contracts',
        labelRo: 'Actualizează Toate Contractele',
        description: 'Revise all employment contracts',
        descriptionRo: 'Revizuiește toate contractele de muncă',
        impacts: { cash: -500 * 1, complianceScore: 10, morale: 2 }, // Per employee
      },
      {
        id: 'consult_lawyer',
        label: 'Consult Employment Lawyer',
        labelRo: 'Consultă Avocat',
        description: 'Get legal advice first',
        descriptionRo: 'Obține consiliere juridică mai întâi',
        impacts: { cash: -3000, complianceScore: 15, penaltiesRisk: -5 },
      },
    ],
  },
  {
    id: 'GDPR_COMPLAINT',
    type: 'REGULATION_CHANGE',
    severity: 'HIGH',
    title: 'GDPR Complaint',
    titleRo: 'Plângere GDPR',
    description: 'A customer has filed a GDPR complaint against your company.',
    descriptionRo: 'Un client a depus o plângere GDPR împotriva firmei tale.',
    triggerConditions: ['customerCount > 50'],
    baseProbability: 0.02,
    deadline: 2,
    responses: [
      {
        id: 'investigate',
        label: 'Investigate and Respond',
        labelRo: 'Investighează și Răspunde',
        description: 'Take the complaint seriously',
        descriptionRo: 'Ia plângerea în serios',
        impacts: { cash: -5000, complianceScore: 5, reputation: -2 },
      },
      {
        id: 'data_audit',
        label: 'Full Data Audit',
        labelRo: 'Audit Complet Date',
        description: 'Review all data practices',
        descriptionRo: 'Revizuiește toate practicile de date',
        impacts: { cash: -15000, complianceScore: 20, penaltiesRisk: -10 },
      },
    ],
  },
  {
    id: 'MINIMUM_WAGE_INCREASE',
    type: 'REGULATION_CHANGE',
    severity: 'LOW',
    title: 'Minimum Wage Increase',
    titleRo: 'Creștere Salariu Minim',
    description: 'The minimum wage has been increased.',
    descriptionRo: 'Salariul minim a fost crescut.',
    triggerConditions: ['month === 1'],
    baseProbability: 0.8, // Usually happens annually
    responses: [
      {
        id: 'adjust_all',
        label: 'Adjust All Salaries',
        labelRo: 'Ajustează Toate Salariile',
        description: 'Increase all salaries proportionally',
        descriptionRo: 'Crește toate salariile proporțional',
        impacts: { averageSalary: 200, morale: 10, expenses: 5 },
      },
      {
        id: 'minimum_only',
        label: 'Adjust Minimum Only',
        labelRo: 'Ajustează Doar Minimul',
        description: 'Only update minimum wage employees',
        descriptionRo: 'Actualizează doar angajații la minim',
        impacts: { expenses: 2, morale: -5 },
      },
    ],
  },
  {
    id: 'E_FACTURA_DEADLINE',
    type: 'REGULATION_CHANGE',
    severity: 'MEDIUM',
    title: 'e-Factura Deadline',
    titleRo: 'Termen e-Factura',
    description: 'The e-Factura submission deadline is approaching.',
    descriptionRo: 'Termenul de depunere e-Factura se apropie.',
    triggerConditions: ['month === 6 || month === 12'],
    baseProbability: 0.9,
    responses: [
      {
        id: 'automated_system',
        label: 'Implement Automated System',
        labelRo: 'Implementează Sistem Automat',
        description: 'Set up automatic e-Factura submission',
        descriptionRo: 'Configurează trimiterea automată e-Factura',
        impacts: { cash: -5000, complianceScore: 20, auditRisk: -5 },
      },
      {
        id: 'manual_submit',
        label: 'Manual Submission',
        labelRo: 'Trimitere Manuală',
        description: 'Submit invoices manually',
        descriptionRo: 'Trimite facturile manual',
        impacts: { cash: -500, complianceScore: 5 },
      },
    ],
    relatedCourseId: 'e-factura-romania',
  },
  {
    id: 'SAFT_REQUIREMENT',
    type: 'REGULATION_CHANGE',
    severity: 'HIGH',
    title: 'SAF-T D406 Required',
    titleRo: 'SAF-T D406 Obligatoriu',
    description: 'Your company must now submit SAF-T D406 monthly reports.',
    descriptionRo: 'Firma ta trebuie să depună acum rapoarte lunare SAF-T D406.',
    triggerConditions: ['revenue > 100000'],
    baseProbability: 0.3,
    responses: [
      {
        id: 'implement_saft',
        label: 'Implement SAF-T System',
        labelRo: 'Implementează Sistem SAF-T',
        description: 'Set up SAF-T reporting',
        descriptionRo: 'Configurează raportarea SAF-T',
        impacts: { cash: -8000, complianceScore: 25, auditRisk: -10 },
      },
      {
        id: 'outsource',
        label: 'Outsource to Accountant',
        labelRo: 'Externalizează la Contabil',
        description: 'Have your accountant handle it',
        descriptionRo: 'Contabilul tău se ocupă de asta',
        impacts: { expenses: 3, complianceScore: 15, auditRisk: -5 },
      },
    ],
    relatedCourseId: 'saft-romania',
  },
  {
    id: 'PENALTY_NOTICE',
    type: 'AUDIT',
    severity: 'HIGH',
    title: 'Tax Penalty Notice',
    titleRo: 'Notificare Penalități Fiscale',
    description: 'You have received a tax penalty notice from ANAF.',
    descriptionRo: 'Ai primit o notificare de penalități fiscale de la ANAF.',
    triggerConditions: ['penaltiesRisk > 20'],
    baseProbability: 0.1,
    deadline: 1,
    responses: [
      {
        id: 'pay_penalty',
        label: 'Pay Penalty',
        labelRo: 'Plătește Penalitatea',
        description: 'Accept and pay the penalty',
        descriptionRo: 'Acceptă și plătește penalitatea',
        impacts: { cash: -5000, penaltiesRisk: -20, complianceScore: 5 },
      },
      {
        id: 'contest',
        label: 'Contest the Penalty',
        labelRo: 'Contestă Penalitatea',
        description: 'Challenge the penalty in court',
        descriptionRo: 'Contestă penalitatea în instanță',
        impacts: { cash: -10000, reputation: -2, penaltiesRisk: 5 },
        chainEvents: ['LEGAL_BATTLE'],
      },
    ],
  },
  {
    id: 'INSPECTION',
    type: 'AUDIT',
    severity: 'MEDIUM',
    title: 'Labor Inspection',
    titleRo: 'Inspecția Muncii',
    description: 'The Labor Inspectorate has scheduled a visit.',
    descriptionRo: 'Inspecția Muncii a programat o vizită.',
    triggerConditions: ['employees > 5'],
    baseProbability: 0.04,
    responses: [
      {
        id: 'prepare_docs',
        label: 'Prepare All Documentation',
        labelRo: 'Pregătește Toată Documentația',
        description: 'Ensure all papers are in order',
        descriptionRo: 'Asigură-te că toate actele sunt în ordine',
        impacts: { cash: -1000, complianceScore: 10, morale: 2 },
      },
      {
        id: 'fix_issues',
        label: 'Fix Known Issues First',
        labelRo: 'Rezolvă Problemele Cunoscute',
        description: 'Address compliance gaps before inspection',
        descriptionRo: 'Rezolvă lacunele de conformitate înainte de inspecție',
        impacts: { cash: -5000, complianceScore: 15, penaltiesRisk: -10 },
      },
    ],
  },
];

// =====================================================
// EMPLOYEE EVENTS (10)
// =====================================================

export const EMPLOYEE_EVENTS: SimulationEvent[] = [
  {
    id: 'KEY_EMPLOYEE_RESIGNATION',
    type: 'EMPLOYEE_EVENT',
    severity: 'HIGH',
    title: 'Key Employee Resignation',
    titleRo: 'Demisia unui Angajat Cheie',
    description: 'A senior team member has announced their resignation.',
    descriptionRo: 'Un membru senior al echipei și-a anunțat demisia.',
    triggerConditions: ['employees > 3', 'morale < 60'],
    baseProbability: 0.03,
    deadline: 2,
    responses: [
      {
        id: 'counter_offer',
        label: 'Make Counter Offer',
        labelRo: 'Fă Contra-Ofertă',
        description: 'Offer better terms to stay',
        descriptionRo: 'Oferă condiții mai bune pentru a rămâne',
        impacts: { averageSalary: 1000, morale: 5, cash: -2000 },
      },
      {
        id: 'accept_gracefully',
        label: 'Accept Gracefully',
        labelRo: 'Acceptă cu Grație',
        description: 'Wish them well and plan transition',
        descriptionRo: 'Urează-le succes și planifică tranziția',
        impacts: { employees: -1, capacity: -80, quality: -5 },
      },
      {
        id: 'immediate_replacement',
        label: 'Start Immediate Hiring',
        labelRo: 'Începe Angajarea Imediată',
        description: 'Begin search for replacement',
        descriptionRo: 'Începe căutarea unui înlocuitor',
        impacts: { cash: -5000, morale: -3 },
        chainEvents: ['HIRING_CHALLENGE'],
      },
    ],
  },
  {
    id: 'TEAM_CONFLICT',
    type: 'EMPLOYEE_EVENT',
    severity: 'MEDIUM',
    title: 'Team Conflict',
    titleRo: 'Conflict în Echipă',
    description: 'There is a significant conflict between team members.',
    descriptionRo: 'Există un conflict semnificativ între membrii echipei.',
    triggerConditions: ['employees > 5', 'morale < 70'],
    baseProbability: 0.05,
    responses: [
      {
        id: 'mediate',
        label: 'Mediate Personally',
        labelRo: 'Mediază Personal',
        description: 'Step in and resolve the conflict',
        descriptionRo: 'Intervine și rezolvă conflictul',
        impacts: { morale: 10, quality: 3 },
      },
      {
        id: 'external_mediator',
        label: 'Hire External Mediator',
        labelRo: 'Angajează Mediator Extern',
        description: 'Bring in a professional',
        descriptionRo: 'Adu un profesionist',
        impacts: { cash: -3000, morale: 15 },
      },
      {
        id: 'ignore',
        label: 'Let Them Work It Out',
        labelRo: 'Lasă-i să Rezolve Singuri',
        description: 'Hope it resolves naturally',
        descriptionRo: 'Speră că se rezolvă natural',
        impacts: { morale: -10, quality: -5, utilization: -10 },
      },
    ],
  },
  {
    id: 'SALARY_DEMAND',
    type: 'EMPLOYEE_EVENT',
    severity: 'MEDIUM',
    title: 'Salary Increase Demand',
    titleRo: 'Cerere de Mărire Salariu',
    description: 'Multiple employees are requesting salary increases.',
    descriptionRo: 'Mai mulți angajați solicită măriri salariale.',
    triggerConditions: ['employees > 3'],
    baseProbability: 0.06,
    deadline: 2,
    responses: [
      {
        id: 'grant_increase',
        label: 'Grant Increases',
        labelRo: 'Acordă Măririle',
        description: 'Approve salary increases',
        descriptionRo: 'Aprobă măririle salariale',
        impacts: { averageSalary: 500, morale: 15, expenses: 5 },
      },
      {
        id: 'partial_increase',
        label: 'Partial Increase',
        labelRo: 'Mărire Parțială',
        description: 'Offer smaller increases',
        descriptionRo: 'Oferă măriri mai mici',
        impacts: { averageSalary: 200, morale: 5, expenses: 2 },
      },
      {
        id: 'refuse',
        label: 'Decline Request',
        labelRo: 'Refuză Cererea',
        description: 'Cannot afford increases now',
        descriptionRo: 'Nu ne permitem măriri acum',
        impacts: { morale: -15 },
        chainEvents: ['KEY_EMPLOYEE_RESIGNATION'],
      },
    ],
  },
  {
    id: 'TRAINING_OPPORTUNITY',
    type: 'EMPLOYEE_EVENT',
    severity: 'LOW',
    title: 'Training Opportunity',
    titleRo: 'Oportunitate de Training',
    description: 'A valuable industry training program is available.',
    descriptionRo: 'Este disponibil un program valoros de training industrial.',
    triggerConditions: ['employees > 2'],
    baseProbability: 0.08,
    responses: [
      {
        id: 'send_all',
        label: 'Send All Eligible Staff',
        labelRo: 'Trimite Tot Personalul Eligibil',
        description: 'Invest in team development',
        descriptionRo: 'Investește în dezvoltarea echipei',
        impacts: { cash: -1000 * 1, quality: 10, morale: 8, utilization: -20 },
      },
      {
        id: 'send_some',
        label: 'Send Key Personnel',
        labelRo: 'Trimite Personalul Cheie',
        description: 'Train select individuals',
        descriptionRo: 'Instruiește persoane selectate',
        impacts: { cash: -1000, quality: 5, morale: 3 },
      },
      {
        id: 'skip',
        label: 'Skip This Time',
        labelRo: 'Omite de Data Aceasta',
        description: 'Cannot spare the time/cost',
        descriptionRo: 'Nu putem permite timpul/costul',
        impacts: { morale: -3 },
      },
    ],
  },
  {
    id: 'SICK_LEAVE_WAVE',
    type: 'EMPLOYEE_EVENT',
    severity: 'MEDIUM',
    title: 'Employee Sick Leave Wave',
    titleRo: 'Val de Concedii Medicale',
    description: 'Multiple employees are on sick leave simultaneously.',
    descriptionRo: 'Mai mulți angajați sunt în concediu medical simultan.',
    triggerConditions: ['employees > 5', 'month >= 10 || month <= 2'],
    baseProbability: 0.08,
    responses: [
      {
        id: 'temporary_staff',
        label: 'Hire Temporary Staff',
        labelRo: 'Angajează Personal Temporar',
        description: 'Bring in temporary workers',
        descriptionRo: 'Adu muncitori temporari',
        impacts: { cash: -5000, utilization: -10, quality: -5 },
      },
      {
        id: 'overtime_remaining',
        label: 'Overtime for Remaining Staff',
        labelRo: 'Ore Suplimentare pentru Restul',
        description: 'Ask healthy staff to work extra',
        descriptionRo: 'Roagă personalul sănătos să lucreze extra',
        impacts: { morale: -10, expenses: 3, quality: -3 },
      },
      {
        id: 'reduce_output',
        label: 'Reduce Output Temporarily',
        labelRo: 'Reduce Producția Temporar',
        description: 'Accept lower productivity',
        descriptionRo: 'Acceptă productivitate mai mică',
        impacts: { revenue: -15, reputation: -2 },
      },
    ],
  },
  {
    id: 'EXCEPTIONAL_PERFORMANCE',
    type: 'EMPLOYEE_EVENT',
    severity: 'LOW',
    title: 'Exceptional Employee Performance',
    titleRo: 'Performanță Excepțională a Angajatului',
    description: 'An employee has delivered exceptional results.',
    descriptionRo: 'Un angajat a livrat rezultate excepționale.',
    triggerConditions: ['quality > 70', 'morale > 60'],
    baseProbability: 0.05,
    responses: [
      {
        id: 'bonus',
        label: 'Give Performance Bonus',
        labelRo: 'Acordă Bonus de Performanță',
        description: 'Reward with a cash bonus',
        descriptionRo: 'Recompensează cu un bonus în bani',
        impacts: { cash: -3000, morale: 10, quality: 3 },
      },
      {
        id: 'promotion',
        label: 'Offer Promotion',
        labelRo: 'Oferă Promovare',
        description: 'Promote to a senior role',
        descriptionRo: 'Promovează la un rol superior',
        impacts: { averageSalary: 800, morale: 15, capacity: 20 },
      },
      {
        id: 'recognition',
        label: 'Public Recognition',
        labelRo: 'Recunoaștere Publică',
        description: 'Acknowledge in front of team',
        descriptionRo: 'Recunoaște în fața echipei',
        impacts: { morale: 5 },
      },
    ],
  },
  {
    id: 'WORKPLACE_INCIDENT',
    type: 'EMPLOYEE_EVENT',
    severity: 'HIGH',
    title: 'Workplace Incident',
    titleRo: 'Incident la Locul de Muncă',
    description: 'There has been a safety incident at work.',
    descriptionRo: 'A avut loc un incident de siguranță la muncă.',
    triggerConditions: ['quality < 60'],
    baseProbability: 0.02,
    responses: [
      {
        id: 'full_investigation',
        label: 'Full Investigation',
        labelRo: 'Investigație Completă',
        description: 'Thoroughly investigate and fix issues',
        descriptionRo: 'Investighează complet și rezolvă problemele',
        impacts: { cash: -10000, quality: 15, complianceScore: 10, morale: 5 },
      },
      {
        id: 'minimal_response',
        label: 'Basic Compliance',
        labelRo: 'Conformitate de Bază',
        description: 'Do the minimum required',
        descriptionRo: 'Fă minimul necesar',
        impacts: { cash: -2000, complianceScore: 3, morale: -10 },
        chainEvents: ['INSPECTION'],
      },
    ],
  },
  {
    id: 'UNION_FORMATION',
    type: 'EMPLOYEE_EVENT',
    severity: 'MEDIUM',
    title: 'Union Formation Attempt',
    titleRo: 'Încercare de Formare Sindicat',
    description: 'Employees are discussing forming a union.',
    descriptionRo: 'Angajații discută despre formarea unui sindicat.',
    triggerConditions: ['employees > 15', 'morale < 50'],
    baseProbability: 0.03,
    responses: [
      {
        id: 'engage',
        label: 'Engage Constructively',
        labelRo: 'Implică-te Constructiv',
        description: 'Open dialogue about concerns',
        descriptionRo: 'Dialog deschis despre preocupări',
        impacts: { morale: 15, reputation: 3, averageSalary: 300 },
      },
      {
        id: 'improve_conditions',
        label: 'Improve Conditions',
        labelRo: 'Îmbunătățește Condițiile',
        description: 'Proactively address complaints',
        descriptionRo: 'Abordează proactiv reclamațiile',
        impacts: { cash: -20000, morale: 25, quality: 5 },
      },
      {
        id: 'resist',
        label: 'Resist Formation',
        labelRo: 'Rezistă Formării',
        description: 'Discourage union organization',
        descriptionRo: 'Descurajează organizarea sindicală',
        impacts: { morale: -20, reputation: -10 },
        chainEvents: ['LEGAL_BATTLE'],
      },
    ],
  },
  {
    id: 'HIRING_CHALLENGE',
    type: 'EMPLOYEE_EVENT',
    severity: 'MEDIUM',
    title: 'Hiring Difficulties',
    titleRo: 'Dificultăți de Angajare',
    description: 'It is proving difficult to find qualified candidates.',
    descriptionRo: 'Este dificil să găsești candidați calificați.',
    triggerConditions: ['employees > 5'],
    baseProbability: 0.06,
    responses: [
      {
        id: 'increase_offer',
        label: 'Increase Salary Offer',
        labelRo: 'Crește Oferta Salarială',
        description: 'Offer above-market compensation',
        descriptionRo: 'Oferă compensație peste piață',
        impacts: { averageSalary: 500, employees: 1, cash: -8000 },
      },
      {
        id: 'recruiting_agency',
        label: 'Use Recruiting Agency',
        labelRo: 'Folosește Agenție de Recrutare',
        description: 'Outsource the search',
        descriptionRo: 'Externalizează căutarea',
        impacts: { cash: -5000, employees: 1 },
      },
      {
        id: 'train_junior',
        label: 'Hire and Train Junior',
        labelRo: 'Angajează și Instruiește Junior',
        description: 'Develop talent internally',
        descriptionRo: 'Dezvoltă talentul intern',
        impacts: { employees: 1, cash: -3000, capacity: 30 },
      },
    ],
  },
  {
    id: 'REMOTE_WORK_REQUEST',
    type: 'EMPLOYEE_EVENT',
    severity: 'LOW',
    title: 'Remote Work Request',
    titleRo: 'Cerere Muncă la Distanță',
    description: 'Employees are requesting more flexible work arrangements.',
    descriptionRo: 'Angajații solicită aranjamente de lucru mai flexibile.',
    triggerConditions: ['industry === "IT" || industry === "Consulting"'],
    baseProbability: 0.1,
    responses: [
      {
        id: 'full_remote',
        label: 'Allow Full Remote',
        labelRo: 'Permite Full Remote',
        description: 'Implement full remote work policy',
        descriptionRo: 'Implementează politică full remote',
        impacts: { morale: 15, expenses: -3, quality: -2 },
      },
      {
        id: 'hybrid',
        label: 'Hybrid Model',
        labelRo: 'Model Hibrid',
        description: '2-3 days in office, rest remote',
        descriptionRo: '2-3 zile la birou, restul remote',
        impacts: { morale: 10, expenses: -1 },
      },
      {
        id: 'office_only',
        label: 'Office Only',
        labelRo: 'Doar la Birou',
        description: 'Maintain current in-office policy',
        descriptionRo: 'Menține politica actuală la birou',
        impacts: { morale: -5 },
        chainEvents: ['KEY_EMPLOYEE_RESIGNATION'],
      },
    ],
  },
];

// =====================================================
// CRISIS & OPPORTUNITY EVENTS (15)
// =====================================================

export const CRISIS_OPPORTUNITY_EVENTS: SimulationEvent[] = [
  {
    id: 'ECONOMIC_RECESSION',
    type: 'ECONOMIC_SHOCK',
    severity: 'CRITICAL',
    title: 'Economic Recession',
    titleRo: 'Recesiune Economică',
    description: 'The economy has entered a recession. Demand is falling.',
    descriptionRo: 'Economia a intrat în recesiune. Cererea scade.',
    triggerConditions: ['year >= 2025'],
    baseProbability: 0.02,
    responses: [
      {
        id: 'cut_costs',
        label: 'Aggressive Cost Cutting',
        labelRo: 'Reducere Agresivă Costuri',
        description: 'Reduce all non-essential spending',
        descriptionRo: 'Reduce toate cheltuielile neesențiale',
        impacts: { expenses: -20, employees: -2, morale: -15, capacity: -30 },
      },
      {
        id: 'maintain_invest',
        label: 'Maintain and Invest',
        labelRo: 'Menține și Investește',
        description: 'Use this as opportunity to grow market share',
        descriptionRo: 'Folosește asta ca oportunitate de creștere a cotei de piață',
        impacts: { cash: -50000, marketShare: 5, reputation: 5 },
      },
      {
        id: 'pivot',
        label: 'Pivot Business Model',
        labelRo: 'Pivotează Modelul de Afaceri',
        description: 'Adapt offerings to recession needs',
        descriptionRo: 'Adaptează ofertele la nevoile recesiunii',
        impacts: { cash: -20000, quality: 10, reputation: 3 },
      },
    ],
    relatedCourseId: 'finantare-startup-romania-2025',
  },
  {
    id: 'SUPPLY_CHAIN_DISRUPTION',
    type: 'CRISIS',
    severity: 'HIGH',
    title: 'Supply Chain Disruption',
    titleRo: 'Întrerupere Lanț Aprovizionare',
    description: 'A major supplier has gone bankrupt.',
    descriptionRo: 'Un furnizor major a intrat în faliment.',
    triggerConditions: ['inventory < 10000'],
    baseProbability: 0.02,
    deadline: 2,
    responses: [
      {
        id: 'emergency_supplier',
        label: 'Find Emergency Supplier',
        labelRo: 'Găsește Furnizor de Urgență',
        description: 'Source from new supplier at premium',
        descriptionRo: 'Aprovizionează de la furnizor nou la preț premium',
        impacts: { cash: -15000, inventory: 10000, expenses: 5 },
      },
      {
        id: 'halt_production',
        label: 'Pause Operations',
        labelRo: 'Pauză Operațiuni',
        description: 'Stop until supply is restored',
        descriptionRo: 'Oprește până la restabilirea aprovizionării',
        impacts: { revenue: -40, reputation: -10, utilization: -50 },
      },
      {
        id: 'diversify',
        label: 'Diversify Suppliers',
        labelRo: 'Diversifică Furnizorii',
        description: 'Long-term solution with multiple suppliers',
        descriptionRo: 'Soluție pe termen lung cu furnizori multipli',
        impacts: { cash: -25000, expenses: 3, inventory: 15000 },
      },
    ],
  },
  {
    id: 'CYBER_ATTACK',
    type: 'CRISIS',
    severity: 'CRITICAL',
    title: 'Cyber Attack',
    titleRo: 'Atac Cibernetic',
    description: 'Your systems have been compromised by hackers.',
    descriptionRo: 'Sistemele tale au fost compromise de hackeri.',
    triggerConditions: ['industry === "IT" || industry === "FinTech" || industry === "E-commerce"'],
    baseProbability: 0.02,
    deadline: 1,
    responses: [
      {
        id: 'incident_response',
        label: 'Full Incident Response',
        labelRo: 'Răspuns Complet la Incident',
        description: 'Engage security experts immediately',
        descriptionRo: 'Angajează experți în securitate imediat',
        impacts: { cash: -30000, complianceScore: 10, reputation: -10 },
      },
      {
        id: 'pay_ransom',
        label: 'Pay Ransom',
        labelRo: 'Plătește Răscumpărarea',
        description: 'Pay to restore access (not recommended)',
        descriptionRo: 'Plătește pentru a restabili accesul (nerecomandat)',
        impacts: { cash: -50000, reputation: -20 },
        chainEvents: ['GDPR_COMPLAINT'],
      },
      {
        id: 'rebuild',
        label: 'Rebuild Systems',
        labelRo: 'Reconstruiește Sistemele',
        description: 'Start fresh with better security',
        descriptionRo: 'Începe de la zero cu securitate mai bună',
        impacts: { cash: -40000, utilization: -80, quality: 15 },
      },
    ],
  },
  {
    id: 'GOVERNMENT_GRANT',
    type: 'OPPORTUNITY',
    severity: 'MEDIUM',
    title: 'Government Grant Available',
    titleRo: 'Grant Guvernamental Disponibil',
    description: 'Your company is eligible for a government innovation grant.',
    descriptionRo: 'Firma ta este eligibilă pentru un grant guvernamental de inovare.',
    triggerConditions: ['reputation > 70', 'complianceScore > 60'],
    baseProbability: 0.03,
    responses: [
      {
        id: 'apply_grant',
        label: 'Apply for Grant',
        labelRo: 'Aplică pentru Grant',
        description: 'Submit grant application',
        descriptionRo: 'Trimite aplicația pentru grant',
        impacts: { cash: 50000, quality: 10, reputation: 5 },
      },
      {
        id: 'decline_grant',
        label: 'Decline Opportunity',
        labelRo: 'Refuză Oportunitatea',
        description: 'Too much paperwork involved',
        descriptionRo: 'Prea multă birocrație implicată',
        impacts: {},
      },
    ],
    relatedCourseId: 'finantare-startup-romania-2025',
  },
  {
    id: 'INVESTOR_INTEREST',
    type: 'OPPORTUNITY',
    severity: 'HIGH',
    title: 'Investor Interest',
    titleRo: 'Interes de la Investitori',
    description: 'An investor has expressed interest in your company.',
    descriptionRo: 'Un investitor și-a exprimat interesul pentru firma ta.',
    triggerConditions: ['reputation > 75', 'profit > 5000', 'marketShare > 5'],
    baseProbability: 0.02,
    responses: [
      {
        id: 'pursue_investment',
        label: 'Pursue Investment',
        labelRo: 'Urmărește Investiția',
        description: 'Enter due diligence process',
        descriptionRo: 'Intră în procesul de due diligence',
        impacts: { cash: 200000, reputation: 10 },
        chainEvents: ['RAPID_GROWTH_PRESSURE'],
      },
      {
        id: 'strategic_partnership',
        label: 'Propose Partnership',
        labelRo: 'Propune Parteneriat',
        description: 'Suggest partnership instead of investment',
        descriptionRo: 'Sugerează parteneriat în loc de investiție',
        impacts: { customerCount: 30, reputation: 5 },
      },
      {
        id: 'decline_investment',
        label: 'Decline Politely',
        labelRo: 'Refuză Politicos',
        description: 'Not ready for outside investment',
        descriptionRo: 'Nu ești pregătit pentru investiție externă',
        impacts: {},
      },
    ],
  },
  {
    id: 'RAPID_GROWTH_PRESSURE',
    type: 'OPPORTUNITY',
    severity: 'MEDIUM',
    title: 'Rapid Growth Pressure',
    titleRo: 'Presiunea Creșterii Rapide',
    description: 'Investors expect you to scale quickly.',
    descriptionRo: 'Investitorii se așteaptă să scalezi rapid.',
    triggerConditions: ['cash > 100000'],
    baseProbability: 0.05,
    responses: [
      {
        id: 'aggressive_growth',
        label: 'Aggressive Growth',
        labelRo: 'Creștere Agresivă',
        description: 'Invest heavily in expansion',
        descriptionRo: 'Investește masiv în expansiune',
        impacts: { cash: -80000, employees: 5, capacity: 100, quality: -10 },
      },
      {
        id: 'sustainable_growth',
        label: 'Sustainable Growth',
        labelRo: 'Creștere Sustenabilă',
        description: 'Grow at a manageable pace',
        descriptionRo: 'Crește într-un ritm gestionabil',
        impacts: { cash: -30000, employees: 2, capacity: 30 },
      },
    ],
  },
  {
    id: 'ACQUISITION_OFFER',
    type: 'OPPORTUNITY',
    severity: 'CRITICAL',
    title: 'Acquisition Offer',
    titleRo: 'Ofertă de Achiziție',
    description: 'A larger company wants to acquire your business.',
    descriptionRo: 'O companie mai mare dorește să achiziționeze afacerea ta.',
    triggerConditions: ['reputation > 80', 'marketShare > 10', 'profit > 10000'],
    baseProbability: 0.01,
    responses: [
      {
        id: 'accept_offer',
        label: 'Accept Offer',
        labelRo: 'Acceptă Oferta',
        description: 'Sell the company',
        descriptionRo: 'Vinde compania',
        impacts: { cash: 1000000 }, // Game ends
      },
      {
        id: 'negotiate_higher',
        label: 'Negotiate Higher',
        labelRo: 'Negociază Mai Mult',
        description: 'Try to get a better price',
        descriptionRo: 'Încearcă să obții un preț mai bun',
        impacts: { reputation: 5 },
      },
      {
        id: 'remain_independent',
        label: 'Remain Independent',
        labelRo: 'Rămâi Independent',
        description: 'Continue building the company',
        descriptionRo: 'Continuă să construiești compania',
        impacts: { morale: 10, reputation: 3 },
      },
    ],
  },
  {
    id: 'NATURAL_DISASTER',
    type: 'CRISIS',
    severity: 'CRITICAL',
    title: 'Natural Disaster',
    titleRo: 'Dezastru Natural',
    description: 'A natural disaster has damaged your facilities.',
    descriptionRo: 'Un dezastru natural ți-a avariat facilitățile.',
    triggerConditions: [],
    baseProbability: 0.005,
    responses: [
      {
        id: 'insurance_claim',
        label: 'File Insurance Claim',
        labelRo: 'Depune Cerere Asigurare',
        description: 'Claim damages from insurance',
        descriptionRo: 'Solicită despăgubiri de la asigurare',
        impacts: { cash: 30000, equipment: -20000, utilization: -50 },
      },
      {
        id: 'temporary_location',
        label: 'Setup Temporary Location',
        labelRo: 'Configurează Locație Temporară',
        description: 'Move operations temporarily',
        descriptionRo: 'Mută operațiunile temporar',
        impacts: { cash: -20000, expenses: 5, utilization: -30 },
      },
    ],
  },
  {
    id: 'TECHNOLOGY_BREAKTHROUGH',
    type: 'TECHNOLOGY',
    severity: 'MEDIUM',
    title: 'Technology Breakthrough',
    titleRo: 'Descoperire Tehnologică',
    description: 'New technology could transform your industry.',
    descriptionRo: 'O nouă tehnologie ar putea transforma industria ta.',
    triggerConditions: ['industry === "IT" || industry === "Manufacturing"'],
    baseProbability: 0.04,
    responses: [
      {
        id: 'early_adopter',
        label: 'Adopt Early',
        labelRo: 'Adoptă Devreme',
        description: 'Be first to implement new technology',
        descriptionRo: 'Fii primul care implementează noua tehnologie',
        impacts: { cash: -30000, quality: 20, capacity: 20, reputation: 5 },
      },
      {
        id: 'wait_mature',
        label: 'Wait for Maturity',
        labelRo: 'Așteaptă Maturitatea',
        description: 'Let others work out the bugs',
        descriptionRo: 'Lasă alții să rezolve problemele',
        impacts: { reputation: -2 },
      },
      {
        id: 'partner',
        label: 'Partner with Tech Provider',
        labelRo: 'Parteneriat cu Furnizor Tech',
        description: 'Collaborate rather than build in-house',
        descriptionRo: 'Colaborează în loc să construiești intern',
        impacts: { cash: -15000, quality: 10, capacity: 10 },
      },
    ],
  },
  {
    id: 'CUSTOMER_LAWSUIT',
    type: 'CRISIS',
    severity: 'HIGH',
    title: 'Customer Lawsuit',
    titleRo: 'Proces de la Client',
    description: 'A customer is suing your company.',
    descriptionRo: 'Un client dă în judecată firma ta.',
    triggerConditions: ['quality < 60'],
    baseProbability: 0.02,
    responses: [
      {
        id: 'settle',
        label: 'Settle Out of Court',
        labelRo: 'Rezolvă pe Cale Amiabilă',
        description: 'Pay to make it go away',
        descriptionRo: 'Plătește ca să dispară',
        impacts: { cash: -25000, reputation: -5 },
      },
      {
        id: 'fight',
        label: 'Fight in Court',
        labelRo: 'Luptă în Instanță',
        description: 'Defend your position legally',
        descriptionRo: 'Apără-ți poziția legal',
        impacts: { cash: -40000, reputation: -10 },
        chainEvents: ['LEGAL_BATTLE'],
      },
    ],
  },
  {
    id: 'LEGAL_BATTLE',
    type: 'CRISIS',
    severity: 'HIGH',
    title: 'Ongoing Legal Battle',
    titleRo: 'Bătălie Juridică în Curs',
    description: 'Legal proceedings are draining resources.',
    descriptionRo: 'Procedurile legale consumă resurse.',
    triggerConditions: [],
    baseProbability: 0.01,
    responses: [
      {
        id: 'continue_fight',
        label: 'Continue Fighting',
        labelRo: 'Continuă Lupta',
        description: 'See it through to the end',
        descriptionRo: 'Continuă până la capăt',
        impacts: { cash: -15000, reputation: -3 },
      },
      {
        id: 'mediate',
        label: 'Seek Mediation',
        labelRo: 'Caută Mediere',
        description: 'Try to resolve through mediation',
        descriptionRo: 'Încearcă să rezolvi prin mediere',
        impacts: { cash: -10000, reputation: 2 },
      },
    ],
  },
  {
    id: 'MEDIA_COVERAGE',
    type: 'OPPORTUNITY',
    severity: 'LOW',
    title: 'Positive Media Coverage',
    titleRo: 'Acoperire Media Pozitivă',
    description: 'A journalist wants to feature your company.',
    descriptionRo: 'Un jurnalist vrea să prezinte firma ta.',
    triggerConditions: ['reputation > 60'],
    baseProbability: 0.04,
    responses: [
      {
        id: 'full_cooperation',
        label: 'Full Cooperation',
        labelRo: 'Cooperare Totală',
        description: 'Give full access for the story',
        descriptionRo: 'Oferă acces complet pentru poveste',
        impacts: { reputation: 10, customerCount: 20 },
      },
      {
        id: 'controlled_access',
        label: 'Controlled Access',
        labelRo: 'Acces Controlat',
        description: 'Participate but limit exposure',
        descriptionRo: 'Participă dar limitează expunerea',
        impacts: { reputation: 5, customerCount: 10 },
      },
      {
        id: 'decline_media',
        label: 'Decline Interview',
        labelRo: 'Refuză Interviul',
        description: 'Prefer to stay under the radar',
        descriptionRo: 'Preferă să rămâi discret',
        impacts: { reputation: -2 },
      },
    ],
  },
  {
    id: 'CAPACITY_STRAIN',
    type: 'EMPLOYEE_EVENT',
    severity: 'MEDIUM',
    title: 'Capacity at Maximum',
    titleRo: 'Capacitate la Maxim',
    description: 'Your team is working at maximum capacity.',
    descriptionRo: 'Echipa ta lucrează la capacitate maximă.',
    triggerConditions: ['utilization > 95'],
    baseProbability: 0.15,
    responses: [
      {
        id: 'hire_urgently',
        label: 'Hire Urgently',
        labelRo: 'Angajează Urgent',
        description: 'Fast-track new hires',
        descriptionRo: 'Accelerează noile angajări',
        impacts: { employees: 2, cash: -15000, capacity: 50 },
      },
      {
        id: 'outsource',
        label: 'Outsource Work',
        labelRo: 'Externalizează Munca',
        description: 'Use contractors for overflow',
        descriptionRo: 'Folosește contractori pentru surplus',
        impacts: { expenses: 10, quality: -5, capacity: 30 },
      },
      {
        id: 'limit_orders',
        label: 'Limit New Orders',
        labelRo: 'Limitează Comenzile Noi',
        description: 'Stop accepting new work',
        descriptionRo: 'Oprește acceptarea de lucrări noi',
        impacts: { customerCount: -5, reputation: -3 },
      },
    ],
  },
  {
    id: 'PARTNERSHIP_OPPORTUNITY',
    type: 'OPPORTUNITY',
    severity: 'MEDIUM',
    title: 'Strategic Partnership',
    titleRo: 'Parteneriat Strategic',
    description: 'A complementary business wants to partner.',
    descriptionRo: 'O afacere complementară dorește să fie parteneră.',
    triggerConditions: ['reputation > 65'],
    baseProbability: 0.04,
    responses: [
      {
        id: 'formal_partnership',
        label: 'Formal Partnership',
        labelRo: 'Parteneriat Formal',
        description: 'Sign a formal partnership agreement',
        descriptionRo: 'Semnează un acord formal de parteneriat',
        impacts: { customerCount: 25, reputation: 5, marketShare: 2 },
      },
      {
        id: 'informal_collab',
        label: 'Informal Collaboration',
        labelRo: 'Colaborare Informală',
        description: 'Work together without commitment',
        descriptionRo: 'Lucrați împreună fără angajament',
        impacts: { customerCount: 10, reputation: 2 },
      },
      {
        id: 'decline_partnership',
        label: 'Decline Offer',
        labelRo: 'Refuză Oferta',
        description: 'Not the right fit',
        descriptionRo: 'Nu este potrivit',
        impacts: {},
      },
    ],
  },
  {
    id: 'COMPETITION_RESPONSE',
    type: 'COMPETITION',
    severity: 'LOW',
    title: 'Competitor Reaction',
    titleRo: 'Reacția Competitorului',
    description: 'Competitors are responding to your market moves.',
    descriptionRo: 'Competitorii răspund la mișcările tale pe piață.',
    triggerConditions: ['marketShare > 8'],
    baseProbability: 0.08,
    responses: [
      {
        id: 'double_down',
        label: 'Double Down',
        labelRo: 'Intensifică',
        description: 'Increase competitive pressure',
        descriptionRo: 'Crește presiunea competitivă',
        impacts: { cash: -20000, marketShare: 3, reputation: 2 },
      },
      {
        id: 'hold_position',
        label: 'Hold Position',
        labelRo: 'Menține Poziția',
        description: 'Defend current market share',
        descriptionRo: 'Apără cota de piață curentă',
        impacts: { cash: -5000 },
      },
      {
        id: 'differentiate_more',
        label: 'Differentiate Further',
        labelRo: 'Diferențiere Suplimentară',
        description: 'Focus on unique value proposition',
        descriptionRo: 'Concentrează-te pe propunerea unică de valoare',
        impacts: { quality: 10, reputation: 5 },
      },
    ],
  },
];

// =====================================================
// ALL EVENTS COMBINED
// =====================================================

export const ALL_EVENTS: SimulationEvent[] = [
  ...MARKET_EVENTS,
  ...REGULATORY_EVENTS,
  ...EMPLOYEE_EVENTS,
  ...CRISIS_OPPORTUNITY_EVENTS,
];

/**
 * Get events by type
 */
export function getEventsByType(type: EventType): SimulationEvent[] {
  return ALL_EVENTS.filter(e => e.type === type);
}

/**
 * Get event by ID
 */
export function getEventById(id: string): SimulationEvent | undefined {
  return ALL_EVENTS.find(e => e.id === id);
}

/**
 * Check if event should trigger based on conditions and probability
 */
export function shouldEventTrigger(
  event: SimulationEvent,
  state: Record<string, any>
): boolean {
  // Check conditions
  for (const condition of event.triggerConditions) {
    try {
      const result = evaluateCondition(condition, state);
      if (!result) return false;
    } catch {
      return false;
    }
  }

  // Random probability check
  return Math.random() < event.baseProbability;
}

/**
 * Evaluate a condition string against state
 */
function evaluateCondition(condition: string, state: Record<string, any>): boolean {
  try {
    let expr = condition;
    for (const [key, value] of Object.entries(state)) {
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      expr = expr.replace(regex, JSON.stringify(value));
    }
    return Function(`"use strict"; return (${expr})`)();
  } catch {
    return false;
  }
}

/**
 * Get random events for a simulation month
 */
export function getMonthlyEvents(state: Record<string, any>, maxEvents: number = 2): SimulationEvent[] {
  const triggeredEvents: SimulationEvent[] = [];

  for (const event of ALL_EVENTS) {
    if (shouldEventTrigger(event, state)) {
      triggeredEvents.push(event);
      if (triggeredEvents.length >= maxEvents) break;
    }
  }

  return triggeredEvents;
}

// Alias for service compatibility
export const SIMULATION_EVENTS = ALL_EVENTS;

/**
 * Trigger events for a simulation month
 * Returns events that were triggered based on state and probability
 */
export function triggerEvents(state: Record<string, any>, totalMonths: number): SimulationEvent[] {
  // Increase event frequency slightly as game progresses
  const progressMultiplier = 1 + totalMonths * 0.01;
  const triggeredEvents: SimulationEvent[] = [];
  const maxEvents = Math.min(3, 1 + Math.floor(totalMonths / 6));

  for (const event of ALL_EVENTS) {
    // Adjust probability based on game progress
    const adjustedProbability = event.baseProbability * progressMultiplier;

    // Check conditions
    let conditionsMet = true;
    for (const condition of event.triggerConditions) {
      try {
        if (!evaluateCondition(condition, state)) {
          conditionsMet = false;
          break;
        }
      } catch {
        conditionsMet = false;
        break;
      }
    }

    if (conditionsMet && Math.random() < adjustedProbability) {
      triggeredEvents.push(event);
      if (triggeredEvents.length >= maxEvents) break;
    }
  }

  return triggeredEvents;
}

/**
 * Process player's response to an event
 * Returns new state and impacts
 */
export function processEventResponse(
  state: Record<string, any>,
  event: SimulationEvent,
  responseId: string
): { newState: Record<string, any>; impacts: Record<string, number> } {
  const response = event.responses.find(r => r.id === responseId);
  if (!response) {
    return { newState: state, impacts: {} };
  }

  const newState = { ...state };
  const impacts: Record<string, number> = {};

  // Apply response impacts
  for (const [metric, value] of Object.entries(response.impacts)) {
    const currentValue = newState[metric] || 0;
    if (typeof value === 'number') {
      newState[metric] = currentValue + value;
      impacts[metric] = value;
    }
  }

  return { newState, impacts };
}
