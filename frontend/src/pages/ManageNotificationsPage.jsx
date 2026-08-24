import ManageNotificationsFilterBar from '../features/notifications/components/ManageNotificationsFilterBar';
import ManageNotificationsTable from '../features/notifications/components/ManageNotificationsTable';
import AdminFooter from '../features/dashboard/components/AdminFooter';

const ManageNotificationsPage = () => {
  return (
    <div className="flex flex-col h-full w-full animate-fade-in">
      <ManageNotificationsFilterBar />
      <div className="flex-1">
        <ManageNotificationsTable />
      </div>
      <AdminFooter />
    </div>
  );
};

export default ManageNotificationsPage;
