import React, { useCallback } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVoiceInput } from './useVoiceInput';

interface VoiceButtonProps {
  onTranscript?: (text: string) => void;
  className?: string;
  showTranscript?: boolean;
}

export function VoiceButton({
  onTranscript,
  className = '',
  showTranscript = false,
}: VoiceButtonProps) {
  const navigate = useNavigate();

  const handleCommand = useCallback((action: string, params?: Record<string, string>) => {
    switch (action) {
      case 'navigate':
        if (params?.path) {
          navigate(params.path);
        }
        break;
      case 'create':
        if (params?.type === 'invoice') {
          navigate('/invoices/new');
        } else if (params?.type === 'expense') {
          navigate('/expenses?action=new');
        } else if (params?.type === 'contact') {
          navigate('/contacts?action=new');
        } else if (params?.type === 'project') {
          navigate('/projects/new');
        }
        break;
      case 'search':
        if (params?.query) {
          navigate(`/search?q=${encodeURIComponent(params.query)}`);
        }
        break;
      case 'report':
        navigate(`/reports/${params?.type || 'overview'}`);
        break;
      case 'amount':
        if (onTranscript && params?.value) {
          onTranscript(params.value);
        }
        break;
    }
  }, [navigate, onTranscript]);

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    error,
    confidence,
    startListening,
    stopListening,
    resetTranscript,
  } = useVoiceInput(handleCommand);

  if (!isSupported) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={isListening ? stopListening : startListening}
        className={`
          flex items-center justify-center w-12 h-12 rounded-full
          transition-all duration-200 shadow-lg
          ${isListening
            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
            : 'bg-blue-600 hover:bg-blue-700'
          }
        `}
        aria-label={isListening ? 'Oprește ascultarea' : 'Începe comanda vocală'}
        title={isListening ? 'Oprește ascultarea' : 'Comenzi vocale (română)'}
      >
        {isListening ? (
          <Mic className="w-6 h-6 text-white" />
        ) : (
          <MicOff className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Transcript display */}
      {showTranscript && (isListening || transcript) && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-white rounded-lg shadow-xl border border-gray-200">
          {isListening && (
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Ascult...</span>
            </div>
          )}

          {interimTranscript && (
            <p className="text-gray-400 text-sm italic">{interimTranscript}</p>
          )}

          {transcript && (
            <div className="space-y-1">
              <p className="text-gray-700 text-sm">{transcript}</p>
              {confidence > 0 && (
                <p className="text-xs text-gray-400">
                  Încredere: {Math.round(confidence * 100)}%
                </p>
              )}
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}

          {transcript && (
            <button
              onClick={resetTranscript}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700"
            >
              Șterge
            </button>
          )}
        </div>
      )}

      {/* Voice indicator ring */}
      {isListening && (
        <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping" />
      )}
    </div>
  );
}

export function VoiceInputField({
  value,
  onChange,
  placeholder,
  className = '',
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const handleTranscript = useCallback((text: string) => {
    onChange(text);
  }, [onChange]);

  const {
    isListening,
    isSupported,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
  } = useVoiceInput((action, params) => {
    if (action === 'amount' && params?.value) {
      handleTranscript(params.value);
    }
  });

  // Update value when transcript changes
  React.useEffect(() => {
    if (transcript) {
      handleTranscript(transcript);
    }
  }, [transcript, handleTranscript]);

  if (!isSupported) {
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
      />
    );
  }

  return (
    <div className="relative flex items-center">
      <input
        type="text"
        value={interimTranscript || value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${className} pr-10`}
      />
      <button
        type="button"
        onClick={isListening ? stopListening : startListening}
        className={`
          absolute right-2 p-1 rounded-full
          ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-gray-600'}
        `}
        aria-label={isListening ? 'Oprește' : 'Dictează'}
      >
        <Mic className="w-5 h-5" />
      </button>
    </div>
  );
}

export default VoiceButton;
