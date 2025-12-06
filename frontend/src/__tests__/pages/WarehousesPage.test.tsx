import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import WarehousesPage from '../../pages/inventory/WarehousesPage';

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

// Mock confirm dialog
global.confirm = vi.fn();

const mockWarehousesResponse = {
  warehouses: [
    {
      id: 'w1',
      name: 'Depozit Central București',
      code: 'DC-001',
      warehouse_type: 'warehouse',
      address: 'Str. Industriei nr. 10',
      city: 'București',
      county: 'București',
      postal_code: '020451',
      phone: '+40213456789',
      email: 'depozit@company.ro',
      is_active: true,
      is_sellable: false,
      total_stock: 15000,
      total_value: 250000.00,
      product_count: 156,
      low_stock_count: 12
    },
    {
      id: 'w2',
      name: 'Magazin Cluj',
      code: 'MG-002',
      warehouse_type: 'store',
      address: 'Bd. Eroilor nr. 25',
      city: 'Cluj-Napoca',
      county: 'Cluj',
      postal_code: '400129',
      phone: '+40264123456',
      email: 'magazin@company.ro',
      is_active: true,
      is_sellable: true,
      total_stock: 5000,
      total_value: 80000.00,
      product_count: 75,
      low_stock_count: 5
    },
    {
      id: 'w3',
      name: 'Dropship Provider',
      code: 'DS-003',
      warehouse_type: 'dropship',
      address: '-',
      city: 'Online',
      county: '-',
      postal_code: '-',
      phone: '-',
      email: 'dropship@provider.com',
      is_active: true,
      is_sellable: true,
      total_stock: 0,
      total_value: 0,
      product_count: 0,
      low_stock_count: 0
    }
  ]
};

describe('WarehousesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'fake-token';
      if (key === 'company_id') return 'test-company-id';
      return null;
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockWarehousesResponse
    });
  });

  it('renders page title and description', () => {
    renderWithRouter(<WarehousesPage />);

    expect(screen.getByText('🏢 Depozite & Locații')).toBeTruthy();
    expect(screen.getByText('Gestionați depozitele, magazinele și punctele de stocare')).toBeTruthy();
  });

  it('displays "Depozit Nou" button', () => {
    renderWithRouter(<WarehousesPage />);

    const newWarehouseButton = screen.getByText('Depozit Nou');
    expect(newWarehouseButton).toBeTruthy();
  });

  it('displays loading state initially', () => {
    // Make fetch delay to keep loading state
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));

    renderWithRouter(<WarehousesPage />);

    expect(screen.getByText('Se încarcă depozitele...')).toBeTruthy();
  });

  it('fetches and displays warehouses after loading', async () => {
    renderWithRouter(<WarehousesPage />);

    await waitFor(() => {
      expect(screen.getByText('Depozit Central București')).toBeTruthy();
      expect(screen.getByText('DC-001')).toBeTruthy();
      expect(screen.getByText('Magazin Cluj')).toBeTruthy();
      expect(screen.getByText('MG-002')).toBeTruthy();
      expect(screen.getByText('Dropship Provider')).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('displays warehouse type badges with correct labels', async () => {
    renderWithRouter(<WarehousesPage />);

    await waitFor(() => {
      expect(screen.getByText('Depozit')).toBeTruthy(); // warehouse type
      expect(screen.getByText('Magazin')).toBeTruthy(); // store type
      expect(screen.getByText('Dropshipping')).toBeTruthy(); // dropship type
    }, { timeout: 2000 });
  });

  it('displays warehouse location information', async () => {
    renderWithRouter(<WarehousesPage />);

    await waitFor(() => {
      // Check that some location data appears
      const locationElements = screen.getAllByText(/București|Cluj|Online/);
      expect(locationElements.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  it('displays warehouse codes and names', async () => {
    renderWithRouter(<WarehousesPage />);

    await waitFor(() => {
      expect(screen.getByText('DC-001')).toBeTruthy();
      expect(screen.getByText('MG-002')).toBeTruthy();
      expect(screen.getByText('DS-003')).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('uses correct API endpoint with company_id and token', async () => {
    renderWithRouter(<WarehousesPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/inventory/warehouses.php'),
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

  it('displays "Niciun depozit" when no warehouses returned', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ warehouses: [] })
    });

    renderWithRouter(<WarehousesPage />);

    await waitFor(() => {
      expect(screen.getByText(/Niciun depozit/)).toBeTruthy();
    }, { timeout: 2000 });
  });
});
