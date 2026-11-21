import { useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { AuthCard } from './AuthCard.tsx';

export function AuthModal() {
  const { authModalOpen, authModalMode, closeAuthModal } = useAuth();

  useEffect(() => {
    if (!authModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuthModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [authModalOpen, closeAuthModal]);

  if (!authModalOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Account sign in"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-sm px-4 py-6"
      onClick={closeAuthModal}
    >
      <div
        className="relative w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={closeAuthModal}
          aria-label="Close sign in dialog"
          className="absolute right-4 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e2e2e2] bg-white/85 text-[#000000]"
        >
          <X size={16} aria-hidden="true" />
        </button>
        <AuthCard initialMode={authModalMode} onSuccess={closeAuthModal} />
      </div>
    </div>
  );
}
