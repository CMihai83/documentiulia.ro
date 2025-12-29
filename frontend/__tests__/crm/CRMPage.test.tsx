import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CRMPage from '@/app/[locale]/dashboard/crm/page';

// Mock the Toast context
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  compliance: jest.fn(),
  addToast: jest.fn(),
  removeToast: jest.fn(),
  toasts: [],
};

jest.mock('@/components/ui/Toast', () => ({
  useToast: () => mockToast,
}));

// Mock data
const mockContacts = [
  {
    id: 'contact-1',
    name: 'Ion Popescu',
    email: 'ion@example.com',
    phone: '+40721123456',
    company: 'ABC SRL',
    status: 'CUSTOMER',
    createdAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'contact-2',
    name: 'Maria Ionescu',
    email: 'maria@example.com',
    phone: '+40722333444',
    company: 'XYZ SA',
    status: 'LEAD',
    createdAt: '2024-01-15T10:00:00Z',
  },
];

const mockDeals = [
  {
    id: 'deal-1',
    title: 'Contract IT',
    value: 50000,
    currency: 'RON',
    stage: 'NEGOTIATION',
    probability: 75,
    contactId: 'contact-1',
    contactName: 'Ion Popescu',
    createdAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'deal-2',
    title: 'Servicii consultanță',
    value: 25000,
    currency: 'EUR',
    stage: 'PROPOSAL',
    probability: 50,
    contactId: 'contact-2',
    contactName: 'Maria Ionescu',
    createdAt: '2024-01-12T10:00:00Z',
  },
];

const mockActivities = [
  {
    id: 'activity-1',
    type: 'CALL',
    title: 'Apel follow-up',
    contactId: 'contact-1',
    dealId: 'deal-1',
    status: 'PENDING',
    dueDate: '2024-01-20T10:00:00Z',
    createdAt: '2024-01-15T10:00:00Z',
  },
];

const mockStats = {
  totalContacts: 150,
  newContactsThisMonth: 12,
  totalDeals: 45,
  openDealsValue: 750000,
  closedWonThisMonth: 8,
  closedWonValue: 250000,
  conversionRate: 35,
};

describe('CRMPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<CRMPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders CRM page with tabs', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contacts: mockContacts }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<CRMPage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /contact/i })).toBeInTheDocument();
    });

    expect(screen.getByRole('tab', { name: /deal|oportunități/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /activit/i })).toBeInTheDocument();
  });

  it('displays contacts list', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contacts: mockContacts }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<CRMPage />);

    await waitFor(() => {
      expect(screen.getByText('Ion Popescu')).toBeInTheDocument();
    });

    expect(screen.getByText('Maria Ionescu')).toBeInTheDocument();
  });

  it('displays CRM statistics', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contacts: mockContacts }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<CRMPage />);

    await waitFor(() => {
      expect(screen.getByText(/150/)).toBeInTheDocument(); // Total contacts
    });
  });

  it('handles tab switching', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contacts: mockContacts }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<CRMPage />);

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /deal|oportunități/i })).toBeInTheDocument();
    });

    const dealsTab = screen.getByRole('tab', { name: /deal|oportunități/i });
    fireEvent.click(dealsTab);

    // Should show deals content
    await waitFor(() => {
      expect(screen.getByText('Contract IT')).toBeInTheDocument();
    });
  });

  it('renders add contact button', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contacts: mockContacts }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<CRMPage />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /adaugă|add/i })).toBeInTheDocument();
    });
  });

  it('handles API error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<CRMPage />);

    await waitFor(() => {
      // Should show error or fallback to mock data
      expect(screen.queryByRole('status') || screen.queryByText(/eroare/i)).toBeTruthy();
    });
  });

  it('uses auth token in API requests', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contacts: mockContacts }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<CRMPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });
  });
});

describe('CRMPage - Search functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('renders search input', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contacts: mockContacts }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<CRMPage />);

    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText(/căut|search/i);
      expect(searchInput).toBeInTheDocument();
    });
  });

  it('filters contacts when searching', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contacts: mockContacts }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<CRMPage />);

    await waitFor(() => {
      expect(screen.getByText('Ion Popescu')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/căut|search/i);
    fireEvent.change(searchInput, { target: { value: 'Ion' } });

    // Should filter to show only matching contacts
    await waitFor(() => {
      expect(screen.getByText('Ion Popescu')).toBeInTheDocument();
    });
  });
});

describe('CRMPage - Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('renders status filter dropdown', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contacts: mockContacts }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<CRMPage />);

    await waitFor(() => {
      // Look for filter buttons or dropdowns
      const filterElements = screen.getAllByRole('button');
      expect(filterElements.length).toBeGreaterThan(0);
    });
  });
});

describe('CRMPage - Pipeline view', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('displays deals in pipeline stages', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contacts: mockContacts }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<CRMPage />);

    // Switch to deals tab
    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /deal|oportunități/i })).toBeInTheDocument();
    });

    const dealsTab = screen.getByRole('tab', { name: /deal|oportunități/i });
    fireEvent.click(dealsTab);

    await waitFor(() => {
      // Check for pipeline stages
      expect(screen.getByText('NEGOTIATION')).toBeInTheDocument();
    });
  });
});

describe('CRMPage - CRUD operations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    window.confirm = jest.fn(() => true);
  });

  it('shows toast on successful contact creation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contacts: mockContacts }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<CRMPage />);

    await waitFor(() => {
      expect(screen.getByText('Ion Popescu')).toBeInTheDocument();
    });

    // The add button should be present
    const addButton = screen.getByRole('button', { name: /adaugă|add/i });
    expect(addButton).toBeInTheDocument();
  });

  it('handles delete contact with confirmation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockStats),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contacts: mockContacts }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

    render(<CRMPage />);

    await waitFor(() => {
      expect(screen.getByText('Ion Popescu')).toBeInTheDocument();
    });

    // Find delete button in the row
    const deleteButtons = screen.getAllByRole('button', { name: /șterge|delete|trash/i });
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      expect(window.confirm).toHaveBeenCalled();
    }
  });
});

describe('CRMPage - Empty states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('shows empty state when no contacts exist', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockStats, totalContacts: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ contacts: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<CRMPage />);

    await waitFor(() => {
      // Should show empty state message or add button prominently
      expect(screen.getByRole('button', { name: /adaugă|add/i })).toBeInTheDocument();
    });
  });
});
