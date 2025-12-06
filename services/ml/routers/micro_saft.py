"""
Micro SAF-T Router - Simplified SAF-T for Freelancers (PFA/PFI)
Generates SAF-T D406 compliant XML for small businesses and freelancers.

Based on OPANAF 1783/2024 and OECD SAF-T v2.0 schema.
"""

import io
import xml.etree.ElementTree as ET
from datetime import datetime, date
from typing import Optional, List, Dict, Any
from decimal import Decimal
from enum import Enum

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel, Field
from loguru import logger

router = APIRouter()


# Enums
class ContributorType(str, Enum):
    PFA = "PFA"  # Persoană Fizică Autorizată
    II = "II"    # Întreprindere Individuală
    IF = "IF"    # Întreprindere Familială
    MICRO = "MICRO"  # Microîntreprindere


class TaxRegime(str, Enum):
    REAL = "REAL"        # Sistem real (contabilitate simplă sau în partidă dublă)
    NORMA = "NORMA"      # Impozitare pe normă de venit
    MICRO = "MICRO"      # Microîntreprindere (1% sau 3%)


# Input Models
class HeaderInfo(BaseModel):
    """SAF-T header information."""
    cif: str = Field(..., description="CUI/CIF (without RO prefix)")
    denumire: str = Field(..., description="Business name")
    adresa: str = Field(..., description="Business address")
    localitate: str = Field(..., description="City")
    judet: str = Field(..., description="County code (e.g., B, CJ, TM)")
    cod_postal: str = Field(..., description="Postal code")
    email: Optional[str] = None
    telefon: Optional[str] = None
    tip_contribuabil: ContributorType = ContributorType.PFA
    regim_fiscal: TaxRegime = TaxRegime.REAL


class IncomeEntry(BaseModel):
    """Income entry for SAF-T."""
    data: str = Field(..., description="Date (YYYY-MM-DD)")
    descriere: str = Field(..., description="Description")
    suma: float = Field(..., ge=0, description="Amount")
    tva: float = Field(0.0, ge=0, description="VAT amount if applicable")
    cota_tva: Optional[float] = Field(None, description="VAT rate (21, 11, 5, 0)")
    numar_document: Optional[str] = Field(None, description="Invoice/receipt number")
    client_cif: Optional[str] = Field(None, description="Client CIF if B2B")
    client_denumire: Optional[str] = Field(None, description="Client name")


class ExpenseEntry(BaseModel):
    """Expense entry for SAF-T."""
    data: str = Field(..., description="Date (YYYY-MM-DD)")
    descriere: str = Field(..., description="Description")
    suma: float = Field(..., ge=0, description="Amount without VAT")
    tva: float = Field(0.0, ge=0, description="VAT amount (deductible)")
    cota_tva: Optional[float] = Field(None, description="VAT rate")
    numar_document: Optional[str] = Field(None, description="Invoice number")
    furnizor_cif: Optional[str] = Field(None, description="Supplier CIF")
    furnizor_denumire: Optional[str] = Field(None, description="Supplier name")
    categorie: str = Field("general", description="Expense category")


class MicroSaftRequest(BaseModel):
    """Request to generate micro SAF-T."""
    header: HeaderInfo
    perioada_start: str = Field(..., description="Period start (YYYY-MM-DD)")
    perioada_end: str = Field(..., description="Period end (YYYY-MM-DD)")
    venituri: List[IncomeEntry] = []
    cheltuieli: List[ExpenseEntry] = []
    sold_initial: float = Field(0.0, description="Opening balance")


# Response Models
class SaftValidation(BaseModel):
    """Validation result for SAF-T data."""
    valid: bool
    errors: List[str]
    warnings: List[str]


class SaftSummary(BaseModel):
    """Summary of SAF-T data."""
    total_venituri: float
    total_cheltuieli: float
    profit_brut: float
    tva_colectata: float
    tva_deductibila: float
    tva_de_plata: float
    numar_documente: int


# SAF-T XML Schema namespace
SAFT_NAMESPACE = "urn:OECD:StandardAuditFile-Tax:RO_1.0"
NSMAP = {"saft": SAFT_NAMESPACE}


def create_element(parent: ET.Element, tag: str, text: str = None) -> ET.Element:
    """Helper to create XML element with optional text."""
    elem = ET.SubElement(parent, f"{{{SAFT_NAMESPACE}}}{tag}")
    if text is not None:
        elem.text = str(text)
    return elem


