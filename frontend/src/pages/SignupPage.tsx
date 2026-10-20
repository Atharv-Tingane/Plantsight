import { useState, FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Mail, Lock, User, MapPin, Eye, EyeOff, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Please provide your full name.');
      return;
    }

    if (!email.trim()) {
      setError('Please provide your email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      await signup({
        name: name.trim(),
        email: email.trim(),
        password,
        location: location.trim() || undefined,
      });
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f6f8f4]">
      {/* Left side: Brand Showcase Banner */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-emerald-800 via-brand-700 to-teal-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative blur elements */}
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
            Join the Botanical Network
          </span>
          <h2 className="text-4xl font-display font-bold tracking-tight leading-tight text-white mb-4">
            Start managing your plants with intelligent telemetry.
          </h2>
          <p className="text-brand-100/90 text-sm leading-relaxed mb-8">
            Create an account to register your botanic specimens, monitor real-time microclimate sensors, and diagnose leaf diseases with Gemini Vision AI.
          </p>

          <div className="space-y-3.5">
            <div className="flex items-center gap-3 text-sm text-brand-100">
              <div className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Isolated private dashboard for each botanist</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-brand-100">
              <div className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Automatic linking to existing starter plants</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-brand-100">
              <div className="w-5 h-5 rounded-full bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <span>Bcrypt password encryption and secure JWT sessioning</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-white/10 flex items-center justify-between text-xs text-brand-200">
          <span>MongoDB Atlas &middot; Cloudinary &middot; Gemini AI</span>
          <span>&copy; {new Date().getFullYear()} PlantSight</span>
        </div>
      </div>

      {/* Right side: Signup Form */}
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
              <h2 className="text-2xl font-display font-bold text-gray-900">Create an account</h2>
              <p className="text-sm text-gray-500 mt-1">
                Enter your details to set up your personal plant monitoring profile.
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
                <label className="label" htmlFor="name">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Maya Lin"
                    required
                    autoFocus
                    className="input pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

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
                    autoComplete="email"
                    className="input pl-10"
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="password">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a strong password"
                    required
                    minLength={6}
                    autoComplete="new-password"
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

              <div>
                <label className="label" htmlFor="location">
                  Garden Location <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="location"
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Balcony Garden / Greenhouse"
                    className="input pl-10"
                    disabled={loading}
                  />
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
                    Creating account...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Create PlantSight Account
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-brand-600 hover:text-brand-700 hover:underline inline-flex items-center gap-1"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
