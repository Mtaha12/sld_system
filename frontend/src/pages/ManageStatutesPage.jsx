import AdminFooter from '../features/dashboard/components/AdminFooter';
import ManageStatutesFilterBar from '../features/statutes/components/ManageStatutesFilterBar';
import ManageStatutesTable from '../features/statutes/components/ManageStatutesTable';

const ManageStatutesPage = () => {
  return (
    <div className="flex flex-col w-full animate-fade-in gap-6">
      
      <div className="flex flex-col gap-2">
        <ManageStatutesFilterBar />
        <ManageStatutesTable />
      </div>

      <AdminFooter />
    </div>
  );
};

export default ManageStatutesPage;
