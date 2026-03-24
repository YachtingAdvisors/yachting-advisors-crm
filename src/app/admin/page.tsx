'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase';
import { isAdmin } from '@/lib/types';
import type { Client } from '@/lib/types';

interface SheetSource {
  id: string;
  clientId: string;
  clientName: string;
  spreadsheetId: string;
  gid: string;
  sourceName: string;
  enabled: boolean;
  createdAt: string;
}

export default function AdminSettingsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [emails, setEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [phones, setPhones] = useState<string[]>([]);
  const [newPhone, setNewPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();

  // Sheet sources state
  const [sheetSources, setSheetSources] = useState<SheetSource[]>([]);
  const [sheetUrl, setSheetUrl] = useState('');
  const [sheetSourceName, setSheetSourceName] = useState('');
  const [sheetClientId, setSheetClientId] = useState('');
  const [sheetGid, setSheetGid] = useState('');
  const [addingSheet, setAddingSheet] = useState(false);
  const [sheetMessage, setSheetMessage] = useState('');
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [tableMissing, setTableMissing] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user || !isAdmin(user.email)) {
        router.push('/');
        return;
      }
      setUser(user);
      setLoading(false);
    });
  }, [router]);

  useEffect(() => {
    if (!user) return;
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then((data) => {
        const list = data.clients || data || [];
        setClients(list);
        if (list.length > 0) {
          setSelectedClientId(list[0].id);
          setSheetClientId(list[0].id);
        }
      });
  }, [user]);

  useEffect(() => {
    if (!selectedClientId) return;
    fetch(`/api/admin/settings?client_id=${selectedClientId}`)
      .then((r) => r.json())
      .then((data) => {
        setEmails(data.notification_emails || []);
        setPhones(data.notification_phones || []);
      });
  }, [selectedClientId]);

  // Fetch sheet sources
  useEffect(() => {
    if (!user) return;
    fetchSheetSources();
  }, [user]);

  function fetchSheetSources() {
    fetch('/api/admin/sheet-sources')
      .then((r) => r.json())
      .then((data) => {
        setSheetSources(data.sources || []);
        setTableMissing(data.tableMissing || false);
      })
      .catch(() => {});
  }

  function addEmail() {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) return;
    if (emails.includes(email)) return;
    setEmails([...emails, email]);
    setNewEmail('');
  }

  function removeEmail(email: string) {
    setEmails(emails.filter((e) => e !== email));
  }

  function addPhone() {
    const phone = newPhone.trim();
    if (!phone) return;
    if (phones.includes(phone)) return;
    setPhones([...phones, phone]);
    setNewPhone('');
  }

  function removePhone(phone: string) {
    setPhones(phones.filter((p) => p !== phone));
  }

  async function handleSave() {
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: selectedClientId,
          notification_emails: emails,
          notification_phones: phones,
        }),
      });
      if (res.ok) {
        setMessage('Settings saved');
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage('Failed to save');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  }

  async function handleAddSheet() {
    if (!sheetUrl || !sheetSourceName || !sheetClientId) return;
    setAddingSheet(true);
    setSheetMessage('');
    try {
      const res = await fetch('/api/admin/sheet-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: sheetClientId,
          sheet_url: sheetUrl,
          source_name: sheetSourceName,
          gid: sheetGid || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSheetMessage(`Error: ${data.error}`);
        return;
      }
      setSheetMessage(
        `Connected! ${data.sync ? `Synced ${data.sync.synced} leads.` : ''}`
      );
      setSheetUrl('');
      setSheetSourceName('');
      setSheetGid('');
      fetchSheetSources();
    } catch {
      setSheetMessage('Failed to connect sheet');
    } finally {
      setAddingSheet(false);
      setTimeout(() => setSheetMessage(''), 5000);
    }
  }

  async function handleRemoveSheet(id: string) {
    if (!confirm('Remove this sheet source?')) return;
    try {
      await fetch('/api/admin/sheet-sources', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchSheetSources();
    } catch {}
  }

  async function handleSyncNow(source: SheetSource) {
    setSyncingId(source.id);
    try {
      const res = await fetch('/api/admin/sheet-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: source.clientId,
          sheet_url: source.spreadsheetId,
          source_name: source.sourceName,
          gid: source.gid,
        }),
      });
      const data = await res.json();
      if (data.sync) {
        setSheetMessage(`Synced ${data.sync.synced} new leads from ${source.sourceName}`);
      }
    } catch {
      setSheetMessage('Sync failed');
    } finally {
      setSyncingId(null);
      setTimeout(() => setSheetMessage(''), 5000);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">Admin Settings</h1>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* ========== GOOGLE SHEET SOURCES ========== */}
        <div className="bg-[#141620] border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-medium mb-1">Google Sheet Sources</h2>
          <p className="text-gray-500 text-sm mb-4">
            Connect Google Sheets to automatically import leads. Sheets sync every 5 minutes.
            Make sure each sheet is shared publicly (Anyone with the link).
          </p>

          {tableMissing && (
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3 mb-4">
              <p className="text-yellow-400 text-sm">
                The sheet_sources table hasn&apos;t been created yet. Using fallback configs.
                Run the setup SQL in Supabase Dashboard to enable this feature.
              </p>
            </div>
          )}

          {/* Existing sources */}
          {sheetSources.length > 0 && (
            <div className="space-y-2 mb-4">
              {sheetSources.map((source) => (
                <div
                  key={source.id}
                  className="flex items-center justify-between bg-[#0a0c10] border border-gray-700 rounded-lg px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white truncate">
                        {source.sourceName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {source.clientName}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 truncate mt-0.5">
                      ID: {source.spreadsheetId.slice(0, 20)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => handleSyncNow(source)}
                      disabled={syncingId === source.id}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
                    >
                      {syncingId === source.id ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                      onClick={() => handleRemoveSheet(source.id)}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add new sheet form */}
          {!tableMissing && (
            <div className="space-y-3 border-t border-gray-800 pt-4">
              <h3 className="text-sm text-gray-400 font-medium">Connect New Sheet</h3>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="Paste Google Sheets URL..."
                className="w-full bg-[#0a0c10] border border-gray-700 rounded-lg text-sm text-gray-200 px-4 py-2.5 focus:outline-none focus:border-blue-500"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sheetSourceName}
                  onChange={(e) => setSheetSourceName(e.target.value)}
                  placeholder="Source name (e.g. Schafer PBIBS)"
                  className="flex-1 bg-[#0a0c10] border border-gray-700 rounded-lg text-sm text-gray-200 px-4 py-2.5 focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={sheetGid}
                  onChange={(e) => setSheetGid(e.target.value)}
                  placeholder="GID (optional)"
                  className="w-28 bg-[#0a0c10] border border-gray-700 rounded-lg text-sm text-gray-200 px-4 py-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={sheetClientId}
                  onChange={(e) => setSheetClientId(e.target.value)}
                  className="flex-1 bg-[#0a0c10] border border-gray-700 rounded-lg text-sm text-gray-200 px-4 py-2.5 focus:outline-none focus:border-blue-500"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddSheet}
                  disabled={addingSheet || !sheetUrl || !sheetSourceName}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {addingSheet ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          )}

          {sheetMessage && (
            <p
              className={`mt-3 text-sm ${sheetMessage.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {sheetMessage}
            </p>
          )}
        </div>

        {/* ========== NOTIFICATION SETTINGS ========== */}
        {/* Client Selector */}
        <div>
          <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
            Client (for notification settings)
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full bg-[#141620] border border-gray-700 rounded-lg text-sm text-gray-200 px-4 py-2.5 focus:outline-none focus:border-blue-500"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Notification Emails */}
        <div className="bg-[#141620] border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-medium mb-1">Notification Emails</h2>
          <p className="text-gray-500 text-sm mb-4">
            These email addresses will receive an email when a new lead comes in for this client.
          </p>

          {emails.length > 0 && (
            <div className="space-y-2 mb-4">
              {emails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between bg-[#0a0c10] border border-gray-700 rounded-lg px-4 py-2"
                >
                  <span className="text-sm text-gray-300">{email}</span>
                  <button
                    onClick={() => removeEmail(email)}
                    className="text-gray-500 hover:text-red-400 transition-colors text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addEmail()}
              placeholder="email@example.com"
              className="flex-1 bg-[#0a0c10] border border-gray-700 rounded-lg text-sm text-gray-200 px-4 py-2.5 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={addEmail}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="bg-[#141620] border border-gray-800 rounded-xl p-6">
          <h2 className="text-white font-medium mb-1">SMS Notifications</h2>
          <p className="text-gray-500 text-sm mb-4">
            These phone numbers will receive a text message when a new lead comes in.
            Format: +1XXXXXXXXXX. Note: +14106937337 always receives texts by default.
          </p>

          {phones.length > 0 && (
            <div className="space-y-2 mb-4">
              {phones.map((phone) => (
                <div
                  key={phone}
                  className="flex items-center justify-between bg-[#0a0c10] border border-gray-700 rounded-lg px-4 py-2"
                >
                  <span className="text-sm text-gray-300">{phone}</span>
                  <button
                    onClick={() => removePhone(phone)}
                    className="text-gray-500 hover:text-red-400 transition-colors text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <input
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addPhone()}
              placeholder="+14155551234"
              className="flex-1 bg-[#0a0c10] border border-gray-700 rounded-lg text-sm text-gray-200 px-4 py-2.5 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={addPhone}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* Save */}
        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Notification Settings'}
          </button>
          {message && (
            <span
              className={`text-sm ${message.startsWith('Error') ? 'text-red-400' : 'text-emerald-400'}`}
            >
              {message}
            </span>
          )}
        </div>
      </main>
    </div>
  );
}
