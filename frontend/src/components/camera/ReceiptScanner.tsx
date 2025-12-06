import { useState, useCallback, useEffect } from 'react';
import { Camera, X, RotateCcw, Check, Loader2, Upload } from 'lucide-react';
import { useCamera } from './useCamera';

interface ReceiptScannerProps {
  onCapture: (imageData: string) => Promise<void>;
  onClose: () => void;
}

export function ReceiptScanner({ onCapture, onClose }: ReceiptScannerProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const {
    isActive,
    isSupported,
    error,
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
  } = useCamera();

  const handleCapture = useCallback(() => {
    const image = capturePhoto();
    if (image) {
      setCapturedImage(image);
      stopCamera();
    }
  }, [capturePhoto, stopCamera]);

  const handleRetake = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const handleConfirm = useCallback(async () => {
    if (!capturedImage) return;

    setIsProcessing(true);
    try {
      await onCapture(capturedImage);
      onClose();
    } catch (err) {
      console.error('Error processing receipt:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [capturedImage, onCapture, onClose]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCapturedImage(result);
    };
    reader.readAsDataURL(file);
  }, []);

  // Start camera on mount if supported
  useEffect(() => {
    if (isSupported) {
      startCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isSupported, startCamera, stopCamera]);

  if (!isSupported) {
    // Fallback to file upload
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <Camera className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Camera nu este disponibilă
          </h3>
          <p className="text-gray-500 mb-6">
            Încărcați o fotografie a bonului fiscal.
          </p>

          <label className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl cursor-pointer hover:bg-blue-700 transition-colors">
            <Upload className="w-5 h-5" />
            <span>Încarcă fotografie</span>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          <button
            onClick={onClose}
            className="mt-4 text-gray-500 hover:text-gray-700"
          >
            Anulează
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-black/50 absolute top-0 left-0 right-0 z-10">
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="p-2 text-white hover:bg-white/10 rounded-full"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-white font-semibold">Scanează bonul</h2>
        <button
          onClick={switchCamera}
          className="p-2 text-white hover:bg-white/10 rounded-full"
        >
          <RotateCcw className="w-6 h-6" />
        </button>
      </div>

      {/* Camera view or captured image */}
      <div className="flex-1 relative">
        {capturedImage ? (
          <img
            src={capturedImage}
            alt="Captured receipt"
            className="w-full h-full object-contain"
          />
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        )}

        {/* Scan overlay guide */}
        {!capturedImage && isActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-[80%] h-[60%] border-2 border-white/50 rounded-lg">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg" />
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg" />
            </div>
            <p className="absolute bottom-32 text-white text-center text-sm bg-black/50 px-4 py-2 rounded-full">
              Poziționați bonul în cadru
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-4">
              <p className="text-white mb-4">{error}</p>
              <label className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-900 rounded-lg cursor-pointer">
                <Upload className="w-5 h-5" />
                <span>Încarcă fotografie</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-black/50">
        {capturedImage ? (
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={handleRetake}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-full hover:bg-gray-700"
              disabled={isProcessing}
            >
              <RotateCcw className="w-5 h-5" />
              <span>Refă</span>
            </button>
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50"
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Procesez...</span>
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  <span>Confirmă</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex justify-center">
            <button
              onClick={handleCapture}
              className="w-20 h-20 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 active:scale-95 transition-transform"
              disabled={!isActive}
            >
              <div className="w-16 h-16 bg-white border-4 border-gray-300 rounded-full" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReceiptScanner;
