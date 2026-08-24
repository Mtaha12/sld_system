import { ShieldCheck } from 'lucide-react';

const AdminFooter = () => {
  return (
    <footer className="mt-8 flex items-center justify-between text-xs text-theme-muted py-4 border-t border-theme-border">
      <p>
        You are using <strong className="font-semibold text-theme-main">SLD System</strong> Admin Panel
      </p>
      <div className="flex items-center gap-1.5">
        <span>Version 2.0.0</span>
        <ShieldCheck className="w-4 h-4 text-brand-orange" />
      </div>
    </footer>
  );
};

export default AdminFooter;
