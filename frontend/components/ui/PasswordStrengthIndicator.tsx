'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Check, X, AlertCircle } from 'lucide-react';

interface PasswordStrengthIndicatorProps {
  password: string;
  showRequirements?: boolean;
  minLength?: number;
}

interface PasswordStrength {
  score: number;
  level: 'weak' | 'fair' | 'good' | 'strong';
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasNumber: boolean;
    hasSpecial: boolean;
  };
}

function calculatePasswordStrength(password: string, minLength: number = 8): PasswordStrength {
  const checks = {
    minLength: password.length >= minLength,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  let level: 'weak' | 'fair' | 'good' | 'strong';
  if (score <= 2) level = 'weak';
  else if (score === 3) level = 'fair';
  else if (score === 4) level = 'good';
  else level = 'strong';

  return { score, level, checks };
}

export default function PasswordStrengthIndicator({
  password,
  showRequirements = true,
  minLength = 8,
}: PasswordStrengthIndicatorProps) {
  const t = useTranslations('auth');

  const strength = useMemo(
    () => calculatePasswordStrength(password, minLength),
    [password, minLength]
  );

  if (!password) return null;

  const levelColors = {
    weak: 'bg-red-500',
    fair: 'bg-yellow-500',
    good: 'bg-blue-500',
    strong: 'bg-green-500',
  };

  const levelLabels = {
    weak: t('passwordStrength.weak') || 'Slabă',
    fair: t('passwordStrength.fair') || 'Acceptabilă',
    good: t('passwordStrength.good') || 'Bună',
    strong: t('passwordStrength.strong') || 'Puternică',
  };

  const requirements = [
    {
      key: 'minLength',
      label: t('passwordRequirements.minLength') || `Minim ${minLength} caractere`,
      met: strength.checks.minLength,
    },
    {
      key: 'hasUppercase',
      label: t('passwordRequirements.uppercase') || 'O literă mare (A-Z)',
      met: strength.checks.hasUppercase,
    },
    {
      key: 'hasLowercase',
      label: t('passwordRequirements.lowercase') || 'O literă mică (a-z)',
      met: strength.checks.hasLowercase,
    },
    {
      key: 'hasNumber',
      label: t('passwordRequirements.number') || 'O cifră (0-9)',
      met: strength.checks.hasNumber,
    },
    {
      key: 'hasSpecial',
      label: t('passwordRequirements.special') || 'Un caracter special (!@#$%)',
      met: strength.checks.hasSpecial,
    },
  ];

  return (
    <div className="mt-2 space-y-3" role="status" aria-live="polite">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">
            {t('passwordStrength.label') || 'Puterea parolei'}:
          </span>
          <span
            className={`font-medium ${
              strength.level === 'weak'
                ? 'text-red-600'
                : strength.level === 'fair'
                ? 'text-yellow-600'
                : strength.level === 'good'
                ? 'text-blue-600'
                : 'text-green-600'
            }`}
          >
            {levelLabels[strength.level]}
          </span>
        </div>
        <div className="flex gap-1" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((bar) => (
            <div
              key={bar}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                bar <= strength.score
                  ? levelColors[strength.level]
                  : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Requirements Checklist */}
      {showRequirements && (
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            {t('passwordRequirements.title') || 'Cerințe parolă'}:
          </p>
          <ul className="space-y-1">
            {requirements.map((req) => (
              <li
                key={req.key}
                className={`flex items-center gap-2 text-xs ${
                  req.met ? 'text-green-600' : 'text-gray-500'
                }`}
              >
                {req.met ? (
                  <Check className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                ) : (
                  <X className="w-3.5 h-3.5 flex-shrink-0 text-gray-400" aria-hidden="true" />
                )}
                <span>{req.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Screen reader announcement */}
      <span className="sr-only">
        {t('passwordStrength.sr') || 'Puterea parolei'}: {levelLabels[strength.level]}.
        {requirements.filter((r) => !r.met).length > 0 &&
          ` ${requirements.filter((r) => !r.met).length} cerințe neîndeplinite.`}
      </span>
    </div>
  );
}
