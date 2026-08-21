import React, { useState, useEffect, useMemo } from 'react';
import {
  Mail,
  KeyRound,
  User,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Users,
  Zap,
  RotateCcw,
  SendHorizontal,
  Eye,
  EyeOff,
  Copy,
  Check,
  HelpCircle,
  Calendar,
  Phone,
  Lock,
  AtSign,
  AlertCircle,
  Key,
} from 'lucide-react';
import { useAuth, RegisterPayload } from '../context/AuthContext';

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const NAME_REGEX = /^[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,50}$/;
const USERNAME_REGEX = /^[a-z][a-z0-9_]{2,19}$/;

export const LoginPage: React.FC = () => {
  const {
    loginWithPassword,
    registerUser,
    checkUsername,
    checkEmail,
    verifyRegistrationOTP,
    forgotPassword,
    resetPassword,
    pendingOTP,
    otpEmail,
  } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot_password'>('login');

  // Sign In States (Email + Password only, NO OTP)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoginPendingVerification, setIsLoginPendingVerification] = useState(false);

  // Forgot Password States (Email -> OTP -> New Password)
  const [forgotStep, setForgotStep] = useState<'email' | 'otp_reset'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Register Multi-Step States
  const [registerStep, setRegisterStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form Fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  const [birthDay, setBirthDay] = useState('15');
  const [birthMonth, setBirthMonth] = useState('6');
  const [birthYear, setBirthYear] = useState('2001');

  const [gender, setGender] = useState<'male' | 'female' | 'custom' | 'prefer_not_to_say'>('male');
  const [genderCustom, setGenderCustom] = useState('');

  const [email, setEmail] = useState('');
  const [emailStatus, setEmailStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
  }>({ checking: false });

  const [countryCode, setCountryCode] = useState('+92');
  const [phoneRaw, setPhoneRaw] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [username, setUsername] = useState('');
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available?: boolean;
    message?: string;
    suggestions?: string[];
  }>({ checking: false });

  const [regOtp, setRegOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showCodeHelper, setShowCodeHelper] = useState(false);
  const [copied, setCopied] = useState(false);

  // Touched state for onBlur validation
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const markTouched = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  // Auto-suggest username when names change
  useEffect(() => {
    if (firstName.trim() && lastName.trim() && !username) {
      const clean = `${firstName.trim()}_${lastName.trim()}`
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
      if (clean.length >= 3 && clean.length <= 20 && /^[a-z]/.test(clean)) {
        setUsername(clean);
      }
    }
  }, [firstName, lastName, username]);

  // Live debounced email uniqueness check
  useEffect(() => {
    if (registerStep === 3 && EMAIL_REGEX.test(email.trim())) {
      setEmailStatus({ checking: true });
      const timer = setTimeout(async () => {
        const res = await checkEmail(email.trim());
        setEmailStatus({
          checking: false,
          available: res.available,
          message: res.message,
        });
      }, 400);
      return () => clearTimeout(timer);
    } else {
      setEmailStatus({ checking: false });
    }
  }, [email, registerStep, checkEmail]);

  // Live debounced username uniqueness check
  useEffect(() => {
    const cleanUser = username.trim().toLowerCase();
    if (registerStep === 4 && USERNAME_REGEX.test(cleanUser)) {
      setUsernameStatus({ checking: true });
      const timer = setTimeout(async () => {
        const res = await checkUsername(cleanUser);
        setUsernameStatus({
          checking: false,
          available: res.available,
          message: res.message,
          suggestions: res.suggestions || [],
        });
      }, 400);
      return () => clearTimeout(timer);
    } else if (registerStep === 4) {
      setUsernameStatus({
        checking: false,
        available: false,
        message:
          cleanUser.length > 0 && !USERNAME_REGEX.test(cleanUser)
            ? 'Must be 3–20 chars, start with a letter, and use letters, numbers, or _'
            : '',
      });
    }
  }, [username, registerStep, checkUsername]);

  // Pakistani phone formatting
  const formatPakistaniPhone = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 10);
    if (digitsOnly.length <= 3) return digitsOnly;
    return `${digitsOnly.slice(0, 3)} ${digitsOnly.slice(3)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPakistaniPhone(e.target.value);
    setPhoneRaw(formatted);
  };

  const phoneDigits = phoneRaw.replace(/\D/g, '');
  const isPhoneValid = useMemo(() => {
    if (!phoneRaw.trim()) return true;
    if (countryCode === '+92') {
      return phoneDigits.length === 10 && phoneDigits.startsWith('3');
    }
    return phoneDigits.length >= 7 && phoneDigits.length <= 15;
  }, [phoneRaw, countryCode, phoneDigits]);

  // Age calculation
  const calculatedAge = useMemo(() => {
    const dob = new Date(parseInt(birthYear), parseInt(birthMonth) - 1, parseInt(birthDay));
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }, [birthDay, birthMonth, birthYear]);

  const isAgeValid = calculatedAge >= 13;

  // Password strength calculation
  const passwordStrength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-slate-200' };
    let score = 0;
    if (password.length >= 8) score++;
    if (/[A-Za-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password) || password.length >= 10) score++;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score === 2 || score === 3) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  }, [password]);

  const isPasswordValid = password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
  const isConfirmPasswordValid = password === confirmPassword && confirmPassword.length > 0;

  const isFirstNameValid = NAME_REGEX.test(firstName.trim());
  const isLastNameValid = NAME_REGEX.test(lastName.trim());
  const isStep1Valid = isFirstNameValid && isLastNameValid;

  const isGenderValid = gender !== 'custom' || genderCustom.trim().length > 0;
  const isStep2Valid = isAgeValid && isGenderValid;

  const isEmailFormatValid = EMAIL_REGEX.test(email.trim());
  const isEmailUnique = emailStatus.available !== false;
  const isStep3Valid =
    isEmailFormatValid &&
    isEmailUnique &&
    isPhoneValid &&
    isPasswordValid &&
    isConfirmPasswordValid;

  const isStep4Valid = usernameStatus.available === true && USERNAME_REGEX.test(username.trim().toLowerCase());

  // Step Progression handlers
  const handleNextStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    markTouched('firstName');
    markTouched('lastName');
    if (!isStep1Valid) return;
    setRegisterStep(2);
  };

  const handleNextStep2 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isStep2Valid) return;
    setRegisterStep(3);
  };

  const handleNextStep3 = (e: React.FormEvent) => {
    e.preventDefault();
    markTouched('email');
    markTouched('phone');
    markTouched('password');
    markTouched('confirmPassword');
    if (!isStep3Valid) return;
    setRegisterStep(4);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    markTouched('username');
    if (!isStep4Valid) return;

    setIsLoading(true);
    const dobString = `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`;
    const payload: RegisterPayload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      password,
      dateOfBirth: dobString,
      gender,
      genderCustom: gender === 'custom' ? genderCustom.trim() : undefined,
      phone: phoneDigits ? `${countryCode}${phoneDigits}` : undefined,
    };

    const res = await registerUser(payload);
    setIsLoading(false);

    if (res.success) {
      setRegisterStep(5);
    }
  };

  const handleVerifyRegisterOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regOtp.trim()) return;
    await verifyRegistrationOTP(email.trim(), regOtp.trim());
  };

  // ==========================================
  // SIGN IN SUBMISSION (Email + Password only)
  // ==========================================
  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoginPendingVerification(false);

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setLoginError('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    const res = await loginWithPassword(loginEmail.trim(), loginPassword.trim());
    setIsLoading(false);

    if (!res.success) {
      setLoginError(res.message || 'Invalid email or password.');
      if (res.message?.includes('verify your email')) {
        setIsLoginPendingVerification(true);
      }
    }
  };

  // ==========================================
  // FORGOT PASSWORD SUBMISSIONS
  // ==========================================
  const handleSendForgotPasswordOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');
    if (!forgotEmail.trim() || !EMAIL_REGEX.test(forgotEmail.trim())) {
      setForgotError('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    const res = await forgotPassword(forgotEmail.trim());
    setIsLoading(false);

    if (res.success) {
      setForgotStep('otp_reset');
    } else {
      setForgotError(res.message || 'Could not send reset code.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError('');

    if (!forgotOtp.trim()) {
      setForgotError('Please enter the 6-digit verification code.');
      return;
    }

    if (forgotNewPassword.length < 8 || !/[A-Za-z]/.test(forgotNewPassword) || !/[0-9]/.test(forgotNewPassword)) {
      setForgotError('New password must be at least 8 characters and contain both letters and numbers.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const res = await resetPassword(forgotEmail.trim(), forgotOtp.trim(), forgotNewPassword);
    setIsLoading(false);

    if (res.success) {
      setMode('login');
      setLoginEmail(forgotEmail.trim());
      setLoginPassword('');
      setForgotStep('email');
    } else {
      setForgotError(res.message || 'Failed to reset password.');
    }
  };

  const handleQuickFill = () => {
    const code = pendingOTP || '123456';
    if (mode === 'forgot_password') setForgotOtp(code);
    else setRegOtp(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Days, Months, Years
  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const months = [
    { value: '1', label: 'Jan' },
    { value: '2', label: 'Feb' },
    { value: '3', label: 'Mar' },
    { value: '4', label: 'Apr' },
    { value: '5', label: 'May' },
    { value: '6', label: 'Jun' },
    { value: '7', label: 'Jul' },
    { value: '8', label: 'Aug' },
    { value: '9', label: 'Sep' },
    { value: '10', label: 'Oct' },
    { value: '11', label: 'Nov' },
    { value: '12', label: 'Dec' },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 90 }, (_, i) => (currentYear - i).toString());

  return (
    <div className="min-h-screen w-full bg-slate-100 flex items-center justify-center p-4 sm:p-6 select-none">
      <div className="w-full max-w-5xl rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[660px]">
        {/* Left Branding Showcase Pane */}
        <div className="lg:col-span-5 bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-950 p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight font-display">Nexus Social</h1>
                <span className="text-xs text-indigo-300 font-mono uppercase tracking-widest">
                  Professional Network
                </span>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed pt-2">
              The premier social workspace for software engineers and tech innovators.
              Connect with peers, collaborate on code, and share updates worldwide.
            </p>
          </div>

          {/* Highlights */}
          <div className="space-y-3.5 my-6 relative z-10">
            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Standard Password Security</h4>
                <p className="text-[11px] text-slate-400">Secure PBKDF2 hashing with brute-force protection</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="p-2 rounded-xl bg-violet-500/20 text-violet-300">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">One-Time Registration OTP</h4>
                <p className="text-[11px] text-slate-400">OTP used only once during sign-up to verify email</p>
              </div>
            </div>

            <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300">
                <Key className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">Self-Service Account Recovery</h4>
                <p className="text-[11px] text-slate-400">Direct password reset via 6-digit Gmail code</p>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-4 border-t border-white/10 relative z-10 flex items-center justify-between">
            <span>Capital University (CUST)</span>
            <span>07B Arch Tech</span>
          </div>
        </div>

        {/* Right Form Pane */}
        <div className="lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto space-y-5">
            {/* Mode Switcher */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setLoginError('');
                }}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  mode === 'login' || mode === 'forgot_password'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setRegisterStep(1);
                }}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  mode === 'register'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* ========================================================= */}
            {/* 1. STANDARD SIGN IN (Email + Password only - NO OTP) */}
            {/* ========================================================= */}
            {mode === 'login' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Sign In to Your Account</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Enter your email and password to access your feed
                  </p>
                </div>

                {loginError && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleStandardLogin} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="your.email@gmail.com"
                        className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                        required
                        autoFocus
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      💡 Enter the email address associated with your account.
                    </p>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setMode('forgot_password');
                          setForgotStep('email');
                          setForgotEmail(loginEmail);
                          setForgotError('');
                        }}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type={showLoginPassword ? 'text' : 'password'}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      💡 Enter your account password.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !loginEmail.trim() || !loginPassword.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all active:scale-95"
                  >
                    <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {isLoginPendingVerification && (
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs text-center space-y-2">
                    <p>Your account email has not been verified yet.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(loginEmail);
                        setMode('register');
                        setRegisterStep(5);
                      }}
                      className="px-4 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs shadow-sm hover:bg-amber-700"
                    >
                      Enter Verification Code
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* 2. FORGOT PASSWORD FLOW (Email -> 6-Digit OTP -> New Password) */}
            {/* ========================================================= */}
            {mode === 'forgot_password' && (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Reset Your Password</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {forgotStep === 'email'
                      ? 'Enter your registered email to receive a 6-digit recovery code'
                      : 'Enter the code sent to your email and set a new password'}
                  </p>
                </div>

                {forgotError && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                    <span>{forgotError}</span>
                  </div>
                )}

                {forgotStep === 'email' ? (
                  <form onSubmit={handleSendForgotPasswordOTP} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Account Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          placeholder="your.email@gmail.com"
                          className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                          required
                          autoFocus
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        💡 We'll send a 6-digit password reset code to your Gmail inbox.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setMode('login');
                          setForgotError('');
                        }}
                        className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || !EMAIL_REGEX.test(forgotEmail.trim())}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
                      >
                        <span>{isLoading ? 'Sending Reset Code...' : 'Send Reset Code'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                    <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs space-y-1">
                      <p className="text-slate-700">
                        Reset code sent to <strong>{forgotEmail}</strong>.
                      </p>
                      <div className="pt-1 flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => setShowCodeHelper(!showCodeHelper)}
                          className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>{showCodeHelper ? 'Hide Code' : 'Check code here'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleQuickFill}
                          className="font-bold text-indigo-700 bg-white hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 shadow-sm"
                        >
                          {copied ? 'Filled!' : 'Quick Auto-Fill'}
                        </button>
                      </div>
                      {showCodeHelper && (
                        <div className="p-2 rounded-xl bg-white border border-indigo-200 text-center">
                          <p className="font-mono text-base font-extrabold tracking-widest text-indigo-600">
                            {pendingOTP || '123456'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 6-Digit OTP Code */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        6-Digit Reset Code
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          maxLength={6}
                          value={forgotOtp}
                          onChange={(e) => setForgotOtp(e.target.value)}
                          placeholder="e.g. 123456"
                          className="w-full pl-10 pr-4 py-2.5 text-center text-sm font-mono font-bold tracking-widest rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                          required
                          autoFocus
                        />
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        New Password
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showForgotNewPassword ? 'text' : 'password'}
                          value={forgotNewPassword}
                          onChange={(e) => setForgotNewPassword(e.target.value)}
                          placeholder="Min 8 chars (letters + numbers)"
                          className="w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirm New Password
                      </label>
                      <input
                        type={showForgotNewPassword ? 'text' : 'password'}
                        value={forgotConfirmPassword}
                        onChange={(e) => setForgotConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                        required
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setForgotStep('email')}
                        className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={
                          isLoading ||
                          !forgotOtp.trim() ||
                          forgotNewPassword.length < 8 ||
                          forgotNewPassword !== forgotConfirmPassword
                        }
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
                      >
                        <span>{isLoading ? 'Updating...' : 'Reset Password & Sign In'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* 3. MULTI-STEP REGISTRATION FLOW */}
            {/* ========================================================= */}
            {mode === 'register' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="text-xl font-extrabold text-slate-900">
                      {registerStep === 1 && "What's your name?"}
                      {registerStep === 2 && 'Date of Birth & Gender'}
                      {registerStep === 3 && 'Contact & Security'}
                      {registerStep === 4 && 'Choose Your Handle'}
                      {registerStep === 5 && 'Verify Your Email'}
                    </h2>
                    <span className="text-xs font-mono font-bold text-indigo-600">
                      Step {registerStep} of 5
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                      style={{ width: `${(registerStep / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* STEP 1: First Name & Last Name */}
                {registerStep === 1 && (
                  <form onSubmit={handleNextStep1} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          First Name *
                        </label>
                        <input
                          type="text"
                          value={firstName}
                          onBlur={() => markTouched('firstName')}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="e.g. Faseeh"
                          className={`w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border ${
                            touched.firstName && !isFirstNameValid
                              ? 'border-rose-500 bg-rose-50/30'
                              : 'border-slate-200'
                          } text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none`}
                          autoFocus
                          required
                        />
                        {touched.firstName && !isFirstNameValid && (
                          <p className="text-[11px] text-rose-500 mt-1">
                            Letters only, min 2 characters.
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Last Name *
                        </label>
                        <input
                          type="text"
                          value={lastName}
                          onBlur={() => markTouched('lastName')}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="e.g. Rehman"
                          className={`w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border ${
                            touched.lastName && !isLastNameValid
                              ? 'border-rose-500 bg-rose-50/30'
                              : 'border-slate-200'
                          } text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none`}
                          required
                        />
                        {touched.lastName && !isLastNameValid && (
                          <p className="text-[11px] text-rose-500 mt-1">
                            Letters only, min 2 characters.
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      💡 Use your real name — this is how friends will find you.
                    </p>

                    <button
                      type="submit"
                      disabled={!isStep1Valid}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
                    >
                      <span>Next: Date of Birth</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                )}

                {/* STEP 2: Date of Birth & Gender */}
                {registerStep === 2 && (
                  <form onSubmit={handleNextStep2} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Date of Birth *</span>
                      </label>

                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={birthDay}
                          onChange={(e) => setBirthDay(e.target.value)}
                          className="px-3 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                        >
                          {days.map((d) => (
                            <option key={d} value={d}>
                              Day {d}
                            </option>
                          ))}
                        </select>

                        <select
                          value={birthMonth}
                          onChange={(e) => setBirthMonth(e.target.value)}
                          className="px-3 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                        >
                          {months.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label}
                            </option>
                          ))}
                        </select>

                        <select
                          value={birthYear}
                          onChange={(e) => setBirthYear(e.target.value)}
                          className="px-3 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                        >
                          {years.map((y) => (
                            <option key={y} value={y}>
                              {y}
                            </option>
                          ))}
                        </select>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1.5">
                        💡 Use your real birthday. Your exact date of birth is kept private.
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-[11px] text-slate-600">
                          Calculated Age: <strong className="text-slate-900">{calculatedAge} years old</strong>
                        </span>
                        {!isAgeValid && (
                          <span className="text-[11px] font-bold text-rose-500 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Must be 13+</span>
                          </span>
                        )}
                      </div>

                      {!isAgeValid && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs mt-2 font-medium">
                          ⚠️ You must be at least 13 years old to create an account on Nexus Social.
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender *</label>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <label
                          className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border cursor-pointer font-medium transition-all ${
                            gender === 'male'
                              ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name="gender"
                            value="male"
                            checked={gender === 'male'}
                            onChange={() => setGender('male')}
                            className="hidden"
                          />
                          <span>Male</span>
                        </label>

                        <label
                          className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border cursor-pointer font-medium transition-all ${
                            gender === 'female'
                              ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name="gender"
                            value="female"
                            checked={gender === 'female'}
                            onChange={() => setGender('female')}
                            className="hidden"
                          />
                          <span>Female</span>
                        </label>

                        <label
                          className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border cursor-pointer font-medium transition-all ${
                            gender === 'custom'
                              ? 'bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <input
                            type="radio"
                            name="gender"
                            value="custom"
                            checked={gender === 'custom'}
                            onChange={() => setGender('custom')}
                            className="hidden"
                          />
                          <span>Custom</span>
                        </label>
                      </div>

                      {gender === 'custom' && (
                        <input
                          type="text"
                          value={genderCustom}
                          onChange={(e) => setGenderCustom(e.target.value)}
                          placeholder="Your pronoun / preferred gender"
                          className="w-full mt-2 px-3.5 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                          required
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setRegisterStep(1)}
                        className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={!isStep2Valid}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
                      >
                        <span>Next: Contact & Password</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 3: Email, Phone & Password */}
                {registerStep === 3 && (
                  <form onSubmit={handleNextStep3} className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={email}
                          onBlur={() => markTouched('email')}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@gmail.com"
                          className={`w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 border ${
                            touched.email && (!isEmailFormatValid || emailStatus.available === false)
                              ? 'border-rose-500 bg-rose-50/30'
                              : emailStatus.available === true
                              ? 'border-emerald-500'
                              : 'border-slate-200'
                          } text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none`}
                          required
                        />
                        {emailStatus.checking && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">⏳</span>
                        )}
                        {emailStatus.available === true && !emailStatus.checking && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                        )}
                      </div>

                      {touched.email && !isEmailFormatValid ? (
                        <p className="text-[11px] text-rose-500 mt-1 font-medium">
                          Please enter a valid email address (e.g. name@example.com).
                        </p>
                      ) : touched.email && emailStatus.available === false ? (
                        <p className="text-[11px] text-rose-500 mt-1 font-medium">
                          {emailStatus.message}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 mt-1">
                          💡 We'll send a 6-digit verification code to this address.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Phone Number (Optional recovery)
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={countryCode}
                          onChange={(e) => setCountryCode(e.target.value)}
                          className="px-2.5 py-2.5 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                        >
                          <option value="+92">🇵🇰 +92</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+971">🇦🇪 +971</option>
                          <option value="+966">🇸🇦 +966</option>
                        </select>
                        <div className="relative flex-1">
                          <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="tel"
                            value={phoneRaw}
                            onBlur={() => markTouched('phone')}
                            onChange={handlePhoneChange}
                            placeholder="300 1234567"
                            className={`w-full pl-10 pr-4 py-2.5 text-xs rounded-xl bg-slate-50 border ${
                              touched.phone && !isPhoneValid
                                ? 'border-rose-500 bg-rose-50/30'
                                : 'border-slate-200'
                            } text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none`}
                          />
                        </div>
                      </div>

                      {touched.phone && !isPhoneValid ? (
                        <p className="text-[11px] text-rose-500 mt-1 font-medium">
                          Enter a valid Pakistani mobile number (10 digits, starting with 3).
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 mt-1">
                          💡 10 digits, starting with 3 (e.g. 300 1234567). Used only for account recovery.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onBlur={() => markTouched('password')}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Min 8 chars (letters + numbers)"
                          className={`w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 border ${
                            touched.password && !isPasswordValid
                              ? 'border-rose-500 bg-rose-50/30'
                              : 'border-slate-200'
                          } text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {password && (
                        <div className="mt-1.5 space-y-1">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">Strength:</span>
                            <span className="font-bold text-slate-800">{passwordStrength.label}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-1 h-1">
                            <div
                              className={`rounded-full ${
                                passwordStrength.score >= 1 ? passwordStrength.color : 'bg-slate-200'
                              }`}
                            />
                            <div
                              className={`rounded-full ${
                                passwordStrength.score >= 2 ? passwordStrength.color : 'bg-slate-200'
                              }`}
                            />
                            <div
                              className={`rounded-full ${
                                passwordStrength.score >= 3 ? passwordStrength.color : 'bg-slate-200'
                              }`}
                            />
                          </div>
                        </div>
                      )}

                      {touched.password && !isPasswordValid ? (
                        <p className="text-[11px] text-rose-500 mt-1 font-medium">
                          Must be at least 8 characters with both letters and numbers.
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 mt-1">
                          💡 At least 8 characters, with a mix of letters and numbers.
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Confirm Password *
                      </label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onBlur={() => markTouched('confirmPassword')}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password"
                        className={`w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 border ${
                          touched.confirmPassword && !isConfirmPasswordValid
                            ? 'border-rose-500 bg-rose-50/30'
                            : 'border-slate-200'
                        } text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none`}
                        required
                      />
                      {touched.confirmPassword && !isConfirmPasswordValid && (
                        <p className="text-[11px] text-rose-500 mt-1 font-medium">
                          Passwords do not match.
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setRegisterStep(2)}
                        className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={!isStep3Valid}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
                      >
                        <span>Next: Choose Username</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 4: Choose Username */}
                {registerStep === 4 && (
                  <form onSubmit={handleRegisterSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Choose Your Unique Username (@handle) *
                      </label>

                      <div className="relative">
                        <AtSign className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={username}
                          onBlur={() => markTouched('username')}
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
                            setUsername(val);
                          }}
                          placeholder="e.g. faseeh_rehman"
                          className={`w-full pl-10 pr-10 py-2.5 text-xs rounded-xl bg-slate-50 border ${
                            usernameStatus.available === false
                              ? 'border-rose-500 bg-rose-50/30'
                              : usernameStatus.available === true
                              ? 'border-emerald-500'
                              : 'border-slate-200'
                          } text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none`}
                          autoFocus
                          required
                        />
                        {usernameStatus.checking && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs">⏳</span>
                        )}
                        {!usernameStatus.checking && usernameStatus.available === true && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 mt-1.5">
                        💡 Letters, numbers, and underscores only. This must be unique — you'll see a checkmark if it's available.
                      </p>

                      {usernameStatus.message && (
                        <p
                          className={`text-[11px] mt-1 font-semibold ${
                            usernameStatus.available ? 'text-emerald-600' : 'text-rose-500'
                          }`}
                        >
                          {usernameStatus.message}
                        </p>
                      )}

                      {usernameStatus.suggestions && usernameStatus.suggestions.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <span className="text-[10px] text-slate-400 block font-medium">
                            Suggested available handles:
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {usernameStatus.suggestions.map((sug) => (
                              <button
                                key={sug}
                                type="button"
                                onClick={() => setUsername(sug)}
                                className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-mono font-semibold transition-colors"
                              >
                                @{sug}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setRegisterStep(3)}
                        className="px-4 py-3 rounded-2xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        disabled={!isStep4Valid || isLoading}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
                      >
                        <span>{isLoading ? 'Creating & Sending OTP...' : 'Create Account & Send OTP'}</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )}

                {/* STEP 5: 6-Digit Email OTP Verification */}
                {registerStep === 5 && (
                  <form onSubmit={handleVerifyRegisterOTP} className="space-y-4">
                    <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs space-y-1.5">
                      <div className="flex items-center justify-between font-bold text-indigo-900">
                        <span className="flex items-center gap-1.5">
                          <SendHorizontal className="w-4 h-4 text-indigo-600" />
                          <span>OTP Dispatched to Your Gmail</span>
                        </span>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          Sent
                        </span>
                      </div>
                      <p className="text-slate-600">
                        We sent a 6-digit code to <strong>{email}</strong>. Enter it below to activate your account.
                      </p>

                      <div className="pt-1 flex items-center justify-between text-[11px]">
                        <button
                          type="button"
                          onClick={() => setShowCodeHelper(!showCodeHelper)}
                          className="text-indigo-600 font-semibold hover:underline flex items-center gap-1"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                          <span>{showCodeHelper ? 'Hide Code' : 'Check code here'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleQuickFill}
                          className="font-bold text-indigo-700 bg-white hover:bg-indigo-100 px-2 py-0.5 rounded-lg border border-indigo-200 shadow-sm"
                        >
                          {copied ? 'Filled!' : 'Quick Auto-Fill'}
                        </button>
                      </div>

                      {showCodeHelper && (
                        <div className="p-2 rounded-xl bg-white border border-indigo-200 text-center">
                          <p className="font-mono text-base font-extrabold tracking-widest text-indigo-600">
                            {pendingOTP || '123456'}
                          </p>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Enter 6-Digit OTP Code
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          maxLength={6}
                          value={regOtp}
                          onChange={(e) => setRegOtp(e.target.value)}
                          placeholder="e.g. 123456"
                          className="w-full pl-10 pr-4 py-3 text-center text-sm font-mono font-bold tracking-widest rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                          autoFocus
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={!regOtp.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Activate Account & Log In</span>
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
