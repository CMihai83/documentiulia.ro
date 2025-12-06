import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface ExtractedData {
  merchant_name?: string;
  receipt_date?: string;
  total_amount?: number;
  vat_amount?: number;
  currency?: string;
  payment_method?: string;
  ocr_confidence?: number;
}

interface UploadedReceipt {
  receipt_id: string;
  filename: string;
  file_path: string;
  ocr_status: string;
  merchant_name?: string;
  receipt_date?: string;
  total_amount?: number;
  vat_amount?: number;
  currency?: string;
  ocr_confidence?: number;
}

const ReceiptUploadPage: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedReceipt, setUploadedReceipt] = useState<UploadedReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoProcess, setAutoProcess] = useState(true);

  // Editable fields
  const [editableData, setEditableData] = useState<ExtractedData>({});

  const token = localStorage.getItem('auth_token');
  const companyId = localStorage.getItem('company_id');

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  // File selection handler
  const handleFileSelect = async (file: File) => {
    // Validate file
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError('Please upload a valid image (JPG, PNG) or PDF file');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      setError('File size must be less than 10MB');
      return;
    }

    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Upload file
    await uploadFile(file);
  };

  // Upload file to API
  const uploadFile = async (file: File) => {
    setUploading(true);
    setError(null);

    // Get fresh token from localStorage
    const currentToken = localStorage.getItem('auth_token');
    const currentCompanyId = localStorage.getItem('company_id');

    // Check for valid token
    if (!currentToken || currentToken === 'null' || currentToken === 'undefined') {
      setError('Session expired. Please log in again.');
      setUploading(false);
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('auto_process', autoProcess ? 'true' : 'false');

      const response = await fetch('https://documentiulia.ro/api/v1/receipts/upload.php', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken}`,
          'X-Company-ID': currentCompanyId || '',
        },
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setUploadedReceipt(data.data);

        if (autoProcess && data.data.ocr_status === 'completed') {
          // Already processed
          setEditableData({
            merchant_name: data.data.merchant_name,
            receipt_date: data.data.receipt_date,
            total_amount: data.data.total_amount,
            vat_amount: data.data.vat_amount,
            currency: data.data.currency,
            payment_method: data.data.payment_method,
            ocr_confidence: data.data.ocr_confidence,
          });
        } else if (autoProcess && data.data.ocr_status === 'processing') {
          // Poll for completion
          pollProcessingStatus(data.data.receipt_id);
        }
      } else {
        setError(data.message || 'Upload failed');
      }
    } catch (err) {
      setError('Network error during upload');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  // Poll for processing completion
  const pollProcessingStatus = async (receiptId: string) => {
    setProcessing(true);
    const maxAttempts = 30; // 30 seconds max
    let attempts = 0;

    const interval = setInterval(async () => {
      attempts++;

      try {
        const response = await fetch(
          `https://documentiulia.ro/api/v1/receipts/get.php?receipt_id=${receiptId}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'X-Company-ID': companyId || '',
            },
          }
        );

        const data = await response.json();

        if (data.success) {
          const receipt = data.data;

          if (receipt.ocr_status === 'completed') {
            clearInterval(interval);
            setProcessing(false);
            setUploadedReceipt(receipt);
            setEditableData({
              merchant_name: receipt.merchant_name,
              receipt_date: receipt.receipt_date,
              total_amount: receipt.total_amount,
              vat_amount: receipt.vat_amount,
              currency: receipt.currency,
              payment_method: receipt.payment_method,
              ocr_confidence: receipt.ocr_confidence,
            });
          } else if (receipt.ocr_status === 'failed') {
            clearInterval(interval);
            setProcessing(false);
            setError('OCR processing failed. Please try again or edit manually.');
          }
        }

        if (attempts >= maxAttempts) {
          clearInterval(interval);
          setProcessing(false);
          setError('Processing timeout. Please check receipt list later.');
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 1000);
  };

  // Manual process trigger
  const handleManualProcess = async () => {
    if (!uploadedReceipt) return;

    setProcessing(true);
    setError(null);

    try {
      const response = await fetch('https://documentiulia.ro/api/v1/receipts/process.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Company-ID': companyId || '',
        },
        body: JSON.stringify({
          receipt_id: uploadedReceipt.receipt_id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setUploadedReceipt(data.data);
        setEditableData({
          merchant_name: data.data.merchant_name,
          receipt_date: data.data.receipt_date,
          total_amount: data.data.total_amount,
          vat_amount: data.data.vat_amount,
          currency: data.data.currency,
          payment_method: data.data.payment_method,
          ocr_confidence: data.data.ocr_confidence,
        });
      } else {
        setError(data.message || 'Processing failed');
      }
    } catch (err) {
      setError('Network error during processing');
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  // Camera handlers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraStream(stream);
        setShowCamera(true);
      }
    } catch (err) {
      setError('Could not access camera. Please check permissions.');
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);

        canvas.toBlob(async (blob) => {
          if (blob) {
            const file = new File([blob], `receipt_${Date.now()}.jpg`, { type: 'image/jpeg' });
            stopCamera();

            // Create preview
            const reader = new FileReader();
            reader.onload = (e) => {
              setPreviewUrl(e.target?.result as string);
            };
            reader.readAsDataURL(file);

            // Upload
            await uploadFile(file);
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  // Create expense from receipt
  const handleCreateExpense = () => {
    if (!uploadedReceipt) return;

    // Navigate to expense creation page with pre-filled data
    navigate('/expenses/create', {
      state: {
        receipt_id: uploadedReceipt.receipt_id,
        merchant: editableData.merchant_name,
        amount: editableData.total_amount,
        date: editableData.receipt_date,
        currency: editableData.currency,
      },
    });
  };

  // Reset form
  const handleReset = () => {
    setPreviewUrl(null);
    setUploadedReceipt(null);
    setEditableData({});
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Upload Receipt</h1>
          <p className="mt-2 text-gray-600">
            Upload a receipt image or PDF and extract data automatically using OCR
          </p>
        </div>

        {/* Upload Area */}
        {!previewUrl && !showCamera && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
              >
                <path
                  d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="mt-4 text-lg text-gray-700">
                Drag and drop a receipt image here, or click to browse
              </p>
              <p className="mt-2 text-sm text-gray-500">
                Supports JPG, PNG, PDF up to 10MB
              </p>

              <div className="mt-6 flex justify-center gap-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Choose File
                </button>
                <button
                  onClick={startCamera}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  📷 Use Camera
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,application/pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
            </div>

            {/* Auto-process toggle */}
            <div className="mt-4 flex items-center">
              <input
                type="checkbox"
                id="auto-process"
                checked={autoProcess}
                onChange={(e) => setAutoProcess(e.target.checked)}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <label htmlFor="auto-process" className="ml-2 text-sm text-gray-700">
                Automatically extract data after upload (recommended)
              </label>
            </div>
          </div>
        )}

        {/* Camera View */}
        {showCamera && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
            </div>
            <div className="mt-4 flex justify-center gap-4">
              <button
                onClick={capturePhoto}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                📸 Capture Photo
              </button>
              <button
                onClick={stopCamera}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Upload/Processing Status */}
        {(uploading || processing) && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
              <p className="text-blue-800">
                {uploading && 'Uploading receipt...'}
                {processing && 'Processing with OCR...'}
              </p>
            </div>
          </div>
        )}

        {/* Preview and Extracted Data */}
        {previewUrl && uploadedReceipt && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Preview */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Receipt Preview</h2>
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-full rounded-lg border border-gray-200"
              />
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Upload Another
                </button>
                {uploadedReceipt.ocr_status !== 'completed' && (
                  <button
                    onClick={handleManualProcess}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Process Now
                  </button>
                )}
              </div>
            </div>

            {/* Extracted Data */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Extracted Data</h2>
                {uploadedReceipt.ocr_confidence && (
                  <span
                    className={`px-3 py-1 rounded-full text-sm ${
                      uploadedReceipt.ocr_confidence >= 80
                        ? 'bg-green-100 text-green-800'
                        : uploadedReceipt.ocr_confidence >= 60
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {Math.round(uploadedReceipt.ocr_confidence)}% confidence
                  </span>
                )}
              </div>

              {uploadedReceipt.ocr_status === 'completed' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Merchant Name
                    </label>
                    <input
                      type="text"
                      value={editableData.merchant_name || ''}
                      onChange={(e) =>
                        setEditableData({ ...editableData, merchant_name: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Receipt Date
                    </label>
                    <input
                      type="date"
                      value={editableData.receipt_date || ''}
                      onChange={(e) =>
                        setEditableData({ ...editableData, receipt_date: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editableData.total_amount || ''}
                        onChange={(e) =>
                          setEditableData({ ...editableData, total_amount: parseFloat(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        VAT Amount
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={editableData.vat_amount || ''}
                        onChange={(e) =>
                          setEditableData({ ...editableData, vat_amount: parseFloat(e.target.value) })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={editableData.currency || 'RON'}
                      onChange={(e) =>
                        setEditableData({ ...editableData, currency: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="RON">RON</option>
                      <option value="EUR">EUR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={editableData.payment_method || ''}
                      onChange={(e) =>
                        setEditableData({ ...editableData, payment_method: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select...</option>
                      <option value="cash">Cash</option>
                      <option value="card">Card</option>
                      <option value="transfer">Bank Transfer</option>
                    </select>
                  </div>

                  <button
                    onClick={handleCreateExpense}
                    className="w-full mt-6 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                  >
                    Create Expense from Receipt
                  </button>
                </div>
              ) : (
                <p className="text-gray-600">
                  {uploadedReceipt.ocr_status === 'pending' && 'Click "Process Now" to extract data'}
                  {uploadedReceipt.ocr_status === 'processing' && 'Processing...'}
                  {uploadedReceipt.ocr_status === 'failed' && 'Processing failed. Please edit manually.'}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceiptUploadPage;
