import ManageCasesFilterBar from '../features/cases/components/ManageCasesFilterBar';
import ManageCasesTable from '../features/cases/components/ManageCasesTable';
import AdminFooter from '../features/dashboard/components/AdminFooter';

const ManageCasesPage = () => {
  return (
    <div className="flex flex-col h-full w-full animate-fade-in">
      <ManageCasesFilterBar />
      <div className="flex-1">
        <ManageCasesTable />
      </div>
      <AdminFooter />
    </div>
  );
};

export default ManageCasesPage;
