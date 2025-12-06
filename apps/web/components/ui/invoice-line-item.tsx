'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: number;
  discount?: number;
  discountType?: 'percent' | 'fixed';
  total: number;
  productId?: string;
  productCode?: string;
  notes?: string;
}

export interface InvoiceLineItemProps {
  item: LineItem;
  index: number;
  currency?: string;
  editable?: boolean;
  onUpdate?: (item: LineItem) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  className?: string;
}

export interface LineItemEditorProps {
  item?: Partial<LineItem>;
  currency?: string;
  vatRates?: number[];
  units?: string[];
  onSave: (item: Omit<LineItem, 'id' | 'total'>) => void;
  onCancel: () => void;
  className?: string;
}

export interface LineItemsListProps {
  items: LineItem[];
  currency?: string;
  editable?: boolean;
  onUpdate?: (items: LineItem[]) => void;
  showTotals?: boolean;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const defaultVatRates = [0, 5, 9, 19];
const defaultUnits = ['buc', 'kg', 'l', 'm', 'm²', 'm³', 'h', 'zi', 'lună', 'an', 'set', 'pachet'];

// ============================================================================
// Utility Functions
// ============================================================================

function formatCurrency(amount: number, currency: string = 'RON'): string {
  return new Intl.NumberFormat('ro-RO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

function calculateLineTotal(
  quantity: number,
  unitPrice: number,
  discount?: number,
  discountType?: 'percent' | 'fixed'
): number {
  let subtotal = quantity * unitPrice;
  if (discount) {
    if (discountType === 'percent') {
      subtotal -= subtotal * (discount / 100);
    } else {
      subtotal -= discount;
    }
  }
  return Math.max(0, subtotal);
}

// ============================================================================
// Invoice Line Item Component
// ============================================================================

export function InvoiceLineItem({
  item,
  index,
  currency = 'RON',
  editable = false,
  onUpdate,
  onDelete,
  onDuplicate,
  className,
}: InvoiceLineItemProps) {
  const [isEditing, setIsEditing] = React.useState(false);

  const handleSave = (updatedItem: Omit<LineItem, 'id' | 'total'>) => {
    if (onUpdate) {
      const total = calculateLineTotal(
        updatedItem.quantity,
        updatedItem.unitPrice,
        updatedItem.discount,
        updatedItem.discountType
      );
      onUpdate({ ...item, ...updatedItem, total });
    }
    setIsEditing(false);
  };

  if (isEditing && editable) {
    return (
      <LineItemEditor
        item={item}
        currency={currency}
        onSave={handleSave}
        onCancel={() => setIsEditing(false)}
        className={className}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'grid grid-cols-12 gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors',
        className
      )}
    >
      {/* Index */}
      <div className="col-span-1 flex items-center justify-center">
        <span className="w-6 h-6 flex items-center justify-center bg-muted rounded-full text-xs font-medium">
          {index + 1}
        </span>
      </div>

      {/* Description */}
      <div className="col-span-4">
        <p className="font-medium text-sm">{item.description}</p>
        {item.productCode && (
          <p className="text-xs text-muted-foreground">Cod: {item.productCode}</p>
        )}
        {item.notes && (
          <p className="text-xs text-muted-foreground mt-1">{item.notes}</p>
        )}
      </div>

      {/* Quantity & Unit */}
      <div className="col-span-2 text-center">
        <p className="font-medium text-sm">{item.quantity}</p>
        <p className="text-xs text-muted-foreground">{item.unit}</p>
      </div>

      {/* Unit Price */}
      <div className="col-span-2 text-right">
        <p className="font-medium text-sm">{formatCurrency(item.unitPrice, currency)}</p>
        {item.discount && (
          <p className="text-xs text-green-600">
            -{item.discountType === 'percent' ? `${item.discount}%` : formatCurrency(item.discount, currency)}
          </p>
        )}
      </div>

      {/* VAT */}
      <div className="col-span-1 text-center">
        <p className="text-sm">{item.vatRate}%</p>
      </div>

      {/* Total */}
      <div className="col-span-2 text-right flex items-center justify-end gap-2">
        <p className="font-semibold text-sm">{formatCurrency(item.total, currency)}</p>

        {editable && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 hover:bg-muted rounded transition-colors"
              title="Editează"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
            {onDuplicate && (
              <button
                onClick={onDuplicate}
                className="p-1 hover:bg-muted rounded transition-colors"
                title="Duplică"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 rounded transition-colors"
                title="Șterge"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Line Item Editor Component
// ============================================================================

export function LineItemEditor({
  item,
  currency = 'RON',
  vatRates = defaultVatRates,
  units = defaultUnits,
  onSave,
  onCancel,
  className,
}: LineItemEditorProps) {
  const [formData, setFormData] = React.useState({
    description: item?.description || '',
    quantity: item?.quantity || 1,
    unit: item?.unit || 'buc',
    unitPrice: item?.unitPrice || 0,
    vatRate: item?.vatRate || 19,
    discount: item?.discount || 0,
    discountType: item?.discountType || 'percent' as const,
    productCode: item?.productCode || '',
    notes: item?.notes || '',
  });

  const calculatedTotal = calculateLineTotal(
    formData.quantity,
    formData.unitPrice,
    formData.discount,
    formData.discountType
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <motion.form
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      onSubmit={handleSubmit}
      className={cn('p-4 rounded-lg border-2 border-primary/20 bg-card space-y-4', className)}
    >
      {/* Description */}
      <div>
        <label className="block text-sm font-medium mb-1">Descriere *</label>
        <input
          type="text"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border rounded-md bg-background"
          placeholder="Descrierea produsului sau serviciului"
          required
        />
      </div>

      {/* Quantity, Unit, Unit Price */}
      <div className="grid grid-cols-4 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Cantitate *</label>
          <input
            type="number"
            value={formData.quantity}
            onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-md bg-background"
            min="0"
            step="0.01"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Unitate</label>
          <select
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            {units.map((unit) => (
              <option key={unit} value={unit}>{unit}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Preț unitar *</label>
          <input
            type="number"
            value={formData.unitPrice}
            onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-md bg-background"
            min="0"
            step="0.01"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">TVA</label>
          <select
            value={formData.vatRate}
            onChange={(e) => setFormData({ ...formData, vatRate: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            {vatRates.map((rate) => (
              <option key={rate} value={rate}>{rate}%</option>
            ))}
          </select>
        </div>
      </div>

      {/* Discount */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium mb-1">Discount</label>
          <input
            type="number"
            value={formData.discount}
            onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-md bg-background"
            min="0"
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Tip discount</label>
          <select
            value={formData.discountType}
            onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'percent' | 'fixed' })}
            className="w-full px-3 py-2 border rounded-md bg-background"
          >
            <option value="percent">Procent (%)</option>
            <option value="fixed">Valoare fixă ({currency})</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Cod produs</label>
          <input
            type="text"
            value={formData.productCode}
            onChange={(e) => setFormData({ ...formData, productCode: e.target.value })}
            className="w-full px-3 py-2 border rounded-md bg-background"
            placeholder="SKU"
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium mb-1">Note</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border rounded-md bg-background resize-none"
          rows={2}
          placeholder="Note adiționale pentru acest articol"
        />
      </div>

      {/* Total and Actions */}
      <div className="flex items-center justify-between pt-3 border-t">
        <div>
          <span className="text-sm text-muted-foreground">Total: </span>
          <span className="font-semibold">{formatCurrency(calculatedTotal, currency)}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border rounded-md hover:bg-muted transition-colors"
          >
            Anulează
          </button>
          <button
            type="submit"
            disabled={!formData.description}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Salvează
          </button>
        </div>
      </div>
    </motion.form>
  );
}

// ============================================================================
// Line Items List Component
// ============================================================================

export function LineItemsList({
  items,
  currency = 'RON',
  editable = false,
  onUpdate,
  showTotals = true,
  className,
}: LineItemsListProps) {
  const [isAdding, setIsAdding] = React.useState(false);

  const handleAddItem = (newItem: Omit<LineItem, 'id' | 'total'>) => {
    if (!onUpdate) return;

    const total = calculateLineTotal(
      newItem.quantity,
      newItem.unitPrice,
      newItem.discount,
      newItem.discountType
    );

    const item: LineItem = {
      ...newItem,
      id: crypto.randomUUID(),
      total,
    };

    onUpdate([...items, item]);
    setIsAdding(false);
  };

  const handleUpdateItem = (index: number, updatedItem: LineItem) => {
    if (!onUpdate) return;
    const newItems = [...items];
    newItems[index] = updatedItem;
    onUpdate(newItems);
  };

  const handleDeleteItem = (index: number) => {
    if (!onUpdate) return;
    onUpdate(items.filter((_, i) => i !== index));
  };

  const handleDuplicateItem = (index: number) => {
    if (!onUpdate) return;
    const itemToDuplicate = items[index];
    const duplicatedItem: LineItem = {
      ...itemToDuplicate,
      id: crypto.randomUUID(),
    };
    const newItems = [...items];
    newItems.splice(index + 1, 0, duplicatedItem);
    onUpdate(newItems);
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const vatByRate = items.reduce((acc, item) => {
    const vatAmount = item.total * (item.vatRate / 100);
    acc[item.vatRate] = (acc[item.vatRate] || 0) + vatAmount;
    return acc;
  }, {} as Record<number, number>);
  const totalVat = Object.values(vatByRate).reduce((sum, vat) => sum + vat, 0);
  const grandTotal = subtotal + totalVat;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-muted-foreground border-b">
        <div className="col-span-1 text-center">#</div>
        <div className="col-span-4">Descriere</div>
        <div className="col-span-2 text-center">Cantitate</div>
        <div className="col-span-2 text-right">Preț unitar</div>
        <div className="col-span-1 text-center">TVA</div>
        <div className="col-span-2 text-right">Total</div>
      </div>

      {/* Items */}
      <AnimatePresence mode="popLayout">
        {items.map((item, index) => (
          <InvoiceLineItem
            key={item.id}
            item={item}
            index={index}
            currency={currency}
            editable={editable}
            onUpdate={(updated) => handleUpdateItem(index, updated)}
            onDelete={() => handleDeleteItem(index)}
            onDuplicate={() => handleDuplicateItem(index)}
          />
        ))}
      </AnimatePresence>

      {/* Add New Item */}
      {editable && (
        <AnimatePresence>
          {isAdding ? (
            <LineItemEditor
              currency={currency}
              onSave={handleAddItem}
              onCancel={() => setIsAdding(false)}
            />
          ) : (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setIsAdding(true)}
              className="w-full p-3 border-2 border-dashed rounded-lg text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Adaugă articol
            </motion.button>
          )}
        </AnimatePresence>
      )}

      {/* Totals */}
      {showTotals && items.length > 0 && (
        <div className="pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal:</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          {Object.entries(vatByRate).map(([rate, amount]) => (
            <div key={rate} className="flex justify-between text-sm">
              <span className="text-muted-foreground">TVA {rate}%:</span>
              <span>{formatCurrency(amount, currency)}</span>
            </div>
          ))}
          <div className="flex justify-between text-lg font-semibold pt-2 border-t">
            <span>Total:</span>
            <span>{formatCurrency(grandTotal, currency)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Compact Line Item Component
// ============================================================================

export interface CompactLineItemProps {
  item: LineItem;
  currency?: string;
  className?: string;
}

export function CompactLineItem({ item, currency = 'RON', className }: CompactLineItemProps) {
  return (
    <div className={cn('flex items-center justify-between py-2', className)}>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.description}</p>
        <p className="text-xs text-muted-foreground">
          {item.quantity} {item.unit} × {formatCurrency(item.unitPrice, currency)}
        </p>
      </div>
      <p className="font-medium text-sm ml-4">{formatCurrency(item.total, currency)}</p>
    </div>
  );
}

// ============================================================================
// Line Item Summary Component
// ============================================================================

export interface LineItemsSummaryProps {
  items: LineItem[];
  currency?: string;
  className?: string;
}

export function LineItemsSummary({ items, currency = 'RON', className }: LineItemsSummaryProps) {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const totalVat = items.reduce((sum, item) => sum + item.total * (item.vatRate / 100), 0);
  const grandTotal = subtotal + totalVat;

  return (
    <div className={cn('p-4 bg-muted/50 rounded-lg space-y-2', className)}>
      <div className="flex justify-between text-sm">
        <span>{items.length} articole</span>
        <span>{formatCurrency(subtotal, currency)}</span>
      </div>
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>TVA total</span>
        <span>{formatCurrency(totalVat, currency)}</span>
      </div>
      <div className="flex justify-between font-semibold pt-2 border-t">
        <span>Total</span>
        <span>{formatCurrency(grandTotal, currency)}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export {
  formatCurrency as formatInvoiceCurrency,
  calculateLineTotal,
  defaultVatRates,
  defaultUnits,
};