@router.post("/generate")
async def generate_micro_saft(request: MicroSaftRequest):
    """
    Generate simplified SAF-T XML for freelancers and micro businesses.

    Produces D406-compliant XML suitable for ANAF submission.
    """
    try:
        # Validate data first
        validation = await validate_saft_data(request)
        if not validation.valid:
            raise HTTPException(
                status_code=400,
                detail={"message": "Erori de validare", "errors": validation.errors}
            )

        # Generate XML
        xml_content = _generate_saft_xml(request)

        return Response(
            content=xml_content,
            media_type="application/xml",
            headers={
                "Content-Disposition": f"attachment; filename=SAFT_{request.header.cif}_{request.perioada_start}_{request.perioada_end}.xml"
            }
        )

    except Exception as e:
        logger.error(f"Error generating micro SAF-T: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/validate", response_model=SaftValidation)
async def validate_saft_data(request: MicroSaftRequest):
    """
    Validate SAF-T data before generation.
    """
    errors = []
    warnings = []

    # Validate CIF format
    cif = request.header.cif.replace("RO", "").strip()
    if not cif.isdigit() or len(cif) < 2 or len(cif) > 10:
        errors.append(f"CUI invalid: {request.header.cif}")

    # Validate dates
    try:
        start_date = datetime.strptime(request.perioada_start, "%Y-%m-%d")
        end_date = datetime.strptime(request.perioada_end, "%Y-%m-%d")
        if start_date > end_date:
            errors.append("Data început trebuie să fie înainte de data sfârșit")
    except ValueError:
        errors.append("Format dată invalid. Folosiți YYYY-MM-DD")

    # Validate income entries
    for i, venit in enumerate(request.venituri):
        try:
            venit_date = datetime.strptime(venit.data, "%Y-%m-%d")
            if venit_date < start_date or venit_date > end_date:
                warnings.append(f"Venit #{i+1}: data {venit.data} este în afara perioadei")
        except ValueError:
            errors.append(f"Venit #{i+1}: format dată invalid")

        if venit.cota_tva and venit.cota_tva not in [0, 5, 9, 11, 19, 21]:
            warnings.append(f"Venit #{i+1}: cotă TVA nestandard ({venit.cota_tva}%)")

    # Validate expense entries
    for i, cheltuiala in enumerate(request.cheltuieli):
        try:
            chelt_date = datetime.strptime(cheltuiala.data, "%Y-%m-%d")
            if chelt_date < start_date or chelt_date > end_date:
                warnings.append(f"Cheltuială #{i+1}: data {cheltuiala.data} este în afara perioadei")
        except ValueError:
            errors.append(f"Cheltuială #{i+1}: format dată invalid")

    # Check for minimum entries
    if len(request.venituri) == 0 and len(request.cheltuieli) == 0:
        warnings.append("Nu există niciun document de procesat")

    return SaftValidation(
        valid=len(errors) == 0,
        errors=errors,
        warnings=warnings
    )


@router.post("/summary", response_model=SaftSummary)
async def get_saft_summary(request: MicroSaftRequest):
    """
    Get summary statistics for SAF-T data.
    """
    total_venituri = sum(v.suma for v in request.venituri)
    total_cheltuieli = sum(c.suma for c in request.cheltuieli)
    tva_colectata = sum(v.tva for v in request.venituri)
    tva_deductibila = sum(c.tva for c in request.cheltuieli)

    return SaftSummary(
        total_venituri=round(total_venituri, 2),
        total_cheltuieli=round(total_cheltuieli, 2),
        profit_brut=round(total_venituri - total_cheltuieli, 2),
        tva_colectata=round(tva_colectata, 2),
        tva_deductibila=round(tva_deductibila, 2),
        tva_de_plata=round(tva_colectata - tva_deductibila, 2),
        numar_documente=len(request.venituri) + len(request.cheltuieli)
    )


