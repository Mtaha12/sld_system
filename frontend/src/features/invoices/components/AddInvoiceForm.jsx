import React, { useState, useEffect, useMemo } from 'react';
import { X, Receipt, AlertCircle, Plus, Trash2 } from 'lucide-react';
import Input from '../../../components/ui/Input';
import FormField from '../../../components/ui/FormField';
import Button from '../../../components/ui/Button';
import { invoiceService } from '../services/invoiceService';
import { userService } from '../../../services/userService';

const getTodayDateString = () => {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const d = String(today.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const createEmptyRows = (count = 10) => {
  const rows = [];
  for (let i = 1; i <= count; i++) {
    rows.push({
      srNumber: i,
      details: '',
      qty: 1,
      rate: '',
      total: 0
    });
  }
  return rows;
};

const AddInvoiceForm = ({
  editData = null,
  onClose,
  onSuccess,
  className = ""
}) => {
  const isEdit = Boolean(editData && (editData.id || editData.mongoId));

  const [date, setDate] = useState(getTodayDateString());
  const [selectedUserId, setSelectedUserId] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [items, setItems] = useState(createEmptyRows(10));
  const [deductionPercent, setDeductionPercent] = useState('0');

  const [usersList, setUsersList] = useState([]);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  // Fetch users for dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await userService.getUsers({ limit: 100 });
        const list = res?.data || res?.users || (Array.isArray(res) ? res : []);
        setUsersList(list);
      } catch (err) {
        console.warn('Could not load user list:', err);
      }
    };
    fetchUsers();
  }, []);

  useEffect(() => {
    if (editData) {
      setDate(editData.date || getTodayDateString());
      setSelectedUserId(editData.userId || '');
      setName(editData.name || '');
      setAddress(editData.address || '');
      setDeductionPercent(editData.deductionPercent !== undefined ? editData.deductionPercent.toString() : '0');
      if (Array.isArray(editData.items) && editData.items.length > 0) {
        const mapped = editData.items.map((it, idx) => ({
          srNumber: it.srNumber || (idx + 1),
          details: it.details || '',
          qty: it.qty || 1,
          rate: it.rate !== undefined ? it.rate : '',
          total: Number(it.qty || 1) * Number(it.rate || 0)
        }));
        // Ensure at least 10 rows for legacy aesthetic
        while (mapped.length < 10) {
          mapped.push({
            srNumber: mapped.length + 1,
            details: '',
            qty: 1,
            rate: '',
            total: 0
          });
        }
        setItems(mapped);
      } else {
        setItems(createEmptyRows(10));
      }
    } else {
      setDate(getTodayDateString());
      setSelectedUserId('');
      setName('');
      setAddress('');
      setDeductionPercent('0');
      setItems(createEmptyRows(10));
    }
    setErrors({});
    setServerError('');
  }, [editData]);

  // Handle user select
  const handleUserSelect = (e) => {
    const uId = e.target.value;
    setSelectedUserId(uId);
    if (uId) {
      const found = usersList.find(u => (u._id || u.id || u.userId) === uId);
      if (found) {
        setName(found.fullName || found.name || '');
        setAddress(found.address || found.city || '');
      }
    }
    if (errors.userId) setErrors(prev => ({ ...prev, userId: null }));
  };

  const handleItemChange = (index, field, value) => {
    setItems(prev => {
      const copy = [...prev];
      const updated = { ...copy[index], [field]: value };
      const q = parseFloat(updated.qty) || 0;
      const r = parseFloat(updated.rate) || 0;
      updated.total = Math.round(q * r * 100) / 100;
      copy[index] = updated;
      return copy;
    });
  };

  const addRow = () => {
    setItems(prev => [
      ...prev,
      {
        srNumber: prev.length + 1,
        details: '',
        qty: 1,
        rate: '',
        total: 0
      }
    ]);
  };

  // Calculations
  const totalBillAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
  }, [items]);

  const deductionAmount = useMemo(() => {
    const dPerc = parseFloat(deductionPercent) || 0;
    return Math.round((totalBillAmount * (dPerc / 100)) * 100) / 100;
  }, [totalBillAmount, deductionPercent]);

  const totalReceivable = useMemo(() => {
    return Math.round((totalBillAmount - deductionAmount) * 100) / 100;
  }, [totalBillAmount, deductionAmount]);

  const validate = () => {
    const newErrors = {};
    if (!date) newErrors.date = 'Date is required';
    if (!selectedUserId && !name.trim()) newErrors.userId = 'Please select a user or enter client name';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setServerError('');
    if (!validate()) return;

    // Filter out rows with empty details and 0 rate if multiple
    const activeItems = items.filter(it => it.details.trim() || Number(it.rate) > 0);
    const finalItems = activeItems.length > 0 ? activeItems : items.slice(0, 1);

    setIsSubmitting(true);
    try {
      const payload = {
        date: date.trim(),
        userId: selectedUserId || null,
        name: name.trim(),
        address: address.trim(),
        items: finalItems,
        deductionPercent: parseFloat(deductionPercent) || 0
      };

      let result;
      if (isEdit) {
        const targetId = editData.mongoId || editData.id || editData.invoiceId;
        result = await invoiceService.updateInvoice(targetId, payload);
      } else {
        result = await invoiceService.createInvoice(payload);
      }

      if (onSuccess) {
        onSuccess(result, isEdit ? 'Invoice updated successfully.' : 'Invoice record added successfully.');
      }
      if (onClose) onClose();
    } catch (err) {
      setServerError(err.response?.data?.message || err.message || 'Failed to save invoice.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`bg-white dark:bg-theme-surface border border-theme-border rounded-xl shadow-sm overflow-hidden animate-fade-in ${className}`}>
      
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-2.5 border-b border-theme-border bg-gray-50/70 dark:bg-theme-surface-alt/40">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-brand-orange" />
          <h2 className="text-sm font-semibold text-theme-main">
            {isEdit ? 'Edit Invoice Detail' : 'Add Invoice Detail'}
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-theme-main dark:hover:text-white transition-colors flex items-center gap-1 text-xs font-medium cursor-pointer"
          >
            <span>close</span>
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Form Body */}
      <form onSubmit={handleSubmit} className="p-4 space-y-3.5">
        {serverError && (
          <div className="p-2.5 bg-red-50 dark:bg-red-950/30 border border-red-200 text-red-600 rounded-lg text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{serverError}</span>
          </div>
        )}

        {/* Row 1: Date * and User * (NO status box) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Date" required>
            <Input
              type="date"
              inputSize="sm"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors(prev => ({ ...prev, date: null }));
              }}
              error={Boolean(errors.date)}
            />
            {errors.date && <span className="text-[11px] text-red-500">{errors.date}</span>}
          </FormField>

          <FormField label="User" required>
            <select
              value={selectedUserId}
              onChange={handleUserSelect}
              className={`w-full px-3 py-1.5 bg-theme-surface border rounded-lg text-xs text-theme-main focus:outline-none focus:border-brand-orange transition-colors ${
                errors.userId ? 'border-red-500' : 'border-theme-border'
              }`}
            >
              <option value="">Select User / Client</option>
              {usersList.map((u) => (
                <option key={u._id || u.id || u.userId} value={u._id || u.id || u.userId}>
                  {u.fullName || u.name || u.email} {u.phone ? `(${u.phone})` : ''}
                </option>
              ))}
            </select>
            {errors.userId && <span className="text-[11px] text-red-500">{errors.userId}</span>}
          </FormField>
        </div>

        {/* Row 2: Name */}
        <FormField label="Name">
          <Input
            inputSize="sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Client or Business Name"
          />
        </FormField>

        {/* Row 3: Address */}
        <FormField label="Address">
          <Input
            inputSize="sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Billing or Office Address"
          />
        </FormField>

        {/* Details Section */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-theme-main">Details</label>
            <button
              type="button"
              onClick={addRow}
              className="text-[11px] text-brand-orange hover:text-orange-600 font-medium flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3 h-3" /> Add Row
            </button>
          </div>

          <div className="border border-theme-border rounded-lg overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#f59e0b] dark:bg-[#d97706] text-white">
                  <th className="py-2 px-3 w-16 text-center font-bold">Sr. #</th>
                  <th className="py-2 px-3 font-bold">Details</th>
                  <th className="py-2 px-3 w-20 text-center font-bold">Qty</th>
                  <th className="py-2 px-3 w-28 text-center font-bold">Rate</th>
                  <th className="py-2 px-3 w-28 text-center font-bold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-theme-border bg-white dark:bg-theme-surface">
                {items.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 dark:hover:bg-theme-surface-hover/30">
                    <td className="py-1 px-3 text-center text-theme-muted font-medium">
                      {row.srNumber || idx + 1}
                    </td>
                    <td className="py-1 px-2">
                      <input
                        type="text"
                        value={row.details}
                        onChange={(e) => handleItemChange(idx, 'details', e.target.value)}
                        placeholder="Description of legal service, filing, advice..."
                        className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-theme-border focus:border-brand-orange rounded text-xs text-theme-main focus:outline-none"
                      />
                    </td>
                    <td className="py-1 px-2 text-center">
                      <input
                        type="number"
                        min="1"
                        value={row.qty}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                        className="w-16 px-1.5 py-1 text-center bg-transparent border border-theme-border rounded text-xs text-blue-600 dark:text-blue-400 font-semibold focus:outline-none focus:border-brand-orange"
                      />
                    </td>
                    <td className="py-1 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={row.rate}
                        onChange={(e) => handleItemChange(idx, 'rate', e.target.value)}
                        placeholder="0.00"
                        className="w-24 px-1.5 py-1 text-center bg-transparent border border-theme-border rounded text-xs text-theme-main focus:outline-none focus:border-brand-orange"
                      />
                    </td>
                    <td className="py-1 px-3 text-right font-semibold text-theme-main bg-gray-50/60 dark:bg-theme-surface-alt/40">
                      {row.total ? row.total.toLocaleString() : '0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Calculation Summary Footer Section matching Image 5 */}
        <div className="flex justify-end pt-2">
          <div className="w-full sm:w-80 space-y-2 text-xs text-theme-main">
            <div className="flex items-center justify-between font-semibold py-1 border-b border-theme-border">
              <span>Total Bill Amount:</span>
              <span className="text-sm">Rs. {totalBillAmount.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between gap-2 py-1">
              <span className="text-theme-muted font-medium">Deduction %:</span>
              <div className="w-24">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="any"
                  value={deductionPercent}
                  onChange={(e) => setDeductionPercent(e.target.value)}
                  className="w-full px-2 py-1 bg-white dark:bg-theme-surface border border-theme-border rounded text-xs text-right focus:outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-theme-border text-theme-muted">
              <span>Deduction Amount:</span>
              <span>Rs. {deductionAmount.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between font-bold text-sm text-brand-orange py-1">
              <span>Total Receivable:</span>
              <span>Rs. {totalReceivable.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-theme-border">
          {onClose && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-[34px] px-4 text-xs"
            >
              Closed
            </Button>
          )}

          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={isSubmitting}
            className="bg-[#00bcd4] hover:bg-[#00acc1] text-white h-[34px] px-5 text-xs font-medium cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : (isEdit ? 'Update Record' : 'Add Record')}
          </Button>
        </div>

      </form>
    </div>
  );
};

export default AddInvoiceForm;
