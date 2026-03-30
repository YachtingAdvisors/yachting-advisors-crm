'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lead, LeadStatus } from '@/lib/types';
import StatusBadge from './status-badge';
import SourceBadge from './source-badge';

const STATUSES: LeadStatus[] = ['New', 'Qualified', 'Converted', 'Inactive'];

function daysSince(dateStr: string): number {
  const created = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.floor((now - created) / (1000 * 60 * 60 * 24));
}

interface Props {
  lead: Lead & { clients?: { name: string } };
  onClose: () => void;
  onUpdate: (lead: Lead) => void;
  onDelete: (id: string) => void;
}

export default function LeadDetailPanel({ lead, onClose, onUpdate, onDelete }: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState(lead.notes || '');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function updateField(field: string, value: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const data = await res.json();
      if (data.lead) onUpdate(data.lead);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
      if (res.ok) {
        onDelete(lead.id);
      }
    } finally {
      setDeleting(false);
    }
  }

  const days = daysSince(lead.created_at);
  const daysLabel = days === 0 ? 'Today' : days === 1 ? '1 day ago' : `${days} days ago`;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white border-l border-gray-200 z-50 overflow-y-auto animate-slide-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-[#1a1a2e]">{lead.name}</h2>
              {lead.clients?.name && (
                <p className="text-sm text-gray-500 mt-1">{lead.clients.name}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 mb-6">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-[#0091ae] hover:text-[#007a94] font-mono">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {lead.email}
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-[#0091ae] hover:text-[#007a94] font-mono">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {lead.phone}
              </a>
            )}
          </div>

          {/* Status & Source */}
          <div className="flex items-center gap-3 mb-6">
            <SourceBadge source={lead.source} />
            <select
              value={lead.status}
              onChange={(e) => updateField('status', e.target.value)}
              disabled={saving}
              className="bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-3 py-1.5 focus:outline-none focus:border-[#0091ae] focus:ring-1 focus:ring-[#0091ae]/20"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Convert to Deal button — shown for Qualified or Converted leads */}
          {(lead.status === 'Qualified' || lead.status === 'Converted') && (
            <div className="mb-6">
              <button
                onClick={() => {
                  const params = new URLSearchParams({ new: '1' });
                  if (lead.name) params.set('contact_name', lead.name);
                  if (lead.email) params.set('contact_email', lead.email);
                  if (lead.phone) params.set('contact_phone', lead.phone);
                  router.push(`/deals?${params.toString()}`);
                }}
                className="w-full px-4 py-2.5 text-sm bg-[#ff7a59]/10 border border-[#ff7a59]/40 rounded-lg text-[#ff7a59] hover:bg-[#ff7a59]/20 hover:border-[#ff7a59]/60 transition-colors flex items-center justify-center gap-2"
              >
                Convert to Deal
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          )}

          {/* Details */}
          <div className="space-y-4 mb-6">
            {lead.campaign && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Campaign</p>
                <p className="text-sm text-[#33475b] mt-1">{lead.campaign}</p>
              </div>
            )}
            {lead.ad_name && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Ad Name</p>
                <p className="text-sm text-[#33475b] mt-1">{lead.ad_name}</p>
              </div>
            )}
            {lead.form_name && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Form</p>
                <p className="text-sm text-[#33475b] mt-1">{lead.form_name}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Received</p>
              <p className="text-sm text-[#33475b] mt-1 font-mono">
                {new Date(lead.created_at).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">{daysLabel}</p>
            </div>
          </div>

          {/* Form Responses */}
          {lead.form_responses && lead.form_responses.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Form Responses</p>
              <div className="space-y-2">
                {lead.form_responses.map((fr, i) => (
                  <div key={i} className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{fr.question}</p>
                    <p className="text-sm text-[#33475b] mt-1">{fr.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mb-8">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Notes</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => {
                if (notes !== (lead.notes || '')) {
                  updateField('notes', notes);
                }
              }}
              rows={4}
              placeholder="Add notes..."
              className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] p-3 placeholder-gray-400 focus:outline-none focus:border-[#0091ae] focus:ring-1 focus:ring-[#0091ae]/20 resize-none"
            />
          </div>

          {/* Delete Lead */}
          <div className="border-t border-gray-200 pt-6">
            {!confirmDelete ? (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full px-4 py-2 text-sm bg-red-50 border border-red-200 text-red-600 rounded-lg hover:bg-red-100 hover:border-red-300 transition-colors"
              >
                Delete Lead
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-500 text-center">
                  Are you sure you want to delete <span className="text-[#1a1a2e] font-medium">{lead.name}</span>? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="flex-1 px-4 py-2 text-sm bg-white border border-gray-300 text-gray-600 rounded-lg hover:text-[#1a1a2e] hover:border-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex-1 px-4 py-2 text-sm bg-red-600 border border-red-500 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleting ? 'Deleting...' : 'Yes, Delete'}
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
