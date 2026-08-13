-- REQ-048: invoice numbers had no uniqueness guarantee, so a retry, a double
-- click or a race in the sequence generator could produce two invoices sharing
-- a number. Romanian law requires issued invoices to carry a unique sequential
-- number, and duplicates corrupt D406/e-Factura reporting.
--
-- Partial indexes, because the two directions have different natural keys:
--   ISSUED   — the number is ours, unique per company.
--   RECEIVED — the number belongs to the supplier, so two suppliers may
--              legitimately both issue "001"; unique per (supplier, number).

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_issued_number_unique"
  ON "Invoice" ("userId", "invoiceNumber")
  WHERE "type" = 'ISSUED';

CREATE UNIQUE INDEX IF NOT EXISTS "Invoice_received_number_unique"
  ON "Invoice" ("userId", "partnerCui", "invoiceNumber")
  WHERE "type" = 'RECEIVED' AND "partnerCui" IS NOT NULL;
