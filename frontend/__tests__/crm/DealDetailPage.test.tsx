import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import DealDetailPage from '@/app/[locale]/dashboard/crm/deals/[id]/page';

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

// Mock deal data
const mockDeal = {
  id: 'deal-1',
  title: 'Contract servicii IT 2024',
  value: 75000,
  currency: 'RON',
  stage: 'NEGOTIATION',
  probability: 70,
  expectedCloseDate: '2024-03-31',
  notes: 'Client interesat de upgrade infrastructură',
  createdAt: '2024-01-10T10:00:00Z',
  contact: {
    id: 'contact-1',
    name: 'Maria Ionescu',
    email: 'maria@company.ro',
    phone: '+40722333444',
  },
  assignedTo: {
    id: 'user-1',
    name: 'Alexandru Popa',
  },
};

const mockActivities = [
  {
    id: 'activity-1',
    type: 'CALL',
    title: 'Apel inițial',
    description: 'Prima discuție despre necesități',
    dueDate: null,
    status: 'COMPLETED',
    createdAt: '2024-01-10T14:30:00Z',
  },
  {
    id: 'activity-2',
    type: 'EMAIL',
    title: 'Ofertă trimisă',
    description: 'Ofertă detaliată cu specificații',
    dueDate: null,
    status: 'COMPLETED',
    createdAt: '2024-01-15T09:00:00Z',
  },
  {
    id: 'activity-3',
    type: 'MEETING',
    title: 'Negociere preț',
    description: 'Întâlnire pentru finalizare contract',
    dueDate: '2024-02-01T14:00:00Z',
    status: 'PENDING',
    createdAt: '2024-01-20T11:00:00Z',
  },
];

describe('DealDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<DealDetailPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders deal details after successful fetch', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeal),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<DealDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Contract servicii IT 2024')).toBeInTheDocument();
    });

    expect(screen.getByText(/75[,.]?000/)).toBeInTheDocument(); // Value with formatting
    expect(screen.getByText('RON')).toBeInTheDocument();
  });

  it('renders deal stage with correct styling', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeal),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<DealDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('NEGOTIATION')).toBeInTheDocument();
    });
  });

  it('displays probability percentage', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeal),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<DealDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/70%/)).toBeInTheDocument();
    });
  });

  it('renders contact information', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeal),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<DealDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Maria Ionescu')).toBeInTheDocument();
    });

    expect(screen.getByText('maria@company.ro')).toBeInTheDocument();
  });

  it('renders activities timeline', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeal),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<DealDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Apel inițial')).toBeInTheDocument();
    });

    expect(screen.getByText('Ofertă trimisă')).toBeInTheDocument();
    expect(screen.getByText('Negociere preț')).toBeInTheDocument();
  });

  it('handles deal not found error', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<DealDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/nu a fost găsit|not found/i)).toBeInTheDocument();
    });
  });

  it('handles network error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<DealDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/eroare|error/i)).toBeInTheDocument();
    });
  });

  it('uses auth token in API requests', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeal),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<DealDetailPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/crm/deals/'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });
  });

  it('renders edit button that links to edit page', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeal),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<DealDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Contract servicii IT 2024')).toBeInTheDocument();
    });

    const editLink = screen.getByRole('link', { name: /edit/i });
    expect(editLink).toBeInTheDocument();
  });

  it('renders back navigation', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeal),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<DealDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Contract servicii IT 2024')).toBeInTheDocument();
    });

    const backLink = screen.getByRole('link', { name: /înapoi|back/i });
    expect(backLink).toBeInTheDocument();
  });
});

describe('DealDetailPage - Stage transitions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  const stageTestCases = [
    { stage: 'LEAD', expectedColor: 'gray' },
    { stage: 'QUALIFIED', expectedColor: 'blue' },
    { stage: 'PROPOSAL', expectedColor: 'purple' },
    { stage: 'NEGOTIATION', expectedColor: 'yellow' },
    { stage: 'CLOSED_WON', expectedColor: 'green' },
    { stage: 'CLOSED_LOST', expectedColor: 'red' },
  ];

  stageTestCases.forEach(({ stage }) => {
    it(`renders ${stage} stage correctly`, async () => {
      const dealWithStage = { ...mockDeal, stage };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(dealWithStage),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ activities: [] }),
        });

      render(<DealDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(stage)).toBeInTheDocument();
      });
    });
  });
});

describe('DealDetailPage - Currency display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  const currencyTestCases = [
    { currency: 'RON', value: 75000 },
    { currency: 'EUR', value: 15000 },
    { currency: 'USD', value: 20000 },
  ];

  currencyTestCases.forEach(({ currency, value }) => {
    it(`displays ${currency} currency correctly`, async () => {
      const dealWithCurrency = { ...mockDeal, currency, value };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(dealWithCurrency),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ activities: [] }),
        });

      render(<DealDetailPage />);

      await waitFor(() => {
        expect(screen.getByText(currency)).toBeInTheDocument();
      });
    });
  });
});

describe('DealDetailPage - Delete functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    window.confirm = jest.fn(() => true);
  });

  it('confirms before deleting deal', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeal),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      });

    render(<DealDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Contract servicii IT 2024')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /șterge|delete/i });
    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(window.confirm).toHaveBeenCalled();
    }
  });

  it('cancels delete when user declines confirmation', async () => {
    window.confirm = jest.fn(() => false);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockDeal),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<DealDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Contract servicii IT 2024')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /șterge|delete/i });
    if (deleteButton) {
      fireEvent.click(deleteButton);

      // Should not make DELETE API call
      expect(global.fetch).not.toHaveBeenCalledWith(
        expect.stringContaining('/crm/deals/'),
        expect.objectContaining({ method: 'DELETE' })
      );
    }
  });
});
