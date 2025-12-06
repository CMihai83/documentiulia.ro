import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import InventoryDashboard from '../../pages/inventory/InventoryDashboard';

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('InventoryDashboard', () => {
  it('displays loading state initially', () => {
    renderWithRouter(<InventoryDashboard />);
    expect(screen.getByText('Se încarcă tabloul de bord...')).toBeTruthy();
  });

  it('renders dashboard title after loading', async () => {
    renderWithRouter(<InventoryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('📦 Tablou de Bord Inventar')).toBeTruthy();
    }, { timeout: 1000 });
  });

  it('displays all metric cards after loading', async () => {
    renderWithRouter(<InventoryDashboard />);

    await waitFor(() => {
      expect(screen.getAllByText('Total Produse').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Valoare Stoc').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Depozite Active').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Alerte Stoc Scăzut').length).toBeGreaterThan(0);
    }, { timeout: 1000 });
  });

  it('displays metric values correctly', async () => {
    renderWithRouter(<InventoryDashboard />);

    await waitFor(() => {
      expect(screen.getByText('156')).toBeTruthy();
      expect(screen.getByText('487.500,00 RON')).toBeTruthy();
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('12')).toBeTruthy();
    }, { timeout: 1000 });
  });
});
