const AdminFooter = () => {
  return (
    <footer className="mt-6 flex flex-col sm:flex-row items-center justify-between text-xs py-4 border-t border-theme-border gap-2">
      <p className="font-bold text-theme-main tracking-tight">
        SLD System (SMC-PVT) Limited
      </p>
      <p className="text-xs text-theme-muted font-medium">
        Powered and Designed by{' '}
        <a 
          href="https://www.quirksolution.dev" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="font-bold text-[#f15a24] hover:text-[#d44e35] hover:underline cursor-pointer inline-flex items-center gap-0.5 transition-colors"
        >
          Quirksolution
        </a>
      </p>
    </footer>
  );
};

export default AdminFooter;
