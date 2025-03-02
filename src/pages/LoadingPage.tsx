import { MessageCircle } from 'lucide-react';

export function LoadingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center">
      <div className="text-center">
        <MessageCircle className="h-12 w-12 text-white mx-auto mb-4 animate-pulse" />
        <h1 className="text-2xl font-bold text-white mb-2">ConecteZap</h1>
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent align-[-0.125em]" />
      </div>
    </div>
  );
}