'use client';

import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Save, Send, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoiceSchema, type InvoiceFormData } from '@/lib/validation/schemas';
import { useVatRates } from '@/lib/hooks/useDataFetch';
import { AnimatedButton, FadeIn, SlideIn } from '@/components/ui/AnimatedButton';

/**
 * Invoice Form Component - DocumentIulia.ro
 * React Hook Form + Zod validation with Romanian support
 */

interface InvoiceFormProps {
  defaultValues?: Partial<InvoiceFormData>;
  onSubmit: (data: InvoiceFormData) => Promise<void>;
  onSaveDraft?: (data: Partial<InvoiceFormData>) => void;
  isSubmitting?: boolean;
}

export function InvoiceForm({
  defaultValues,
  onSubmit,
  onSaveDraft,
  isSubmitting = false,
}: InvoiceFormProps) {
  const { data: vatRates } = useVatRates();

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      series: '',
      number: '',
      issuedAt: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency: 'RON',
      paymentMethod: 'transfer',
      sendToAnaf: false,
      items: [{ description: '', quantity: 1, unit: 'buc', unitPrice: 0, vatRate: vatRates?.standard || 19, discount: 0 }],
      client: {
        name: '',
        address: '',
        city: '',
        county: '',
        country: 'Romania',
      },
      ...defaultValues,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const watchItems = watch('items');
  const watchCurrency = watch('currency');

  // Calculate totals
  const calculateItemTotal = (item: typeof watchItems[0]) => {
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = subtotal * (item.discount / 100);
    const afterDiscount = subtotal - discountAmount;
    const vatAmount = afterDiscount * (item.vatRate / 100);
    return {
      subtotal: afterDiscount,
      vat: vatAmount,
      total: afterDiscount + vatAmount,
    };
  };

  const totals = watchItems.reduce(
    (acc, item) => {
      const itemTotals = calculateItemTotal(item);
      return {
        subtotal: acc.subtotal + itemTotals.subtotal,
        vat: acc.vat + itemTotals.vat,
        total: acc.total + itemTotals.total,
      };
    },
    { subtotal: 0, vat: 0, total: 0 }
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ro-RO', {
      style: 'currency',
      currency: watchCurrency,
    }).format(amount);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Invoice Details Section */}
      <FadeIn>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Detalii Factura
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Seria *
              </label>
              <input
                {...register('series')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="ABC"
              />
              {errors.series && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.series.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Numarul *
              </label>
              <input
                {...register('number')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="0001"
              />
              {errors.number && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.number.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data emiterii *
              </label>
              <input
                type="date"
                {...register('issuedAt')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
              {errors.issuedAt && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.issuedAt.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Data scadentei *
              </label>
              <input
                type="date"
                {...register('dueDate')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              />
              {errors.dueDate && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.dueDate.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Client Section */}
      <SlideIn direction="left" delay={0.1}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            Date Client
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Denumire *
              </label>
              <input
                {...register('client.name')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="SC Exemplu SRL"
              />
              {errors.client?.name && (
                <p className="text-red-500 text-sm mt-1">{errors.client.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                CUI/CIF
              </label>
              <input
                {...register('client.cui')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="RO12345678"
              />
              {errors.client?.cui && (
                <p className="text-red-500 text-sm mt-1">{errors.client.cui.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                IBAN
              </label>
              <input
                {...register('client.iban')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="RO49AAAA1B31007593840000"
              />
              {errors.client?.iban && (
                <p className="text-red-500 text-sm mt-1">{errors.client.iban.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Banca
              </label>
              <input
                {...register('client.bank')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="Banca Transilvania"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Adresa *
              </label>
              <input
                {...register('client.address')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="Str. Exemplu nr. 1"
              />
              {errors.client?.address && (
                <p className="text-red-500 text-sm mt-1">{errors.client.address.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Oras *
              </label>
              <input
                {...register('client.city')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="Bucuresti"
              />
              {errors.client?.city && (
                <p className="text-red-500 text-sm mt-1">{errors.client.city.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Judet *
              </label>
              <input
                {...register('client.county')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                placeholder="Bucuresti"
              />
              {errors.client?.county && (
                <p className="text-red-500 text-sm mt-1">{errors.client.county.message}</p>
              )}
            </div>
          </div>
        </div>
      </SlideIn>

      {/* Invoice Items Section */}
      <SlideIn direction="right" delay={0.2}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Produse / Servicii
            </h2>
            <AnimatedButton
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => append({
                description: '',
                quantity: 1,
                unit: 'buc',
                unitPrice: 0,
                vatRate: vatRates?.standard || 19,
                discount: 0,
              })}
            >
              Adauga
            </AnimatedButton>
          </div>

          <div className="space-y-4">
            <AnimatePresence>
              {fields.map((field, index) => (
                <motion.div
                  key={field.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border rounded-lg p-4 dark:border-gray-700"
                >
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Descriere *
                      </label>
                      <input
                        {...register(`items.${index}.description`)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                        placeholder="Servicii de consultanta"
                      />
                      {errors.items?.[index]?.description && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors.items[index]?.description?.message}
                        </p>
                      )}
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Cant.
                      </label>
                      <Controller
                        name={`items.${index}.quantity`}
                        control={control}
                        render={({ field }) => (
                          <input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                          />
                        )}
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        UM
                      </label>
                      <select
                        {...register(`items.${index}.unit`)}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                      >
                        <option value="buc">buc</option>
                        <option value="kg">kg</option>
                        <option value="l">l</option>
                        <option value="m">m</option>
                        <option value="m2">m²</option>
                        <option value="ora">ora</option>
                        <option value="zi">zi</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Pret unitar
                      </label>
                      <Controller
                        name={`items.${index}.unitPrice`}
                        control={control}
                        render={({ field }) => (
                          <input
                            type="number"
                            step="0.01"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                          />
                        )}
                      />
                    </div>

                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        TVA %
                      </label>
                      <Controller
                        name={`items.${index}.vatRate`}
                        control={control}
                        render={({ field }) => (
                          <select
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                          >
                            <option value={vatRates?.standard || 19}>{vatRates?.standard || 19}%</option>
                            <option value={vatRates?.reduced || 9}>{vatRates?.reduced || 9}%</option>
                            <option value={vatRates?.special || 5}>{vatRates?.special || 5}%</option>
                            <option value={0}>0%</option>
                          </select>
                        )}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Total
                      </label>
                      <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-medium">
                        {formatCurrency(calculateItemTotal(watchItems[index]).total)}
                      </div>
                    </div>

                    <div className="md:col-span-1">
                      {fields.length > 1 && (
                        <AnimatedButton
                          type="button"
                          variant="danger"
                          size="sm"
                          onClick={() => remove(index)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </AnimatedButton>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {errors.items?.root && (
            <p className="text-red-500 text-sm mt-2">{errors.items.root.message}</p>
          )}
        </div>
      </SlideIn>

      {/* Totals Section */}
      <FadeIn delay={0.3}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="flex justify-end">
            <div className="w-full md:w-72 space-y-2">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal:</span>
                <span>{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>TVA:</span>
                <span>{formatCurrency(totals.vat)}</span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white border-t pt-2">
                <span>Total:</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>

      {/* Options Section */}
      <FadeIn delay={0.4}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Moneda
              </label>
              <select
                {...register('currency')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="RON">RON</option>
                <option value="EUR">EUR</option>
                <option value="USD">USD</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Metoda de plata
              </label>
              <select
                {...register('paymentMethod')}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="transfer">Transfer bancar</option>
                <option value="cash">Numerar</option>
                <option value="card">Card</option>
                <option value="other">Alta metoda</option>
              </select>
            </div>

            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('sendToAnaf')}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Trimite la ANAF (e-Factura)
                </span>
              </label>
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Note / Mentiuni
            </label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
              placeholder="Informatii suplimentare pentru factura..."
            />
          </div>
        </div>
      </FadeIn>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        {onSaveDraft && isDirty && (
          <AnimatedButton
            type="button"
            variant="outline"
            leftIcon={<Save className="w-4 h-4" />}
            onClick={() => onSaveDraft(watch())}
          >
            Salveaza ciorna
          </AnimatedButton>
        )}

        <AnimatedButton
          type="submit"
          variant="primary"
          loading={isSubmitting}
          loadingText="Se salveaza..."
          leftIcon={<Send className="w-4 h-4" />}
        >
          Emite factura
        </AnimatedButton>
      </div>
    </form>
  );
}

export default InvoiceForm;
