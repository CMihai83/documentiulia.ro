import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react';
import { invoiceAPI, contactAPI } from '../services/api';
import type { Invoice, InvoiceLineItem, Contact } from '../types';
import DashboardLayout from '../components/layout/DashboardLayout';

const InvoiceFormPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Contact[]>([]);

  const [formData, setFormData] = useState({
    customer_id: 0,
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'draft' as Invoice['status'],
    notes: '',
  });

  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([
    { description: '', quantity: 1, unit_price: 0, tax_rate: 0, amount: 0 },
  ]);

  useEffect(() => {
    loadCustomers();
    if (isEdit) {
      loadInvoice();
    }
  }, [id]);

  const loadCustomers = async () => {
    try {
      const data = await contactAPI.list('customer');
      setCustomers(data);
    } catch (error) {
      console.error('Failed to load customers:', error);
    }
  };

  const loadInvoice = async () => {
    if (!id) return;
    try {
      // In a real app, you'd have an API endpoint to get a single invoice
      const invoices = await invoiceAPI.list();
      const invoice = invoices.find((inv) => inv.id === parseInt(id));
      if (invoice) {
        setFormData({
          customer_id: invoice.customer_id,
          invoice_date: invoice.invoice_date,
          due_date: invoice.due_date,
          status: invoice.status,
          notes: '',
        });
        if (invoice.line_items && invoice.line_items.length > 0) {
          setLineItems(invoice.line_items);
        }
      }
    } catch (error) {
      console.error('Failed to load invoice:', error);
    }
  };

  const calculateLineAmount = (quantity: number, unitPrice: number, taxRate: number) => {
    const subtotal = quantity * unitPrice;
    const tax = subtotal * (taxRate / 100);
    return subtotal + tax;
  };

  const handleLineItemChange = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const newItems = [...lineItems];
    newItems[index] = { ...newItems[index], [field]: value };

    // Recalculate amount
    if (field === 'quantity' || field === 'unit_price' || field === 'tax_rate') {
      newItems[index].amount = calculateLineAmount(
        newItems[index].quantity,
        newItems[index].unit_price,
        newItems[index].tax_rate
      );
    }

    setLineItems(newItems);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, tax_rate: 0, amount: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.unit_price;
      return sum + lineSubtotal;
    }, 0);

    const taxAmount = lineItems.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.unit_price;
      const lineTax = lineSubtotal * (item.tax_rate / 100);
      return sum + lineTax;
    }, 0);

    const total = subtotal + taxAmount;

    return { subtotal, taxAmount, total };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.customer_id === 0) {
      alert('Please select a customer');
      return;
    }

    const { subtotal, taxAmount, total } = calculateTotals();

    const invoiceData = {
      ...formData,
      subtotal,
      tax_amount: taxAmount,
      total,
      line_items: lineItems,
    };

    setLoading(true);
    try {
      if (isEdit) {
        await invoiceAPI.update(parseInt(id!), invoiceData);
        alert('Invoice updated successfully!');
      } else {
        await invoiceAPI.create(invoiceData);
        alert('Invoice created successfully!');
      }
      navigate('/invoices');
    } catch (error) {
      console.error('Failed to save invoice:', error);
      alert('Failed to save invoice');
    } finally {
      setLoading(false);
    }
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/invoices')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isEdit ? 'Editează Factură' : 'Factură Nouă'}
              </h1>
              <p className="text-gray-600 mt-1">Completează detaliile facturii</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Customer & Dates */}
              <div className="card">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Invoice Details</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer *
                    </label>
                    <select
                      value={formData.customer_id}
                      onChange={(e) => setFormData({ ...formData, customer_id: parseInt(e.target.value) })}
                      className="input"
                      required
                    >
                      <option value={0}>Select a customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.display_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as Invoice['status'] })}
                      className="input"
                    >
                      <option value="draft">Draft</option>
                      <option value="sent">Sent</option>
                      <option value="paid">Paid</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Issue Date *
                    </label>
                    <input
                      type="date"
                      value={formData.invoice_date}
                      onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                      className="input"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={formData.due_date}
                      onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                      className="input"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Line Items</h2>
                  <button
                    type="button"
                    onClick={addLineItem}
                    className="btn-secondary flex items-center gap-2 text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-4">
                  {lineItems.map((item, index) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-lg">
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-12 md:col-span-5">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Description
                          </label>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                            className="input"
                            placeholder="Item description"
                            required
                          />
                        </div>

                        <div className="col-span-4 md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Qty
                          </label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, 'quantity', parseFloat(e.target.value))}
                            className="input"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>

                        <div className="col-span-4 md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Price
                          </label>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value))}
                            className="input"
                            min="0"
                            step="0.01"
                            required
                          />
                        </div>

                        <div className="col-span-3 md:col-span-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Tax %
                          </label>
                          <input
                            type="number"
                            value={item.tax_rate}
                            onChange={(e) => handleLineItemChange(index, 'tax_rate', parseFloat(e.target.value))}
                            className="input"
                            min="0"
                            step="0.01"
                          />
                        </div>

                        <div className="col-span-1 flex items-end justify-center">
                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                            disabled={lineItems.length === 1}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 text-right">
                        <span className="text-sm text-gray-600">Amount: </span>
                        <span className="text-sm font-semibold text-gray-900">
                          ${item.amount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="card">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input"
                  rows={3}
                  placeholder="Additional notes or payment terms..."
                />
              </div>
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="card sticky top-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">${taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200">
                    <div className="flex justify-between">
                      <span className="text-lg font-semibold text-gray-900">Total:</span>
                      <span className="text-lg font-bold text-primary-600">${total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {isEdit ? 'Update Invoice' : 'Create Invoice'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default InvoiceFormPage;
