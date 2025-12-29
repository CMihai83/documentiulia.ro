/**
 * Error State Component
 * Displays user-friendly error messages with retry functionality
 */

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}

export function ErrorState({
  title = 'A apărut o eroare',
  message = 'Nu am putut încărca datele. Vă rugăm încercați din nou.',
  onRetry,
  showRetry = true,
}: ErrorStateProps) {
  return (
    <Card className="border-red-200 bg-red-50">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-600 mb-4" aria-hidden="true" />
          <h3 className="text-lg font-semibold text-red-900 mb-2">{title}</h3>
          <p className="text-sm text-red-700 mb-4 max-w-md">{message}</p>
          {showRetry && onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              className="border-red-600 text-red-600 hover:bg-red-50"
              aria-label="Încearcă din nou să încarci datele"
            >
              <RefreshCcw className="h-4 w-4 mr-2" aria-hidden="true" />
              Încearcă din nou
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function EmptyState({
  icon: Icon = AlertTriangle,
  title = 'Niciun rezultat',
  message = 'Nu există date de afișat.',
  actionLabel,
  onAction,
}: {
  icon?: any;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mb-4 opacity-50" aria-hidden="true" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-md">{message}</p>
      {actionLabel && onAction && (
        <Button onClick={onAction} variant="outline">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
