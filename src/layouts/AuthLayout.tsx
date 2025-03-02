import { Outlet } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center mb-8">
          <MessageSquare className="w-12 h-12 text-white" />
          <h1 className="text-3xl font-bold text-white ml-2">ConecteZap</h1>
        </div>
        <div className="bg-white rounded-lg shadow-xl p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}