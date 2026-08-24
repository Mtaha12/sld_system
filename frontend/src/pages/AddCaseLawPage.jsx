import { useNavigate } from 'react-router-dom';
import AddCaseLawDetail from '../features/cases/components/AddCaseLawDetail';
import AdminFooter from '../features/dashboard/components/AdminFooter';

const AddCaseLawPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col w-full animate-fade-in gap-6">
      <div className="bg-theme-surface rounded-2xl shadow-sm border border-theme-border overflow-hidden">
        <AddCaseLawDetail onClose={() => navigate('/manage-cases')} />
      </div>
      <AdminFooter />
    </div>
  );
};

export default AddCaseLawPage;
