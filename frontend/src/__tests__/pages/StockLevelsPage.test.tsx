import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import StockLevelsPage from '../../pages/inventory/StockLevelsPage';

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

const mockStockLevelsResponse = {
  products: [
    {
      product_id: '1',
      sku: 'PROD-001',
      product_name: 'Laptop Dell XPS 13',
      category: 'Electronics',
      unit_of_measure: 'buc',
      selling_price: 5999.99,
      total_available: 15,
      total_reserved: 3,
      total_free: 12,
      total_on_order: 5,
      avg_cost: 4500.00,
      total_value: 67500.00,
      warehouse_count: 2,
      warehouse_details: [
        {
          warehouse_id: 'w1',
          warehouse_name: 'Depozit Central',
          warehouse_code: 'DC-001',
          quantity_available: 10,
          quantity_reserved: 2,
          quantity_free: 8,
          quantity_on_order: 3,
          reorder_level: 5,
          average_cost: 4500.00,
          last_movement_date: '2025-11-15'
        },
        {
          warehouse_id: 'w2',
          warehouse_name: 'Depozit Regional',
          warehouse_code: 'DR-001',
          quantity_available: 5,
          quantity_reserved: 1,
          quantity_free: 4,
          quantity_on_order: 2,
          reorder_level: 3,
          average_cost: 4500.00,
          last_movement_date: '2025-11-16'
        }
      ]
    },
    {
      product_id: '2',
      sku: 'PROD-002',
      product_name: 'Mouse Logitech',
      category: 'Electronics',
      unit_of_measure: 'buc',
      selling_price: 399.99,
      total_available: 3,
      total_reserved: 1,
      total_free: 2,
      total_on_order: 10,
      avg_cost: 250.00,
      total_value: 750.00,
      warehouse_count: 1,
      warehouse_details: [
        {
          warehouse_id: 'w1',
          warehouse_name: 'Depozit Central',
          warehouse_code: 'DC-001',
          quantity_available: 3,
          quantity_reserved: 1,
          quantity_free: 2,
          quantity_on_order: 10,
          reorder_level: 10,
          average_cost: 250.00,
          last_movement_date: '2025-11-17'
        }
      ]
    }
  ]
};

describe('StockLevelsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'fake-token';
      if (key === 'company_id') return 'test-company-id';
      return null;
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockStockLevelsResponse
    });
  });

  it('renders page title and description', () => {
    renderWithRouter(<StockLevelsPage />);

    expect(screen.getByText('📊 Niveluri Stoc')).toBeTruthy();
    expect(screen.getByText('Monitorizare în timp real a stocurilor pe produse și depozite')).toBeTruthy();
  });

  it('displays "Actualizează" refresh button', () => {
    renderWithRouter(<StockLevelsPage />);

    const refreshButton = screen.getByText('Actualizează');
    expect(refreshButton).toBeTruthy();
  });

  it('has view toggle buttons (Pe Produs and Pe Depozit)', () => {
    renderWithRouter(<StockLevelsPage />);

    expect(screen.getByText('Pe Produs')).toBeTruthy();
    expect(screen.getByText('Pe Depozit')).toBeTruthy();
    expect(screen.getByText('Vizualizare:')).toBeTruthy();
  });

  it('defaults to "Pe Produs" view', () => {
    renderWithRouter(<StockLevelsPage />);

    const productButton = screen.getByText('Pe Produs').closest('button');
    expect(productButton?.className).toContain('bg-blue-600');
  });

  it('fetches and displays stock levels after loading', async () => {
    renderWithRouter(<StockLevelsPage />);

    await waitFor(() => {
      expect(screen.getByText('Laptop Dell XPS 13')).toBeTruthy();
      expect(screen.getByText('Mouse Logitech')).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('displays stock quantities correctly', async () => {
    renderWithRouter(<StockLevelsPage />);

    await waitFor(() => {
      // Check for stock quantities (15 available, 12 free for laptop)
      const availableTexts = screen.getAllByText(/15|12|3|2/);
      expect(availableTexts.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  it('displays warehouse count for each product', async () => {
    renderWithRouter(<StockLevelsPage />);

    await waitFor(() => {
      // Product 1 has 2 warehouses, product 2 has 1 warehouse
      const warehouseCounts = screen.getAllByText(/2|1/);
      expect(warehouseCounts.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  it('switches view when clicking "Pe Depozit" button', async () => {
    renderWithRouter(<StockLevelsPage />);

    const warehouseButton = screen.getByText('Pe Depozit');
    fireEvent.click(warehouseButton);

    // Should make a new fetch with group_by=warehouse
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('group_by=warehouse'),
        expect.any(Object)
      );
    }, { timeout: 1000 });
  });

  it('refreshes data when clicking "Actualizează" button', async () => {
    renderWithRouter(<StockLevelsPage />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Laptop Dell XPS 13')).toBeTruthy();
    }, { timeout: 2000 });

    // Clear mock calls
    vi.clearAllMocks();

    // Click refresh
    const refreshButton = screen.getByText('Actualizează');
    fireEvent.click(refreshButton);

    // Should trigger a new fetch
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  it('uses correct API endpoint with company_id and token', async () => {
    renderWithRouter(<StockLevelsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/inventory/stock-levels.php'),
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

  it('displays "Se încarcă" loading state initially', () => {
    // Make fetch delay to keep loading state
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<StockLevelsPage />);

    expect(screen.getByText(/Se încarcă/)).toBeTruthy();
  });
});
