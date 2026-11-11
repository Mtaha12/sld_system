import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Plus, List, CreditCard, X, FileText } from 'lucide-react';
import Button from '../components/ui/Button';
import AddTaxCardForm from '../features/tax-cards/components/AddTaxCardForm';
import ManageTaxCardsTable from '../features/tax-cards/components/ManageTaxCardsTable';
import AdminFooter from '../features/dashboard/components/AdminFooter';
import { taxCardService } from '../features/tax-cards/services/taxCardService';
import { downloadService } from '../features/downloads/services/downloadService';
import { useUser } from '../contexts/UserContext';

const fastTaxCardsCache = new Map();

const ManageTaxCardsPage = () => {
  const { user } = useUser();
  const isAdmin = user?.role === 'Administrator' || Boolean(user?.allowAllForms);

  const [urlSearchParams] = useSearchParams();
  const initialQuery = urlSearchParams.get('query') || urlSearchParams.get('text') || '';
  const rawCat = (urlSearchParams.get('category') || '').trim().toLowerCase();

  const [taxCards, setTaxCards] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const editId = urlSearchParams.get('edit');

  useEffect(() => {
    if (!editId || !isAdmin) return;
    let mounted = true;
    taxCardService.getTaxCardById(editId)
      .then(item => {
        if (mounted && item) {
          setEditingItem(item);
          setIsFormOpen(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      })
      .catch(err => {
        console.warn('Could not load tax card edit item:', err);
      });
    return () => { mounted = false; };
  }, [editId, isAdmin]);

  const categoryTitle = useMemo(() => {
    if (rawCat === 'finance-act' || rawCat === 'finance act') {
      return 'Finance Act';
    }
    if (rawCat === 'tax-rates' || rawCat === 'tax-rate' || rawCat === 'tax rates') {
      return 'Tax Rates';
    }
    if (rawCat === 'tax-returns' || rawCat === 'tax-return' || rawCat === 'tax return' || rawCat === 'tax returns') {
      return 'Tax Returns';
    }
    return 'Tax Cards';
  }, [rawCat]);

  const addBtnLabel = useMemo(() => {
    if (rawCat === 'finance-act' || rawCat === 'finance act') return '+ Add Finance Act';
    if (rawCat === 'tax-rates' || rawCat === 'tax-rate' || rawCat === 'tax rates') return '+ Add Tax Rate';
    if (rawCat === 'tax-returns' || rawCat === 'tax-return' || rawCat === 'tax return') return '+ Add Tax Return';
    return '+ Add Tax Card';
  }, [rawCat]);

  const fetchTaxCards = useCallback(async (query = '') => {
    const cacheKey = `${rawCat}_${query}`;
    if (fastTaxCardsCache.has(cacheKey)) {
      setTaxCards(fastTaxCardsCache.get(cacheKey));
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    try {
      // Parallel fast fetching for Finance Act & Tax Cards
      const promises = [taxCardService.getTaxCards(query)];
      if (rawCat === 'finance-act' || rawCat === 'finance act') {
        promises.push(downloadService.getDownloads(query, 'Finance Act').catch(() => []));
      }

      const [data, downloadActs] = await Promise.all(promises);
      let mergedData = Array.isArray(data) ? [...data] : [];

      if (Array.isArray(downloadActs) && downloadActs.length > 0) {
        const formatted = downloadActs.map(d => ({
          ...d,
          id: d.id || d.downloadId || d._id,
          mongoId: d.mongoId || d._id,
          taxCardId: d.downloadId || `FA-${d.srNumber}`,
          category: 'finance-act',
          year: d.year || (d.date ? parseInt(d.date.slice(0, 4), 10) : new Date().getFullYear())
        }));
        mergedData = [...formatted, ...mergedData];
      }

      fastTaxCardsCache.set(cacheKey, mergedData);
      setTaxCards(mergedData);
    } catch (err) {
      console.error('[ManageTaxCardsPage] Fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [rawCat]);

  useEffect(() => {
    fetchTaxCards(searchKeyword);
  }, [fetchTaxCards]);

  const displayedCards = useMemo(() => {
    if (!rawCat) {
      return taxCards.filter(item => {
        const cat = (item.category || '').toLowerCase();
        return cat !== 'finance-act' && cat !== 'finance act' && cat !== 'tax-returns' && cat !== 'tax-return';
      });
    }
    const filtered = taxCards.filter(item => {
      const heading = (item.heading || '').toLowerCase();
      const cat = (item.category || '').toLowerCase();

      if (rawCat === 'finance-act' || rawCat === 'finance act') {
        return cat === 'finance-act' || cat === 'finance act' || 
          heading.includes('finance act') || heading.includes('finance bill') ||
          heading.includes('finance') ||
          (!heading.includes('rate') && !heading.includes('return') && !heading.includes('card') && heading.includes('act'));
      }
      if (rawCat === 'tax-returns' || rawCat === 'tax-return' || rawCat === 'tax return') {
        return cat === 'tax-returns' || cat === 'tax-return' || cat === 'tax return' || heading.includes('return');
      }
      if (rawCat === 'tax-rates' || rawCat === 'tax-rate' || rawCat === 'tax rates') {
        // Exclude finance acts and tax returns while keeping Tax Cards & Tax Rates shared
        if (
          cat === 'finance-act' ||
          cat === 'finance act' ||
          cat === 'tax-returns' ||
          cat === 'tax-return' ||
          cat === 'tax return' ||
          heading.includes('finance act') ||
          heading.includes('finance bill')
        ) {
          return false;
        }
        return true;
      }
      return true;
    });

    // If on finance-act and filtered list would be empty, fall back to taxCards so user does not see an empty 0-records page
    if ((rawCat === 'finance-act' || rawCat === 'finance act') && filtered.length === 0 && taxCards.length > 0) {
      return taxCards;
    }

    return filtered;
  }, [taxCards, rawCat]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    fetchTaxCards(searchKeyword);
  };

  const handleShowAll = () => {
    setSearchKeyword('');
    fetchTaxCards('');
  };

  const lastEntry = useMemo(() => {
    const list = displayedCards.length > 0 ? displayedCards : taxCards;
    if (!list || list.length === 0) return null;
    return list.reduce(
      (best, cur) => ((Number(cur.srNumber) || 0) >= (Number(best?.srNumber) || 0) ? cur : best),
      list[0]
    );
  }, [displayedCards, taxCards]);

  const handleOpenAddForm = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFormSuccess = (savedItem, message, options = {}) => {
    fastTaxCardsCache.clear();
    setToastMessage(message || 'Success');
    if (options?.keepOpen) {
      if (options.nextItem !== undefined) {
        setEditingItem(options.nextItem);
      }
      fetchTaxCards(searchKeyword);
    } else {
      setIsFormOpen(false);
      setEditingItem(null);
      fetchTaxCards(searchKeyword);
    }
  };

  const handleItemDeleted = (deletedId) => {
    fastTaxCardsCache.clear();
    setTaxCards(prev => prev.filter(item => 
      item.id !== deletedId && 
      item.mongoId !== deletedId && 
      item.taxCardId !== deletedId
    ));
  };

  return (
    <div className="flex flex-col w-full animate-fade-in gap-3 pb-8">
      
      {/* Top Action Bar */}
      <div className="bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm p-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          
          <div className="flex items-center gap-2 mr-2">
            <CreditCard className="w-4 h-4 text-brand-orange" />
            <span className="text-sm font-bold text-theme-main whitespace-nowrap">{categoryTitle}</span>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-theme-disabled" />
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="Title, Keyword..."
                className="w-full pl-9 pr-3 py-1.5 bg-theme-surface border border-theme-border rounded-lg text-xs focus:outline-none focus:border-brand-orange text-theme-main transition-colors"
              />
            </div>
          </div>

          <Button
            type="submit"
            size="sm"
            className="bg-[#00bcd4] hover:bg-[#00acc1] text-white border-transparent h-[34px] px-4 text-xs font-medium cursor-pointer"
          >
            <Search className="w-3.5 h-3.5 mr-1" /> Search
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleShowAll}
            className="bg-[#673ab7] hover:bg-[#5e35b1] text-white border-transparent h-[34px] px-4 text-xs font-medium cursor-pointer"
          >
            <List className="w-3.5 h-3.5 mr-1" /> All
          </Button>

          {isAdmin && (
            <button
              type="button"
              onClick={() => {
                if (isFormOpen && !editingItem) setIsFormOpen(false);
                else handleOpenAddForm();
              }}
              className="flex items-center justify-center font-medium bg-[#4caf50] hover:bg-[#43a047] text-white rounded-lg text-xs gap-1 h-[34px] px-4 whitespace-nowrap cursor-pointer transition-colors"
            >
              {isFormOpen && !editingItem ? (
                <>
                  <X className="w-3.5 h-3.5" /> Close
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" /> {addBtnLabel}
                </>
              )}
            </button>
          )}

        </form>
      </div>

      {/* Form (when open) */}
      {isAdmin && isFormOpen && (
        <AddTaxCardForm
          editData={editingItem}
          defaultCategory={rawCat}
          categoryTitle={categoryTitle}
          lastEntry={lastEntry}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Table: hidden while Add / Edit form is open */}
      {!(isAdmin && isFormOpen) && (
        <ManageTaxCardsTable
          taxCards={displayedCards}
          categoryTitle={categoryTitle}
          activeCategory={rawCat}
          onEdit={handleEditItem}
          onDeleted={handleItemDeleted}
          toastMessage={toastMessage}
          setToastMessage={setToastMessage}
          isLoading={isLoading}
        />
      )}

      <AdminFooter />
    </div>
  );
};

export default ManageTaxCardsPage;
