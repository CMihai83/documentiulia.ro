import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { InvoiceForm } from '@/components/forms/InvoiceForm';
import { invoiceSchema, type InvoiceFormData } from '@/lib/validation/schemas';

// Mock the required dependencies
jest.mock('@hookform/resolvers/zod', () => ({
  zodResolver: jest.fn(() => (data: any) => ({ values: data, errors: {} })),
}));

jest.mock('lucide-react', () => ({
  Plus: () => <div data-testid="plus-icon" />,
  Trash2: () => <div data-testid="trash-icon" />,
  Save: () => <div data-testid="save-icon" />,
  Send: () => <div data-testid="send-icon" />,
  AlertCircle: () => <div data-testid="alert-icon" />,
}));

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

jest.mock('@/lib/hooks/useDataFetch', () => ({
  useVatRates: () => ({
    data: { standard: 19, reduced: [9, 5] },
    isLoading: false,
    error: null,
  }),
}));

jest.mock('@/components/ui/AnimatedButton', () => ({
  AnimatedButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  FadeIn: ({ children }: any) => <div>{children}</div>,
  SlideIn: ({ children }: any) => <div>{children}</div>,
}));

// Mock react-hook-form
jest.mock('react-hook-form', () => ({
  useForm: jest.fn(),
  useFieldArray: jest.fn(),
  Controller: ({ children, ...props }: any) => children({
    field: {
      value: props.defaultValue || '',
      onChange: jest.fn(),
      onBlur: jest.fn(),
    },
    fieldState: { error: null },
  }),
}));

const mockUseForm = require('react-hook-form').useForm;
const mockUseFieldArray = require('react-hook-form').useFieldArray;

