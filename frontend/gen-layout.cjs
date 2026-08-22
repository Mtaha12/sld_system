const fs = require('fs');
const path = './src/layouts/AuthLayout.jsx';

const col1Set = `
            <img src="https://images.unsplash.com/photo-1589994965851-a8f479c573a9?q=80&w=800&auto=format&fit=crop" className="rounded-2xl object-cover h-64 w-full text-white" alt="Legal" />
            <div className="bg-brand-orange rounded-2xl p-8 flex flex-col justify-center h-80 text-white">
              <h2 className="text-5xl font-bold mb-4">98%</h2>
              <p className="text-lg opacity-90">of law firms rely on robust case management systems for efficiency.</p>
            </div>
            <img src="https://images.unsplash.com/photo-1473186578172-c141e6798cf4?q=80&w=800&auto=format&fit=crop" className="rounded-2xl object-cover h-96 w-full text-white" alt="Courthouse" />
            <img src="https://images.unsplash.com/photo-1453728013993-6d66e9c9123a?q=80&w=800&auto=format&fit=crop" className="rounded-2xl object-cover h-72 w-full text-white" alt="Justice" />
`;

const col2Set = `
            <img src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=800&auto=format&fit=crop" className="rounded-2xl object-cover h-80 w-full text-white" alt="Lawyer" />
            <img src="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?q=80&w=800&auto=format&fit=crop" className="rounded-2xl object-cover h-64 w-full text-white" alt="Library" />
            <div className="bg-brand-green rounded-2xl p-8 flex flex-col justify-center h-72 text-white">
              <h2 className="text-5xl font-bold mb-4">24/7</h2>
              <p className="text-lg opacity-90">secure access to critical case files and court documents.</p>
            </div>
            <img src="https://images.unsplash.com/photo-1436450412740-6b988f486c6b?q=80&w=800&auto=format&fit=crop" className="rounded-2xl object-cover h-80 w-full text-white" alt="Scales" />
`;

const col3Set = `
            <img src="https://images.unsplash.com/photo-1436450412740-6b988f486c6b?q=80&w=800&auto=format&fit=crop" className="rounded-2xl object-cover h-72 w-full text-white" alt="Books" />
            <img src="https://images.unsplash.com/photo-1473186578172-c141e6798cf4?q=80&w=800&auto=format&fit=crop" className="rounded-2xl object-cover h-64 w-full text-white" alt="Table" />
            <img src="https://images.unsplash.com/photo-1589829085413-56de8ae18c73?q=80&w=800&auto=format&fit=crop" className="rounded-2xl object-cover h-80 w-full text-white" alt="Desk" />
            <img src="https://images.unsplash.com/photo-1473186578172-c141e6798cf4?q=80&w=800&auto=format&fit=crop" className="rounded-2xl object-cover h-72 w-full text-white" alt="Courthouse" />
`;

const fullLayout = `import { Link } from 'react-router-dom';

const AuthLayout = ({ children, type }) => {
  const isLogin = type === 'login';

  return (
    <div className="flex min-h-screen bg-brand-dark font-sans overflow-hidden">
      {/* Left side - Animated Masonry (Hidden on small screens) */}
      <div className="hidden lg:flex w-[60%] p-4 relative h-screen overflow-hidden items-start group">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-dark/20 to-brand-dark/80 z-10 pointer-events-none group-hover:opacity-50 transition-opacity duration-700" />
        <div className="absolute inset-0 bg-brand-dark/40 z-10 pointer-events-none group-hover:opacity-0 transition-opacity duration-700" />

        <div className="flex items-start gap-4 w-full opacity-80 group-hover:opacity-100 transition-opacity duration-700">
          {/* Column 1 - Scrolling up */}
          <div className="flex flex-col gap-4 pb-4 w-1/3 animate-scroll-up">
${col1Set.repeat(4)}
          </div>

          {/* Column 2 - Scrolling down */}
          <div className="flex flex-col gap-4 pb-4 w-1/3 animate-scroll-down">
${col2Set.repeat(4)}
          </div>

          {/* Column 3 - Scrolling up */}
          <div className="flex flex-col gap-4 pb-4 w-1/3 animate-scroll-up" style={{ animationDelay: '-15s' }}>
${col3Set.repeat(4)}
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-[40%] flex flex-col bg-brand-darker relative">
        <div className="absolute top-8 right-8 flex items-center gap-2 text-sm text-gray-400 z-20">
          <span>{isLogin ? "Don't have an account?" : "Already have an account?"}</span>
          <Link to={isLogin ? "/signup" : "/login"} className="text-white hover:text-brand-orange bg-[#1A1C23] hover:bg-[#262833] px-4 py-2 rounded-lg transition-colors">
            {isLogin ? 'Sign up' : 'Log in'}
          </Link>
        </div>

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 md:px-24 max-w-2xl mx-auto w-full z-10">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
`;

fs.writeFileSync(path, fullLayout);
