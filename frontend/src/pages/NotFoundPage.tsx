import { Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mb-4">
        <Leaf className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-display font-bold text-gray-900">Page not found</h2>
      <p className="text-sm text-gray-500 mt-1">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary mt-5">Back to dashboard</Link>
    </div>
  );
}
