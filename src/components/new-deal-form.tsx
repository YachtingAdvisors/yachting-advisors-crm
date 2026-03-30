'use client';

import { useState, useEffect } from 'react';
import { Deal, DealStage, DEAL_STAGES, PropertyType } from '@/lib/types';

const PROPERTY_TYPES: PropertyType[] = ['Single Family', 'Condo', 'Townhouse', 'Multi-Family', 'Land', 'Commercial'];

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
    property_address: '',
    property_type: '' as PropertyType | '',
    mls_number: '',
    list_price: '',
    stage: 'Prospecting' as DealStage,
    closing_date: '',
    agent_notes: '',
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
          property_type: form.property_type || null,
          closing_date: form.closing_date || null,
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

  const inputClass = "w-full bg-[#141620] border border-gray-700 rounded-lg text-sm text-gray-200 px-3 py-2 placeholder-gray-600 focus:outline-none focus:border-blue-500";

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#0d0f17] border-l border-gray-800 z-50 overflow-y-auto animate-slide-in">
        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex items-start justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">New Deal</h2>
            <button type="button" onClick={onClose} className="text-gray-500 hover:text-white p-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
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

            {/* Property Address */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Property Address</label>
              <input
                type="text"
                value={form.property_address}
                onChange={(e) => setForm({ ...form, property_address: e.target.value })}
                placeholder="123 Main St, City, ST 12345"
                className={inputClass}
              />
            </div>

            {/* Property Type & MLS */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">Property Type</label>
                <select
                  value={form.property_type}
                  onChange={(e) => setForm({ ...form, property_type: e.target.value as PropertyType })}
                  className={inputClass}
                >
                  <option value="">Select type</option>
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1.5">MLS #</label>
                <input
                  type="text"
                  value={form.mls_number}
                  onChange={(e) => setForm({ ...form, mls_number: e.target.value })}
                  placeholder="MLS-12345"
                  className={inputClass}
                />
              </div>
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
              className="flex-1 px-4 py-2.5 text-sm bg-[#141620] border border-gray-700 rounded-lg text-gray-300 hover:text-white hover:border-gray-500 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 text-sm bg-blue-600 border border-blue-500 rounded-lg text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create Deal'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
