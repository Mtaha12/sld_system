import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Hash, Search, AlertCircle, Printer } from 'lucide-react';
import ManageNotificationsFilterBar from '../features/notifications/components/ManageNotificationsFilterBar';
import ManageNotificationsTable from '../features/notifications/components/ManageNotificationsTable';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';
import { MOCK_NOTIFICATIONS } from '../features/notifications/data/notificationsMockData';

const ManageNotificationsPage = () => {
  const [searchParams] = useSearchParams();
  const initialParamQuery = searchParams.get('search') || '';

  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  const [currentPage, setCurrentPage] = useState(1);
  const [highlightedId, setHighlightedId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialParamQuery);

  // Sync when search URL query changes
  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  // Get ID Modal State
  const [getIdModalOpen, setGetIdModalOpen] = useState(false);
  const [getIdInput, setGetIdInput] = useState('');
  const [getIdError, setGetIdError] = useState('');

  // Filtered Notifications based on Search
  const filteredNotifications = useMemo(() => {
    if (!searchQuery) return notifications;
    const query = searchQuery.toLowerCase().trim();
    return notifications.filter(item => {
      const srMatch = item.srNumber?.toString().includes(query);
      const numMatch = item.number?.toString().includes(query);
      const yearMatch = item.year?.toString().includes(query);
      const dateMatch = item.lawDate?.toLowerCase().includes(query);
      const sroMatch = item.sroNumber?.toLowerCase().includes(query);
      const subjectMatch = item.subject?.toLowerCase().includes(query);
      const deptMatch = item.department?.toLowerCase().includes(query);
      const statuteMatch = item.lawStatute?.toLowerCase().includes(query);
      const sectionMatch = item.section?.toLowerCase().includes(query);
      return srMatch || numMatch || yearMatch || dateMatch || sroMatch || subjectMatch || deptMatch || statuteMatch || sectionMatch;
    });
  }, [notifications, searchQuery]);

  // Open Get ID Modal
  const handleOpenGetId = () => {
    setGetIdInput('');
    setGetIdError('');
    setGetIdModalOpen(true);
  };

  // Submit Get ID Search
  const handleGetIdSubmit = (e) => {
    e?.preventDefault();
    setGetIdError('');

    if (!getIdInput.trim()) {
      setGetIdError('Please enter a Notification SR # or SRO #.');
      return;
    }

    const clean = getIdInput.trim().toLowerCase().replace(/^sr\s*#?/i, '').replace(/^sro\s*#?/i, '').trim();

    // Find in total notifications
    const foundIndex = notifications.findIndex(n => 
      n.srNumber?.toString().toLowerCase() === clean ||
      n.number?.toString().toLowerCase() === clean ||
      n.id?.toString() === clean ||
      n.sroNumber?.toLowerCase().includes(clean)
    );

    if (foundIndex === -1) {
      setGetIdError(`Notification SR #${getIdInput.trim()} does not exist in records.`);
      return;
    }

    const target = notifications[foundIndex];

    // Clear search query if item is hidden
    if (searchQuery && !filteredNotifications.some(n => n.id === target.id)) {
      setSearchQuery('');
    }

    const targetPage = Math.floor(foundIndex / 10) + 1;
    setCurrentPage(targetPage);
    setHighlightedId(target.id);
    setGetIdModalOpen(false);

    setToastMessage(`Located Notification SR #${target.srNumber} on Page ${targetPage}. Scrolling to position...`);

    // Smooth scroll to element
    setTimeout(() => {
      const rowEl = document.getElementById(`notification-row-${target.id}`);
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);

    // Clear highlight after pulse
    setTimeout(() => {
      setHighlightedId(null);
    }, 4500);
  };

  return (
    <div className="flex flex-col h-full w-full animate-fade-in">
      <ManageNotificationsFilterBar 
        initialSearch={searchQuery}
        onGetId={handleOpenGetId}
        onSearch={setSearchQuery}
        onShowAll={() => setSearchQuery('')}
      />

      <div className="flex-1">
        <ManageNotificationsTable 
          notifications={filteredNotifications}
          setNotifications={setNotifications}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          highlightedId={highlightedId}
          toastMessage={toastMessage}
          setToastMessage={setToastMessage}
        />
      </div>

      <AdminFooter />

      {/* Get Notification ID Dialogue Box */}
      <Modal
        isOpen={getIdModalOpen}
        onClose={() => setGetIdModalOpen(false)}
        title="Get Notification by ID"
        subtitle="Enter a Notification SR # or SRO # to scroll directly to its position"
        icon={Hash}
        maxWidth="max-w-md"
        footer={
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setGetIdModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              className="bg-brand-orange hover:bg-[#D44E35] text-white flex items-center gap-1.5"
              onClick={handleGetIdSubmit}
            >
              <Search className="w-4 h-4" /> Locate & Scroll
            </Button>
          </>
        }
      >
        <form onSubmit={handleGetIdSubmit} className="space-y-4">
          {getIdError && (
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{getIdError}</span>
            </div>
          )}

          <FormField label="Notification SR # or SRO #" required>
            <Input 
              value={getIdInput}
              onChange={(e) => {
                setGetIdInput(e.target.value);
                if (getIdError) setGetIdError('');
              }}
              placeholder="e.g. 1, 2, or S.R.O. 581(I)/2025"
              required
              autoFocus
            />
          </FormField>

          {/* Suggestions */}
          <div>
            <span className="text-[11px] text-theme-muted font-medium block mb-1.5">
              Quick select Notification SR #:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
              {notifications.slice(0, 10).map(n => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => {
                    setGetIdInput(n.srNumber.toString());
                    if (getIdError) setGetIdError('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    getIdInput === n.srNumber.toString()
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'bg-theme-surface-alt/60 hover:bg-theme-surface-alt text-theme-main border-theme-border'
                  }`}
                >
                  SR #{n.srNumber}
                </button>
              ))}
            </div>
          </div>
        </form>
      </Modal>

    </div>
  );
};

export default ManageNotificationsPage;

