import { useState, useCallback, useRef, useEffect } from 'react';

// Web Speech API types
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventType {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEventType {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognitionType {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventType) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventType) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionType;
}

interface VoiceInputState {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
  confidence: number;
}

interface VoiceInputActions {
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
}

interface VoiceCommand {
  pattern: RegExp;
  action: string;
  params?: Record<string, string>;
}

// Romanian voice commands
const ROMANIAN_COMMANDS: VoiceCommand[] = [
  // Navigation
  { pattern: /(?:du-mă la|mergi la|deschide) (facturi|facturile)/i, action: 'navigate', params: { path: '/invoices' } },
  { pattern: /(?:du-mă la|mergi la|deschide) (cheltuieli|cheltuielile)/i, action: 'navigate', params: { path: '/expenses' } },
  { pattern: /(?:du-mă la|mergi la|deschide) (contacte|contactele)/i, action: 'navigate', params: { path: '/contacts' } },
  { pattern: /(?:du-mă la|mergi la|deschide) (rapoarte|rapoartele)/i, action: 'navigate', params: { path: '/reports' } },
  { pattern: /(?:du-mă la|mergi la|deschide) (inventar|inventarul)/i, action: 'navigate', params: { path: '/inventory' } },
  { pattern: /(?:du-mă la|mergi la|deschide) (proiecte|proiectele)/i, action: 'navigate', params: { path: '/projects' } },
  { pattern: /(?:du-mă la|mergi la|deschide) (panou|tablou de bord|dashboard)/i, action: 'navigate', params: { path: '/dashboard' } },

  // Create actions
  { pattern: /(?:creează|adaugă|fă) (?:o )?factură nouă/i, action: 'create', params: { type: 'invoice' } },
  { pattern: /(?:creează|adaugă|fă) (?:o )?cheltuială nouă/i, action: 'create', params: { type: 'expense' } },
  { pattern: /(?:creează|adaugă|fă) (?:un )?contact nou/i, action: 'create', params: { type: 'contact' } },
  { pattern: /(?:creează|adaugă|fă) (?:un )?proiect nou/i, action: 'create', params: { type: 'project' } },

  // Search
  { pattern: /(?:caută|găsește) (.+)/i, action: 'search' },

  // Reports
  { pattern: /(?:arată|afișează) (?:raportul de )?vânzări/i, action: 'report', params: { type: 'sales' } },
  { pattern: /(?:arată|afișează) (?:raportul de )?profit/i, action: 'report', params: { type: 'profit' } },
  { pattern: /(?:arată|afișează) (?:raportul de )?TVA/i, action: 'report', params: { type: 'vat' } },

  // Quick amounts (for invoice/expense creation)
  { pattern: /(\d+(?:[,\.]\d{2})?) (?:lei|ron)/i, action: 'amount' },
];

// Declare window extensions
declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function useVoiceInput(
  onCommand?: (action: string, params?: Record<string, string>) => void
): VoiceInputState & VoiceInputActions {
  const [state, setState] = useState<VoiceInputState>({
    isListening: false,
    isSupported: typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
    transcript: '',
    interimTranscript: '',
    error: null,
    confidence: 0,
  });

  const recognitionRef = useRef<SpeechRecognitionType | null>(null);

  useEffect(() => {
    if (!state.isSupported) return;

    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionClass) return;

    const recognition = new SpeechRecognitionClass();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ro-RO'; // Romanian language

    recognition.onresult = (event: SpeechRecognitionEventType) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        const confidence = event.results[i][0].confidence;

        if (event.results[i].isFinal) {
          setState(prev => ({
            ...prev,
            transcript: prev.transcript + transcript,
            confidence,
          }));

          // Check for commands
          if (onCommand) {
            for (const command of ROMANIAN_COMMANDS) {
              const match = transcript.match(command.pattern);
              if (match) {
                const params = { ...command.params };
                if (command.action === 'search' && match[1]) {
                  params.query = match[1];
                }
                if (command.action === 'amount' && match[1]) {
                  params.value = match[1].replace(',', '.');
                }
                onCommand(command.action, params);
                break;
              }
            }
          }
        } else {
          interimTranscript += transcript;
        }
      }

      setState(prev => ({
        ...prev,
        interimTranscript,
      }));
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventType) => {
      setState(prev => ({
        ...prev,
        error: getErrorMessage(event.error),
        isListening: false,
      }));
    };

    recognition.onend = () => {
      setState(prev => ({
        ...prev,
        isListening: false,
        interimTranscript: '',
      }));
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [state.isSupported, onCommand]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && state.isSupported) {
      setState(prev => ({
        ...prev,
        isListening: true,
        error: null,
      }));
      recognitionRef.current.start();
    }
  }, [state.isSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setState(prev => ({
        ...prev,
        isListening: false,
      }));
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setState(prev => ({
      ...prev,
      transcript: '',
      interimTranscript: '',
      error: null,
      confidence: 0,
    }));
  }, []);

  return {
    ...state,
    startListening,
    stopListening,
    resetTranscript,
  };
}

function getErrorMessage(error: string): string {
  const messages: Record<string, string> = {
    'no-speech': 'Nu s-a detectat nicio vorbire. Încercați din nou.',
    'audio-capture': 'Nu s-a putut accesa microfonul.',
    'not-allowed': 'Accesul la microfon a fost refuzat.',
    'network': 'Eroare de rețea. Verificați conexiunea.',
    'aborted': 'Recunoașterea vocală a fost oprită.',
    'language-not-supported': 'Limba română nu este suportată pe acest dispozitiv.',
  };
  return messages[error] || `Eroare: ${error}`;
}

export default useVoiceInput;