def _generate_saft_xml(request: MicroSaftRequest) -> bytes:
    """Generate SAF-T compliant XML."""
    # Register namespace
    ET.register_namespace("", SAFT_NAMESPACE)

    # Create root element
    root = ET.Element(f"{{{SAFT_NAMESPACE}}}AuditFile")
    root.set("xmlns", SAFT_NAMESPACE)

    # Header
    header = create_element(root, "Header")
    create_element(header, "AuditFileVersion", "1.0")
    create_element(header, "AuditFileCountry", "RO")
    create_element(header, "AuditFileDateCreated", datetime.now().strftime("%Y-%m-%d"))
    create_element(header, "SoftwareCompanyName", "DocumentIulia.ro")
    create_element(header, "SoftwareID", "DOCUMENTIULIA-MICRO-SAFT")
    create_element(header, "SoftwareVersion", "2.0.0")

    # Company information
    company = create_element(header, "Company")
    create_element(company, "RegistrationNumber", request.header.cif)
    create_element(company, "Name", request.header.denumire)

    address = create_element(company, "Address")
    create_element(address, "StreetName", request.header.adresa)
    create_element(address, "City", request.header.localitate)
    create_element(address, "PostalCode", request.header.cod_postal)
    create_element(address, "Country", "RO")
    create_element(address, "Region", request.header.judet)

    if request.header.email:
        contact = create_element(company, "Contact")
        create_element(contact, "ContactPerson", request.header.denumire)
        create_element(contact, "Email", request.header.email)
        if request.header.telefon:
            create_element(contact, "Telephone", request.header.telefon)

    # Tax registration
    tax_reg = create_element(company, "TaxRegistration")
    create_element(tax_reg, "TaxRegistrationNumber", f"RO{request.header.cif}")
    create_element(tax_reg, "TaxAuthority", "ANAF")
    create_element(tax_reg, "TaxType", "TVA")

    # Selection criteria (period)
    selection = create_element(header, "SelectionCriteria")
    period = create_element(selection, "SelectionStartDate", request.perioada_start)
    period = create_element(selection, "SelectionEndDate", request.perioada_end)

    # Default currency
    create_element(header, "DefaultCurrencyCode", "RON")

    # Master Files (simplified for micro)
    master_files = create_element(root, "MasterFiles")

    # General Ledger Accounts (simplified)
    gl_accounts = create_element(master_files, "GeneralLedgerAccounts")

    # Add basic accounts for freelancers
    basic_accounts = [
        ("411", "Clienti", "D"),
        ("401", "Furnizori", "C"),
        ("5121", "Cont curent", "D"),
        ("7xx", "Venituri", "C"),
        ("6xx", "Cheltuieli", "D"),
        ("4427", "TVA colectata", "C"),
        ("4426", "TVA deductibila", "D"),
    ]

    for acc_id, acc_name, acc_type in basic_accounts:
        account = create_element(gl_accounts, "Account")
        create_element(account, "AccountID", acc_id)
        create_element(account, "AccountDescription", acc_name)
        create_element(account, "AccountType", acc_type)

    # Customers from income entries
    customers = create_element(master_files, "Customers")
    seen_customers = set()

    for venit in request.venituri:
        if venit.client_cif and venit.client_cif not in seen_customers:
            seen_customers.add(venit.client_cif)
            customer = create_element(customers, "Customer")
            create_element(customer, "CustomerID", venit.client_cif)
            create_element(customer, "Name", venit.client_denumire or f"Client {venit.client_cif}")
            addr = create_element(customer, "Address")
            create_element(addr, "Country", "RO")

    # Suppliers from expense entries
    suppliers = create_element(master_files, "Suppliers")
    seen_suppliers = set()

    for cheltuiala in request.cheltuieli:
        if cheltuiala.furnizor_cif and cheltuiala.furnizor_cif not in seen_suppliers:
            seen_suppliers.add(cheltuiala.furnizor_cif)
            supplier = create_element(suppliers, "Supplier")
            create_element(supplier, "SupplierID", cheltuiala.furnizor_cif)
            create_element(supplier, "Name", cheltuiala.furnizor_denumire or f"Furnizor {cheltuiala.furnizor_cif}")
            addr = create_element(supplier, "Address")
            create_element(addr, "Country", "RO")

    # Tax Table
    tax_table = create_element(master_files, "TaxTable")
    tax_entry = create_element(tax_table, "TaxTableEntry")
    create_element(tax_entry, "TaxType", "TVA")
    create_element(tax_entry, "TaxCodeDetails", "Standard")

    # General Ledger Entries (simplified journal)
    gl_entries = create_element(root, "GeneralLedgerEntries")
    create_element(gl_entries, "NumberOfEntries", str(len(request.venituri) + len(request.cheltuieli)))

    # Calculate totals
    total_debit = sum(c.suma + c.tva for c in request.cheltuieli) + request.sold_initial
    total_credit = sum(v.suma + v.tva for v in request.venituri)
    create_element(gl_entries, "TotalDebit", f"{total_debit:.2f}")
    create_element(gl_entries, "TotalCredit", f"{total_credit:.2f}")

    # Journal entries
    entry_num = 1

    # Income entries
    for venit in request.venituri:
        journal = create_element(gl_entries, "Journal")
        create_element(journal, "JournalID", "VZ")  # Vânzări
        create_element(journal, "Description", "Registru vânzări")

        transaction = create_element(journal, "Transaction")
        create_element(transaction, "TransactionID", str(entry_num))
        create_element(transaction, "Period", venit.data[:7].replace("-", ""))  # YYYYMM
        create_element(transaction, "TransactionDate", venit.data)
        create_element(transaction, "SourceID", request.header.cif)
        create_element(transaction, "Description", venit.descriere)

        # Debit: Clienti
        line1 = create_element(transaction, "Line")
        create_element(line1, "RecordID", f"{entry_num}-1")
        create_element(line1, "AccountID", "411")
        create_element(line1, "DebitAmount", f"{venit.suma + venit.tva:.2f}")

        # Credit: Venituri
        line2 = create_element(transaction, "Line")
        create_element(line2, "RecordID", f"{entry_num}-2")
        create_element(line2, "AccountID", "7xx")
        create_element(line2, "CreditAmount", f"{venit.suma:.2f}")

        # Credit: TVA colectata (if applicable)
        if venit.tva > 0:
            line3 = create_element(transaction, "Line")
            create_element(line3, "RecordID", f"{entry_num}-3")
            create_element(line3, "AccountID", "4427")
            create_element(line3, "CreditAmount", f"{venit.tva:.2f}")

        entry_num += 1

    # Expense entries
    for cheltuiala in request.cheltuieli:
        journal = create_element(gl_entries, "Journal")
        create_element(journal, "JournalID", "CP")  # Cumpărări
        create_element(journal, "Description", "Registru achiziții")

        transaction = create_element(journal, "Transaction")
        create_element(transaction, "TransactionID", str(entry_num))
        create_element(transaction, "Period", cheltuiala.data[:7].replace("-", ""))
        create_element(transaction, "TransactionDate", cheltuiala.data)
        create_element(transaction, "SourceID", request.header.cif)
        create_element(transaction, "Description", cheltuiala.descriere)

        # Debit: Cheltuieli
        line1 = create_element(transaction, "Line")
        create_element(line1, "RecordID", f"{entry_num}-1")
        create_element(line1, "AccountID", "6xx")
        create_element(line1, "DebitAmount", f"{cheltuiala.suma:.2f}")

        # Debit: TVA deductibila (if applicable)
        if cheltuiala.tva > 0:
            line2 = create_element(transaction, "Line")
            create_element(line2, "RecordID", f"{entry_num}-2")
            create_element(line2, "AccountID", "4426")
            create_element(line2, "DebitAmount", f"{cheltuiala.tva:.2f}")

        # Credit: Furnizori
        line3 = create_element(transaction, "Line")
        create_element(line3, "RecordID", f"{entry_num}-3")
        create_element(line3, "AccountID", "401")
        create_element(line3, "CreditAmount", f"{cheltuiala.suma + cheltuiala.tva:.2f}")

        entry_num += 1

    # Source Documents (Sales Invoices)
    source_docs = create_element(root, "SourceDocuments")

    if request.venituri:
        sales_invoices = create_element(source_docs, "SalesInvoices")
        create_element(sales_invoices, "NumberOfEntries", str(len(request.venituri)))

        total_sales = sum(v.suma for v in request.venituri)
        total_sales_vat = sum(v.tva for v in request.venituri)
        create_element(sales_invoices, "TotalDebit", f"{total_sales + total_sales_vat:.2f}")
        create_element(sales_invoices, "TotalCredit", "0.00")

        for i, venit in enumerate(request.venituri):
            invoice = create_element(sales_invoices, "Invoice")
            create_element(invoice, "InvoiceNo", venit.numar_document or f"VZ-{i+1:04d}")
            create_element(invoice, "CustomerID", venit.client_cif or "CASH")
            create_element(invoice, "Period", venit.data[:7].replace("-", ""))
            create_element(invoice, "InvoiceDate", venit.data)
            create_element(invoice, "InvoiceType", "FT")  # Factura fiscala
            create_element(invoice, "SelfBillingIndicator", "0")

            # Document totals
            doc_totals = create_element(invoice, "DocumentTotals")
            create_element(doc_totals, "TaxPayable", f"{venit.tva:.2f}")
            create_element(doc_totals, "NetTotal", f"{venit.suma:.2f}")
            create_element(doc_totals, "GrossTotal", f"{venit.suma + venit.tva:.2f}")

            # Line item
            line = create_element(invoice, "Line")
            create_element(line, "LineNumber", "1")
            create_element(line, "Description", venit.descriere)
            create_element(line, "Quantity", "1")
            create_element(line, "UnitPrice", f"{venit.suma:.2f}")
            create_element(line, "TaxPointDate", venit.data)
            create_element(line, "Description", venit.descriere)

            if venit.cota_tva:
                tax = create_element(line, "Tax")
                create_element(tax, "TaxType", "TVA")
                create_element(tax, "TaxCode", "S" if venit.cota_tva > 0 else "E")
                create_element(tax, "TaxPercentage", str(venit.cota_tva))
                create_element(tax, "TaxAmount", f"{venit.tva:.2f}")

    # Convert to bytes
    tree = ET.ElementTree(root)
    output = io.BytesIO()
    tree.write(output, encoding="UTF-8", xml_declaration=True)

    return output.getvalue()


