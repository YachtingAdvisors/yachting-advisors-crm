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

  // Listing feeds state
  const [feeds, setFeeds] = useState<{
    boats_com: { enabled: boolean; api_key: string; testing: boolean; status: string | null };
    yacht_broker: { enabled: boolean; api_token: string; company_id: string; testing: boolean; status: string | null };
    yatco: { enabled: boolean; api_token: string; testing: boolean; status: string | null };
  }>({
    boats_com: { enabled: false, api_key: '', testing: false, status: null },
    yacht_broker: { enabled: false, api_token: '', company_id: '', testing: false, status: null },
    yatco: { enabled: false, api_token: '', testing: false, status: null },
  });

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

  // Admin page keeps its own auth check since it needs admin-level access
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

  // Fetch listing feeds on mount
  useEffect(() => {
    if (!user) return;
    fetch('/api/admin/listing-feeds')
      .then((r) => r.json())
      .then((data) => {
        const feedList = data.feeds || [];
        for (const f of feedList) {
          if (f.feed_type === 'boats_com') {
            setFeeds((prev) => ({
              ...prev,
              boats_com: { ...prev.boats_com, enabled: f.enabled, api_key: f.credentials?.api_key || '' },
            }));
          } else if (f.feed_type === 'yacht_broker') {
            setFeeds((prev) => ({
              ...prev,
              yacht_broker: { ...prev.yacht_broker, enabled: f.enabled, api_token: f.credentials?.api_token || '', company_id: f.credentials?.company_id || '' },
            }));
          } else if (f.feed_type === 'yatco') {
            setFeeds((prev) => ({
              ...prev,
              yatco: { ...prev.yatco, enabled: f.enabled, api_token: f.credentials?.api_token || '' },
            }));
          }
        }
      })
      .catch(() => {});
  }, [user]);

  function saveFeed(feedType: string, enabled: boolean, credentials: Record<string, string>) {
    fetch('/api/admin/listing-feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feed_type: feedType, enabled, credentials }),
    }).catch(() => {});
  }

  async function testFeedConnection(feedType: string) {
    setFeeds((prev) => ({
      ...prev,
      [feedType]: { ...prev[feedType as keyof typeof prev], testing: true, status: null },
    }));
    try {
      const res = await fetch(`/api/listings?feed=${feedType}&test=1&limit=1`);
      const data = await res.json();
      if (res.ok && data.listings && data.listings.length > 0) {
        const count = data.total || data.listings.length;
        setFeeds((prev) => ({
          ...prev,
          [feedType]: { ...prev[feedType as keyof typeof prev], testing: false, status: `Connected — ${count} listings found` },
        }));
      } else if (res.ok) {
        setFeeds((prev) => ({
          ...prev,
          [feedType]: { ...prev[feedType as keyof typeof prev], testing: false, status: 'Connected — 0 listings found' },
        }));
      } else {
        setFeeds((prev) => ({
          ...prev,
          [feedType]: { ...prev[feedType as keyof typeof prev], testing: false, status: `Connection failed: ${data.error || 'Unknown error'}` },
        }));
      }
    } catch {
      setFeeds((prev) => ({
        ...prev,
        [feedType]: { ...prev[feedType as keyof typeof prev], testing: false, status: 'Connection failed: Network error' },
      }));
    }
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
    <>
      <header className="bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[#1a1a2e]">Admin Settings</h1>
          <span className="text-sm text-gray-500">{user?.email}</span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* ========== GOOGLE SHEET SOURCES ========== */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-[#1a1a2e] font-medium mb-1">Google Sheet Sources</h2>
          <p className="text-gray-500 text-sm mb-4">
            Connect Google Sheets to automatically import leads. Sheets sync every 5 minutes.
            Make sure each sheet is shared publicly (Anyone with the link).
          </p>

          {tableMissing && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-yellow-700 text-sm">
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
                  className="flex items-center justify-between bg-[#f5f8fa] border border-gray-200 rounded-lg px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#1a1a2e] truncate">
                        {source.sourceName}
                      </span>
                      <span className="text-xs text-gray-500">
                        {source.clientName}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-0.5">
                      ID: {source.spreadsheetId.slice(0, 20)}...
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <button
                      onClick={() => handleSyncNow(source)}
                      disabled={syncingId === source.id}
                      className="text-xs text-[#0091ae] hover:text-[#007a94] transition-colors disabled:opacity-50"
                    >
                      {syncingId === source.id ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                      onClick={() => handleRemoveSheet(source.id)}
                      className="text-xs text-gray-500 hover:text-red-500 transition-colors"
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
            <div className="space-y-3 border-t border-gray-200 pt-4">
              <h3 className="text-sm text-gray-500 font-medium">Connect New Sheet</h3>
              <input
                type="text"
                value={sheetUrl}
                onChange={(e) => setSheetUrl(e.target.value)}
                placeholder="Paste Google Sheets URL..."
                className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#ff7a59]"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={sheetSourceName}
                  onChange={(e) => setSheetSourceName(e.target.value)}
                  placeholder="Source name (e.g. Schafer PBIBS)"
                  className="flex-1 bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#ff7a59]"
                />
                <input
                  type="text"
                  value={sheetGid}
                  onChange={(e) => setSheetGid(e.target.value)}
                  placeholder="GID (optional)"
                  className="w-28 bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#ff7a59]"
                />
              </div>
              <div className="flex gap-2">
                <select
                  value={sheetClientId}
                  onChange={(e) => setSheetClientId(e.target.value)}
                  className="flex-1 bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#ff7a59]"
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
                  className="px-5 py-2.5 bg-[#ff7a59] hover:bg-[#e8664a] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  {addingSheet ? 'Connecting...' : 'Connect'}
                </button>
              </div>
            </div>
          )}

          {sheetMessage && (
            <p
              className={`mt-3 text-sm ${sheetMessage.startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}
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
            className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#ff7a59]"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Notification Emails */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-[#1a1a2e] font-medium mb-1">Notification Emails</h2>
          <p className="text-gray-500 text-sm mb-4">
            These email addresses will receive an email when a new lead comes in for this client.
          </p>

          {emails.length > 0 && (
            <div className="space-y-2 mb-4">
              {emails.map((email) => (
                <div
                  key={email}
                  className="flex items-center justify-between bg-[#f5f8fa] border border-gray-200 rounded-lg px-4 py-2"
                >
                  <span className="text-sm text-[#33475b]">{email}</span>
                  <button
                    onClick={() => removeEmail(email)}
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
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
              className="flex-1 bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#ff7a59]"
            />
            <button
              onClick={addEmail}
              className="px-4 py-2.5 bg-[#ff7a59] hover:bg-[#e8664a] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Add
            </button>
          </div>
        </div>

        {/* SMS Notifications */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-[#1a1a2e] font-medium mb-1">SMS Notifications</h2>
          <p className="text-gray-500 text-sm mb-4">
            These phone numbers will receive a text message when a new lead comes in.
            Format: +1XXXXXXXXXX. Note: +14106937337 always receives texts by default.
          </p>

          {phones.length > 0 && (
            <div className="space-y-2 mb-4">
              {phones.map((phone) => (
                <div
                  key={phone}
                  className="flex items-center justify-between bg-[#f5f8fa] border border-gray-200 rounded-lg px-4 py-2"
                >
                  <span className="text-sm text-[#33475b]">{phone}</span>
                  <button
                    onClick={() => removePhone(phone)}
                    className="text-gray-500 hover:text-red-500 transition-colors text-sm"
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
              className="flex-1 bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#ff7a59]"
            />
            <button
              onClick={addPhone}
              className="px-4 py-2.5 bg-[#ff7a59] hover:bg-[#e8664a] text-white text-sm font-medium rounded-lg transition-colors"
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
            className="px-6 py-2.5 bg-[#ff7a59] hover:bg-[#e8664a] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Notification Settings'}
          </button>
          {message && (
            <span
              className={`text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}
            >
              {message}
            </span>
          )}
        </div>

        {/* ========== LISTING FEEDS ========== */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
          <h2 className="text-[#1a1a2e] font-medium mb-1">Listing Feeds</h2>
          <p className="text-gray-500 text-sm mb-5">
            Connect yacht MLS listing feeds to display inventory
          </p>

          <div className="space-y-4">
            {/* Boats.com / Boat Wizard */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium text-[#1a1a2e]">Boats.com / Boat Wizard</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feeds.boats_com.enabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setFeeds((prev) => ({
                        ...prev,
                        boats_com: { ...prev.boats_com, enabled },
                      }));
                      saveFeed('boats_com', enabled, { api_key: feeds.boats_com.api_key });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0091ae]" />
                </label>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={feeds.boats_com.api_key}
                  onChange={(e) =>
                    setFeeds((prev) => ({
                      ...prev,
                      boats_com: { ...prev.boats_com, api_key: e.target.value },
                    }))
                  }
                  onBlur={() =>
                    saveFeed('boats_com', feeds.boats_com.enabled, { api_key: feeds.boats_com.api_key })
                  }
                  placeholder="API Key"
                  className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#0091ae]"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => testFeedConnection('boats_com')}
                    disabled={feeds.boats_com.testing}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-[#33475b] hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {feeds.boats_com.testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  {feeds.boats_com.status && (
                    <span
                      className={`text-sm ${feeds.boats_com.status.startsWith('Connected') ? 'text-emerald-600' : 'text-red-500'}`}
                    >
                      {feeds.boats_com.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* YachtBroker.org / IYBA */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium text-[#1a1a2e]">YachtBroker.org / IYBA</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feeds.yacht_broker.enabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setFeeds((prev) => ({
                        ...prev,
                        yacht_broker: { ...prev.yacht_broker, enabled },
                      }));
                      saveFeed('yacht_broker', enabled, {
                        api_token: feeds.yacht_broker.api_token,
                        company_id: feeds.yacht_broker.company_id,
                      });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0091ae]" />
                </label>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={feeds.yacht_broker.api_token}
                  onChange={(e) =>
                    setFeeds((prev) => ({
                      ...prev,
                      yacht_broker: { ...prev.yacht_broker, api_token: e.target.value },
                    }))
                  }
                  onBlur={() =>
                    saveFeed('yacht_broker', feeds.yacht_broker.enabled, {
                      api_token: feeds.yacht_broker.api_token,
                      company_id: feeds.yacht_broker.company_id,
                    })
                  }
                  placeholder="API Token"
                  className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#0091ae]"
                />
                <input
                  type="text"
                  value={feeds.yacht_broker.company_id}
                  onChange={(e) =>
                    setFeeds((prev) => ({
                      ...prev,
                      yacht_broker: { ...prev.yacht_broker, company_id: e.target.value },
                    }))
                  }
                  onBlur={() =>
                    saveFeed('yacht_broker', feeds.yacht_broker.enabled, {
                      api_token: feeds.yacht_broker.api_token,
                      company_id: feeds.yacht_broker.company_id,
                    })
                  }
                  placeholder="Company ID"
                  className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#0091ae]"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => testFeedConnection('yacht_broker')}
                    disabled={feeds.yacht_broker.testing}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-[#33475b] hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {feeds.yacht_broker.testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  {feeds.yacht_broker.status && (
                    <span
                      className={`text-sm ${feeds.yacht_broker.status.startsWith('Connected') ? 'text-emerald-600' : 'text-red-500'}`}
                    >
                      {feeds.yacht_broker.status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Yatco */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium text-[#1a1a2e]">Yatco</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feeds.yatco.enabled}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setFeeds((prev) => ({
                        ...prev,
                        yatco: { ...prev.yatco, enabled },
                      }));
                      saveFeed('yatco', enabled, { api_token: feeds.yatco.api_token });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0091ae]" />
                </label>
              </div>
              <div className="space-y-3">
                <input
                  type="text"
                  value={feeds.yatco.api_token}
                  onChange={(e) =>
                    setFeeds((prev) => ({
                      ...prev,
                      yatco: { ...prev.yatco, api_token: e.target.value },
                    }))
                  }
                  onBlur={() =>
                    saveFeed('yatco', feeds.yatco.enabled, { api_token: feeds.yatco.api_token })
                  }
                  placeholder="API Token (base64)"
                  className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#0091ae]"
                />
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => testFeedConnection('yatco')}
                    disabled={feeds.yatco.testing}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-[#33475b] hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    {feeds.yatco.testing ? 'Testing...' : 'Test Connection'}
                  </button>
                  {feeds.yatco.status && (
                    <span
                      className={`text-sm ${feeds.yatco.status.startsWith('Connected') ? 'text-emerald-600' : 'text-red-500'}`}
                    >
                      {feeds.yatco.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
