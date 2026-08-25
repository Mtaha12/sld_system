import { lazy, Suspense } from 'react';
import { Link, useLocation } from 'react-router-dom';
import PageTransition from '../components/ui/PageTransition';
import Spinner from '../components/ui/Spinner';

const AuthMasonry = lazy(() => import('./AuthMasonry'));

const AuthLayout = () => {
  const location = useLocation();
  const isLogin = location.pathname === '/login' || location.pathname === '/';
  const isContact = location.pathname === '/contact';

  const headerPromptText = isContact 
    ? 'Need to access your account?'
    : isLogin 
      ? "Don't have an account?" 
      : 'Already have an account?';

  const headerLinkTo = isContact || !isLogin ? '/login' : '/signup';
  const headerLinkLabel = isContact || !isLogin ? 'Log in' : 'Sign up';

  return (
    <div className="flex min-h-[100dvh] bg-brand-dark font-sans lg:overflow-hidden">
      {/* Left side - Animated Masonry (Hidden on small screens) */}
      <div className="hidden lg:flex w-[60%] p-4 relative h-screen overflow-hidden items-start group">
        <Suspense fallback={<div className="absolute inset-0 bg-brand-dark/80" />}>
          <AuthMasonry />
        </Suspense>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-[40%] flex flex-col bg-brand-darker relative min-h-[100dvh] lg:h-screen lg:overflow-y-auto">
        {/* Navigation / Header Actions (rendered on sub-pages like /contact, /forgot-password, /verify-email) */}
        {!isLogin && location.pathname !== '/signup' && (
          <div className="flex justify-end p-6 sm:p-8 lg:absolute lg:top-8 lg:right-8 lg:p-0 z-20">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>{headerPromptText}</span>
              <Link to={headerLinkTo} className="text-white hover:text-brand-orange bg-[#1A1C23] hover:bg-brand-dark-border px-4 py-2 rounded-lg transition-colors">
                {headerLinkLabel}
              </Link>
            </div>
          </div>
        )}

        {/* Content Container */}
        <div className="flex-1 flex flex-col justify-center py-8 px-6 sm:px-12 md:px-16 lg:px-24 max-w-2xl mx-auto w-full z-10">
          <Suspense fallback={<div className="flex flex-col flex-1 justify-center items-center"><Spinner size="lg" /></div>}>
            <PageTransition />
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