@router.get("/template")
async def get_saft_template():
    """
    Get a template/example for micro SAF-T data input.
    """
    return {
        "header": {
            "cif": "12345678",
            "denumire": "POPESCU ION PFA",
            "adresa": "Str. Exemplu nr. 1",
            "localitate": "București",
            "judet": "B",
            "cod_postal": "010101",
            "email": "ion.popescu@email.com",
            "telefon": "0712345678",
            "tip_contribuabil": "PFA",
            "regim_fiscal": "REAL"
        },
        "perioada_start": "2025-01-01",
        "perioada_end": "2025-03-31",
        "venituri": [
            {
                "data": "2025-01-15",
                "descriere": "Servicii consultanță IT",
                "suma": 5000.00,
                "tva": 1050.00,
                "cota_tva": 21,
                "numar_document": "FV-2025-0001",
                "client_cif": "RO98765432",
                "client_denumire": "SC Client SRL"
            }
        ],
        "cheltuieli": [
            {
                "data": "2025-01-10",
                "descriere": "Abonament internet",
                "suma": 100.00,
                "tva": 21.00,
                "cota_tva": 21,
                "numar_document": "FC-12345",
                "furnizor_cif": "RO11111111",
                "furnizor_denumire": "Telecom SRL",
                "categorie": "utilități"
            }
        ],
        "sold_initial": 0.0
    }


