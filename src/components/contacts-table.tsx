'use client';

import { useCallback, useEffect, useState } from 'react';
import SearchBar from './search-bar';

interface UnifiedContact {
  name: string;
  email: string | null;
  phone: string | null;
  type: 'lead' | 'deal' | 'both';
  lead_status: string | null;
  deal_stage: string | null;
  deal_count: number;
  last_activity: string;
}

interface Props {
  clientId: string | null;
}

const TYPE_BADGE_COLORS: Record<string, string> = {
  lead: 'bg-blue-50 text-blue-700 border-blue-200',
  deal: 'bg-violet-50 text-violet-700 border-violet-200',
  both: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function ContactsTable({ clientId }: Props) {
  const [contacts, setContacts] = useState<UnifiedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState<UnifiedContact | null>(null);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (clientId) params.set('client_id', clientId);

    try {
      const res = await fetch(`/api/contacts?${params}`);
      const data = await res.json();
      setContacts(data.contacts || []);
    } finally {
      setLoading(false);
    }
  }, [search, clientId]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Count cards
  const totalContacts = contacts.length;
  const leadsOnly = contacts.filter((c) => c.type === 'lead').length;
  const dealsOnly = contacts.filter((c) => c.type === 'deal').length;
  const bothCount = contacts.filter((c) => c.type === 'both').length;

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  function formatPrice(val: number | null) {
    if (!val) return '';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
  }

  return (
    <div className="space-y-6">
      {/* Count cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total Contacts</p>
          <p className="text-2xl font-semibold mt-1 text-[#1a1a2e]">{totalContacts}</p>
        </div>
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Leads Only</p>
          <p className="text-2xl font-semibold mt-1 text-blue-600">{leadsOnly}</p>
        </div>
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Deals Only</p>
          <p className="text-2xl font-semibold mt-1 text-violet-600">{dealsOnly}</p>
        </div>
        <div className="bg-white shadow-sm border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Both</p>
          <p className="text-2xl font-semibold mt-1 text-emerald-600">{bothCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="max-w-md">
        <SearchBar value={search} onChange={setSearch} />
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-gray-300 rounded-xl">
          <svg className="w-12 h-12 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <p className="text-gray-500 font-medium mb-1">No contacts found</p>
          <p className="text-sm text-gray-400">Contacts are aggregated from your leads and deals</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-xl">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left bg-[#f5f8fa]">
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Name</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Email</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Phone</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Type</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Status</th>
                <th className="px-4 py-3 text-xs text-gray-500 uppercase tracking-wider font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact, i) => (
                <tr
                  key={`${contact.email || contact.name}-${i}`}
                  onClick={() => setSelectedContact(contact)}
                  className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-[#1a1a2e] font-medium whitespace-nowrap">{contact.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{contact.email || '---'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono">{contact.phone || '---'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded border capitalize ${TYPE_BADGE_COLORS[contact.type]}`}>
                      {contact.type === 'both' ? 'Both' : contact.type === 'lead' ? 'Lead' : 'Deal'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {contact.type === 'both'
                      ? `${contact.lead_status || ''} / ${contact.deal_stage || ''}`
                      : contact.lead_status || contact.deal_stage || '---'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs font-mono whitespace-nowrap">
                    {formatDate(contact.last_activity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Contact Detail Panel */}
      {selectedContact && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedContact(null)} />
          <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white border-l border-gray-200 z-50 overflow-y-auto animate-slide-in shadow-xl">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-semibold text-[#1a1a2e] truncate">{selectedContact.name}</h2>
                  <span className={`text-xs px-2 py-0.5 rounded border capitalize mt-2 inline-block ${TYPE_BADGE_COLORS[selectedContact.type]}`}>
                    {selectedContact.type === 'both' ? 'Lead & Deal' : selectedContact.type === 'lead' ? 'Lead' : 'Deal'}
                  </span>
                </div>
                <button onClick={() => setSelectedContact(null)} className="text-gray-400 hover:text-[#1a1a2e] p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Contact Info */}
              <div className="space-y-3 mb-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Contact Info</p>
                {selectedContact.email && (
                  <a href={`mailto:${selectedContact.email}`} className="flex items-center gap-2 text-sm text-[#0091ae] hover:text-[#007a94] font-mono">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {selectedContact.email}
                  </a>
                )}
                {selectedContact.phone && (
                  <a href={`tel:${selectedContact.phone}`} className="flex items-center gap-2 text-sm text-[#0091ae] hover:text-[#007a94] font-mono">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {selectedContact.phone}
                  </a>
                )}
              </div>

              {/* Lead Info */}
              {(selectedContact.type === 'lead' || selectedContact.type === 'both') && (
                <div className="mb-6">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Lead Info</p>
                  <div className="bg-[#f5f8fa] border border-gray-200 rounded-lg p-3">
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="text-sm text-[#33475b] mt-1">{selectedContact.lead_status || '---'}</p>
                  </div>
                </div>
              )}

              {/* Deal Info */}
              {(selectedContact.type === 'deal' || selectedContact.type === 'both') && (
                <div className="mb-6">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Deal Info</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#f5f8fa] border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Current Stage</p>
                      <p className="text-sm text-[#33475b] mt-1">{selectedContact.deal_stage || '---'}</p>
                    </div>
                    <div className="bg-[#f5f8fa] border border-gray-200 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Deal Count</p>
                      <p className="text-sm text-[#33475b] mt-1">{selectedContact.deal_count}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Last Activity */}
              <div className="mb-6">
                <p className="text-xs text-gray-500 uppercase tracking-wider">Last Activity</p>
                <p className="text-sm text-[#33475b] mt-1 font-mono">
                  {new Date(selectedContact.last_activity).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
