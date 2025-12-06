import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ProductsPage from '../../pages/inventory/ProductsPage';

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

const mockProductsResponse = {
  products: [
    {
      id: '1',
      sku: 'PROD-001',
      name: 'Laptop Dell XPS 13',
      category: 'Electronics',
      unit_of_measure: 'buc',
      selling_price: 5999.99,
      purchase_price: 4500.00,
      profit_margin: 33.3,
      total_stock: 15,
      total_reserved: 3,
      total_free: 12,
      warehouse_count: 2,
      is_low_stock: false,
      is_active: true
    },
    {
      id: '2',
      sku: 'PROD-002',
      name: 'Mouse Logitech MX Master',
      category: 'Electronics',
      unit_of_measure: 'buc',
      selling_price: 399.99,
      purchase_price: 250.00,
      profit_margin: 60.0,
      total_stock: 5,
      total_reserved: 1,
      total_free: 4,
      warehouse_count: 1,
      is_low_stock: true,
      is_active: true
    },
    {
      id: '3',
      sku: 'PROD-003',
      name: 'Tastatură Mecanică',
      category: 'Electronics',
      unit_of_measure: 'buc',
      selling_price: 599.99,
      purchase_price: 450.00,
      profit_margin: 33.3,
      total_stock: 0,
      total_reserved: 0,
      total_free: 0,
      warehouse_count: 0,
      is_low_stock: false,
      is_active: true
    }
  ],
  summary: {
    total_products: 3,
    total_units: 20,
    total_value: 125000.00,
    low_stock_products: 1,
    out_of_stock_products: 1
  }
};

describe('ProductsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'fake-token';
      if (key === 'company_id') return 'test-company-id';
      return null;
    });
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockProductsResponse
    });
  });

  it('displays loading state initially', () => {
    renderWithRouter(<ProductsPage />);
    expect(screen.getByText('Se încarcă produsele...')).toBeTruthy();
  });

  it('renders page title and description', async () => {
    renderWithRouter(<ProductsPage />);

    expect(screen.getByText('📦 Produse & Inventar')).toBeTruthy();
    expect(screen.getByText('Gestionați catalogul de produse și monitorizați stocurile')).toBeTruthy();
  });

  it('displays "Produs Nou" button', async () => {
    renderWithRouter(<ProductsPage />);

    const newProductButton = screen.getByText('Produs Nou');
    expect(newProductButton).toBeTruthy();
  });

  it('fetches and displays products after loading', async () => {
    renderWithRouter(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('Laptop Dell XPS 13')).toBeTruthy();
      expect(screen.getByText('SKU: PROD-001')).toBeTruthy();
      expect(screen.getByText('Mouse Logitech MX Master')).toBeTruthy();
      expect(screen.getByText('SKU: PROD-002')).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('displays statistics cards with correct values', async () => {
    renderWithRouter(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('Total Produse')).toBeTruthy();
      expect(screen.getAllByText('3').length).toBeGreaterThan(0); // total_products (may appear in multiple places)
      expect(screen.getByText('Unități Stoc')).toBeTruthy();
      expect(screen.getByText('20')).toBeTruthy(); // total_units
      expect(screen.getByText('Stoc Scăzut')).toBeTruthy();
      expect(screen.getAllByText('1').length).toBeGreaterThan(0); // low_stock_products
    }, { timeout: 2000 });
  });

  it('displays product prices in RON currency format', async () => {
    renderWithRouter(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('5.999,99 RON')).toBeTruthy();
      expect(screen.getByText('399,99 RON')).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('displays profit margins with correct values', async () => {
    renderWithRouter(<ProductsPage />);

    await waitFor(() => {
      const margins = screen.getAllByText(/33\.3%|60\.0%/);
      expect(margins.length).toBeGreaterThanOrEqual(2);
    }, { timeout: 2000 });
  });

  it('displays stock status badges correctly', async () => {
    renderWithRouter(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('În stoc')).toBeTruthy(); // for product with stock
      expect(screen.getByText('Stoc scăzut')).toBeTruthy(); // for low stock product
      expect(screen.getByText('Stoc epuizat')).toBeTruthy(); // for out of stock product
    }, { timeout: 2000 });
  });

  it('has search input field', async () => {
    renderWithRouter(<ProductsPage />);

    const searchInput = screen.getByPlaceholderText('Caută produs, SKU sau cod bare...');
    expect(searchInput).toBeTruthy();
  });

  it('has category filter dropdown', async () => {
    renderWithRouter(<ProductsPage />);

    const categorySelect = screen.getByRole('combobox');
    expect(categorySelect).toBeTruthy();

    // Check for category options
    await waitFor(() => {
      expect(screen.getByText('Toate categoriile')).toBeTruthy();
      expect(screen.getByText('Electronice')).toBeTruthy();
      expect(screen.getByText('Îmbrăcăminte')).toBeTruthy();
    }, { timeout: 1000 });
  });

  it('has low stock filter checkbox', async () => {
    renderWithRouter(<ProductsPage />);

    const lowStockCheckbox = screen.getByRole('checkbox');
    expect(lowStockCheckbox).toBeTruthy();
    expect(screen.getByText('Doar stoc scăzut')).toBeTruthy();
  });

  it('triggers search when typing in search field', async () => {
    renderWithRouter(<ProductsPage />);

    const searchInput = screen.getByPlaceholderText('Caută produs, SKU sau cod bare...') as HTMLInputElement;

    fireEvent.change(searchInput, { target: { value: 'Laptop' } });

    expect(searchInput.value).toBe('Laptop');

    // Should trigger a new fetch with search parameter
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('search=Laptop'),
        expect.any(Object)
      );
    }, { timeout: 1000 });
  });

  it('resets filters when clicking "Resetează filtre" button', async () => {
    renderWithRouter(<ProductsPage />);

    // Set some filters first
    const searchInput = screen.getByPlaceholderText('Caută produs, SKU sau cod bare...') as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(searchInput.value).toBe('test');
    });

    // Click reset button
    const resetButton = screen.getByText('Resetează filtre');
    fireEvent.click(resetButton);

    // Check that search is cleared
    await waitFor(() => {
      expect(searchInput.value).toBe('');
    });
  });

  it('displays action buttons for each product', async () => {
    renderWithRouter(<ProductsPage />);

    await waitFor(() => {
      const viewButtons = screen.getAllByText('Vizualizare');
      const editButtons = screen.getAllByText('Editează');

      expect(viewButtons.length).toBeGreaterThan(0);
      expect(editButtons.length).toBeGreaterThan(0);
    }, { timeout: 2000 });
  });

  it('displays "Niciun produs găsit" when no products returned', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ products: [], summary: null })
    });

    renderWithRouter(<ProductsPage />);

    await waitFor(() => {
      expect(screen.getByText('Niciun produs găsit')).toBeTruthy();
      expect(screen.getByText('Începeți prin a adăuga primul produs')).toBeTruthy();
    }, { timeout: 2000 });
  });

  it('uses correct API endpoint with company_id and token', async () => {
    renderWithRouter(<ProductsPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/inventory/products.php'),
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
});