describe('InvoiceForm', () => {
  const mockOnSubmit = jest.fn().mockResolvedValue(undefined);
  const mockOnSaveDraft = jest.fn();

  const mockForm = {
    register: jest.fn((name: string) => ({
      name,
      onChange: jest.fn(),
      onBlur: jest.fn(),
    })),
    control: {},
    handleSubmit: jest.fn((fn) => (e?: any) => {
      e?.preventDefault?.();
      return fn({
        series: 'FV',
        number: '001',
        issuedAt: '2024-01-01',
        dueDate: '2024-01-31',
        currency: 'RON',
        paymentMethod: 'transfer',
        sendToAnaf: false,
        items: [{
          description: 'Test Item',
          quantity: 1,
          unit: 'buc',
          unitPrice: 100,
          vatRate: 19,
          discount: 0,
        }],
        client: {
          name: 'Test Client',
          cui: 'RO12345678',
          address: 'Test Address',
          email: 'test@example.com',
        },
        notes: 'Test notes',
      });
    }),
    watch: jest.fn((field?: string) => {
      if (field === 'items') {
        return [{
          description: 'Test Item',
          quantity: 1,
          unit: 'buc',
          unitPrice: 100,
          vatRate: 19,
          discount: 0,
        }];
      }
      return '';
    }),
    setValue: jest.fn(),
    formState: {
      errors: {},
      isDirty: false,
    },
  };

  const mockFieldArray = {
    fields: [{
      id: 'item-1',
      description: 'Test Item',
      quantity: 1,
      unit: 'buc',
      unitPrice: 100,
      vatRate: 19,
      discount: 0,
    }],
    append: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseForm.mockReturnValue(mockForm);
    mockUseFieldArray.mockReturnValue(mockFieldArray);
  });

  describe('Form Rendering', () => {
    it('renders the invoice form with all required fields', () => {
      render(<InvoiceForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Serie Factură')).toBeInTheDocument();
      expect(screen.getByText('Număr Factură')).toBeInTheDocument();
      expect(screen.getByText('Data Emiterii')).toBeInTheDocument();
      expect(screen.getByText('Data Scadenței')).toBeInTheDocument();
      expect(screen.getByText('Monedă')).toBeInTheDocument();
    });

    it('renders client information section', () => {
      render(<InvoiceForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Date Client')).toBeInTheDocument();
      expect(screen.getByText('Nume Client')).toBeInTheDocument();
      expect(screen.getByText('CUI')).toBeInTheDocument();
      expect(screen.getByText('Adresă')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
    });

    it('renders invoice items section', () => {
      render(<InvoiceForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Produse/Servicii')).toBeInTheDocument();
      expect(screen.getByText('Descriere')).toBeInTheDocument();
      expect(screen.getByText('Cantitate')).toBeInTheDocument();
      expect(screen.getByText('Preț Unitate')).toBeInTheDocument();
      expect(screen.getByText('TVA (%)')).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with valid form data when form is submitted', async () => {
      render(<InvoiceForm onSubmit={mockOnSubmit} />);

      const submitButton = screen.getByRole('button', { name: /trimite factură/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          series: 'FV',
          number: '001',
          issuedAt: '2024-01-01',
          dueDate: '2024-01-31',
          currency: 'RON',
          paymentMethod: 'transfer',
          sendToAnaf: false,
          items: [{
            description: 'Test Item',
            quantity: 1,
            unit: 'buc',
            unitPrice: 100,
            vatRate: 19,
            discount: 0,
          }],
          client: {
            name: 'Test Client',
            cui: 'RO12345678',
            address: 'Test Address',
            email: 'test@example.com',
          },
          notes: 'Test notes',
        });
      });
    });

    it('shows loading state when submitting', () => {
      render(<InvoiceForm onSubmit={mockOnSubmit} isSubmitting={true} />);

      const submitButton = screen.getByRole('button', { name: /se trimite/i });
      expect(submitButton).toBeDisabled();
    });

    it('calls onSaveDraft when save draft button is clicked', () => {
      render(<InvoiceForm onSubmit={mockOnSubmit} onSaveDraft={mockOnSaveDraft} />);

      const saveDraftButton = screen.getByRole('button', { name: /salvează ciornă/i });
      fireEvent.click(saveDraftButton);

      expect(mockOnSaveDraft).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('displays validation errors for required fields', async () => {
      const formWithErrors = {
        ...mockForm,
        formState: {
          errors: {
            series: { message: 'Serie este obligatorie' },
            number: { message: 'Număr este obligatoriu' },
          },
          isDirty: true,
        },
      };

      mockUseForm.mockReturnValue(formWithErrors);

      render(<InvoiceForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Serie este obligatorie')).toBeInTheDocument();
      expect(screen.getByText('Număr este obligatoriu')).toBeInTheDocument();
    });

    it('validates client information', async () => {
      const formWithClientErrors = {
        ...mockForm,
        formState: {
          errors: {
            client: {
              name: { message: 'Nume client este obligatoriu' },
              cui: { message: 'CUI este invalid' },
            },
          },
          isDirty: true,
        },
      };

      mockUseForm.mockReturnValue(formWithClientErrors);

      render(<InvoiceForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Nume client este obligatoriu')).toBeInTheDocument();
      expect(screen.getByText('CUI este invalid')).toBeInTheDocument();
    });
  });

  describe('Invoice Items Management', () => {
    it('allows adding new invoice items', () => {
      render(<InvoiceForm onSubmit={mockOnSubmit} />);

      const addItemButton = screen.getByRole('button', { name: /adaugă produs/i });
      fireEvent.click(addItemButton);

      expect(mockFieldArray.append).toHaveBeenCalledWith({
        description: '',
        quantity: 1,
        unit: 'buc',
        unitPrice: 0,
        vatRate: 19,
        discount: 0,
      });
    });

    it('allows removing invoice items', () => {
      render(<InvoiceForm onSubmit={mockOnSubmit} />);

      const removeButtons = screen.getAllByRole('button', { name: /șterge/i });
      if (removeButtons.length > 0) {
        fireEvent.click(removeButtons[0]);
        expect(mockFieldArray.remove).toHaveBeenCalledWith(0);
      }
    });

    it('calculates totals correctly', () => {
      const formWithCalculations = {
        ...mockForm,
        watch: jest.fn((field?: string) => {
          if (field === 'items') {
            return [{
              description: 'Test Item',
              quantity: 2,
              unit: 'buc',
              unitPrice: 100,
              vatRate: 19,
              discount: 10,
            }];
          }
          return '';
        }),
      };

      mockUseForm.mockReturnValue(formWithCalculations);

      render(<InvoiceForm onSubmit={mockOnSubmit} />);

      // Should show subtotal: 2 * 100 = 200
      // Discount: 10% of 200 = 20, so subtotal after discount: 180
      // TVA: 19% of 180 = 34.2
      // Total: 180 + 34.2 = 214.2
      expect(screen.getByText('214.20')).toBeInTheDocument();
    });
  });

  describe('ANAF Integration', () => {
    it('shows ANAF submission option', () => {
      render(<InvoiceForm onSubmit={mockOnSubmit} />);

      expect(screen.getByText('Trimite către ANAF')).toBeInTheDocument();
      expect(screen.getByText('e-Factura B2B')).toBeInTheDocument();
    });

    it('handles ANAF submission toggle', () => {
      render(<InvoiceForm onSubmit={mockOnSubmit} />);

      const anafCheckbox = screen.getByRole('checkbox', { name: /trimite către anaf/i });
      fireEvent.click(anafCheckbox);

      expect(mockForm.setValue).toHaveBeenCalledWith('sendToAnaf', true);
    });
  });

  describe('Currency Support', () => {
    it('supports multiple currencies', () => {
      render(<InvoiceForm onSubmit={mockOnSubmit} />);

      const currencySelect = screen.getByRole('combobox', { name: /monedă/i });
      expect(currencySelect).toBeInTheDocument();

      // Should have RON as default
      expect(screen.getByDisplayValue('RON')).toBeInTheDocument();
    });

    it('handles currency conversion for EUR', () => {
      const formWithEur = {
        ...mockForm,
        watch: jest.fn((field?: string) => {
          if (field === 'currency') return 'EUR';
          if (field === 'items') return mockFieldArray.fields;
          return '';
        }),
      };

      mockUseForm.mockReturnValue(formWithEur);

      render(<InvoiceForm onSubmit={mockOnSubmit} />);

      // Should show EUR symbol in totals
      expect(screen.getByText('€')).toBeInTheDocument();
    });
  });
});