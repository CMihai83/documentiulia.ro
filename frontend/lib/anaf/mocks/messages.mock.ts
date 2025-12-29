/**
 * SPV Messages Mock Data
 * Notifications and messages from ANAF SPV
 */

import type { SpvMessage } from '../types';

const now = new Date();
const daysAgo = (days: number) => {
  const result = new Date(now);
  result.setDate(result.getDate() - days);
  return result;
};

export const mockSpvMessages: SpvMessage[] = [
  {
    id: 'msg_001',
    type: 'SUCCESS',
    title: 'SAF-T D406 Acceptat',
    message: 'Raportul SAF-T D406 pentru perioada Ianuarie 2025 a fost acceptat de ANAF.',
    createdAt: daysAgo(0),
    read: false,
    relatedSubmissionId: 'sub_001',
  },
  {
    id: 'msg_002',
    type: 'INFO',
    title: 'e-Factura în procesare',
    message: 'Factura FAC-2025-002 este în procesare la ANAF. Verificați statusul în 24-48 ore.',
    createdAt: daysAgo(1),
    read: false,
    relatedSubmissionId: 'sub_002',
  },
  {
    id: 'msg_003',
    type: 'WARNING',
    title: 'Termen apropiat: SAF-T D406',
    message: 'Aveți 5 zile până la termenul limită pentru depunerea SAF-T D406 Februarie 2025 (25 martie 2025).',
    createdAt: daysAgo(2),
    read: true,
  },
  {
    id: 'msg_004',
    type: 'ERROR',
    title: 'e-Factura respinsă',
    message: 'Factura FAC-2025-004 a fost respinsă: Date furnizor incomplete - CUI lipsă. Vă rugăm corectați și retrimiteți.',
    createdAt: daysAgo(3),
    read: true,
    relatedSubmissionId: 'sub_004',
  },
  {
    id: 'msg_005',
    type: 'INFO',
    title: 'Conexiune SPV actualizată',
    message: 'Token-ul de autentificare SPV a fost actualizat cu succes. Valabil până pe 31 decembrie 2025.',
    createdAt: daysAgo(5),
    read: true,
  },
  {
    id: 'msg_006',
    type: 'SUCCESS',
    title: 'e-Transport aprobat',
    message: 'Declarația e-Transport pentru transportul București-Cluj a fost aprobată. UIT: UIT-2025-001-ABC123',
    createdAt: daysAgo(6),
    read: true,
    relatedSubmissionId: 'sub_003',
  },
  {
    id: 'msg_007',
    type: 'INFO',
    title: 'Modificare legislație: Legea 141/2025',
    message: 'ANAF informează: Cotele TVA vor fi modificate de la 1 august 2025. Standard: 21% (din 19%), Redusă: 11% (din 9%), Specială: 5% (neschimbată). Vă rugăm să actualizați sistemul.',
    createdAt: daysAgo(10),
    read: true,
  },
  {
    id: 'msg_008',
    type: 'WARNING',
    title: 'Mențiune perioadă pilot SAF-T',
    message: 'Perioada pilot pentru SAF-T D406 începe la 1 septembrie 2025. Perioadă de grație: 6 luni (până 28 februarie 2027).',
    createdAt: daysAgo(15),
    read: true,
  },
  {
    id: 'msg_009',
    type: 'SUCCESS',
    title: 'Factură primită de la furnizor',
    message: 'Aveți o nouă factură primită prin e-Factura: FAC-SUP-2025-089 de la SC Furnizor Demo SRL (CUI: 11223344), valoare: 3,570 RON.',
    createdAt: daysAgo(20),
    read: true,
  },
  {
    id: 'msg_010',
    type: 'INFO',
    title: 'Actualizare SPV: noi funcționalități',
    message: 'ANAF a lansat noi funcționalități în SPV: (1) Descărcare automată facturi primite, (2) Rapoarte consolidate SAF-T, (3) Validare XML înainte de transmitere.',
    createdAt: daysAgo(25),
    read: true,
  },
  {
    id: 'msg_011',
    type: 'WARNING',
    title: 'Termen depășit: SAF-T D406 Decembrie 2024',
    message: 'Atenție! Termenul limită pentru SAF-T D406 Decembrie 2024 a fost depășit cu 5 zile (deadline: 25 ianuarie 2025). Vă rugăm să depuneți urgent.',
    createdAt: daysAgo(30),
    read: true,
  },
  {
    id: 'msg_012',
    type: 'SUCCESS',
    title: 'Declarație TVA acceptată',
    message: 'Declarația TVA D300 pentru Ianuarie 2025 a fost acceptată de ANAF. Referință: TVA-2025-01-001.',
    createdAt: daysAgo(35),
    read: true,
  },
  {
    id: 'msg_013',
    type: 'INFO',
    title: 'e-Factura B2B devine obligatorie',
    message: 'Notificare ANAF: e-Factura B2B va deveni obligatorie începând cu 1 iulie 2026. Pregătiți sistemul pentru integrare completă.',
    createdAt: daysAgo(40),
    read: true,
  },
  {
    id: 'msg_014',
    type: 'ERROR',
    title: 'Eroare de validare SAF-T',
    message: 'SAF-T D406 pentru Noiembrie 2024 a fost respins: Validare XSD eșuată - tag <CompanyID> lipsă în header. Vă rugăm să regenerați și să retrimiteți.',
    createdAt: daysAgo(50),
    read: true,
  },
  {
    id: 'msg_015',
    type: 'SUCCESS',
    title: 'Bun venit la SPV DocumentIulia',
    message: 'Conectarea la ANAF Spațiul Privat Virtual a fost realizată cu succes! Toate funcționalitățile sunt acum disponibile: e-Factura, SAF-T D406, e-Transport.',
    createdAt: daysAgo(60),
    read: true,
  },
];

export const mockUnreadMessages = mockSpvMessages.filter((msg) => !msg.read);

export const mockReadMessages = mockSpvMessages.filter((msg) => msg.read);

export const mockMessagesByType = {
  INFO: mockSpvMessages.filter((msg) => msg.type === 'INFO'),
  SUCCESS: mockSpvMessages.filter((msg) => msg.type === 'SUCCESS'),
  WARNING: mockSpvMessages.filter((msg) => msg.type === 'WARNING'),
  ERROR: mockSpvMessages.filter((msg) => msg.type === 'ERROR'),
};

export const mockRecentMessages = mockSpvMessages.slice(0, 5);

// Helper function to simulate marking message as read
export const markMessageAsRead = (messageId: string) => {
  const message = mockSpvMessages.find((msg) => msg.id === messageId);
  if (message) {
    message.read = true;
  }
  return message;
};

// Helper function to get messages by submission ID
export const getMessagesBySubmissionId = (submissionId: string) => {
  return mockSpvMessages.filter((msg) => msg.relatedSubmissionId === submissionId);
};

// Helper function to count unread messages
export const getUnreadCount = () => {
  return mockSpvMessages.filter((msg) => !msg.read).length;
};
