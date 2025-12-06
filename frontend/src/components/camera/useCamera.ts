import { useState, useRef, useCallback, useEffect } from 'react';

interface CameraState {
  isActive: boolean;
  isSupported: boolean;
  hasPermission: boolean | null;
  error: string | null;
  facingMode: 'user' | 'environment';
  stream: MediaStream | null;
}

interface CameraActions {
  startCamera: () => Promise<void>;
  stopCamera: () => void;
  capturePhoto: () => string | null;
  switchCamera: () => void;
}

export function useCamera(): CameraState & CameraActions & { videoRef: React.RefObject<HTMLVideoElement | null> } {
  const [state, setState] = useState<CameraState>({
    isActive: false,
    isSupported: typeof navigator !== 'undefined' &&
      'mediaDevices' in navigator &&
      'getUserMedia' in navigator.mediaDevices,
    hasPermission: null,
    error: null,
    facingMode: 'environment', // Back camera for receipts
    stream: null,
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Create canvas on mount
  useEffect(() => {
    if (typeof document !== 'undefined') {
      canvasRef.current = document.createElement('canvas');
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!state.isSupported) {
      setState(prev => ({
        ...prev,
        error: 'Camera nu este suportată pe acest dispozitiv.',
      }));
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: state.facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setState(prev => ({
        ...prev,
        isActive: true,
        hasPermission: true,
        stream,
        error: null,
      }));
    } catch (err) {
      const error = err as Error;
      let message = 'Nu s-a putut accesa camera.';

      if (error.name === 'NotAllowedError') {
        message = 'Accesul la cameră a fost refuzat. Verificați permisiunile.';
      } else if (error.name === 'NotFoundError') {
        message = 'Nu s-a găsit nicio cameră disponibilă.';
      } else if (error.name === 'NotReadableError') {
        message = 'Camera este folosită de altă aplicație.';
      }

      setState(prev => ({
        ...prev,
        error: message,
        hasPermission: error.name === 'NotAllowedError' ? false : prev.hasPermission,
      }));
    }
  }, [state.isSupported, state.facingMode]);

  const stopCamera = useCallback(() => {
    if (state.stream) {
      state.stream.getTracks().forEach(track => track.stop());
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setState(prev => ({
      ...prev,
      isActive: false,
      stream: null,
    }));
  }, [state.stream]);

  const capturePhoto = useCallback((): string | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Draw the video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Return as base64 JPEG
    return canvas.toDataURL('image/jpeg', 0.9);
  }, []);

  const switchCamera = useCallback(() => {
    setState(prev => ({
      ...prev,
      facingMode: prev.facingMode === 'user' ? 'environment' : 'user',
    }));

    // Restart camera with new facing mode
    if (state.isActive) {
      stopCamera();
      setTimeout(startCamera, 100);
    }
  }, [state.isActive, stopCamera, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.stream) {
        state.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [state.stream]);

  return {
    ...state,
    videoRef,
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
  };
}

export default useCamera;
