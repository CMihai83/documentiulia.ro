'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, CheckCircle2 } from 'lucide-react';
import { useOnboarding } from './OnboardingProvider';
import { useAuth } from '@/contexts/AuthContext';

export function WelcomeStep() {
  const t = useTranslations('onboarding');
  const { user } = useAuth();
  const { data, updateUserName, nextStep } = useOnboarding();
  const [name, setName] = useState(data.userName || user?.name || '');

  useEffect(() => {
    if (name && name !== data.userName) {
      updateUserName(name);
    }
  }, [name, data.userName, updateUserName]);

  const handleContinue = () => {
    if (name.trim()) {
      updateUserName(name);
      nextStep();
    }
  };

  return (
    <div className="text-center space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-center">
        <div className="relative">
          <Sparkles className="w-16 h-16 sm:w-20 sm:h-20 text-blue-600 animate-pulse" />
          <div className="absolute inset-0 animate-ping opacity-30">
            <Sparkles className="w-16 h-16 sm:w-20 sm:h-20 text-blue-400" />
          </div>
        </div>
      </div>

      <div className="space-y-3 sm:space-y-4">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">
          {t('welcome.title')}
        </h1>
        <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto px-4">
          {t('welcome.subtitle')}
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-6 px-4">
        <div className="space-y-2 text-left">
          <Label htmlFor="userName" className="text-base">
            {t('welcome.nameLabel')}
          </Label>
          <Input
            id="userName"
            type="text"
            placeholder={t('welcome.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-lg py-6"
            autoFocus
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 sm:p-6 space-y-3 text-left">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            {t('welcome.stepsTitle')}
          </h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">1.</span>
              <span>{t('welcome.step1')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">2.</span>
              <span>{t('welcome.step2')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">3.</span>
              <span>{t('welcome.step3')}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 font-bold">4.</span>
              <span>{t('welcome.step4')}</span>
            </li>
          </ul>
        </div>

        <Button
          onClick={handleContinue}
          disabled={!name.trim()}
          variant="primary"
          size="lg"
          className="w-full"
        >
          {t('welcome.continue')}
        </Button>

        <p className="text-xs sm:text-sm text-gray-500">
          {t('welcome.timeEstimate')}
        </p>
      </div>
    </div>
  );
}
