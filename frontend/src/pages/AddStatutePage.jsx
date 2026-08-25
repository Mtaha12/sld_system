import AdminFooter from '../features/dashboard/components/AdminFooter';
import AddStatuteForm from '../features/statutes/components/AddStatuteForm';

const AddStatutePage = () => {
  return (
    <div className="flex flex-col w-full animate-fade-in gap-6">
      <div className="bg-theme-surface rounded-2xl shadow-sm border border-theme-border overflow-hidden relative">
        <AddStatuteForm />
      </div>
      <AdminFooter />
    </div>
  );
};

export default AddStatutePage;
