import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Eye, EyeOff, Check, X } from 'lucide-react';
import NavigationV2 from '../components/v2/NavigationV2';
import FooterV2 from '../components/v2/FooterV2';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3010';
const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:5173';

interface ValidationErrors {
  name?: string;
  companyName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  isValid: boolean;
}

export default function Register() {
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({ score: 0, feedback: [], isValid: false });

  const validatePassword = (pwd: string): PasswordStrength => {
    const feedback: string[] = [];
    let score = 0;

    if (pwd.length >= 8) {
      score += 1;
    } else {
      feedback.push('At least 8 characters');
    }

    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) {
      score += 1;
    } else {
      feedback.push('Mix of uppercase and lowercase letters');
    }

    if (/\d/.test(pwd)) {
      score += 1;
    } else {
      feedback.push('At least one number');
    }

    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) {
      score += 1;
    } else {
      feedback.push('At least one special character');
    }

    return {
      score,
      feedback,
      isValid: score >= 3 && pwd.length >= 8
    };
  };

  const validateForm = (): ValidationErrors => {
    const newErrors: ValidationErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Name is required';
    } else if (name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (companyName.trim() && companyName.trim().length < 2) {
      newErrors.companyName = 'Company name must be at least 2 characters';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (!passwordStrength.isValid) {
      newErrors.password = 'Password does not meet requirements';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    return newErrors;
  };

  useEffect(() => {
    if (password) {
      setPasswordStrength(validatePassword(password));
    }
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const formErrors = validateForm();

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          name,
          companyName: companyName || undefined
        }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Registration failed');
      }

      // Store token if provided
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }

      // Redirect to the main app
      window.location.href = `${APP_URL}/planning`;
    } catch (err: any) {
      setErrors({ email: err.message || 'Registration failed' });
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = (hasError: boolean) =>
    `w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-slate-900 bg-white ${
      hasError
        ? 'border-red-300 focus:ring-red-500'
        : 'border-slate-200 focus:ring-blue-500'
    }`;

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <NavigationV2 />

      <div className="flex-1 flex items-center justify-center px-4 pt-20">
        <div className="w-full max-w-md py-12">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">Create your account</h1>
            <p className="text-slate-600">Get started with AgentWorks today</p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClasses(!!errors.name)}
                placeholder="Enter your full name"
              />
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Company / Workspace Name <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={inputClasses(!!errors.companyName)}
                placeholder="Your company or workspace name"
              />
              {errors.companyName && (
                <p className="mt-1 text-xs text-red-600">{errors.companyName}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClasses(!!errors.email)}
                placeholder="Enter your email address"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email}</p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClasses(!!errors.password)} pr-10`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2 space-y-1">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full transition-colors ${
                          passwordStrength.score >= level
                            ? passwordStrength.score <= 2
                              ? 'bg-red-500'
                              : passwordStrength.score === 3
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                            : 'bg-slate-200'
                        }`}
                      />
                    ))}
                  </div>
                  {passwordStrength.feedback.length > 0 && (
                    <div className="text-xs space-y-0.5">
                      {passwordStrength.feedback.map((item, index) => (
                        <div key={index} className="flex items-center gap-1 text-slate-500">
                          <X className="h-3 w-3 text-red-400" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {passwordStrength.isValid && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <Check className="h-3 w-3" />
                      <span>Password meets requirements</span>
                    </div>
                  )}
                </div>
              )}
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password}</p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`${inputClasses(!!errors.confirmPassword)} pr-10`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && password && confirmPassword === password && (
                <div className="mt-1 flex items-center gap-1 text-xs text-green-600">
                  <Check className="h-3 w-3" />
                  <span>Passwords match</span>
                </div>
              )}
              {errors.confirmPassword && (
                <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !passwordStrength.isValid || password !== confirmPassword}
              className="w-full bg-blue-500 text-white py-2.5 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>

            <p className="mt-4 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </div>
      </div>

      <FooterV2 />
    </div>
  );
}
