import { useState, type FormEvent } from 'react';
import {
  formatFirebaseAuthError,
  useAuth,
  type AuthModalMode,
} from '../context/AuthContext.tsx';

interface AuthCardProps {
  initialMode?: AuthModalMode;
  heading?: string;
  subheading?: string;
  onSuccess?: () => void;
}

export function AuthCard({
  initialMode = 'signin',
  heading,
  subheading,
  onSuccess,
}: AuthCardProps) {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, sendPasswordReset } = useAuth();
  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [resetSentTo, setResetSentTo] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (mode === 'reset') {
      const trimmedEmail = email.trim();
      if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
        setErrorMessage('Enter a valid email address to generate a password reset link.');
        return;
      }
      setBusy(true);
      try {
        await sendPasswordReset(trimmedEmail);
        setResetSentTo(trimmedEmail);
      } catch (err: unknown) {
        setErrorMessage(formatFirebaseAuthError(err));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'signup' && fullName.trim().length < 2) {
      setErrorMessage('Enter your full name to create your account.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(fullName, email, password);
      } else {
        await signInWithEmail(email, password);
      }
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMessage(formatFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setErrorMessage('');
    setBusy(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err: unknown) {
      setErrorMessage(formatFirebaseAuthError(err));
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: AuthModalMode) => {
    setMode(next);
    setErrorMessage('');
    if (next !== 'reset') {
      setResetSentTo('');
    }
  };

  return (
    <div className="w-full rounded-2xl glass-light border border-white/70 p-7 md:p-9">
      <div>
        <h2 className="display-md text-[#000000]">
          {mode === 'reset'
            ? 'Reset your password'
            : heading || (mode === 'signin' ? 'Sign in to Evora' : 'Create your Evora account')}
        </h2>
        <p className="mt-2 text-sm text-[#5e5e5e] leading-relaxed">
          {mode === 'reset'
            ? 'Enter the email address for your account and we will send a password reset link right away.'
            : subheading ||
              'Book passes, keep your QR tickets synced, and publish campus events.'}
        </p>
      </div>

      {mode !== 'reset' ? (
        <div
          role="tablist"
          aria-label="Authentication mode"
          className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-[#efefef] p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            onClick={() => switchMode('signin')}
            className={`rounded-lg py-2.5 text-xs font-medium ${
              mode === 'signin'
                ? 'bg-[#000000] text-[#ffffff]'
                : 'bg-transparent text-[#000000]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => switchMode('signup')}
            className={`rounded-lg py-2.5 text-xs font-medium ${
              mode === 'signup'
                ? 'bg-[#000000] text-[#ffffff]'
                : 'bg-transparent text-[#000000]'
            }`}
          >
            Create Account
          </button>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="mt-5 rounded-xl border border-[#b42318] bg-[#ffffff] px-4 py-3 text-xs text-[#b42318] leading-relaxed"
        >
          {errorMessage}
        </div>
      ) : null}

      {mode === 'reset' && resetSentTo ? (
        <div className="mt-5 space-y-4">
          <div
            role="status"
            className="rounded-xl border border-[#166534] bg-[#ffffff] px-4 py-4 text-xs text-[#166534] leading-relaxed"
          >
            <p className="font-semibold">Reset link sent</p>
            <p className="mt-1">
              We sent a password reset link to <span className="font-semibold">{resetSentTo}</span>. Open the link in your inbox (or spam folder) to choose a new password.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setResetSentTo('')}
              className="text-xs font-medium text-[#5e5e5e] underline"
            >
              Send to another email
            </button>
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="rounded-full bg-[#000000] active:bg-[#282828] px-5 py-2.5 text-xs font-medium text-[#ffffff]"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {mode === 'signup' ? (
            <div>
              <label htmlFor="auth-fullname" className="block text-xs font-medium text-[#000000] mb-1.5">
                Full name
              </label>
              <input
                id="auth-fullname"
                type="text"
                required
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Aarav Verma"
                className="w-full rounded-lg bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e]"
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="auth-email" className="block text-xs font-medium text-[#000000] mb-1.5">
              Email address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@college.edu"
              className="w-full rounded-lg bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e]"
            />
          </div>

          {mode !== 'reset' ? (
            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-3">
                <label htmlFor="auth-password" className="block text-xs font-medium text-[#000000]">
                  Password
                </label>
                {mode === 'signin' ? (
                  <button
                    type="button"
                    onClick={() => switchMode('reset')}
                    className="text-xs font-medium text-[#5e5e5e] underline"
                  >
                    Forgot password?
                  </button>
                ) : null}
              </div>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Enter your password'}
                className="w-full rounded-lg bg-[#efefef] px-3.5 py-3 text-sm text-[#000000] placeholder:text-[#5e5e5e]"
              />
            </div>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-[#000000] active:bg-[#282828] disabled:opacity-50 px-5 py-3.5 text-sm font-medium text-[#ffffff]"
          >
            {busy
              ? 'Please wait...'
              : mode === 'reset'
                ? 'Send Password Reset Link'
                : mode === 'signup'
                  ? 'Create Account'
                  : 'Sign In'}
          </button>

          {mode === 'reset' ? (
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className="w-full py-1 text-center text-xs font-medium text-[#5e5e5e] underline"
            >
              Back to Sign In
            </button>
          ) : null}
        </form>
      )}

      {mode !== 'reset' ? (
        <>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#e2e2e2]" />
            <span className="text-xs text-[#5e5e5e]">or</span>
            <div className="h-px flex-1 bg-[#e2e2e2]" />
          </div>

          <button
            type="button"
            disabled={busy}
            onClick={handleGoogle}
            className="w-full rounded-xl border border-[#e2e2e2] bg-[#ffffff] active:bg-[#efefef] disabled:opacity-50 px-5 py-3 text-sm font-medium text-[#000000]"
          >
            Continue with Google
          </button>
        </>
      ) : null}
    </div>
  );
}
