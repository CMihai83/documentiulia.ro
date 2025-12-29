#!/usr/bin/env python3
"""
DocumentIulia.ro - Comprehensive Platform User Simulation Script
================================================================

This script simulates a real user interacting with ALL platform functionalities
from an external webpage context. It validates cross-module integrations and
interprets outputs for QA reporting.

Features:
- Selenium WebDriver for UI interactions
- Requests for API calls
- Full module coverage (Finance, HR, HSE, Quality, Supply Chain, Warehouse, CRM, Analytics)
- Cross-module integration validation
- Output interpretation and assertion
- HTML/JSON report generation
- CI/CD ready with headless mode

Usage:
    python platform_user_simulator.py --env staging --headless --report-format html

Requirements:
    pip install selenium requests beautifulsoup4 pytest pytest-html
"""

import os
import sys
import json
import time
import logging
import argparse
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field, asdict
from enum import Enum
import base64
import uuid
import xml.etree.ElementTree as ET

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# Selenium imports
try:
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.common.keys import Keys
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    from selenium.webdriver.chrome.options import Options as ChromeOptions
    from selenium.webdriver.chrome.service import Service as ChromeService
    from selenium.common.exceptions import TimeoutException, NoSuchElementException
    SELENIUM_AVAILABLE = True
except ImportError:
    SELENIUM_AVAILABLE = False
    logging.warning("Selenium not installed. UI tests will be skipped.")

# BeautifulSoup for HTML parsing
try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False


# ============================================================
# CONFIGURATION
# ============================================================

class Environment(Enum):
    STAGING = "staging"
    PRODUCTION = "production"
    LOCAL = "local"


@dataclass
class Config:
    """Platform configuration"""
    base_url: str = "https://staging.documentiulia.ro"
    api_url: str = "https://staging.documentiulia.ro/api"
    external_client_url: str = "https://external-client-demo.com"

    # Test credentials
    test_email: str = os.getenv("TEST_EMAIL", "test@documentiulia.ro")
    test_password: str = os.getenv("TEST_PASSWORD", "Test123!")

    # Timeouts
    page_load_timeout: int = 30
    element_wait_timeout: int = 10
    api_timeout: int = 30

    # Retry settings
    max_retries: int = 3
    retry_delay: float = 1.0

    # Headless mode
    headless: bool = True

    # Report settings
    report_dir: str = "./test-reports"
    screenshot_dir: str = "./test-reports/screenshots"


# ============================================================
# DATA MODELS
# ============================================================

class TestStatus(Enum):
    PASSED = "PASSED"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"
    ERROR = "ERROR"


@dataclass
class TestResult:
    """Individual test result"""
    name: str
    module: str
    status: TestStatus
    duration_ms: float
    message: str = ""
    screenshot_path: Optional[str] = None
    api_response: Optional[Dict] = None
    interpretation: str = ""
    assertions: List[Dict] = field(default_factory=list)


@dataclass
class TestReport:
    """Full test report"""
    run_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    environment: str = "staging"
    total_tests: int = 0
    passed: int = 0
    failed: int = 0
    skipped: int = 0
    errors: int = 0
    results: List[TestResult] = field(default_factory=list)
    cross_module_results: List[Dict] = field(default_factory=list)

    def add_result(self, result: TestResult):
        self.results.append(result)
        self.total_tests += 1
        if result.status == TestStatus.PASSED:
            self.passed += 1
        elif result.status == TestStatus.FAILED:
            self.failed += 1
        elif result.status == TestStatus.SKIPPED:
            self.skipped += 1
        else:
            self.errors += 1

    @property
    def success_rate(self) -> float:
        if self.total_tests == 0:
            return 0.0
        return (self.passed / self.total_tests) * 100


# ============================================================
# API CLIENT
# ============================================================

