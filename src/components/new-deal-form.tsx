'use client';

import { useState, useEffect } from 'react';
import { Deal, DealStage, DEAL_STAGES } from '@/lib/types';

interface InitialValues {
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
}

interface Props {
  clientId: string | null;
  onClose: () => void;
  onCreate: (deal: Deal) => void;
  initialValues?: InitialValues;
}

export default function NewDealForm({ clientId, onClose, onCreate, initialValues }: Props) {
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [form, setForm] = useState({
    client_id: clientId || '',
    contact_name: initialValues?.contact_name || '',
    contact_email: initialValues?.contact_email || '',
    contact_phone: initialValues?.contact_phone || '',
    description: '',
    list_price: '',
    stage: 'Prospecting' as DealStage,
    closing_date: '',
    agent_notes: '',
    commission_rate: '',
    buyer_agent: '',
    listing_agent: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then((d) => {
        setClients(d.clients || []);
        if (!clientId && d.clients?.length) {
          setForm((f) => ({ ...f, client_id: d.clients[0].id }));
        }
      })
      .catch(() => {});
  }, [clientId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.contact_name.trim()) {
      setError('Contact name is required');
      return;
    }
    if (!form.client_id) {
      setError('Client is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/deals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          list_price: form.list_price ? parseFloat(form.list_price) : null,
          closing_date: form.closing_date || null,
          commission_rate: form.commission_rate ? parseFloat(form.commission_rate) : null,
          buyer_agent: form.buyer_agent || null,
          listing_agent: form.listing_agent || null,
        }),
      });
      const data = await res.json();
      if (data.deal) {
        onCreate(data.deal);
        onClose();
      } else {
        setError(data.error || 'Failed to create deal');
      }
    } catch {
      setError('Failed to create deal');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = "w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-3 py-2 placeholder-gray-400 focus:outline-none focus:border-[#0091ae]";

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white border-l border-gray-200 z-50 overflow-y-auto animate-slide-in">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-xl font-semibold text-[#1a1a2e]">New Deal</h2>
            <button type="button" onClick={onClose} className="text-gray-400 hover:text-[#33475b] p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* Client */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Client</label>
              <select
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                className={inputClass}
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Contact Name */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Contact Name *</label>
              <input
                type="text"
                value={form.contact_name}
                onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                placeholder="John Smith"
                className={inputClass}
              />
            </div>

            {/* Contact Email & Phone */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  placeholder="email@example.com"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  className={inputClass}
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                placeholder="Brief description of this deal..."
                className={`${inputClass} resize-none`}
              />
            </div>

            {/* Price & Stage */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">List Price</label>
                <input
                  type="number"
                  value={form.list_price}
                  onChange={(e) => setForm({ ...form, list_price: e.target.value })}
                  placeholder="450000"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Stage</label>
                <select
                  value={form.stage}
                  onChange={(e) => setForm({ ...form, stage: e.target.value as DealStage })}
                  className={inputClass}
                >
                  {DEAL_STAGES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Closing Date */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Expected Closing Date</label>
              <input
                type="date"
                value={form.closing_date}
                onChange={(e) => setForm({ ...form, closing_date: e.target.value })}
                className={inputClass}
              />
            </div>

            {/* Commission & Agents */}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Commission & Agents</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Commission Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={form.commission_rate}
                    onChange={(e) => setForm({ ...form, commission_rate: e.target.value })}
                    placeholder="e.g. 3.0"
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Buyer Agent</label>
                    <input
                      type="text"
                      value={form.buyer_agent}
                      onChange={(e) => setForm({ ...form, buyer_agent: e.target.value })}
                      placeholder="Agent name"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Listing Agent</label>
                    <input
                      type="text"
                      value={form.listing_agent}
                      onChange={(e) => setForm({ ...form, listing_agent: e.target.value })}
                      placeholder="Agent name"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Agent Notes</label>
              <textarea
                value={form.agent_notes}
                onChange={(e) => setForm({ ...form, agent_notes: e.target.value })}
                rows={3}
                placeholder="Initial notes..."
                className={`${inputClass} resize-none`}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 text-sm bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm bg-[#ff7a59] border border-[#ff7a59] rounded-lg text-white hover:bg-[#e8664a] transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