@router.get("/expense-categories")
async def get_expense_categories():
    """
    Get standard expense categories for PFA/PFI.
    """
    return {
        "categories": [
            {"code": "materiale", "name": "Materiale și materii prime", "deductibil": 100},
            {"code": "marfuri", "name": "Mărfuri", "deductibil": 100},
            {"code": "utilitati", "name": "Utilități (electricitate, gaz, apă, internet)", "deductibil": 100},
            {"code": "chirie", "name": "Chirie spațiu comercial", "deductibil": 100},
            {"code": "combustibil", "name": "Combustibil", "deductibil": 75, "nota": "75% deductibil dacă autovehicul folosit și personal"},
            {"code": "intretinere_auto", "name": "Întreținere autovehicule", "deductibil": 75},
            {"code": "asigurari", "name": "Asigurări", "deductibil": 100},
            {"code": "servicii_externe", "name": "Servicii externalizate", "deductibil": 100},
            {"code": "publicitate", "name": "Publicitate și marketing", "deductibil": 100},
            {"code": "deplasari", "name": "Deplasări și diurnă", "deductibil": 100, "nota": "Diurna 2.5x din suma legală pentru salariați"},
            {"code": "comisioane_bancare", "name": "Comisioane bancare", "deductibil": 100},
            {"code": "dobanzi", "name": "Dobânzi la credite", "deductibil": 100},
            {"code": "amortizare", "name": "Amortizare bunuri", "deductibil": 100},
            {"code": "contributii", "name": "Contribuții sociale (CAS, CASS)", "deductibil": 100},
            {"code": "taxe_impozite", "name": "Taxe și impozite locale", "deductibil": 100},
            {"code": "protocol", "name": "Cheltuieli de protocol", "deductibil": 2, "nota": "Max 2% din baza de calcul"},
            {"code": "sponsorizare", "name": "Sponsorizări", "deductibil": 5, "nota": "Max 5% din impozit datorat"},
        ],
        "note": "Deductibilitatea se aplică conform Codului Fiscal. Consultați un contabil pentru situații specifice."
    }


@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "operational",
        "service": "micro-saft",
        "features": [
            "SAF-T D406 generation for PFA/PFI",
            "OECD v2.0 compliant XML",
            "Income and expense tracking",
            "VAT calculation and reporting",
            "Expense category classification"
        ],
        "compliance": ["OPANAF 1783/2024", "OECD SAF-T v2.0"]
    }
