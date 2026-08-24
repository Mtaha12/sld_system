import AddNotificationForm from '../features/notifications/components/AddNotificationForm';
import AdminFooter from '../features/dashboard/components/AdminFooter';

const AddNotificationPage = () => {
  return (
    <div className="flex flex-col w-full animate-fade-in gap-6">
      <div className="bg-theme-surface rounded-2xl shadow-sm border border-theme-border overflow-hidden">
        <AddNotificationForm />
      </div>
      <AdminFooter />
    </div>
  );
};

export default AddNotificationPage;
