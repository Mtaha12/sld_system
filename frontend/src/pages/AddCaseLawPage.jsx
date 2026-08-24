import { useNavigate } from 'react-router-dom';
import AddCaseLawDetail from '../features/cases/components/AddCaseLawDetail';
import AdminFooter from '../features/dashboard/components/AdminFooter';

const AddCaseLawPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full w-full animate-fade-in">
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
        <AddCaseLawDetail onClose={() => navigate('/manage-cases')} />
      </div>
      <AdminFooter />
    </div>
  );
};

export default AddCaseLawPage;
