import { useState, FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Leaf, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Return to intended page after login, or dashboard
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f6f8f4]">
      {/* Left side: Brand Showcase Banner (visible on desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-800 via-brand-700 to-teal-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/5 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-brand-400/10 blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center">
            <Leaf className="w-6 h-6 text-brand-300" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold tracking-tight">PlantSight</h1>
            <p className="text-xs text-brand-200">Smart Plant Monitoring & AI Botanical Diagnosis</p>
          </div>
        </div>

        <div className="relative z-10 my-auto py-8 max-w-md">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-200 border border-emerald-400/20 mb-6">
            <ShieldCheck className="w-3.5 h-3.5" />
            Secure Multi-Tenant Platform
          </span>
          <h2 className="text-4xl font-display font-bold tracking-tight leading-tight text-white mb-4">
            Keep your plants thriving with real-time intelligence.
          </h2>
          <p className="text-brand-100/90 text-sm leading-relaxed mb-8">
            Access your private garden dashboard, live soil moisture telemetry from your ESP32 microcontrollers, and Google Gemini AI botanical disease diagnosis.
          </p>

          <div className="space-y-3.5">
            <div className="flex items-center gap-3 text-sm text-brand-100">
              <div className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Private garden isolation & multi-user data security</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-brand-100">
              <div className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Google Gemini Developer API leaf disease diagnosis</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-brand-100">
              <div className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Continuous sensor thresholds & smart alerts</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-brand-200">
          <span>MongoDB Atlas &middot; Cloudinary &middot; Gemini AI</span>
          <span>&copy; {new Date().getFullYear()} PlantSight</span>
        </div>
      </div>

      {/* Right side: Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile brand header */}
          <div className="flex items-center gap-2.5 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-brand-600 text-white flex items-center justify-center shadow-md shadow-brand-600/20">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold text-gray-900">PlantSight</h1>
              <p className="text-xs text-gray-400">Smart Plant Monitoring</p>
            </div>
          </div>

          <div className="card p-6 sm:p-8 bg-white border border-gray-100 shadow-xl shadow-gray-200/40">
            <div className="mb-6">
              <h2 className="text-2xl font-display font-bold text-gray-900">Welcome back</h2>
              <p className="text-sm text-gray-500 mt-1">
                Enter your credentials to access your plants and sensor data.
              </p>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="gardener@example.com"
                    required
                    autoFocus
                    autoComplete="email"
                    className="input pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="label !mb-0" htmlFor="password">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    autoComplete="current-password"
                    className="input pl-10 pr-10"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 mt-2 text-base font-semibold shadow-lg shadow-brand-600/20"
              >
                {loading ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Sign in to PlantSight
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600">
                Don't have an account yet?{' '}
                <Link
                  to="/signup"
                  className="font-semibold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1"
                >
                  Create an account
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
