import { Loader2 } from 'lucide-react';

export default function FinanceLoading() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <span className="ml-2 text-gray-600">Se incarca rapoartele financiare...</span>
    </div>
  );
}
