/**
 * Romanian Chart of Accounts (Plan de Conturi General, OMFP 1802/2014).
 *
 * Single source of truth shared by the accounting module (journal synthesis,
 * trial balance) and the ANAF SAF-T D406 generator — both previously carried
 * divergent hardcoded lists, so D406 could not tie out with the trial balance.
 */

export interface LedgerAccount {
  code: string;
  name: string;
  type: 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';
  balance: number;
  debit: number;
  credit: number;
  parentCode?: string;
  children?: LedgerAccount[];
}

/** Map OMFP account type to the SAF-T RO AccountType letter used in D406. */
export function saftAccountType(type: LedgerAccount['type']): string {
  switch (type) {
    case 'ASSET': return 'A';
    case 'EXPENSE': return 'E';
    case 'REVENUE': return 'R';
    default: return 'L'; // LIABILITY + EQUITY
  }
}

export function getAccountByCode(code: string): LedgerAccount | undefined {
  return ROMANIAN_CHART_OF_ACCOUNTS.find((a) => a.code === code);
}

// Romanian Chart of Accounts (Plan de Conturi)
export const ROMANIAN_CHART_OF_ACCOUNTS: LedgerAccount[] = [
  // Class 1 - Capital accounts
  { code: '101', name: 'Capital social', type: 'EQUITY', balance: 0, debit: 0, credit: 0 },
  { code: '117', name: 'Rezultatul reportat', type: 'EQUITY', balance: 0, debit: 0, credit: 0 },
  { code: '121', name: 'Profit sau pierdere', type: 'EQUITY', balance: 0, debit: 0, credit: 0 },

  // Class 2 - Fixed assets
  { code: '211', name: 'Terenuri', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '212', name: 'Constructii', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '213', name: 'Instalatii tehnice', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '214', name: 'Mobilier si echipamente', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '281', name: 'Amortizari privind imobilizarile corporale', type: 'ASSET', balance: 0, debit: 0, credit: 0 },

  // Class 3 - Inventory
  { code: '301', name: 'Materii prime', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '302', name: 'Materiale consumabile', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '345', name: 'Produse finite', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '371', name: 'Marfuri', type: 'ASSET', balance: 0, debit: 0, credit: 0 },

  // Class 4 - Third parties
  { code: '401', name: 'Furnizori', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },
  { code: '404', name: 'Furnizori de imobilizari', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },
  { code: '411', name: 'Clienti', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '421', name: 'Personal - salarii datorate', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },
  { code: '431', name: 'Asigurari sociale', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },
  { code: '4423', name: 'TVA de plata', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },
  { code: '4426', name: 'TVA deductibila', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '4427', name: 'TVA colectata', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },
  { code: '4428', name: 'TVA neexigibila', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },
  { code: '441', name: 'Impozit pe profit', type: 'LIABILITY', balance: 0, debit: 0, credit: 0 },

  // Class 5 - Treasury
  { code: '5121', name: 'Conturi la banci in lei', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '5124', name: 'Conturi la banci in valuta', type: 'ASSET', balance: 0, debit: 0, credit: 0 },
  { code: '531', name: 'Casa', type: 'ASSET', balance: 0, debit: 0, credit: 0 },

  // Class 6 - Expenses
  { code: '601', name: 'Cheltuieli cu materii prime', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '602', name: 'Cheltuieli cu materiale consumabile', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '607', name: 'Cheltuieli privind marfurile', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '611', name: 'Cheltuieli cu intretinerea si reparatiile', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '612', name: 'Cheltuieli cu redeventele', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '613', name: 'Cheltuieli cu primele de asigurare', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '621', name: 'Cheltuieli cu colaboratorii', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '622', name: 'Cheltuieli privind comisioanele', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '623', name: 'Cheltuieli de protocol', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '624', name: 'Cheltuieli cu transportul', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '625', name: 'Cheltuieli cu deplasari', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '626', name: 'Cheltuieli postale si telecomunicatii', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '627', name: 'Cheltuieli cu servicii bancare', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '628', name: 'Alte cheltuieli cu servicii', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '641', name: 'Cheltuieli cu salariile', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '645', name: 'Cheltuieli cu asigurarile sociale', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '681', name: 'Cheltuieli cu amortizarile', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },
  { code: '691', name: 'Cheltuieli cu impozitul pe profit', type: 'EXPENSE', balance: 0, debit: 0, credit: 0 },

  // Class 7 - Revenue
  { code: '701', name: 'Venituri din vanzarea produselor finite', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
  { code: '704', name: 'Venituri din lucrari executate si servicii', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
  { code: '707', name: 'Venituri din vanzarea marfurilor', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
  { code: '711', name: 'Venituri aferente costurilor stocurilor', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
  { code: '722', name: 'Venituri din productia de imobilizari', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
  { code: '765', name: 'Venituri din diferente de curs valutar', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
  { code: '766', name: 'Venituri din dobanzi', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
  { code: '768', name: 'Alte venituri financiare', type: 'REVENUE', balance: 0, debit: 0, credit: 0 },
];
