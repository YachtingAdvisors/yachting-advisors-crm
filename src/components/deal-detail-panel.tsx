'use client';

import { useEffect, useRef, useState } from 'react';
import { Deal, DealStage, DEAL_STAGES } from '@/lib/types';
import DealStageBadge from './deal-stage-badge';

interface Props {
  deal: Deal & { clients?: { name: string } };
  onClose: () => void;
  onUpdate: (deal: Deal) => void;
  onDelete: (dealId: string) => void;
}

interface StageHistoryEntry {
  from: DealStage;
  to: DealStage;
  timestamp: Date;
}

export default function DealDetailPanel({ deal, onClose, onUpdate, onDelete }: Props) {
  const [notes, setNotes] = useState(deal.agent_notes || '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [stageHistory, setStageHistory] = useState<StageHistoryEntry[]>([]);

  // Toast state for stage updates
  const [stageToast, setStageToast] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Editable financial fields — local draft values
  const [listPrice, setListPrice] = useState(deal.list_price != null ? String(deal.list_price) : '');
  const [offerPrice, setOfferPrice] = useState(deal.offer_price != null ? String(deal.offer_price) : '');
  const [salePrice, setSalePrice] = useState(deal.sale_price != null ? String(deal.sale_price) : '');
  const [mlsNumber, setMlsNumber] = useState(deal.mls_number || '');
  const [closingDate, setClosingDate] = useState(deal.closing_date || '');
  const [commissionRate, setCommissionRate] = useState(deal.commission_rate != null ? String(deal.commission_rate) : '');
  const [commissionAmount, setCommissionAmount] = useState(deal.commission_amount != null ? String(deal.commission_amount) : '');
  const [commissionManualOverride, setCommissionManualOverride] = useState(false);
  const [buyerAgent, setBuyerAgent] = useState(deal.buyer_agent || '');
  const [listingAgent, setListingAgent] = useState(deal.listing_agent || '');

  // Keep local edits in sync when the deal prop changes (e.g. real-time updates)
  useEffect(() => {
    setNotes(deal.agent_notes || '');
    setListPrice(deal.list_price != null ? String(deal.list_price) : '');
    setOfferPrice(deal.offer_price != null ? String(deal.offer_price) : '');
    setSalePrice(deal.sale_price != null ? String(deal.sale_price) : '');
    setMlsNumber(deal.mls_number || '');
    setClosingDate(deal.closing_date || '');
    setCommissionRate(deal.commission_rate != null ? String(deal.commission_rate) : '');
    setCommissionAmount(deal.commission_amount != null ? String(deal.commission_amount) : '');
    setCommissionManualOverride(false);
    setBuyerAgent(deal.buyer_agent || '');
    setListingAgent(deal.listing_agent || '');
  }, [deal.id]); // Only reset when deal changes identity

  // Auto-calculate commission amount when sale_price or commission_rate changes
  useEffect(() => {
    if (commissionManualOverride) return;
    const sp = parsePrice(salePrice);
    const cr = parseFloat(commissionRate);
    if (sp && !isNaN(cr)) {
      const calc = (sp * cr / 100);
      setCommissionAmount(String(Math.round(calc * 100) / 100));
    }
  }, [salePrice, commissionRate, commissionManualOverride]);

  // Clean up toast timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  async function updateField(field: string, value: string | number | null) {
    setSaving(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.deal) onUpdate(data.deal);
    } finally {
      setSaving(false);
    }
  }

  async function handleStageChange(newStage: string) {
    const prevStage = deal.stage;
    if ((newStage as DealStage) !== prevStage) {
      setStageHistory((prev) => [
        ...prev,
        { from: prevStage, to: newStage as DealStage, timestamp: new Date() },
      ]);
    }
    await updateField('stage', newStage);
    // Show toast
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setStageToast(newStage);
    toastTimerRef.current = setTimeout(() => setStageToast(null), 2000);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/deals/${deal.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.deleted) {
        onDelete(deal.id);
        onClose();
      }
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  function formatPrice(val: number | null) {
    if (!val) return '---';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  }

  /** Parse a price string into a number or null */
  function parsePrice(val: string): number | null {
    const n = parseFloat(val.replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  }

  const editInputClass = "mt-1.5 w-full bg-white border border-gray-300 rounded text-xs text-[#33475b] px-2 py-1.5 placeholder-gray-400 focus:outline-none focus:border-[#0091ae]";

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white border-l border-gray-200 z-50 overflow-y-auto animate-slide-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-[#1a1a2e] truncate">{deal.contact_name}</h2>
              {deal.clients?.name && (
                <p className="text-sm text-gray-500 mt-1">{deal.clients.name}</p>
              )}
            </div>
            <div className="flex items-center gap-1 ml-2">
              <button
                onClick={() => window.print()}
                title="Print Summary"
                className="text-gray-400 hover:text-[#33475b] p-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-[#33475b] p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Stage selector + toast */}
          <div className="mb-6 relative">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Deal Stage</p>
            <select
              value={deal.stage}
              onChange={(e) => handleStageChange(e.target.value)}
              disabled={saving}
              className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-3 py-2 focus:outline-none focus:border-[#0091ae]"
            >
              {DEAL_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            {/* Stage update toast */}
            {stageToast && (
              <div className="mt-2 px-3 py-1.5 bg-[#0091ae]/10 border border-[#0091ae]/30 rounded-lg text-xs text-[#0091ae] animate-fade-in-out">
                Stage updated to <span className="font-semibold">{stageToast}</span>
              </div>
            )}
          </div>

          {/* Contact Info */}
          <div className="space-y-3 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Contact</p>
            {deal.contact_email && (
              <a href={`mailto:${deal.contact_email}`} className="flex items-center gap-2 text-sm text-[#0091ae] hover:text-[#007a94] font-mono">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {deal.contact_email}
              </a>
            )}
            {deal.contact_phone && (
              <a href={`tel:${deal.contact_phone}`} className="flex items-center gap-2 text-sm text-[#0091ae] hover:text-[#007a94] font-mono">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {deal.contact_phone}
              </a>
            )}
          </div>

          {/* Property Details */}
          <div className="space-y-4 mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Property Details</p>
            {deal.property_address && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-sm text-[#33475b] mt-1">{deal.property_address}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              {deal.property_type && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Property Type</p>
                  <p className="text-sm text-[#33475b] mt-1">{deal.property_type}</p>
                </div>
              )}
              {/* MLS # — editable + search link */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-500">MLS #</p>
                  {deal.mls_number && (
                    <a
                      href={`https://www.realtor.com/realestateandhomes-search?keywords=${encodeURIComponent(deal.mls_number)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-[#0091ae] hover:text-[#007a94] underline underline-offset-2"
                    >
                      View on MLS
                    </a>
                  )}
                </div>
                <p className="text-sm text-[#33475b] mt-1 font-mono">{deal.mls_number || '---'}</p>
                <input
                  type="text"
                  value={mlsNumber}
                  onChange={(e) => setMlsNumber(e.target.value)}
                  onBlur={() => {
                    const val = mlsNumber.trim() || null;
                    if (val !== deal.mls_number) updateField('mls_number', val);
                  }}
                  placeholder="MLS-12345"
                  className={editInputClass}
                />
              </div>
            </div>
          </div>

          {/* Pricing — all editable */}
          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Financials</p>
            <div className="grid grid-cols-3 gap-3">
              {/* List Price */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">List Price</p>
                <p className="text-sm text-[#33475b] mt-1 font-mono">{formatPrice(deal.list_price)}</p>
                <input
                  type="number"
                  value={listPrice}
                  onChange={(e) => setListPrice(e.target.value)}
                  onBlur={() => {
                    const val = parsePrice(listPrice);
                    if (val !== deal.list_price) updateField('list_price', val);
                  }}
                  placeholder="e.g. 450000"
                  className={editInputClass}
                />
              </div>
              {/* Offer Price */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Offer Price</p>
                <p className="text-sm text-[#33475b] mt-1 font-mono">{formatPrice(deal.offer_price)}</p>
                <input
                  type="number"
                  value={offerPrice}
                  onChange={(e) => setOfferPrice(e.target.value)}
                  onBlur={() => {
                    const val = parsePrice(offerPrice);
                    if (val !== deal.offer_price) updateField('offer_price', val);
                  }}
                  placeholder="e.g. 440000"
                  className={editInputClass}
                />
              </div>
              {/* Sale Price */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Sale Price</p>
                <p className="text-sm text-emerald-600 mt-1 font-mono">{formatPrice(deal.sale_price)}</p>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  onBlur={() => {
                    const val = parsePrice(salePrice);
                    if (val !== deal.sale_price) updateField('sale_price', val);
                  }}
                  placeholder="e.g. 435000"
                  className={editInputClass}
                />
              </div>
            </div>
          </div>

          {/* Commission */}
          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Commission</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Commission Rate */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Commission Rate (%)</p>
                <p className="text-sm text-[#33475b] mt-1 font-mono">{deal.commission_rate != null ? `${deal.commission_rate}%` : '---'}</p>
                <input
                  type="number"
                  step="0.1"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(e.target.value)}
                  onBlur={() => {
                    const val = commissionRate ? parseFloat(commissionRate) : null;
                    if (val !== deal.commission_rate) updateField('commission_rate', val);
                  }}
                  placeholder="e.g. 3.0"
                  className={editInputClass}
                />
              </div>
              {/* Commission Amount */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Commission Amount</p>
                <p className="text-sm text-emerald-600 mt-1 font-mono">{formatPrice(commissionAmount ? parseFloat(commissionAmount) : null)}</p>
                <input
                  type="number"
                  value={commissionAmount}
                  onChange={(e) => {
                    setCommissionManualOverride(true);
                    setCommissionAmount(e.target.value);
                  }}
                  onBlur={() => {
                    const val = commissionAmount ? parseFloat(commissionAmount) : null;
                    if (val !== deal.commission_amount) updateField('commission_amount', val);
                  }}
                  placeholder="Auto or manual"
                  className={editInputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {/* Buyer Agent */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Buyer Agent</p>
                <p className="text-sm text-[#33475b] mt-1">{deal.buyer_agent || '---'}</p>
                <input
                  type="text"
                  value={buyerAgent}
                  onChange={(e) => setBuyerAgent(e.target.value)}
                  onBlur={() => {
                    const val = buyerAgent.trim() || null;
                    if (val !== deal.buyer_agent) updateField('buyer_agent', val);
                  }}
                  placeholder="Agent name"
                  className={editInputClass}
                />
              </div>
              {/* Listing Agent */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-500">Listing Agent</p>
                <p className="text-sm text-[#33475b] mt-1">{deal.listing_agent || '---'}</p>
                <input
                  type="text"
                  value={listingAgent}
                  onChange={(e) => setListingAgent(e.target.value)}
                  onBlur={() => {
                    const val = listingAgent.trim() || null;
                    if (val !== deal.listing_agent) updateField('listing_agent', val);
                  }}
                  placeholder="Agent name"
                  className={editInputClass}
                />
              </div>
            </div>
          </div>

          {/* Closing Date — editable */}
          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Closing Date</p>
            {deal.closing_date && (
              <p className="text-sm text-[#33475b] font-mono mb-1.5">
                {new Date(deal.closing_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            )}
            <input
              type="date"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              onBlur={() => {
                const val = closingDate || null;
                if (val !== deal.closing_date) updateField('closing_date', val);
              }}
              className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-3 py-2 focus:outline-none focus:border-[#0091ae]"
            />
          </div>

          {/* Timeline */}
          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Created</p>
            <p className="text-sm text-[#33475b] mt-1 font-mono">
              {new Date(deal.created_at).toLocaleString()}
            </p>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Agent Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== (deal.agent_notes || '')) {
                  updateField('agent_notes', notes);
                }
              }}
              rows={4}
              placeholder="Add notes about this deal..."
              className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] p-3 placeholder-gray-400 focus:outline-none focus:border-[#0091ae] resize-none"
            />
          </div>

          {/* Stage History (this session) */}
          {stageHistory.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Stage History (this session)</p>
              <div className="space-y-2">
                {stageHistory.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0091ae] flex-shrink-0" />
                    <span className="text-xs text-gray-500">
                      <span className="text-gray-500">{entry.from}</span>
                      <span className="mx-1.5 text-gray-400">→</span>
                      <span className="text-[#33475b]">{entry.to}</span>
                    </span>
                    <span className="text-xs text-gray-400 font-mono ml-auto">
                      {entry.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete Button */}
          <div className="border-t border-gray-200 pt-6">
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-2.5 text-sm bg-red-50 border border-red-200 rounded-lg text-red-600 hover:bg-red-100 transition-colors"
              >
                Delete Deal
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-red-600 text-center">Are you sure? This cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-2.5 text-sm bg-red-600 border border-red-600 rounded-lg text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
