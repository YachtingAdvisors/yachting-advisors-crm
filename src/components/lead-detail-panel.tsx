'use client';

import { useState } from 'react';
import { Lead, LeadStatus } from '@/lib/types';
import StatusBadge from './status-badge';
import SourceBadge from './source-badge';

const STATUSES: LeadStatus[] = ['New', 'Qualified', 'Converted', 'Inactive'];

interface Props {
  lead: Lead & { clients?: { name: string } };
  onClose: () => void;
  onUpdate: (lead: Lead) => void;
}

export default function LeadDetailPanel({ lead, onClose, onUpdate }: Props) {
  const [notes, setNotes] = useState(lead.notes || '');
  const [saving, setSaving] = useState(false);

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

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-[#0d0f17] border-l border-gray-800 z-50 overflow-y-auto animate-slide-in">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-white">{lead.name}</h2>
              {lead.clients?.name && (
                <p className="text-sm text-gray-500 mt-1">{lead.clients.name}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white p-1"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Contact Info */}
          <div className="space-y-3 mb-6">
            {lead.email && (
              <a href={`mailto:${lead.email}`} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-mono">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {lead.email}
              </a>
            )}
            {lead.phone && (
              <a href={`tel:${lead.phone}`} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 font-mono">
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
              className="bg-[#141620] border border-gray-700 rounded-lg text-sm text-gray-200 px-3 py-1.5 focus:outline-none focus:border-blue-500"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Details */}
          <div className="space-y-4 mb-6">
            {lead.campaign && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Campaign</p>
                <p className="text-sm text-gray-300 mt-1">{lead.campaign}</p>
              </div>
            )}
            {lead.ad_name && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Ad Name</p>
                <p className="text-sm text-gray-300 mt-1">{lead.ad_name}</p>
              </div>
            )}
            {lead.form_name && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">Form</p>
                <p className="text-sm text-gray-300 mt-1">{lead.form_name}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Received</p>
              <p className="text-sm text-gray-300 mt-1 font-mono">
                {new Date(lead.created_at).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Form Responses */}
          {lead.form_responses && lead.form_responses.length > 0 && (
            <div className="mb-6">
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Form Responses</p>
              <div className="space-y-2">
                {lead.form_responses.map((fr, i) => (
                  <div key={i} className="bg-[#141620] border border-gray-800 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{fr.question}</p>
                    <p className="text-sm text-gray-200 mt-1">{fr.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
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
              className="w-full bg-[#141620] border border-gray-700 rounded-lg text-sm text-gray-200 p-3 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>
      </div>
    </>
  );
}
