import { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Package, Warehouse, ArrowRightLeft, CheckCircle, AlertTriangle, X, Printer } from 'lucide-react';

interface Product {
  id: string;
  sku: string;
  name: string;
  unit_of_measure: string;
}

interface Warehouse {
  id: string;
  name: string;
  location_name: string;
}

interface TransferItem {
  product_id: string;
  product_name: string;
  product_sku: string;
  available_quantity: number;
  transfer_quantity: number;
  is_valid: boolean;
}

export default function StockTransfersPage() {
  const [step, setStep] = useState(1);
  const [sourceWarehouse, setSourceWarehouse] = useState('');
  const [destinationWarehouse, setDestinationWarehouse] = useState('');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<TransferItem[]>([]);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [transferNumber, setTransferNumber] = useState('');

  useEffect(() => {
    fetchWarehouses();
    fetchProducts();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(`/api/v1/inventory/warehouses.php?company_id=${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setWarehouses(data.warehouses || []);
      }
    } catch (error) {
      console.error('Error fetching warehouses:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      const response = await fetch(`/api/v1/inventory/products.php?company_id=${companyId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const addProduct = (product: Product) => {
    if (selectedProducts.find(p => p.product_id === product.id)) {
      return; // Already added
    }

    const newItem: TransferItem = {
      product_id: product.id,
      product_name: product.name,
      product_sku: product.sku,
      available_quantity: 100, // Would fetch from stock_levels API
      transfer_quantity: 0,
      is_valid: true
    };

    setSelectedProducts([...selectedProducts, newItem]);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter(p => p.product_id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setSelectedProducts(selectedProducts.map(p => {
      if (p.product_id === productId) {
        const is_valid = quantity > 0 && quantity <= p.available_quantity;
        return { ...p, transfer_quantity: quantity, is_valid };
      }
      return p;
    }));
  };

  const handleSubmit = async () => {
    if (selectedProducts.length === 0) {
      setError('Adăugați cel puțin un produs');
      return;
    }

    if (!selectedProducts.every(p => p.is_valid)) {
      setError('Toate cantitățile trebuie să fie valide');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('auth_token');
      const companyId = localStorage.getItem('company_id');

      // Generate transfer number
      const transferNum = `TR-${Date.now()}`;
      setTransferNumber(transferNum);

      // Process each transfer
      for (const item of selectedProducts) {
        const response = await fetch('/api/v1/inventory/stock-transfer.php', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            company_id: companyId,
            from_warehouse_id: sourceWarehouse,
            to_warehouse_id: destinationWarehouse,
            product_id: item.product_id,
            quantity: item.transfer_quantity,
            reference_number: transferNum,
            expected_date: transferDate,
            notes: notes
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to transfer ${item.product_name}`);
        }
      }

      setSuccess(true);
    } catch (error: any) {
      setError(error.message || 'Eroare la procesarea transferului');
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep(1);
    setSourceWarehouse('');
    setDestinationWarehouse('');
    setSelectedProducts([]);
    setTransferDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setSuccess(false);
    setError('');
    setTransferNumber('');
  };

  const printTransferSlip = () => {
    window.print();
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return sourceWarehouse !== '' && destinationWarehouse !== '' && sourceWarehouse !== destinationWarehouse;
      case 2:
        return selectedProducts.length > 0;
      case 3:
        return selectedProducts.every(p => p.is_valid && p.transfer_quantity > 0);
      default:
        return false;
    }
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="text-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Transfer Creat Cu Succes!</h2>
            <p className="text-gray-600">Număr transfer: <span className="font-mono font-semibold">{transferNumber}</span></p>
          </div>

          {/* Transfer Summary */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">De la:</span>
              <span className="font-medium text-gray-900">
                {warehouses.find(w => w.id === sourceWarehouse)?.name}
              </span>
            </div>
            <div className="flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Către:</span>
              <span className="font-medium text-gray-900">
                {warehouses.find(w => w.id === destinationWarehouse)?.name}
              </span>
            </div>
            <div className="border-t pt-3 mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Produse transferate:</span>
                <span className="font-medium text-gray-900">{selectedProducts.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">Data transfer:</span>
                <span className="font-medium text-gray-900">{new Date(transferDate).toLocaleDateString('ro-RO')}</span>
              </div>
            </div>
          </div>

          {/* Products List */}
          <div className="border border-gray-200 rounded-lg divide-y mb-6">
            {selectedProducts.map((item) => (
              <div key={item.product_id} className="p-3 flex justify-between items-center">
                <div>
                  <div className="font-medium text-gray-900">{item.product_name}</div>
                  <div className="text-sm text-gray-600">SKU: {item.product_sku}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-blue-600">{item.transfer_quantity} buc</div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={printTransferSlip}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" />
              Imprimă Bon Transfer
            </button>
            <button
              onClick={resetWizard}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Transfer Nou
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Transfer Stoc</h1>
        <p className="text-sm text-gray-600 mt-1">Transferă produse între depozite</p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          {[1, 2, 3, 4].map((s, index) => (
            <div key={s} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                step >= s ? 'border-blue-600 bg-blue-600 text-white' : 'border-gray-300 text-gray-400'
              }`}>
                {s}
              </div>
              {index < 3 && (
                <div className={`flex-1 h-1 ${step > s ? 'bg-blue-600' : 'bg-gray-300'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-600">
          <span>Depozite</span>
          <span>Produse</span>
          <span>Cantități</span>
          <span>Verificare</span>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Eroare</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-5 h-5 text-red-400 hover:text-red-600" />
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 min-h-[400px]">
        {/* Step 1: Select Warehouses */}
        {step === 1 && (
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
            <div className="flex items-center gap-3 mb-6">
              <Warehouse className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Selectează Depozitele</h2>
            </div>

            {/* Source Warehouse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                De la (Sursă): <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {warehouses.map((wh) => (
                  <button
                    key={wh.id}
                    onClick={() => setSourceWarehouse(wh.id)}
                    disabled={wh.id === destinationWarehouse}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      sourceWarehouse === wh.id
                        ? 'border-blue-600 bg-blue-50'
                        : wh.id === destinationWarehouse
                        ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{wh.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{wh.location_name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Transfer Icon */}
            {sourceWarehouse && (
              <div className="flex justify-center">
                <ArrowRightLeft className="w-8 h-8 text-blue-600 animate-pulse" />
              </div>
            )}

            {/* Destination Warehouse */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Către (Destinație): <span className="text-red-600">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {warehouses.map((wh) => (
                  <button
                    key={wh.id}
                    onClick={() => setDestinationWarehouse(wh.id)}
                    disabled={wh.id === sourceWarehouse}
                    className={`p-4 border-2 rounded-lg text-left transition-colors ${
                      destinationWarehouse === wh.id
                        ? 'border-green-600 bg-green-50'
                        : wh.id === sourceWarehouse
                        ? 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{wh.name}</div>
                    <div className="text-sm text-gray-600 mt-1">{wh.location_name}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Select Products */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Selectează Produsele</h2>
            </div>

            <div className="space-y-4">
              {/* Product Select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adaugă Produse:</label>
                <select
                  onChange={(e) => {
                    const product = products.find(p => p.id === e.target.value);
                    if (product) addProduct(product);
                    e.target.value = '';
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selectează un produs...</option>
                  {products.filter(p => !selectedProducts.find(sp => sp.product_id === p.id)).map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              {/* Selected Products List */}
              {selectedProducts.length > 0 && (
                <div className="border border-gray-200 rounded-lg divide-y">
                  {selectedProducts.map((item) => (
                    <div key={item.product_id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">{item.product_name}</div>
                        <div className="text-sm text-gray-600">SKU: {item.product_sku}</div>
                        <div className="text-xs text-gray-500 mt-1">Disponibil: {item.available_quantity} buc</div>
                      </div>
                      <button
                        onClick={() => removeProduct(item.product_id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Set Quantities */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <ArrowRightLeft className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Setează Cantitățile</h2>
            </div>

            <div className="space-y-3">
              {selectedProducts.map((item) => (
                <div key={item.product_id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium text-gray-900">{item.product_name}</div>
                      <div className="text-sm text-gray-600">SKU: {item.product_sku}</div>
                    </div>
                    <div className="text-sm text-gray-600">
                      Max: <span className="font-semibold">{item.available_quantity}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="text-sm text-gray-700 whitespace-nowrap">Cantitate Transfer:</label>
                    <input
                      type="number"
                      min="1"
                      max={item.available_quantity}
                      value={item.transfer_quantity}
                      onChange={(e) => updateQuantity(item.product_id, parseInt(e.target.value) || 0)}
                      className={`flex-1 px-3 py-2 border rounded-lg ${
                        !item.is_valid ? 'border-red-300 bg-red-50' : 'border-gray-300'
                      }`}
                    />
                  </div>

                  {!item.is_valid && item.transfer_quantity > 0 && (
                    <div className="mt-2 text-sm text-red-600">
                      Cantitatea depășește stocul disponibil
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Additional Info */}
            <div className="mt-6 pt-6 border-t space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data Transfer Așteptată:</label>
                <input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notițe (opțional):</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Adaugă detalii despre transfer..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold text-gray-900">Verifică și Confirmă Transferul</h2>
            </div>

            {/* Transfer Details */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-blue-700 mb-1">Depozit Sursă</div>
                  <div className="font-semibold text-blue-900">
                    {warehouses.find(w => w.id === sourceWarehouse)?.name}
                  </div>
                </div>
                <ArrowRightLeft className="w-6 h-6 text-blue-600" />
                <div className="text-right">
                  <div className="text-sm text-blue-700 mb-1">Depozit Destinație</div>
                  <div className="font-semibold text-blue-900">
                    {warehouses.find(w => w.id === destinationWarehouse)?.name}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-blue-300 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Data Transfer:</span>
                  <span className="ml-2 font-medium text-blue-900">
                    {new Date(transferDate).toLocaleDateString('ro-RO')}
                  </span>
                </div>
                <div>
                  <span className="text-blue-700">Total Produse:</span>
                  <span className="ml-2 font-medium text-blue-900">{selectedProducts.length}</span>
                </div>
              </div>
            </div>

            {/* Products to Transfer */}
            <div className="border border-gray-200 rounded-lg divide-y">
              <div className="bg-gray-50 px-4 py-2 font-medium text-gray-700 text-sm">
                Produse de Transferat
              </div>
              {selectedProducts.map((item) => (
                <div key={item.product_id} className="p-4 flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-900">{item.product_name}</div>
                    <div className="text-sm text-gray-600">SKU: {item.product_sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-blue-600">{item.transfer_quantity}</div>
                    <div className="text-xs text-gray-500">din {item.available_quantity} disponibil</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Notes */}
            {notes && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="text-sm font-medium text-yellow-800 mb-2">Notițe Transfer:</div>
                <div className="text-sm text-yellow-700">{notes}</div>
              </div>
            )}

            {/* Warning */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <div className="font-medium mb-1">Atenție!</div>
                <p>Transferul va reduce stocul din depozitul sursă și va crește stocul în depozitul destinație.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="inline-flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Înapoi
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="inline-flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Următorul
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Se procesează...' : 'Confirmă Transfer'}
            <CheckCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
