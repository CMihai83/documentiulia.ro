/**
 * DocumentIulia.ro - Demo Businesses Seed Data
 * 10 Fictional Romanian SMEs with full module data
 */

export const demoBusinesses = [
  {
    id: 'biz-translog',
    name: 'TransLog SRL',
    cui: 'RO15234567',
    industry: 'Logistics & Transportation',
    city: 'București',
    county: 'București',
    employeeCount: 45,
    revenue: 8500000,
    tier: 'BUSINESS',
    description: 'Companie de transport și logistică cu flotă proprie de 30 de camioane, specializată în transport intern și internațional. Oferim servicii complete de logistică pentru industria retail și FMCG.',
    contacts: [
      { name: 'Maria Ionescu', role: 'Director Financiar', email: 'maria.ionescu@translog.ro', phone: '+40721234567', isPrimary: true },
      { name: 'Andrei Marin', role: 'Director Operațiuni', email: 'andrei.marin@translog.ro', phone: '+40722345678', isPrimary: false },
    ],
    employees: [
      { firstName: 'Maria', lastName: 'Ionescu', email: 'maria.ionescu@translog.ro', department: 'Financiar', position: 'Director Financiar', salary: 12000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Andrei', lastName: 'Marin', email: 'andrei.marin@translog.ro', department: 'Operațiuni', position: 'Director Operațiuni', salary: 11500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Ion', lastName: 'Popescu', email: 'ion.popescu@translog.ro', department: 'Operațiuni', position: 'Dispecer Transport', salary: 4500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Elena', lastName: 'Dumitrescu', email: 'elena.d@translog.ro', department: 'Operațiuni', position: 'Coordonator Logistică', salary: 5500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Vasile', lastName: 'Gheorghe', email: 'vasile.g@translog.ro', department: 'Transport', position: 'Șofer TIR', salary: 5000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Nicolae', lastName: 'Stancu', email: 'nicolae.s@translog.ro', department: 'Transport', position: 'Șofer TIR', salary: 4800, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Gheorghe', lastName: 'Popa', email: 'gheorghe.p@translog.ro', department: 'Transport', position: 'Șofer TIR', salary: 5200, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Adrian', lastName: 'Moldovan', email: 'adrian.m@translog.ro', department: 'Transport', position: 'Șofer TIR', salary: 4900, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Cristina', lastName: 'Radu', email: 'cristina.r@translog.ro', department: 'Administrativ', position: 'Specialist HR', salary: 4200, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Ana', lastName: 'Voicu', email: 'ana.v@translog.ro', department: 'Financiar', position: 'Contabil', salary: 4500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Mihai', lastName: 'Stoica', email: 'mihai.s@translog.ro', department: 'Mentenanță', position: 'Mecanic Auto', salary: 4800, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Dan', lastName: 'Marinescu', email: 'dan.m@translog.ro', department: 'IT', position: 'Administrator Sistem', salary: 6000, contractType: 'DEMO_FULL_TIME' },
    ]
  },
  {
    id: 'biz-buildtech',
    name: 'BuildTech România SRL',
    cui: 'RO18456789',
    industry: 'Construction',
    city: 'Cluj-Napoca',
    county: 'Cluj',
    employeeCount: 120,
    revenue: 25000000,
    tier: 'BUSINESS',
    description: 'Constructor general cu experiență în proiecte rezidențiale și comerciale, certificat ISO 9001 și ISO 14001. Portofoliul include ansambluri rezidențiale, centre comerciale și clădiri de birouri.',
    contacts: [
      { name: 'Andrei Popescu', role: 'Contabil Șef', email: 'andrei.popescu@buildtech.ro', phone: '+40723456789', isPrimary: true },
      { name: 'Cristian Dumitrescu', role: 'Director Tehnic', email: 'cristian.d@buildtech.ro', phone: '+40724567890', isPrimary: false },
    ],
    employees: [
      { firstName: 'Andrei', lastName: 'Popescu', email: 'andrei.popescu@buildtech.ro', department: 'Financiar', position: 'Contabil Șef', salary: 10000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Cristian', lastName: 'Dumitrescu', email: 'cristian.d@buildtech.ro', department: 'Tehnic', position: 'Director Tehnic', salary: 15000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Alexandru', lastName: 'Mureșan', email: 'alex.m@buildtech.ro', department: 'Proiectare', position: 'Arhitect Șef', salary: 12000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Ioana', lastName: 'Bălan', email: 'ioana.b@buildtech.ro', department: 'Proiectare', position: 'Inginer Structurist', salary: 9000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Radu', lastName: 'Cosma', email: 'radu.c@buildtech.ro', department: 'Șantier', position: 'Șef Șantier', salary: 8500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Florin', lastName: 'Ardelean', email: 'florin.a@buildtech.ro', department: 'Șantier', position: 'Șef Echipă', salary: 6500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Vasile', lastName: 'Crișan', email: 'vasile.c@buildtech.ro', department: 'Șantier', position: 'Șef Echipă', salary: 6200, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Ion', lastName: 'Toma', email: 'ion.t@buildtech.ro', department: 'Achiziții', position: 'Manager Achiziții', salary: 7500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Maria', lastName: 'Neagu', email: 'maria.n@buildtech.ro', department: 'HR', position: 'Manager HR', salary: 7000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Diana', lastName: 'Petrescu', email: 'diana.p@buildtech.ro', department: 'Calitate', position: 'Manager Calitate', salary: 8000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Bogdan', lastName: 'Rus', email: 'bogdan.r@buildtech.ro', department: 'SSM', position: 'Inspector SSM', salary: 5500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Carmen', lastName: 'Lung', email: 'carmen.l@buildtech.ro', department: 'Financiar', position: 'Economist', salary: 5000, contractType: 'DEMO_FULL_TIME' },
    ]
  },
  {
    id: 'biz-medicare',
    name: 'MediCare Plus SRL',
    cui: 'RO21567890',
    industry: 'Healthcare',
    city: 'Timișoara',
    county: 'Timiș',
    employeeCount: 35,
    revenue: 4200000,
    tier: 'PRO',
    description: 'Rețea de cabinete medicale private, cu specializări în medicină internă, cardiologie și pediatrie. Oferim servicii medicale de înaltă calitate cu echipamente moderne.',
    contacts: [
      { name: 'Elena Dumitrescu', role: 'Administrator', email: 'elena.d@medicare.ro', phone: '+40725678901', isPrimary: true },
      { name: 'Dr. Adrian Stan', role: 'Director Medical', email: 'adrian.stan@medicare.ro', phone: '+40726789012', isPrimary: false },
    ],
    employees: [
      { firstName: 'Elena', lastName: 'Dumitrescu', email: 'elena.d@medicare.ro', department: 'Administrativ', position: 'Administrator', salary: 8000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Adrian', lastName: 'Stan', email: 'adrian.stan@medicare.ro', department: 'Medical', position: 'Director Medical', salary: 18000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Laura', lastName: 'Munteanu', email: 'laura.m@medicare.ro', department: 'Medical', position: 'Medic Cardiolog', salary: 15000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Mihai', lastName: 'Ciobanu', email: 'mihai.c@medicare.ro', department: 'Medical', position: 'Medic Internist', salary: 14000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Ana', lastName: 'Bogdan', email: 'ana.b@medicare.ro', department: 'Medical', position: 'Medic Pediatru', salary: 13000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Roxana', lastName: 'Filip', email: 'roxana.f@medicare.ro', department: 'Nursing', position: 'Asistent Medical Șef', salary: 5500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Ioana', lastName: 'Nistor', email: 'ioana.n@medicare.ro', department: 'Nursing', position: 'Asistent Medical', salary: 4200, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Cristina', lastName: 'Pavel', email: 'cristina.p@medicare.ro', department: 'Recepție', position: 'Recepționer', salary: 3500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Alina', lastName: 'Gheorghe', email: 'alina.g@medicare.ro', department: 'Financiar', position: 'Contabil', salary: 4500, contractType: 'DEMO_FULL_TIME' },
    ]
  },
  {
    id: 'biz-agrofarm',
    name: 'AgroFarm Holding SA',
    cui: 'RO24678901',
    industry: 'Agriculture',
    city: 'Craiova',
    county: 'Dolj',
    employeeCount: 85,
    revenue: 12000000,
    tier: 'BUSINESS',
    description: 'Fermă agricolă integrată cu 2,500 hectare teren arabil, depozite și capacitate de procesare cereale. Cultivăm grâu, porumb, floarea soarelui și rapiță.',
    contacts: [
      { name: 'Ion Georgescu', role: 'Director General', email: 'ion.g@agrofarm.ro', phone: '+40727890123', isPrimary: true },
      { name: 'Ana Voicu', role: 'CFO', email: 'ana.voicu@agrofarm.ro', phone: '+40728901234', isPrimary: false },
    ],
    employees: [
      { firstName: 'Ion', lastName: 'Georgescu', email: 'ion.g@agrofarm.ro', department: 'Management', position: 'Director General', salary: 20000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Ana', lastName: 'Voicu', email: 'ana.voicu@agrofarm.ro', department: 'Financiar', position: 'CFO', salary: 15000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Marian', lastName: 'Dinu', email: 'marian.d@agrofarm.ro', department: 'Producție', position: 'Director Producție', salary: 12000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Vasile', lastName: 'Barbu', email: 'vasile.b@agrofarm.ro', department: 'Tehnic', position: 'Inginer Agronom', salary: 8000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Nicolae', lastName: 'Oprea', email: 'nicolae.o@agrofarm.ro', department: 'Tehnic', position: 'Inginer Agronom', salary: 7500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Gheorghe', lastName: 'Marin', email: 'gheorghe.m@agrofarm.ro', department: 'Mecanizare', position: 'Șef Atelier Mecanic', salary: 6500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Dumitru', lastName: 'Popa', email: 'dumitru.p@agrofarm.ro', department: 'Mecanizare', position: 'Mecanic Agricol', salary: 5000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Florin', lastName: 'Iancu', email: 'florin.i@agrofarm.ro', department: 'Siloz', position: 'Șef Siloz', salary: 5500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Constantin', lastName: 'Radu', email: 'constantin.r@agrofarm.ro', department: 'Vânzări', position: 'Manager Vânzări', salary: 9000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Elena', lastName: 'Stanciu', email: 'elena.s@agrofarm.ro', department: 'Administrativ', position: 'Office Manager', salary: 4500, contractType: 'DEMO_FULL_TIME' },
    ]
  },
  {
    id: 'biz-techinnov',
    name: 'TechInnov Solutions SRL',
    cui: 'RO27789012',
    industry: 'IT Services',
    city: 'București',
    county: 'București',
    employeeCount: 65,
    revenue: 9800000,
    tier: 'BUSINESS',
    description: 'Companie IT specializată în dezvoltare software custom, cloud computing și consultanță digitală. Clienți din banking, retail și energie.',
    contacts: [
      { name: 'Radu Mihai', role: 'CEO', email: 'radu.mihai@techinnov.ro', phone: '+40729012345', isPrimary: true },
      { name: 'Simona Cristea', role: 'HR Manager', email: 'simona.c@techinnov.ro', phone: '+40730123456', isPrimary: false },
    ],
    employees: [
      { firstName: 'Radu', lastName: 'Mihai', email: 'radu.mihai@techinnov.ro', department: 'Management', position: 'CEO', salary: 25000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Simona', lastName: 'Cristea', email: 'simona.c@techinnov.ro', department: 'HR', position: 'HR Manager', salary: 9000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Alexandru', lastName: 'Ionescu', email: 'alex.i@techinnov.ro', department: 'Development', position: 'CTO', salary: 22000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Andrei', lastName: 'Popescu', email: 'andrei.p@techinnov.ro', department: 'Development', position: 'Tech Lead', salary: 16000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Mihai', lastName: 'Dumitrescu', email: 'mihai.d@techinnov.ro', department: 'Development', position: 'Senior Developer', salary: 14000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Ana', lastName: 'Munteanu', email: 'ana.m@techinnov.ro', department: 'Development', position: 'Senior Developer', salary: 13500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Bogdan', lastName: 'Stanescu', email: 'bogdan.s@techinnov.ro', department: 'Development', position: 'Mid Developer', salary: 10000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Cristina', lastName: 'Radu', email: 'cristina.r@techinnov.ro', department: 'Development', position: 'Junior Developer', salary: 6000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Dan', lastName: 'Vlad', email: 'dan.v@techinnov.ro', department: 'DevOps', position: 'DevOps Engineer', salary: 15000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Ioana', lastName: 'Popa', email: 'ioana.p@techinnov.ro', department: 'QA', position: 'QA Lead', salary: 11000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'George', lastName: 'Matei', email: 'george.m@techinnov.ro', department: 'Sales', position: 'Sales Manager', salary: 12000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Laura', lastName: 'Neagu', email: 'laura.n@techinnov.ro', department: 'Financiar', position: 'CFO', salary: 18000, contractType: 'DEMO_FULL_TIME' },
    ]
  },
  {
    id: 'biz-retailhub',
    name: 'RetailHub Distribution SRL',
    cui: 'RO30890123',
    industry: 'Retail & E-commerce',
    city: 'Iași',
    county: 'Iași',
    employeeCount: 150,
    revenue: 35000000,
    tier: 'BUSINESS',
    description: 'Distribuitor și retailer omnichannel cu 15 magazine fizice și platformă e-commerce cu 50,000+ produse. Specializați în electronice și home appliances.',
    contacts: [
      { name: 'Mihai Tudor', role: 'Director Comercial', email: 'mihai.tudor@retailhub.ro', phone: '+40731234567', isPrimary: true },
      { name: 'Laura Nistor', role: 'E-commerce Manager', email: 'laura.n@retailhub.ro', phone: '+40732345678', isPrimary: false },
    ],
    employees: [
      { firstName: 'Mihai', lastName: 'Tudor', email: 'mihai.tudor@retailhub.ro', department: 'Comercial', position: 'Director Comercial', salary: 18000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Laura', lastName: 'Nistor', email: 'laura.n@retailhub.ro', department: 'E-commerce', position: 'E-commerce Manager', salary: 12000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Adrian', lastName: 'Călin', email: 'adrian.c@retailhub.ro', department: 'Management', position: 'CEO', salary: 25000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Cristian', lastName: 'Ursache', email: 'cristian.u@retailhub.ro', department: 'Logistică', position: 'Director Logistică', salary: 14000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Andreea', lastName: 'Popescu', email: 'andreea.p@retailhub.ro', department: 'Marketing', position: 'Marketing Manager', salary: 10000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Vlad', lastName: 'Munteanu', email: 'vlad.m@retailhub.ro', department: 'IT', position: 'IT Manager', salary: 13000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Roxana', lastName: 'Gheorghe', email: 'roxana.g@retailhub.ro', department: 'Financiar', position: 'CFO', salary: 16000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Ionuț', lastName: 'Popa', email: 'ionut.p@retailhub.ro', department: 'Retail', position: 'Area Manager', salary: 8000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Diana', lastName: 'Radu', email: 'diana.r@retailhub.ro', department: 'HR', position: 'HR Manager', salary: 9000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'George', lastName: 'Stancu', email: 'george.s@retailhub.ro', department: 'Achiziții', position: 'Procurement Manager', salary: 11000, contractType: 'DEMO_FULL_TIME' },
    ]
  },
  {
    id: 'biz-manufprod',
    name: 'ManuProd Industries SA',
    cui: 'RO33901234',
    industry: 'Manufacturing',
    city: 'Brașov',
    county: 'Brașov',
    employeeCount: 280,
    revenue: 48000000,
    tier: 'BUSINESS',
    description: 'Producător de componente auto și industriale, furnizor tier-2 pentru mari constructori europeni. Certificat IATF 16949 și ISO 14001.',
    contacts: [
      { name: 'Alexandru Radu', role: 'Plant Manager', email: 'alexandru.radu@manufprod.ro', phone: '+40733456789', isPrimary: true },
      { name: 'Diana Petrescu', role: 'Quality Manager', email: 'diana.p@manufprod.ro', phone: '+40734567890', isPrimary: false },
    ],
    employees: [
      { firstName: 'Alexandru', lastName: 'Radu', email: 'alexandru.radu@manufprod.ro', department: 'Management', position: 'Plant Manager', salary: 22000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Diana', lastName: 'Petrescu', email: 'diana.p@manufprod.ro', department: 'Calitate', position: 'Quality Manager', salary: 14000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Sorin', lastName: 'Moldovan', email: 'sorin.m@manufprod.ro', department: 'Producție', position: 'Production Manager', salary: 16000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Cristian', lastName: 'Bogdan', email: 'cristian.b@manufprod.ro', department: 'Mentenanță', position: 'Maintenance Manager', salary: 12000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Marian', lastName: 'Stoica', email: 'marian.s@manufprod.ro', department: 'Inginerie', position: 'Engineering Manager', salary: 15000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Elena', lastName: 'Vlad', email: 'elena.v@manufprod.ro', department: 'HR', position: 'HR Director', salary: 13000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Andrei', lastName: 'Neagu', email: 'andrei.n@manufprod.ro', department: 'Financiar', position: 'CFO', salary: 20000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Florin', lastName: 'Toma', email: 'florin.t@manufprod.ro', department: 'Logistică', position: 'Supply Chain Manager', salary: 14000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Iuliana', lastName: 'Costea', email: 'iuliana.c@manufprod.ro', department: 'SSM', position: 'EHS Manager', salary: 10000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Radu', lastName: 'Iancu', email: 'radu.i@manufprod.ro', department: 'IT', position: 'IT Manager', salary: 12000, contractType: 'DEMO_FULL_TIME' },
    ]
  },
  {
    id: 'biz-servicepro',
    name: 'ServicePro Consulting SRL',
    cui: 'RO36012345',
    industry: 'Professional Services',
    city: 'București',
    county: 'București',
    employeeCount: 28,
    revenue: 3500000,
    tier: 'PRO',
    description: 'Firmă de consultanță în management și strategie de afaceri, cu focus pe transformare digitală și eficiență operațională. Clienți din top 100 companii România.',
    contacts: [
      { name: 'Bogdan Marinescu', role: 'Managing Partner', email: 'bogdan.m@servicepro.ro', phone: '+40735678901', isPrimary: true },
      { name: 'Irina Vlad', role: 'Senior Consultant', email: 'irina.vlad@servicepro.ro', phone: '+40736789012', isPrimary: false },
    ],
    employees: [
      { firstName: 'Bogdan', lastName: 'Marinescu', email: 'bogdan.m@servicepro.ro', department: 'Management', position: 'Managing Partner', salary: 30000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Irina', lastName: 'Vlad', email: 'irina.vlad@servicepro.ro', department: 'Consulting', position: 'Senior Consultant', salary: 15000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Mihai', lastName: 'Ionescu', email: 'mihai.i@servicepro.ro', department: 'Consulting', position: 'Partner', salary: 25000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Alexandra', lastName: 'Popa', email: 'alexandra.p@servicepro.ro', department: 'Consulting', position: 'Senior Consultant', salary: 14000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Andrei', lastName: 'Dumitrescu', email: 'andrei.d@servicepro.ro', department: 'Consulting', position: 'Consultant', salary: 10000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Elena', lastName: 'Radu', email: 'elena.r@servicepro.ro', department: 'Consulting', position: 'Junior Consultant', salary: 6000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Cristina', lastName: 'Stan', email: 'cristina.s@servicepro.ro', department: 'Administrativ', position: 'Office Manager', salary: 5000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'George', lastName: 'Matei', email: 'george.m@servicepro.ro', department: 'Financiar', position: 'Finance Manager', salary: 11000, contractType: 'DEMO_FULL_TIME' },
    ]
  },
  {
    id: 'biz-foodchain',
    name: 'FoodChain Distribution SRL',
    cui: 'RO39123456',
    industry: 'Food & Beverage',
    city: 'Constanța',
    county: 'Constanța',
    employeeCount: 95,
    revenue: 22000000,
    tier: 'BUSINESS',
    description: 'Distribuitor regional de produse alimentare și băuturi, cu depozite frigorifice și flotă de distribuție proprie. Acoperim zona Dobrogea și Moldova.',
    contacts: [
      { name: 'Vlad Constantinescu', role: 'Director Logistică', email: 'vlad.c@foodchain.ro', phone: '+40737890123', isPrimary: true },
      { name: 'Monica Stancu', role: 'Procurement Manager', email: 'monica.s@foodchain.ro', phone: '+40738901234', isPrimary: false },
    ],
    employees: [
      { firstName: 'Vlad', lastName: 'Constantinescu', email: 'vlad.c@foodchain.ro', department: 'Logistică', position: 'Director Logistică', salary: 14000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Monica', lastName: 'Stancu', email: 'monica.s@foodchain.ro', department: 'Achiziții', position: 'Procurement Manager', salary: 10000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Adrian', lastName: 'Matei', email: 'adrian.m@foodchain.ro', department: 'Management', position: 'General Manager', salary: 20000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Cristian', lastName: 'Ene', email: 'cristian.e@foodchain.ro', department: 'Vânzări', position: 'Sales Director', salary: 15000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Alina', lastName: 'Dobre', email: 'alina.d@foodchain.ro', department: 'Depozit', position: 'Warehouse Manager', salary: 8000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Florin', lastName: 'Marinescu', email: 'florin.m@foodchain.ro', department: 'Calitate', position: 'Quality Manager', salary: 9000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Dana', lastName: 'Popescu', email: 'dana.p@foodchain.ro', department: 'Financiar', position: 'CFO', salary: 16000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Ion', lastName: 'Nistor', email: 'ion.n@foodchain.ro', department: 'Transport', position: 'Fleet Manager', salary: 7500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Maria', lastName: 'Gheorghe', email: 'maria.g@foodchain.ro', department: 'HR', position: 'HR Manager', salary: 8000, contractType: 'DEMO_FULL_TIME' },
    ]
  },
  {
    id: 'biz-greenenergy',
    name: 'GreenEnergy Power SRL',
    cui: 'RO42234567',
    industry: 'Renewable Energy',
    city: 'Sibiu',
    county: 'Sibiu',
    employeeCount: 42,
    revenue: 18000000,
    tier: 'BUSINESS',
    description: 'Producător de energie verde din surse solare și eoliene, cu 25MW capacitate instalată și servicii de consultanță energie pentru companii.',
    contacts: [
      { name: 'Dan Moldovan', role: 'CEO', email: 'dan.moldovan@greenenergy.ro', phone: '+40739012345', isPrimary: true },
      { name: 'Alina Barbu', role: 'Sustainability Manager', email: 'alina.b@greenenergy.ro', phone: '+40740123456', isPrimary: false },
    ],
    employees: [
      { firstName: 'Dan', lastName: 'Moldovan', email: 'dan.moldovan@greenenergy.ro', department: 'Management', position: 'CEO', salary: 28000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Alina', lastName: 'Barbu', email: 'alina.b@greenenergy.ro', department: 'Sustainability', position: 'Sustainability Manager', salary: 12000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Mihai', lastName: 'Radu', email: 'mihai.r@greenenergy.ro', department: 'Tehnic', position: 'Technical Director', salary: 18000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Cristina', lastName: 'Ionescu', email: 'cristina.i@greenenergy.ro', department: 'Operațiuni', position: 'Operations Manager', salary: 14000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Andrei', lastName: 'Popa', email: 'andrei.p@greenenergy.ro', department: 'Tehnic', position: 'Solar Engineer', salary: 10000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Bogdan', lastName: 'Stan', email: 'bogdan.s@greenenergy.ro', department: 'Tehnic', position: 'Wind Engineer', salary: 10500, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Elena', lastName: 'Costea', email: 'elena.c@greenenergy.ro', department: 'Consulting', position: 'Energy Consultant', salary: 11000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Florin', lastName: 'Neagu', email: 'florin.n@greenenergy.ro', department: 'Financiar', position: 'CFO', salary: 16000, contractType: 'DEMO_FULL_TIME' },
      { firstName: 'Ana', lastName: 'Marin', email: 'ana.m@greenenergy.ro', department: 'Sales', position: 'Business Development', salary: 9000, contractType: 'DEMO_FULL_TIME' },
    ]
  }
];

// Sample HSE Incidents for demo
export const hseIncidents = [
  {
    businessId: 'biz-buildtech',
    type: 'NEAR_MISS',
    severity: 'HSE_MEDIUM',
    title: 'Obiect căzut de la înălțime - near miss',
    description: 'Un obiect metalic a căzut de la etajul 3 al șantierului, fără a lovi pe nimeni. Zona era marcată, dar obiectul a depășit perimetrul de siguranță.',
    location: 'Șantier Ansamblu Rezidențial Nord, Cluj-Napoca',
    rootCause: 'Depozitare necorespunzătoare a materialelor la înălțime',
    correctiveActions: 'Reamenajare zonă de depozitare, instalare plase de protecție suplimentare',
    preventiveActions: 'Training suplimentar pentru echipele de la înălțime, verificări zilnice ale zonelor de depozitare',
    status: 'RESOLVED'
  },
  {
    businessId: 'biz-buildtech',
    type: 'INJURY',
    severity: 'HSE_LOW',
    title: 'Tăietură superficială la mână',
    description: 'Muncitor cu tăietură superficială la mână dreaptă în urma manipulării plăcilor de gips-carton fără mănuși de protecție.',
    location: 'Șantier Centru Comercial Est, Cluj-Napoca',
    rootCause: 'Nerespectarea procedurii de utilizare EIP',
    correctiveActions: 'Primul ajutor administrat, incidentul documentat',
    preventiveActions: 'Briefing de siguranță pentru toată echipa, verificarea zilnică a EIP',
    status: 'CLOSED'
  },
  {
    businessId: 'biz-manufprod',
    type: 'EQUIPMENT_FAILURE',
    severity: 'HSE_HIGH',
    title: 'Defecțiune presă hidraulică - oprire de urgență',
    description: 'Presa hidraulică #3 a prezentat scurgeri de ulei și s-a activat sistemul de oprire de urgență. Operatorul a evacuat zona imediat.',
    location: 'Hala Producție A, Brașov',
    rootCause: 'Uzura garnitură circuit hidraulic',
    correctiveActions: 'Înlocuire garnituri, verificare completă sistem hidraulic',
    preventiveActions: 'Revizuire program mentenanță preventivă, adăugare puncte de verificare',
    status: 'CORRECTIVE_ACTION'
  },
  {
    businessId: 'biz-translog',
    type: 'NEAR_MISS',
    severity: 'HSE_HIGH',
    title: 'Aproape accident rutier - evitare coliziune',
    description: 'Șofer TIR a evitat în ultimul moment o coliziune cu un autoturism care a intrat neregulamentar pe autostradă. Fără victime sau daune.',
    location: 'Autostrada A1, km 85',
    rootCause: 'Factor extern - conducător auto terț',
    correctiveActions: 'Raport incident transmis la DRDP',
    preventiveActions: 'Briefing defensive driving pentru toți șoferii',
    status: 'CLOSED'
  },
  {
    businessId: 'biz-foodchain',
    type: 'PROPERTY_DAMAGE',
    severity: 'HSE_MEDIUM',
    title: 'Defecțiune sistem refrigerare - pierdere marfă',
    description: 'Sistemul de refrigerare camera 2 s-a defectat pe parcursul nopții. Temperatura a crescut peste limitele admise. 500kg produse compromise.',
    location: 'Depozit Constanța, Camera frigorifică #2',
    rootCause: 'Defecțiune compresor',
    correctiveActions: 'Compresor înlocuit, marfă compromisă eliminată conform procedurii',
    preventiveActions: 'Instalare sistem monitorizare și alertare temperatură 24/7',
    status: 'RESOLVED'
  }
];

// Sample HR Contracts for demo
export const hrContracts = [
  {
    businessId: 'biz-techinnov',
    employeeEmail: 'mihai.d@techinnov.ro',
    type: 'HR_INDEFINITE',
    startDate: '2022-03-15',
    salary: 14000,
    workHours: 40,
    position: 'Senior Developer',
    department: 'Development',
    telework: true,
    teleworkDays: 3,
    status: 'ACTIVE'
  },
  {
    businessId: 'biz-techinnov',
    employeeEmail: 'cristina.r@techinnov.ro',
    type: 'HR_FIXED_TERM',
    startDate: '2024-06-01',
    endDate: '2025-05-31',
    probationEnd: '2024-09-01',
    salary: 6000,
    workHours: 40,
    position: 'Junior Developer',
    department: 'Development',
    telework: false,
    status: 'ACTIVE'
  },
  {
    businessId: 'biz-buildtech',
    employeeEmail: 'radu.c@buildtech.ro',
    type: 'HR_INDEFINITE',
    startDate: '2019-02-01',
    salary: 8500,
    workHours: 40,
    position: 'Șef Șantier',
    department: 'Șantier',
    telework: false,
    status: 'ACTIVE'
  }
];

// Sample HR Forms for demo
export const hrForms = [
  {
    businessId: 'biz-techinnov',
    employeeEmail: 'bogdan.s@techinnov.ro',
    type: 'LEAVE_REQUEST',
    title: 'Cerere concediu de odihnă - Sărbători 2024',
    data: {
      startDate: '2024-12-23',
      endDate: '2025-01-03',
      days: 8,
      reason: 'Concediu odihnă pentru sărbătorile de iarnă',
      replacement: 'Mihai Dumitrescu'
    },
    status: 'APPROVED'
  },
  {
    businessId: 'biz-medicare',
    employeeEmail: 'roxana.f@medicare.ro',
    type: 'TRAINING_REQUEST',
    title: 'Cerere participare curs ACLS',
    data: {
      courseName: 'Advanced Cardiac Life Support',
      provider: 'Centrul de Training Medical',
      startDate: '2025-02-15',
      endDate: '2025-02-17',
      cost: 2500,
      justification: 'Cerință pentru acreditare și îmbunătățirea competențelor în urgențe cardiace'
    },
    status: 'IN_REVIEW'
  },
  {
    businessId: 'biz-servicepro',
    employeeEmail: 'andrei.d@servicepro.ro',
    type: 'EXPENSE_CLAIM',
    title: 'Decontare cheltuieli deplasare client',
    data: {
      client: 'ABC Corporation',
      dates: '5-6 Decembrie 2024',
      expenses: [
        { type: 'Transport', amount: 450, description: 'Bilete avion București-Cluj' },
        { type: 'Cazare', amount: 320, description: '1 noapte Hotel Central' },
        { type: 'Masă', amount: 150, description: 'Cină de afaceri cu clientul' }
      ],
      total: 920
    },
    status: 'SUBMITTED'
  }
];

// Sample freelancers for demo
export const freelancers = [
  {
    name: 'Andrei Munteanu',
    email: 'andrei.freelancer@gmail.com',
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS'],
    categories: ['Web Development', 'Full Stack'],
    experience: 7,
    hourlyRate: 50,
    currency: 'EUR',
    bio: 'Full-stack developer cu 7 ani experiență în aplicații web enterprise. Specializat în React și Node.js.',
    availability: 'AVAILABLE',
    rating: 4.8,
    reviewCount: 23
  },
  {
    name: 'Elena Călin',
    email: 'elena.design@outlook.com',
    skills: ['UI/UX Design', 'Figma', 'Adobe XD', 'Design System', 'User Research'],
    categories: ['Design', 'UX Research'],
    experience: 5,
    hourlyRate: 40,
    currency: 'EUR',
    bio: 'UX/UI Designer cu experiență în produse digitale pentru fintech și e-commerce.',
    availability: 'PARTIALLY_AVAILABLE',
    rating: 4.9,
    reviewCount: 18
  },
  {
    name: 'Mihai Stoica',
    email: 'mihai.consulting@yahoo.com',
    skills: ['Financial Modeling', 'Business Analysis', 'Excel VBA', 'Power BI', 'SAP'],
    categories: ['Finance', 'Business Intelligence'],
    experience: 10,
    hourlyRate: 60,
    currency: 'EUR',
    bio: 'Senior Financial Consultant cu experiență în Big4. Specializat în transformare financiară și implementări ERP.',
    availability: 'AVAILABLE',
    rating: 5.0,
    reviewCount: 31
  },
  {
    name: 'Ana Popescu',
    email: 'ana.marketing@gmail.com',
    skills: ['Digital Marketing', 'SEO', 'Google Ads', 'Facebook Ads', 'Content Strategy'],
    categories: ['Marketing', 'Growth'],
    experience: 6,
    hourlyRate: 35,
    currency: 'EUR',
    bio: 'Digital Marketing Specialist cu focus pe growth și performance marketing. Rezultate dovedite pentru e-commerce.',
    availability: 'ON_PROJECT',
    rating: 4.7,
    reviewCount: 15
  },
  {
    name: 'Cristian Radu',
    email: 'cristian.devops@proton.me',
    skills: ['DevOps', 'Kubernetes', 'Docker', 'CI/CD', 'Terraform', 'Azure'],
    categories: ['DevOps', 'Cloud Infrastructure'],
    experience: 8,
    hourlyRate: 55,
    currency: 'EUR',
    bio: 'DevOps Engineer specializat în cloud infrastructure și automatizare. Certified AWS Solutions Architect.',
    availability: 'AVAILABLE',
    rating: 4.9,
    reviewCount: 27
  }
];