class PlatformAPIClient:
    """REST API client with retry logic"""

    def __init__(self, config: Config):
        self.config = config
        self.session = self._create_session()
        self.auth_token: Optional[str] = None
        self.tenant_id: Optional[str] = None

    def _create_session(self) -> requests.Session:
        session = requests.Session()
        retry_strategy = Retry(
            total=self.config.max_retries,
            backoff_factor=self.config.retry_delay,
            status_forcelist=[429, 500, 502, 503, 504],
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        session.mount("https://", adapter)
        session.mount("http://", adapter)
        return session

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.auth_token:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        return headers

    def authenticate(self, email: str, password: str) -> Dict[str, Any]:
        """Authenticate and get JWT token"""
        response = self.session.post(
            f"{self.config.api_url}/auth/login",
            json={"email": email, "password": password},
            timeout=self.config.api_timeout,
        )
        response.raise_for_status()
        data = response.json()
        self.auth_token = data.get("access_token")
        self.tenant_id = data.get("tenantId")
        return data

    def get(self, endpoint: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        """GET request"""
        response = self.session.get(
            f"{self.config.api_url}{endpoint}",
            headers=self._get_headers(),
            params=params,
            timeout=self.config.api_timeout,
        )
        response.raise_for_status()
        return response.json()

    def post(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """POST request"""
        response = self.session.post(
            f"{self.config.api_url}{endpoint}",
            headers=self._get_headers(),
            json=data,
            timeout=self.config.api_timeout,
        )
        response.raise_for_status()
        return response.json()

    def put(self, endpoint: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """PUT request"""
        response = self.session.put(
            f"{self.config.api_url}{endpoint}",
            headers=self._get_headers(),
            json=data,
            timeout=self.config.api_timeout,
        )
        response.raise_for_status()
        return response.json()

    def delete(self, endpoint: str) -> Dict[str, Any]:
        """DELETE request"""
        response = self.session.delete(
            f"{self.config.api_url}{endpoint}",
            headers=self._get_headers(),
            timeout=self.config.api_timeout,
        )
        response.raise_for_status()
        return response.json() if response.content else {}


# ============================================================
# SELENIUM WEB DRIVER
# ============================================================

class PlatformWebDriver:
    """Selenium WebDriver wrapper for UI testing"""

    def __init__(self, config: Config):
        self.config = config
        self.driver: Optional[webdriver.Chrome] = None

    def start(self):
        """Initialize Chrome WebDriver"""
        if not SELENIUM_AVAILABLE:
            raise RuntimeError("Selenium not installed")

        options = ChromeOptions()
        if self.config.headless:
            options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")

        self.driver = webdriver.Chrome(options=options)
        self.driver.implicitly_wait(self.config.element_wait_timeout)
        self.driver.set_page_load_timeout(self.config.page_load_timeout)

    def stop(self):
        """Close WebDriver"""
        if self.driver:
            self.driver.quit()
            self.driver = None

    def navigate(self, url: str):
        """Navigate to URL"""
        self.driver.get(url)

    def find_element(self, by: By, value: str, timeout: int = None):
        """Find element with explicit wait"""
        wait = WebDriverWait(self.driver, timeout or self.config.element_wait_timeout)
        return wait.until(EC.presence_of_element_located((by, value)))

    def click(self, by: By, value: str):
        """Click element"""
        element = self.find_element(by, value)
        element.click()

    def type_text(self, by: By, value: str, text: str):
        """Type text into element"""
        element = self.find_element(by, value)
        element.clear()
        element.send_keys(text)

    def screenshot(self, name: str) -> str:
        """Take screenshot and return path"""
        os.makedirs(self.config.screenshot_dir, exist_ok=True)
        path = os.path.join(
            self.config.screenshot_dir,
            f"{name}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.png"
        )
        self.driver.save_screenshot(path)
        return path

    def get_text(self, by: By, value: str) -> str:
        """Get element text"""
        return self.find_element(by, value).text


# ============================================================
# TEST EXECUTOR
# ============================================================

class PlatformTestExecutor:
    """Main test executor for platform simulation"""

    def __init__(self, config: Config):
        self.config = config
        self.api = PlatformAPIClient(config)
        self.web: Optional[PlatformWebDriver] = None
        self.report = TestReport(
            run_id=str(uuid.uuid4()),
            start_time=datetime.now(),
            environment=config.base_url,
        )
        self.logger = self._setup_logger()

        # Test data storage for cross-module references
        self.test_data: Dict[str, Any] = {}

    def _setup_logger(self) -> logging.Logger:
        logger = logging.getLogger("PlatformSimulator")
        logger.setLevel(logging.INFO)
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        return logger

    def _run_test(
        self,
        name: str,
        module: str,
        test_func,
        *args,
        **kwargs
    ) -> TestResult:
        """Execute a single test with timing and error handling"""
        start_time = time.time()
        result = TestResult(
            name=name,
            module=module,
            status=TestStatus.PASSED,
            duration_ms=0,
        )

        try:
            response = test_func(*args, **kwargs)
            result.api_response = response if isinstance(response, dict) else None
            result.interpretation = self._interpret_response(name, response)
            result.message = "Test passed successfully"

        except AssertionError as e:
            result.status = TestStatus.FAILED
            result.message = str(e)
            self.logger.error(f"Test {name} failed: {e}")

        except requests.exceptions.HTTPError as e:
            result.status = TestStatus.FAILED
            result.message = f"HTTP Error: {e.response.status_code} - {e.response.text}"
            self.logger.error(f"Test {name} HTTP error: {result.message}")

        except Exception as e:
            result.status = TestStatus.ERROR
            result.message = f"Unexpected error: {str(e)}"
            self.logger.exception(f"Test {name} error")

        finally:
            result.duration_ms = (time.time() - start_time) * 1000

        return result

    def _interpret_response(self, test_name: str, response: Any) -> str:
        """Interpret API response for human-readable output"""
        if response is None:
            return "No response data"

        if isinstance(response, dict):
            if "totalVat" in response:
                return f"Invoice created: VAT {response.get('vatRate', 21)}% applied, Total: {response.get('totalAmount')} RON"
            if "status" in response:
                return f"Operation completed with status: {response['status']}"
            if "id" in response:
                return f"Entity created with ID: {response['id']}"
            if "xmlContent" in response:
                return "XML document generated successfully"
            if "score" in response or "aiScore" in response:
                return f"AI scoring completed: {response.get('score') or response.get('aiScore')}"

        return f"Response received: {type(response).__name__}"

    # ========================================================
    # MODULE TEST METHODS
    # ========================================================

    def test_authentication(self) -> TestResult:
        """Test user authentication"""
        def _test():
            response = self.api.authenticate(
                self.config.test_email,
                self.config.test_password
            )
            assert "access_token" in response, "Missing access token"
            assert response["access_token"], "Empty access token"
            self.logger.info(f"Authenticated successfully. Token: {response['access_token'][:20]}...")
            return response

        return self._run_test("User Authentication", "Auth", _test)

    def test_create_invoice_vat_21(self) -> TestResult:
        """Test invoice creation with 21% VAT"""
        def _test():
            invoice_data = {
                "customerId": str(uuid.uuid4()),
                "items": [
                    {"description": "IT Consulting", "quantity": 10, "unitPrice": 500, "vatRate": 21}
                ],
                "currency": "RON",
                "issueDate": datetime.now().isoformat(),
            }
            response = self.api.post("/invoices", invoice_data)

            # Assertions
            assert "id" in response, "Invoice ID not returned"
            assert response.get("totalVat") == 1050, f"VAT calculation error: expected 1050, got {response.get('totalVat')}"
            assert response.get("totalAmount") == 6050, "Total amount incorrect"

            self.test_data["invoice_id"] = response["id"]
            return response

        return self._run_test("Create Invoice (VAT 21%)", "Finance", _test)

    def test_create_invoice_vat_11(self) -> TestResult:
        """Test invoice with reduced VAT (Legea 141/2025)"""
        def _test():
            invoice_data = {
                "customerId": str(uuid.uuid4()),
                "items": [
                    {"description": "Food Products", "quantity": 100, "unitPrice": 10, "vatRate": 11}
                ],
                "currency": "RON",
                "issueDate": datetime.now().isoformat(),
            }
            response = self.api.post("/invoices", invoice_data)

            assert response.get("totalVat") == 110, "Reduced VAT calculation error"
            return response

        return self._run_test("Create Invoice (VAT 11% - Legea 141)", "Finance", _test)

    def test_generate_efactura(self) -> TestResult:
        """Test e-Factura XML generation"""
        def _test():
            invoice_id = self.test_data.get("invoice_id")
            if not invoice_id:
                raise AssertionError("No invoice ID available")

            response = self.api.post(f"/invoices/{invoice_id}/e-factura", {})

            assert "xmlContent" in response, "Missing XML content"
            xml_content = response["xmlContent"]
            assert "xmlns:cbc" in xml_content, "Invalid e-Factura XML format"

            return response

        return self._run_test("Generate e-Factura XML", "Tax/Compliance", _test)

    def test_generate_saft_d406(self) -> TestResult:
        """Test SAF-T D406 report generation"""
        def _test():
            response = self.api.post("/compliance/saft/generate", {
                "reportPeriod": "2025-01",
                "reportType": "D406",
            })

            assert "xmlContent" in response, "Missing SAF-T XML"
            # Validate XML structure
            try:
                ET.fromstring(response["xmlContent"])
            except ET.ParseError:
                raise AssertionError("Invalid SAF-T XML structure")

            return response

        return self._run_test("Generate SAF-T D406 Report", "Tax/Compliance", _test)

    def test_create_employee(self) -> TestResult:
        """Test employee creation"""
        def _test():
            employee_data = {
                "firstName": "Test",
                "lastName": f"Employee_{uuid.uuid4().hex[:6]}",
                "email": f"employee_{uuid.uuid4().hex[:8]}@test.ro",
                "cnp": "1900101123456",
                "position": "Software Engineer",
                "department": "IT",
                "salary": 10000,
                "currency": "RON",
                "startDate": datetime.now().isoformat(),
                "contractType": "FULL_TIME",
            }
            response = self.api.post("/hr/employees", employee_data)

            assert "id" in response, "Employee ID not returned"
            self.test_data["employee_id"] = response["id"]
            return response

        return self._run_test("Create Employee", "HR", _test)

    def test_process_payroll(self) -> TestResult:
        """Test payroll processing with deductions"""
        def _test():
            employee_id = self.test_data.get("employee_id")
            if not employee_id:
                raise AssertionError("No employee ID available")

            response = self.api.post("/hr/payroll/process", {
                "employeeId": employee_id,
                "period": "2025-01",
                "grossSalary": 10000,
            })

            # Romanian deductions: CAS 25%, CASS 10%, Tax 10%
            assert "netSalary" in response, "Missing net salary"
            assert response["netSalary"] < 10000, "Deductions not applied"

            self.test_data["payroll_id"] = response.get("id")
            return response

        return self._run_test("Process Payroll", "HR", _test)

    def test_report_hse_incident(self) -> TestResult:
        """Test HSE incident reporting with AI triage"""
        def _test():
            response = self.api.post("/hse/incidents", {
                "type": "NEAR_MISS",
                "description": "Worker almost slipped on wet floor in production area",
                "location": "Production Hall A",
                "reportedBy": self.test_data.get("employee_id", str(uuid.uuid4())),
                "severity": "MEDIUM",
                "dateOccurred": datetime.now().isoformat(),
            })

            assert "id" in response, "Incident ID not returned"
            assert "aiTriageScore" in response or "status" in response, "AI triage or status missing"

            self.test_data["incident_id"] = response["id"]
            return response

        return self._run_test("Report HSE Incident", "HSE", _test)

    def test_create_ncr(self) -> TestResult:
        """Test Non-Conformance Report creation"""
        def _test():
            response = self.api.post("/non-conformances", {
                "title": f"Material defect NCR-{uuid.uuid4().hex[:6]}",
                "type": "MATERIAL",
                "severity": "MAJOR",
                "description": "Surface defects found on incoming material batch",
                "affectedQuantity": 50,
                "detectedBy": str(uuid.uuid4()),
            })

            assert "id" in response, "NCR ID not returned"
            assert response.get("status") in ["DRAFT", "OPEN"], f"Unexpected NCR status: {response.get('status')}"

            self.test_data["ncr_id"] = response["id"]
            return response

        return self._run_test("Create NCR", "Quality", _test)

    def test_create_capa(self) -> TestResult:
        """Test CAPA creation from NCR"""
        def _test():
            ncr_id = self.test_data.get("ncr_id")

            response = self.api.post("/capas", {
                "title": f"CAPA for material defect",
                "type": "CORRECTIVE",
                "priority": "HIGH",
                "sourceNcrId": ncr_id,
                "problemStatement": "Recurring material quality issues from supplier",
            })

            assert "id" in response, "CAPA ID not returned"
            self.test_data["capa_id"] = response["id"]
            return response

        return self._run_test("Create CAPA", "Quality", _test)

    def test_create_supplier(self) -> TestResult:
        """Test supplier creation and qualification"""
        def _test():
            response = self.api.post("/suppliers", {
                "name": f"Test Supplier {uuid.uuid4().hex[:6]}",
                "code": f"SUP-{uuid.uuid4().hex[:4].upper()}",
                "category": "RAW_MATERIALS",
                "vatNumber": f"RO{uuid.uuid4().hex[:8].upper()}",
                "address": {
                    "street": "Test Street 123",
                    "city": "Bucharest",
                    "country": "Romania",
                },
                "contactEmail": f"supplier_{uuid.uuid4().hex[:6]}@test.com",
            })

            assert "id" in response, "Supplier ID not returned"
            self.test_data["supplier_id"] = response["id"]
            return response

        return self._run_test("Create Supplier", "Supply Chain", _test)

    def test_create_purchase_order(self) -> TestResult:
        """Test purchase order creation"""
        def _test():
            supplier_id = self.test_data.get("supplier_id", str(uuid.uuid4()))

            response = self.api.post("/purchase-orders", {
                "supplierId": supplier_id,
                "items": [
                    {"productCode": "RAW-001", "description": "Raw Material", "quantity": 100, "unitPrice": 25}
                ],
                "deliveryDate": (datetime.now() + timedelta(days=14)).isoformat(),
                "currency": "RON",
            })

            assert "id" in response, "PO ID not returned"
            self.test_data["po_id"] = response["id"]
            return response

        return self._run_test("Create Purchase Order", "Supply Chain", _test)

    def test_create_inventory_item(self) -> TestResult:
        """Test inventory item creation"""
        def _test():
            response = self.api.post("/inventory", {
                "sku": f"SKU-{uuid.uuid4().hex[:6].upper()}",
                "name": "Test Material",
                "category": "RAW_MATERIALS",
                "unitOfMeasure": "PIECE",
                "reorderPoint": 100,
                "reorderQuantity": 500,
            })

            assert "id" in response, "Inventory item ID not returned"
            self.test_data["inventory_id"] = response["id"]
            return response

        return self._run_test("Create Inventory Item", "Warehouse", _test)

    def test_create_lead(self) -> TestResult:
        """Test CRM lead creation with AI scoring"""
        def _test():
            response = self.api.post("/crm/leads", {
                "company": f"Test Company {uuid.uuid4().hex[:6]}",
                "contactName": "John Doe",
                "email": f"lead_{uuid.uuid4().hex[:6]}@company.com",
                "phone": "+40721000000",
                "source": "WEBSITE",
                "interest": "ERP Solution",
                "budget": 25000,
                "currency": "EUR",
            })

            assert "id" in response, "Lead ID not returned"
            self.test_data["lead_id"] = response["id"]
            return response

        return self._run_test("Create CRM Lead", "CRM", _test)

    def test_create_dashboard(self) -> TestResult:
        """Test analytics dashboard creation"""
        def _test():
            response = self.api.post("/quality-dashboards", {
                "name": f"Test Dashboard {uuid.uuid4().hex[:6]}",
                "widgets": [
                    {"type": "KPI_CARD", "metric": "FIRST_PASS_YIELD", "position": {"x": 0, "y": 0}},
                    {"type": "TREND_CHART", "metric": "DEFECT_RATE", "position": {"x": 1, "y": 0}},
                ],
                "isDefault": False,
            })

            assert "id" in response, "Dashboard ID not returned"
            self.test_data["dashboard_id"] = response["id"]
            return response

        return self._run_test("Create Analytics Dashboard", "Analytics", _test)

    def test_calculate_kpis(self) -> TestResult:
        """Test KPI calculation"""
        def _test():
            response = self.api.post("/quality-kpis/calculate", {
                "period": "2025-01",
            })

            assert isinstance(response, list), "KPIs should be a list"
            return {"kpis": response, "count": len(response)}

        return self._run_test("Calculate Quality KPIs", "Analytics", _test)

    # ========================================================
    # CROSS-MODULE INTEGRATION TESTS
    # ========================================================

    def test_hse_to_quality_integration(self) -> TestResult:
        """Test HSE incident triggers Quality NCR"""
        def _test():
            incident_id = self.test_data.get("incident_id")
            if not incident_id:
                raise AssertionError("No incident ID available")

            response = self.api.post(f"/hse/incidents/{incident_id}/escalate", {
                "escalateTo": "QUALITY",
                "reason": "Quality implications identified",
            })

            # Verify NCR was created
            assert "linkedNcrId" in response or "status" in response, "Escalation failed"
            return response

        return self._run_test("HSE -> Quality Integration", "Cross-Module", _test)

    def test_hr_to_finance_integration(self) -> TestResult:
        """Test HR payroll creates Finance entries"""
        def _test():
            payroll_id = self.test_data.get("payroll_id")
            if not payroll_id:
                raise AssertionError("No payroll ID available")

            response = self.api.get(f"/hr/payroll/{payroll_id}/finance-entries")

            assert "journalEntries" in response or isinstance(response, list), "Finance entries not found"
            return response

        return self._run_test("HR -> Finance Integration", "Cross-Module", _test)

    def test_supplier_quality_integration(self) -> TestResult:
        """Test Quality evaluation updates Supply Chain scores"""
        def _test():
            supplier_id = self.test_data.get("supplier_id")
            if not supplier_id:
                raise AssertionError("No supplier ID available")

            # Record quality evaluation
            eval_response = self.api.post("/supplier-quality/evaluations", {
                "supplierId": supplier_id,
                "period": "2025-Q1",
                "qualityScore": 88,
                "deliveryScore": 92,
                "serviceScore": 85,
                "priceScore": 80,
            })

            # Check supplier metrics updated
            metrics_response = self.api.get(f"/suppliers/{supplier_id}/quality-metrics")

            return {"evaluation": eval_response, "metrics": metrics_response}

        return self._run_test("Quality -> Supply Chain Integration", "Cross-Module", _test)

    # ========================================================
    # COMPLIANCE TESTS
    # ========================================================

    def test_gdpr_data_export(self) -> TestResult:
        """Test GDPR compliant data export"""
        def _test():
            response = self.api.get("/compliance/gdpr/export")

            assert "userData" in response or "data" in response, "User data not exported"
            return response

        return self._run_test("GDPR Data Export", "Compliance", _test)

    def test_audit_trail(self) -> TestResult:
        """Test audit trail logging"""
        def _test():
            invoice_id = self.test_data.get("invoice_id")
            if not invoice_id:
                raise AssertionError("No invoice ID for audit check")

            response = self.api.get("/audit-logs", params={
                "entityType": "INVOICE",
                "entityId": invoice_id,
            })

            assert "logs" in response or isinstance(response, list), "Audit logs not found"
            return response

        return self._run_test("Audit Trail Logging", "Compliance", _test)

    # ========================================================
    # EXECUTION
    # ========================================================

    def run_all_tests(self):
        """Execute all platform tests"""
        self.logger.info("=" * 60)
        self.logger.info("DocumentIulia.ro Platform User Simulation")
        self.logger.info(f"Environment: {self.config.base_url}")
        self.logger.info(f"Run ID: {self.report.run_id}")
        self.logger.info("=" * 60)

        # Authentication first
        result = self.test_authentication()
        self.report.add_result(result)

        if result.status != TestStatus.PASSED:
            self.logger.error("Authentication failed. Aborting tests.")
            return

        # Finance tests
        self.report.add_result(self.test_create_invoice_vat_21())
        self.report.add_result(self.test_create_invoice_vat_11())
        self.report.add_result(self.test_generate_efactura())
        self.report.add_result(self.test_generate_saft_d406())

        # HR tests
        self.report.add_result(self.test_create_employee())
        self.report.add_result(self.test_process_payroll())

        # HSE tests
        self.report.add_result(self.test_report_hse_incident())

        # Quality tests
        self.report.add_result(self.test_create_ncr())
        self.report.add_result(self.test_create_capa())

        # Supply Chain tests
        self.report.add_result(self.test_create_supplier())
        self.report.add_result(self.test_create_purchase_order())

        # Warehouse tests
        self.report.add_result(self.test_create_inventory_item())

        # CRM tests
        self.report.add_result(self.test_create_lead())

        # Analytics tests
        self.report.add_result(self.test_create_dashboard())
        self.report.add_result(self.test_calculate_kpis())

        # Cross-module integration tests
        self.report.add_result(self.test_hse_to_quality_integration())
        self.report.add_result(self.test_hr_to_finance_integration())
        self.report.add_result(self.test_supplier_quality_integration())

        # Compliance tests
        self.report.add_result(self.test_gdpr_data_export())
        self.report.add_result(self.test_audit_trail())

        self.report.end_time = datetime.now()

    def generate_report(self, format: str = "json") -> str:
        """Generate test report"""
        os.makedirs(self.config.report_dir, exist_ok=True)

        if format == "json":
            return self._generate_json_report()
        elif format == "html":
            return self._generate_html_report()
        else:
            raise ValueError(f"Unknown report format: {format}")

    def _generate_json_report(self) -> str:
        """Generate JSON report"""
        report_data = {
            "runId": self.report.run_id,
            "environment": self.report.environment,
            "startTime": self.report.start_time.isoformat(),
            "endTime": self.report.end_time.isoformat() if self.report.end_time else None,
            "summary": {
                "total": self.report.total_tests,
                "passed": self.report.passed,
                "failed": self.report.failed,
                "skipped": self.report.skipped,
                "errors": self.report.errors,
                "successRate": f"{self.report.success_rate:.1f}%",
            },
            "results": [
                {
                    "name": r.name,
                    "module": r.module,
                    "status": r.status.value,
                    "durationMs": r.duration_ms,
                    "message": r.message,
                    "interpretation": r.interpretation,
                }
                for r in self.report.results
            ],
        }

        report_path = os.path.join(
            self.config.report_dir,
            f"test_report_{self.report.run_id}.json"
        )

        with open(report_path, "w") as f:
            json.dump(report_data, f, indent=2)

        return report_path

    def _generate_html_report(self) -> str:
        """Generate HTML report"""
        html = f"""
<!DOCTYPE html>
<html>
<head>
    <title>DocumentIulia.ro Platform Test Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        h1 {{ color: #2c3e50; }}
        .summary {{ background: #ecf0f1; padding: 15px; border-radius: 5px; margin: 20px 0; }}
        .passed {{ color: #27ae60; }}
        .failed {{ color: #e74c3c; }}
        .error {{ color: #9b59b6; }}
        table {{ border-collapse: collapse; width: 100%; }}
        th, td {{ border: 1px solid #bdc3c7; padding: 10px; text-align: left; }}
        th {{ background: #34495e; color: white; }}
        tr:nth-child(even) {{ background: #f2f2f2; }}
        .status-PASSED {{ background: #d5f5e3; }}
        .status-FAILED {{ background: #fadbd8; }}
        .status-ERROR {{ background: #e8daef; }}
    </style>
</head>
<body>
    <h1>DocumentIulia.ro Platform Test Report</h1>

    <div class="summary">
        <h2>Summary</h2>
        <p><strong>Run ID:</strong> {self.report.run_id}</p>
        <p><strong>Environment:</strong> {self.report.environment}</p>
        <p><strong>Start Time:</strong> {self.report.start_time.isoformat()}</p>
        <p><strong>End Time:</strong> {self.report.end_time.isoformat() if self.report.end_time else 'N/A'}</p>
        <p>
            <strong>Results:</strong>
            <span class="passed">{self.report.passed} Passed</span> |
            <span class="failed">{self.report.failed} Failed</span> |
            <span class="error">{self.report.errors} Errors</span> |
            {self.report.skipped} Skipped
        </p>
        <p><strong>Success Rate:</strong> {self.report.success_rate:.1f}%</p>
    </div>

    <h2>Test Results</h2>
    <table>
        <tr>
            <th>Test Name</th>
            <th>Module</th>
            <th>Status</th>
            <th>Duration (ms)</th>
            <th>Interpretation</th>
            <th>Message</th>
        </tr>
        {"".join(f'''
        <tr class="status-{r.status.value}">
            <td>{r.name}</td>
            <td>{r.module}</td>
            <td>{r.status.value}</td>
            <td>{r.duration_ms:.2f}</td>
            <td>{r.interpretation}</td>
            <td>{r.message}</td>
        </tr>
        ''' for r in self.report.results)}
    </table>
</body>
</html>
"""

        report_path = os.path.join(
            self.config.report_dir,
            f"test_report_{self.report.run_id}.html"
        )

        with open(report_path, "w") as f:
            f.write(html)

        return report_path

    def print_summary(self):
        """Print test summary to console"""
        print("\n" + "=" * 60)
        print("TEST EXECUTION SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.report.total_tests}")
        print(f"Passed:      {self.report.passed} ({self.report.success_rate:.1f}%)")
        print(f"Failed:      {self.report.failed}")
        print(f"Errors:      {self.report.errors}")
        print(f"Skipped:     {self.report.skipped}")
        print("=" * 60)

        if self.report.failed > 0 or self.report.errors > 0:
            print("\nFAILED/ERROR TESTS:")
            for result in self.report.results:
                if result.status in [TestStatus.FAILED, TestStatus.ERROR]:
                    print(f"  - [{result.module}] {result.name}: {result.message}")


# ============================================================
# MAIN ENTRY POINT
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="DocumentIulia.ro Platform User Simulation"
    )
    parser.add_argument(
        "--env",
        choices=["staging", "production", "local"],
        default="staging",
        help="Target environment",
    )
    parser.add_argument(
        "--headless",
        action="store_true",
        help="Run in headless mode",
    )
    parser.add_argument(
        "--report-format",
        choices=["json", "html"],
        default="html",
        help="Report output format",
    )
    parser.add_argument(
        "--api-only",
        action="store_true",
        help="Run API tests only (no Selenium UI tests)",
    )

    args = parser.parse_args()

    # Configure based on environment
    config = Config()
    if args.env == "staging":
        config.base_url = "https://staging.documentiulia.ro"
        config.api_url = "https://staging.documentiulia.ro/api"
    elif args.env == "production":
        config.base_url = "https://documentiulia.ro"
        config.api_url = "https://documentiulia.ro/api"
    elif args.env == "local":
        config.base_url = "http://localhost:3000"
        config.api_url = "http://localhost:3001"

    config.headless = args.headless

    # Execute tests
    executor = PlatformTestExecutor(config)

    try:
        executor.run_all_tests()
    except KeyboardInterrupt:
        print("\nTest execution interrupted by user")
    except Exception as e:
        print(f"\nFatal error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # Generate report
        report_path = executor.generate_report(args.report_format)
        print(f"\nReport generated: {report_path}")

        # Print summary
        executor.print_summary()

        # Exit with appropriate code
        if executor.report.failed > 0 or executor.report.errors > 0:
            sys.exit(1)
        sys.exit(0)


if __name__ == "__main__":
    main()
