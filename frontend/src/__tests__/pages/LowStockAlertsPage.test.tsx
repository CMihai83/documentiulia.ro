import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LowStockAlertsPage from '../../pages/inventory/LowStockAlertsPage';

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  clear: vi.fn(),
  removeItem: vi.fn(),
  length: 0,
  key: vi.fn(),
};
global.localStorage = localStorageMock as any;

// Mock fetch
global.fetch = vi.fn();

// Mock alert
global.alert = vi.fn();

const mockAlertsResponse = {
  alerts: [
    {
      id: 'a1',
      product_name: 'Laptop Dell XPS 13',
      sku: 'PROD-001',
      barcode: '1234567890123',
      warehouse_name: 'Depozit Central',
      warehouse_code: 'DC-001',
      current_quantity: 2,
      current_stock: 2,
      reorder_level: 10,
      suggested_order_quantity: 15,
      alert_status: 'active',
      days_out_of_stock: 0,
      estimated_lost_revenue: 0,
      created_at: '2025-11-10T10:00:00Z',
      unit_of_measure: 'buc',
      selling_price: 5999.99,
      purchase_price: 4500.00
    },
    {
      id: 'a2',
      product_name: 'Mouse Logitech',
      sku: 'PROD-002',
      barcode: '9876543210987',
      warehouse_name: 'Magazin Cluj',
      warehouse_code: 'MG-002',
      current_quantity: 0,
      current_stock: 0,
      reorder_level: 20,
      suggested_order_quantity: 30,
      alert_status: 'active',
      days_out_of_stock: 5,
      estimated_lost_revenue: 2000.00,
      created_at: '2025-11-12T14:30:00Z',
      unit_of_measure: 'buc',
      selling_price: 399.99,
      purchase_price: 250.00
    },
    {
      id: 'a3',
      product_name: 'Tastatura Mecanica',
      sku: 'PROD-003',
      barcode: '5555555555555',
      warehouse_name: 'Depozit Central',
      warehouse_code: 'DC-001',
      current_quantity: 3,
      current_stock: 3,
      reorder_level: 15,
      suggested_order_quantity: 20,
      alert_status: 'acknowledged',
      days_out_of_stock: 0,
      estimated_lost_revenue: 0,
      created_at: '2025-11-15T09:15:00Z',
      unit_of_measure: 'buc',
      selling_price: 599.99,
      purchase_price: 450.00
    }
  ],
  summary: {
    total_alerts: 25,
    active_alerts: 18,
    acknowledged_alerts: 5,
    out_of_stock_count: 12,
    suggested_order_value: 125000.00
  }
};

describe('LowStockAlertsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'fake-token';
      if (key === 'company_id') return 'test-company-id';
      return null;
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockAlertsResponse
    });
  });

  it('renders page title and description', () => {
    renderWithRouter(<LowStockAlertsPage />);

    expect(screen.getByText('🔔 Alerte Stoc Scăzut')).toBeTruthy();
    expect(screen.getByText('Monitorizați produsele cu stoc scăzut și gestionați comenzile de reaprovizionare')).toBeTruthy();
  });

  it('displays loading state initially', () => {
    // Make fetch delay to keep loading state
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<LowStockAlertsPage />);

    expect(screen.getByText('Se încarcă alertele...')).toBeTruthy();
  });

  it('fetches and displays alerts after loading', async () => {
    renderWithRouter(<LowStockAlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('Laptop Dell XPS 13')).toBeTruthy();
      expect(screen.getByText('Mouse Logitech')).toBeTruthy();
      expect(screen.getByText('Tastatura Mecanica')).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('displays alert summary statistics', async () => {
    renderWithRouter(<LowStockAlertsPage />);

    await waitFor(() => {
      expect(screen.getByText('25')).toBeTruthy(); // total_alerts
      expect(screen.getByText('18')).toBeTruthy(); // active_alerts
      expect(screen.getByText('12')).toBeTruthy(); // out_of_stock_count
    }, { timeout: 2000 });
  });

  it('displays warehouse information for each alert', async () => {
    renderWithRouter(<LowStockAlertsPage />);

    await waitFor(() => {
      // Check for warehouse codes (more likely to be unique and displayed)
      const warehouseElements = screen.getAllByText(/DC-001|MG-002|Depozit|Magazin/);
      expect(warehouseElements.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  it('displays current stock and reorder levels', async () => {
    renderWithRouter(<LowStockAlertsPage />);

    await waitFor(() => {
      // Check for stock quantities
      const stockElements = screen.getAllByText(/2|10|15|20|30/);
      expect(stockElements.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  it('displays alert status badges', async () => {
    renderWithRouter(<LowStockAlertsPage />);

    await waitFor(() => {
      const activeBadges = screen.getAllByText('Activ');
      expect(activeBadges.length).toBeGreaterThan(0);

      const acknowledgedBadges = screen.getAllByText('Confirmat');
      expect(acknowledgedBadges.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  it('has status filter tabs', async () => {
    renderWithRouter(<LowStockAlertsPage />);

    await waitFor(() => {
      // Look for filter buttons/tabs
      const filterElements = screen.getAllByText(/Activ|Toate|Confirmat|Rezolvat/);
      expect(filterElements.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  it('uses correct API endpoint with company_id and token', async () => {
    renderWithRouter(<LowStockAlertsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/inventory/low-stock.php'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer fake-token'
          })
        })
      );
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('company_id=test-company-id'),
        expect.any(Object)
      );
    }, { timeout: 2000 });
  });

  it('displays "Nicio alertă" when no alerts returned', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ alerts: [], summary: null })
    });

    renderWithRouter(<LowStockAlertsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Nicio alertă|Nu există alerte/)).toBeTruthy();
    }, { timeout: 2000 });
  });
});
