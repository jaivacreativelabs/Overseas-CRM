import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, Loader2, Plus, Pencil, Wallet } from 'lucide-react';
import { Modal } from '../../../components/Modal';
import { Button } from '../../../components/Button';
import { Input, Select, Textarea } from '../../../components/Form';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { CounsellingFeeDetail, CounsellingFeeStatus, CounsellingFeeType } from '../../../types';
import {
  COUNSELLING_FEE_CURRENCIES,
  COUNSELLING_FEE_PAYMENT_MODES,
  COUNSELLING_FEE_TYPES,
  formatCurrency,
  formatDate,
} from '../constants';
import { counsellingFeeService } from '../services/counsellingFeeService';
import { CounsellingFeeStatusPill } from './CounsellingFeeStatusPill';

interface CounsellingFeeModalProps {
  isOpen: boolean;
  leadId: string;
  leadName: string;
  onClose: () => void;
  onUpdated?: () => void;
  requestOnOpen?: boolean;
}

type PanelMode = 'view' | 'fee' | 'payment';

const today = () => new Date().toISOString().slice(0, 10);

export const CounsellingFeeModal: React.FC<CounsellingFeeModalProps> = ({
  isOpen,
  leadId,
  leadName,
  onClose,
  onUpdated,
  requestOnOpen = false,
}) => {
  const { success, error } = useToast();
  const { isAdmin, isCounsellor } = useAuth();
  const canManage = isAdmin || isCounsellor;

  const [detail, setDetail] = useState<CounsellingFeeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mode, setMode] = useState<PanelMode>('view');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [feeForm, setFeeForm] = useState({
    feeType: CounsellingFeeType.COUNSELLING_FEE,
    description: '',
    totalFee: '',
    currency: 'INR',
    notes: '',
  });
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paidOn: today(),
    mode: 'UPI',
    reference: '',
    note: '',
  });

  const fetchDetail = useCallback(
    async (isSilent = false) => {
      if (!isSilent) {
        setLoading(true);
        setLoadError(null);
      }
      try {
        const data = await counsellingFeeService.getByLeadId(leadId);
        setDetail(data);
        setFeeForm({
          feeType: data.feeType || CounsellingFeeType.COUNSELLING_FEE,
          description: data.description || '',
          totalFee: data.isSet ? String(data.totalFee) : '',
          currency: data.currency || 'INR',
          notes: data.notes || '',
        });
        setMode(requestOnOpen && !data.isSet ? 'fee' : 'view');
      } catch (err: any) {
        if (!isSilent) setLoadError(err.message || 'Failed to load counselling fee');
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [leadId, requestOnOpen]
  );

  useEffect(() => {
    if (!isOpen) return;
    setMode('view');
    setFormError(null);
    fetchDetail();
  }, [isOpen, fetchDetail]);

  const openFeePanel = () => {
    setFormError(null);
    setFeeForm({
      feeType: detail?.feeType || CounsellingFeeType.COUNSELLING_FEE,
      description: detail?.description || '',
      totalFee: detail?.isSet ? String(detail.totalFee) : '',
      currency: detail?.currency || 'INR',
      notes: detail?.notes || '',
    });
    setMode('fee');
  };

  const openPaymentPanel = () => {
    setFormError(null);
    setPaymentForm({
      amount: detail && detail.outstanding > 0 ? String(detail.outstanding) : '',
      paidOn: today(),
      mode: 'UPI',
      reference: '',
      note: '',
    });
    setMode('payment');
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalFee = Number(feeForm.totalFee);

    if (!feeForm.totalFee.trim()) {
      setFormError('Total counselling fee is required.');
      return;
    }
    if (!Number.isFinite(totalFee) || totalFee <= 0) {
      setFormError('Total counselling fee must be greater than 0.');
      return;
    }
    if (feeForm.feeType === CounsellingFeeType.OTHER && !feeForm.description.trim()) {
      setFormError('A description is required for Other fee types.');
      return;
    }
    if (detail && detail.amountPaid > 0 && totalFee < detail.amountPaid) {
      setFormError(`Total counselling fee cannot be lower than the amount already paid (${detail.amountPaid}).`);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const updated = await counsellingFeeService.setFee(leadId, {
        feeType: feeForm.feeType,
        description:
          feeForm.feeType === CounsellingFeeType.OTHER ? feeForm.description.trim() : undefined,
        totalFee,
        currency: feeForm.currency,
        notes: feeForm.notes.trim() ? feeForm.notes.trim() : undefined,
      });
      setDetail(updated);
      setMode('view');
      success(`Counselling fee set to ${formatCurrency(updated.totalFee, updated.currency)}.`);
      onUpdated?.();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update counselling fee');
    } finally {
      setSaving(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(paymentForm.amount);

    if (!paymentForm.amount.trim()) {
      setFormError('Payment amount is required.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Payment amount must be greater than 0.');
      return;
    }
    if (detail && amount > detail.outstanding) {
      setFormError(`Payment amount cannot exceed the outstanding balance (${detail.outstanding}).`);
      return;
    }

    setSaving(true);
    setFormError(null);
    try {
      const updated = await counsellingFeeService.recordPayment(leadId, {
        amount,
        paidOn: paymentForm.paidOn || undefined,
        mode: paymentForm.mode,
        reference: paymentForm.reference.trim() ? paymentForm.reference.trim() : undefined,
        note: paymentForm.note.trim() ? paymentForm.note.trim() : undefined,
      });
      setDetail(updated);
      setMode('view');
      success(`Payment of ${formatCurrency(amount, updated.currency)} recorded.`);
      onUpdated?.();
    } catch (err: any) {
      setFormError(err.message || 'Failed to record payment');
    } finally {
      setSaving(false);
    }
  };

  const renderSummaryCell = (label: string, value: React.ReactNode) => (
    <div
      style={{
        backgroundColor: 'var(--bg-subtle)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
        {label}
      </span>
      <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>{value}</span>
    </div>
  );

  const renderBody = () => {
    if (loading) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '28px 0' }}>
          <Loader2 className="animate-spin" size={22} color="var(--primary)" />
          <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Loading counselling fee...</span>
        </div>
      );
    }

    if (loadError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            padding: '20px 12px',
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          <AlertCircle size={22} color="var(--danger)" />
          <span style={{ fontSize: '12.5px', color: 'var(--danger-text)', textAlign: 'center' }}>{loadError}</span>
          <Button variant="secondary" size="sm" onClick={() => fetchDetail()}>
            Try Again
          </Button>
        </div>
      );
    }

    if (!detail) return null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>{leadName}</span>
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            Consult fees are tracked independently of university tuition and admission decisions.
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {renderSummaryCell(
            'Fee Type',
            COUNSELLING_FEE_TYPES.find((type) => type.value === detail.feeType)?.label || 'Counselling Fee'
          )}
          {renderSummaryCell(
            'Total Fee',
            detail.isSet ? formatCurrency(detail.totalFee, detail.currency) : 'Not Set'
          )}
          {detail.feeType === CounsellingFeeType.OTHER && detail.description &&
            renderSummaryCell('Description', detail.description)}
          {renderSummaryCell('Amount Paid', formatCurrency(detail.amountPaid, detail.currency))}
          {renderSummaryCell('Outstanding Balance', formatCurrency(detail.outstanding, detail.currency))}
          {renderSummaryCell('Payment Status', <CounsellingFeeStatusPill status={detail.status} />)}
        </div>

        {canManage && mode === 'view' && (
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <Button variant="secondary" size="sm" icon={<Pencil size={13} />} onClick={openFeePanel}>
              {detail.isSet ? 'Update Fee' : 'Request Fee'}
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus size={13} />}
              onClick={openPaymentPanel}
              disabled={!detail.isSet || detail.status === CounsellingFeeStatus.PAID}
            >
              Record Payment
            </Button>
            {!detail.isSet && (
              <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', alignSelf: 'center' }}>
                Set the counselling fee to start recording payments.
              </span>
            )}
          </div>
        )}

        {canManage && mode === 'fee' && (
          <form
            onSubmit={handleSaveFee}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '12px',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-subtle)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {detail.isSet ? 'Update Fee' : 'Request Fee'}
            </div>
            <Select
              label="Fee Type"
              value={feeForm.feeType}
              onChange={(e) => {
                const feeType = e.target.value as CounsellingFeeType;
                setFeeForm({
                  ...feeForm,
                  feeType,
                  description: feeType === CounsellingFeeType.OTHER ? feeForm.description : '',
                });
              }}
              options={COUNSELLING_FEE_TYPES}
            />
            {feeForm.feeType === CounsellingFeeType.OTHER && (
              <Textarea
                label="Description *"
                rows={2}
                placeholder="Describe the other fee"
                value={feeForm.description}
                required
                onChange={(e) => setFeeForm({ ...feeForm, description: e.target.value })}
              />
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '10px' }}>
              <Input
                label="Total Fee"
                type="number"
                min="0"
                step="0.01"
                placeholder="e.g. 25000"
                value={feeForm.totalFee}
                onChange={(e) => setFeeForm({ ...feeForm, totalFee: e.target.value })}
              />
              <Select
                label="Currency"
                value={feeForm.currency}
                onChange={(e) => setFeeForm({ ...feeForm, currency: e.target.value })}
                options={COUNSELLING_FEE_CURRENCIES.map((c) => ({ value: c, label: c }))}
              />
            </div>
            <Textarea
              label="Notes"
              rows={2}
              placeholder="Optional note about the counselling fee..."
              value={feeForm.notes}
              onChange={(e) => setFeeForm({ ...feeForm, notes: e.target.value })}
            />
            {formError && <span className="form-error">{formError}</span>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" size="sm" onClick={() => setMode('view')} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={saving}>
                {detail.isSet ? 'Update Fee' : 'Submit Fee Request'}
              </Button>
            </div>
          </form>
        )}

        {canManage && mode === 'payment' && (
          <form
            onSubmit={handleRecordPayment}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              padding: '12px',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-subtle)',
            }}
          >
            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Record Payment</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Input
                label="Amount"
                type="number"
                min="0"
                step="0.01"
                placeholder={String(detail.outstanding)}
                value={paymentForm.amount}
                onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
              />
              <Input
                label="Paid On"
                type="date"
                value={paymentForm.paidOn}
                onChange={(e) => setPaymentForm({ ...paymentForm, paidOn: e.target.value })}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <Select
                label="Payment Mode"
                value={paymentForm.mode}
                onChange={(e) => setPaymentForm({ ...paymentForm, mode: e.target.value })}
                options={COUNSELLING_FEE_PAYMENT_MODES}
              />
              <Input
                label="Reference"
                placeholder="UTR / Cheque No."
                value={paymentForm.reference}
                onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
              />
            </div>
            <Textarea
              label="Note"
              rows={2}
              placeholder="Optional note for this payment..."
              value={paymentForm.note}
              onChange={(e) => setPaymentForm({ ...paymentForm, note: e.target.value })}
            />
            {formError && <span className="form-error">{formError}</span>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Button type="button" variant="secondary" size="sm" onClick={() => setMode('view')} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={saving} icon={<Wallet size={13} />}>
                Record Payment
              </Button>
            </div>
          </form>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Payment History</span>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              {detail.paymentCount} {detail.paymentCount === 1 ? 'entry' : 'entries'}
            </span>
          </div>

          {detail.payments.length === 0 ? (
            <div
              style={{
                padding: '18px 12px',
                textAlign: 'center',
                border: '1px dashed var(--border-color)',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Wallet size={20} color="var(--text-muted)" style={{ margin: '0 auto 6px' }} />
              <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>No payments recorded</div>
              <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                Payments recorded against the counselling fee will appear here.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
              {detail.payments.map((payment, index) => (
                <div
                  key={`${payment.createdAt || 'payment'}-${index}`}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '10px',
                    padding: '10px 12px',
                    borderTop: index === 0 ? 'none' : '1px solid var(--border-light)',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {formatCurrency(payment.amount, detail.currency)}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {formatDate(payment.paidOn || payment.createdAt)}
                      {payment.mode ? ` • ${payment.mode.replace(/_/g, ' ').toLowerCase()}` : ''}
                      {payment.reference ? ` • Ref: ${payment.reference}` : ''}
                    </span>
                    {payment.note && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{payment.note}</span>
                    )}
                  </div>
                  <span style={{ fontSize: '10.5px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {payment.recordedByName || 'Staff'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Consult Fee & Payments"
      maxWidth="560px"
      footer={
        <Button variant="secondary" size="sm" onClick={onClose}>
          Close
        </Button>
      }
    >
      {renderBody()}
    </Modal>
  );
};