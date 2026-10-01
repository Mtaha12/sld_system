import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Hash, Search, AlertCircle, Copy, Check } from 'lucide-react';
import ManageNotificationsFilterBar from '../features/notifications/components/ManageNotificationsFilterBar';
import ManageNotificationsTable from '../features/notifications/components/ManageNotificationsTable';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import FormField from '../components/ui/FormField';
import { notificationService } from '../features/notifications/services/notificationService';

const ManageNotificationsPage = () => {
  const [searchParams] = useSearchParams();
  const initialParamQuery = searchParams.get('search') || '';

  const [notifications, setNotifications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [highlightedId, setHighlightedId] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialParamQuery);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications with server pagination
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    notificationService.getNotifications({ page: currentPage, limit: 25, query: searchQuery }).then(data => {
      if (isMounted) {
        setNotifications(data);
        setTotalItems(data.total || data.length || 0);
        setTotalPages(data.totalPages || 1);
      }
    }).finally(() => {
      if (isMounted) {
        setIsLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [currentPage, searchQuery]);

  // Sync when search URL query changes
  useEffect(() => {
    const q = searchParams.get('search');
    if (q !== null && q !== undefined) {
      setSearchQuery(q);
      setCurrentPage(1);
    }
  }, [searchParams]);

  // Get ID Modal State
  const [getIdModalOpen, setGetIdModalOpen] = useState(false);
  const [getIdInput, setGetIdInput] = useState('');
  const [getIdError, setGetIdError] = useState('');
  const [notifIdResult, setNotifIdResult] = useState(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isFetchingNotifId, setIsFetchingNotifId] = useState(false);

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
    setNotifIdResult(null);
    setIsCopied(false);
    setGetIdModalOpen(true);
  };

  // Submit Get ID Search
  const handleGetIdSubmit = async (e) => {
    e?.preventDefault();
    setGetIdError('');

    if (!getIdInput.trim()) {
      setGetIdError('Please enter a Notification SR #.');
      return;
    }

    const inputVal = getIdInput.trim();
    const clean = inputVal.toLowerCase().replace(/^sr\s*#?/i, '').replace(/^sro\s*#?/i, '').trim();
    setIsFetchingNotifId(true);

    try {
      // Query database directly by SR # or ID
      let target = null;
      try {
        target = await notificationService.getNotificationById(clean);
      } catch (apiErr) {
        target = notifications.find(n => 
          n.srNumber?.toString().toLowerCase() === clean ||
          n.number?.toString().toLowerCase() === clean ||
          n.id?.toString() === clean ||
          n.notificationId?.toLowerCase() === clean ||
          n.sroNumber?.toLowerCase().includes(clean)
        );
      }

      if (!target) {
        setGetIdError(`No notification found matching SR #${inputVal} in database.`);
        setNotifIdResult(null);
        return;
      }

      const uniqueNotifId = target.notificationId || target.notification_id || `NOTIF-${String(target.srNumber || target.id).padStart(6, '0')}`;

      const foundIndex = notifications.findIndex(n => 
        n.srNumber?.toString().toLowerCase() === clean ||
        n.id === target.id ||
        n.notificationId === uniqueNotifId
      );
      const targetPage = foundIndex !== -1 ? Math.floor(foundIndex / 10) + 1 : 1;

      setNotifIdResult({
        target,
        notificationId: uniqueNotifId,
        targetPage,
        isInList: foundIndex !== -1
      });
      setIsCopied(false);
    } catch (err) {
      setGetIdError(`Failed to fetch notification: ${err.message || 'Server error'}`);
      setNotifIdResult(null);
    } finally {
      setIsFetchingNotifId(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full animate-fade-in">
      <ManageNotificationsFilterBar 
        initialSearch={searchQuery}
        onGetId={handleOpenGetId}
        onSearch={(q) => {
          setSearchQuery(q);
          setCurrentPage(1);
        }}
        onShowAll={() => {
          setSearchQuery('');
          setCurrentPage(1);
        }}
      />

      <div className="flex-1">
        <ManageNotificationsTable 
          notifications={notifications}
          setNotifications={setNotifications}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          totalItems={totalItems}
          totalPages={totalPages}
          serverPaginated={true}
          highlightedId={highlightedId}
          toastMessage={toastMessage}
          setToastMessage={setToastMessage}
          isLoading={isLoading}
        />
      </div>

      <AdminFooter />

      {/* Get Notification ID Dialogue Box */}
      <Modal
        isOpen={getIdModalOpen}
        onClose={() => {
          setGetIdModalOpen(false);
          setNotifIdResult(null);
          setIsCopied(false);
        }}
        title="Get Notification ID by SR #"
        subtitle="Enter a Notification SR # to fetch the unique Notification ID from the database"
        icon={Hash}
        maxWidth="max-w-md"
        footer={
          <>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setGetIdModalOpen(false);
                setNotifIdResult(null);
                setIsCopied(false);
              }}
            >
              Close
            </Button>
            <Button 
              variant="primary" 
              size="sm"
              className="bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center gap-1.5"
              onClick={handleGetIdSubmit}
              disabled={isFetchingNotifId}
            >
              {isFetchingNotifId ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <Search className="w-4 h-4" />
              )}
              {isFetchingNotifId ? 'Fetching ID...' : 'Get Notification ID'}
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

          <FormField label="Notification SR # (Required)" required>
            <Input 
              value={getIdInput}
              onChange={(e) => {
                setGetIdInput(e.target.value);
                if (getIdError) setGetIdError('');
                if (notifIdResult) setNotifIdResult(null);
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
                    setGetIdInput(n.srNumber ? n.srNumber.toString() : '');
                    if (getIdError) setGetIdError('');
                    if (notifIdResult) setNotifIdResult(null);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    getIdInput === (n.srNumber ? n.srNumber.toString() : '')
                      ? 'bg-brand-orange text-white border-brand-orange'
                      : 'bg-theme-surface-alt/60 hover:bg-theme-surface-alt text-theme-main border-theme-border'
                  }`}
                >
                  SR #{n.srNumber || n.id}
                </button>
              ))}
            </div>
          </div>

          {/* Unique Notification ID Result Card with Copy Button */}
          {notifIdResult && (
            <div className="mt-4 p-3.5 bg-theme-surface-alt/80 border border-brand-orange/40 rounded-xl space-y-3 animate-fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-theme-main">Database Record Found:</span>
                <span className="px-2 py-0.5 rounded-md bg-brand-orange/10 text-brand-orange text-[11px] font-semibold border border-brand-orange/30">
                  SR #{notifIdResult.target.srNumber || notifIdResult.target.id}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 bg-theme-surface border border-theme-border rounded-lg p-2.5">
                <div className="flex flex-col">
                  <span className="text-[10px] text-theme-muted uppercase font-bold tracking-wider">Unique Notification ID</span>
                  <span className="font-mono text-base font-bold text-brand-orange select-all break-all">
                    {notifIdResult.notificationId}
                  </span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(notifIdResult.notificationId);
                    setIsCopied(true);
                    setTimeout(() => setIsCopied(false), 2500);
                  }}
                  className="h-8 px-2.5 text-xs flex items-center gap-1.5 bg-theme-surface hover:bg-theme-surface-alt border-theme-border text-theme-main transition-colors shrink-0"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-green-500" />
                      <span className="text-green-500 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ID</span>
                    </>
                  )}
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] text-theme-muted pt-0.5">
                <div>
                  <span className="font-medium text-theme-main block">SRO / Number:</span>
                  <span className="truncate block">{notifIdResult.target.sroNumber || notifIdResult.target.number || 'N/A'}</span>
                </div>
                <div>
                  <span className="font-medium text-theme-main block">Department:</span>
                  <span className="truncate block">{notifIdResult.target.department || 'N/A'}</span>
                </div>
              </div>

              <Button
                type="button"
                size="sm"
                className="w-full bg-brand-orange hover:bg-brand-orange-hover text-white flex items-center justify-center gap-1.5 h-9 mt-1"
                onClick={() => {
                  if (searchQuery && !filteredNotifications.some(n => n.id === notifIdResult.target.id)) {
                    setSearchQuery('');
                  }
                  setCurrentPage(notifIdResult.targetPage);
                  setHighlightedId(notifIdResult.target.id);
                  setGetIdModalOpen(false);
                  setNotifIdResult(null);
                  setToastMessage(`Located Notification ${notifIdResult.notificationId} (SR #${notifIdResult.target.srNumber}) on Page ${notifIdResult.targetPage}.`);

                  setTimeout(() => {
                    const rowEl = document.getElementById(`notification-row-${notifIdResult.target.id}`);
                    if (rowEl) {
                      rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 200);

                  setTimeout(() => {
                    setHighlightedId(null);
                  }, 5000);
                }}
              >
                <Search className="w-3.5 h-3.5" /> View & Highlight in Table
              </Button>
            </div>
          )}
        </form>
      </Modal>

    </div>
  );
};

export default ManageNotificationsPage;

