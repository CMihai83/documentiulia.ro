import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Flashlight, FlashlightOff, QrCode } from 'lucide-react';
import { useCamera } from './useCamera';

interface BarcodeScannerProps {
  onScan: (code: string, format: string) => void;
  onClose: () => void;
  formats?: BarcodeFormat[];
}

type BarcodeFormat =
  | 'qr_code'
  | 'ean_13'
  | 'ean_8'
  | 'code_128'
  | 'code_39'
  | 'code_93'
  | 'upc_a'
  | 'upc_e'
  | 'itf'
  | 'data_matrix';

const FORMAT_MAP: Record<BarcodeFormat, string> = {
  qr_code: 'qr_code',
  ean_13: 'ean_13',
  ean_8: 'ean_8',
  code_128: 'code_128',
  code_39: 'code_39',
  code_93: 'code_93',
  upc_a: 'upc_a',
  upc_e: 'upc_e',
  itf: 'itf',
  data_matrix: 'data_matrix',
};

export function BarcodeScanner({
  onScan,
  onClose,
  formats = ['qr_code', 'ean_13', 'ean_8', 'code_128'],
}: BarcodeScannerProps) {
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const detectorRef = useRef<BarcodeDetectorType | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    isActive,
    error,
    stream,
    videoRef,
    startCamera,
    stopCamera,
  } = useCamera();

  // Check for BarcodeDetector API support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      setIsSupported(true);
      // @ts-ignore - BarcodeDetector may not be in types
      detectorRef.current = new window.BarcodeDetector({
        formats: formats.map(f => FORMAT_MAP[f]),
      });
    }
  }, [formats]);

  // Toggle flashlight
  const toggleFlash = useCallback(async () => {
    if (!stream) return;

    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      // @ts-ignore - torch is not in standard types
      const capabilities = track.getCapabilities();
      // @ts-ignore
      if (capabilities.torch) {
        await track.applyConstraints({
          // @ts-ignore
          advanced: [{ torch: !isFlashOn }],
        });
        setIsFlashOn(!isFlashOn);
      }
    } catch (err) {
      console.error('Flash not available:', err);
    }
  }, [stream, isFlashOn]);

  // Scan for barcodes
  useEffect(() => {
    if (!isActive || !detectorRef.current || !videoRef.current) return;

    const detect = async () => {
      if (!detectorRef.current || !videoRef.current) return;

      try {
        const barcodes = await detectorRef.current.detect(videoRef.current);
        if (barcodes.length > 0) {
          const barcode = barcodes[0];
          // Avoid duplicate scans
          if (barcode.rawValue !== lastScannedCode) {
            setLastScannedCode(barcode.rawValue);
            // Vibrate on scan (if supported)
            if (navigator.vibrate) {
              navigator.vibrate(100);
            }
            onScan(barcode.rawValue, barcode.format);
          }
        }
      } catch (err) {
        // Ignore detection errors
      }
    };

    // Scan every 100ms
    scanIntervalRef.current = setInterval(detect, 100);

    return () => {
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [isActive, videoRef, lastScannedCode, onScan]);

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
      }
    };
  }, [startCamera, stopCamera]);

  // Reset last scanned code after 2 seconds
  useEffect(() => {
    if (lastScannedCode) {
      const timer = setTimeout(() => setLastScannedCode(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [lastScannedCode]);

  if (!isSupported) {
    return (
      <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full text-center">
          <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Scanner nu este suportat
          </h3>
          <p className="text-gray-500 mb-6">
            Browserul dvs. nu suportă scanarea codurilor de bare.
            Încercați Chrome sau Edge pe un dispozitiv mobil.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Închide
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
        <h2 className="text-white font-semibold">Scanează cod</h2>
        <button
          onClick={toggleFlash}
          className="p-2 text-white hover:bg-white/10 rounded-full"
        >
          {isFlashOn ? (
            <Flashlight className="w-6 h-6" />
          ) : (
            <FlashlightOff className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Camera view */}
      <div className="flex-1 relative">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover"
        />

        {/* Scan overlay guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {/* Darkened area outside scan zone */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Scan zone */}
          <div className="relative w-[280px] h-[280px]">
            {/* Clear center */}
            <div className="absolute inset-0 bg-transparent" style={{
              boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.4)',
            }} />

            {/* Corner markers */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-white rounded-tl-lg" />
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-white rounded-tr-lg" />
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-white rounded-bl-lg" />
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-white rounded-br-lg" />

            {/* Scan line animation */}
            <div className="absolute left-0 right-0 h-0.5 bg-green-400 animate-pulse" style={{
              top: '50%',
              boxShadow: '0 0 8px rgba(74, 222, 128, 0.8)',
            }} />
          </div>
        </div>

        {/* Scanned code feedback */}
        {lastScannedCode && (
          <div className="absolute bottom-24 left-0 right-0 flex justify-center">
            <div className="bg-green-500 text-white px-6 py-3 rounded-full shadow-lg animate-bounce">
              <span className="font-mono">{lastScannedCode}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="text-center p-4">
              <p className="text-white mb-4">{error}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-white text-gray-900 rounded-lg"
              >
                Încearcă din nou
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer instructions */}
      <div className="p-6 bg-black/50 text-center">
        <p className="text-white/70 text-sm">
          Poziționați codul de bare sau QR în zona de scanare
        </p>
        <p className="text-white/50 text-xs mt-2">
          Suportă: QR, EAN-13, EAN-8, Code 128
        </p>
      </div>
    </div>
  );
}

// TypeScript declarations for BarcodeDetector API
interface DetectedBarcode {
  rawValue: string;
  format: string;
  boundingBox: DOMRectReadOnly;
  cornerPoints: Array<{ x: number; y: number }>;
}

interface BarcodeDetectorType {
  detect(image: HTMLVideoElement): Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorType;
  getSupportedFormats(): Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

export default BarcodeScanner;
