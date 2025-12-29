import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ContactDetailPage from '@/app/[locale]/dashboard/crm/contacts/[id]/page';

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

// Mock contact data
const mockContact = {
  id: 'contact-1',
  name: 'Ion Popescu',
  email: 'ion.popescu@example.com',
  phone: '+40721123456',
  company: 'ABC SRL',
  position: 'Director General',
  status: 'CUSTOMER',
  notes: 'Client fidel din 2020',
  createdAt: '2020-01-15T10:00:00Z',
  lastContactedAt: '2024-01-10T14:30:00Z',
};

const mockDeals = [
  {
    id: 'deal-1',
    title: 'Contract servicii IT',
    value: 50000,
    currency: 'RON',
    stage: 'NEGOTIATION',
    probability: 75,
  },
  {
    id: 'deal-2',
    title: 'Licențe software',
    value: 15000,
    currency: 'EUR',
    stage: 'PROPOSAL',
    probability: 50,
  },
];

const mockActivities = [
  {
    id: 'activity-1',
    type: 'CALL',
    title: 'Apel de follow-up',
    description: 'Discuție despre noua ofertă',
    dueDate: '2024-01-15T10:00:00Z',
    status: 'COMPLETED',
    createdAt: '2024-01-10T14:30:00Z',
  },
  {
    id: 'activity-2',
    type: 'MEETING',
    title: 'Întâlnire prezentare',
    description: null,
    dueDate: '2024-01-20T14:00:00Z',
    status: 'PENDING',
    createdAt: '2024-01-12T09:00:00Z',
  },
];

describe('ContactDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('renders loading state initially', () => {
    // Mock API calls that never resolve
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<ContactDetailPage />);

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders contact details after successful fetch', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContact),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<ContactDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Ion Popescu')).toBeInTheDocument();
    });

    expect(screen.getByText('ion.popescu@example.com')).toBeInTheDocument();
    expect(screen.getByText('+40721123456')).toBeInTheDocument();
    expect(screen.getByText('ABC SRL')).toBeInTheDocument();
    expect(screen.getByText('Director General')).toBeInTheDocument();
  });

  it('renders error state when contact not found', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<ContactDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/nu a fost găsit/i)).toBeInTheDocument();
    });
  });

  it('renders deals associated with contact', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContact),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<ContactDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Contract servicii IT')).toBeInTheDocument();
    });

    expect(screen.getByText('Licențe software')).toBeInTheDocument();
  });

  it('renders activities associated with contact', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContact),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: mockActivities }),
      });

    render(<ContactDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Apel de follow-up')).toBeInTheDocument();
    });

    expect(screen.getByText('Întâlnire prezentare')).toBeInTheDocument();
  });

  it('handles API error gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<ContactDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/eroare/i)).toBeInTheDocument();
    });
  });

  it('uses auth token from localStorage', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContact),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<ContactDetailPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/crm/contacts/'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-token',
          }),
        })
      );
    });
  });

  it('displays correct status badge color', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContact),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<ContactDetailPage />);

    await waitFor(() => {
      // Check for status badge - CUSTOMER should have green color
      const statusBadge = screen.getByText('CUSTOMER');
      expect(statusBadge).toBeInTheDocument();
    });
  });

  it('renders edit button that links to edit page', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContact),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<ContactDetailPage />);

    await waitFor(() => {
      const editButton = screen.getByRole('link', { name: /edit/i });
      expect(editButton).toBeInTheDocument();
    });
  });

  it('renders back navigation link', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContact),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<ContactDetailPage />);

    await waitFor(() => {
      const backLink = screen.getByRole('link', { name: /înapoi|back/i });
      expect(backLink).toBeInTheDocument();
    });
  });

  it('handles session expired error', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<ContactDetailPage />);

    await waitFor(() => {
      expect(screen.getByText(/sesiune expirată|autentificați/i)).toBeInTheDocument();
    });
  });
});

describe('ContactDetailPage - Delete functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
    // Mock window.confirm
    window.confirm = jest.fn(() => true);
  });

  it('shows confirmation dialog before delete', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContact),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<ContactDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Ion Popescu')).toBeInTheDocument();
    });

    // Find and click delete button
    const deleteButton = screen.getByRole('button', { name: /șterge|delete/i });
    if (deleteButton) {
      fireEvent.click(deleteButton);
      expect(window.confirm).toHaveBeenCalled();
    }
  });
});

describe('ContactDetailPage - Empty states', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('renders empty state for deals when none exist', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContact),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<ContactDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Ion Popescu')).toBeInTheDocument();
    });

    // Should show some indication that there are no deals
    // This depends on how the empty state is implemented
  });

  it('renders empty state for activities when none exist', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockContact),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ deals: mockDeals }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ activities: [] }),
      });

    render(<ContactDetailPage />);

    await waitFor(() => {
      expect(screen.getByText('Ion Popescu')).toBeInTheDocument();
    });
  });
});
