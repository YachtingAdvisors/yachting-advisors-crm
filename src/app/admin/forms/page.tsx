'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBrowserClient } from '@/lib/supabase';
import { isAdmin } from '@/lib/types';
import type { Client, Form, FormField, FormSettings } from '@/lib/types';

const DEFAULT_FIELDS: FormField[] = [
  { name: 'name', label: 'Name', type: 'text', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'phone', required: true },
];

const DEFAULT_SETTINGS: FormSettings = {
  heading: 'Get in Touch',
  description: "Fill out the form below and we'll get back to you shortly.",
  submitButtonText: 'Submit',
  successMessage: "Thank you! We'll be in touch soon.",
  accentColor: '#ff7a59',
};

const FIELD_TYPES: FormField['type'][] = ['text', 'email', 'phone', 'textarea', 'select'];

interface FormWithClient extends Form {
  clients?: { name: string } | null;
}

export default function FormBuilderPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);
  const [forms, setForms] = useState<FormWithClient[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  // Editor state
  const [editing, setEditing] = useState(false);
  const [editingFormId, setEditingFormId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [fields, setFields] = useState<FormField[]>(DEFAULT_FIELDS);
  const [settings, setSettings] = useState<FormSettings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFormId, setSavedFormId] = useState<string | null>(null);

  const router = useRouter();

  // Auth check
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

  const fetchForms = useCallback(() => {
    fetch('/api/admin/forms')
      .then((r) => r.json())
      .then((data) => setForms(data.forms || []))
      .catch(() => {});
  }, []);

  // Fetch data
  useEffect(() => {
    if (!user) return;
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then((data) => {
        const list = data.clients || data || [];
        setClients(list);
        if (list.length > 0 && !formClientId) {
          setFormClientId(list[0].id);
        }
      });
    fetchForms();
  }, [user, fetchForms, formClientId]);

  function getEmbedCode(formId: string) {
    return `<script type="text/javascript" src="https://yachting-advisors-crm.vercel.app/api/embed/${formId}"></script>`;
  }

  function copyEmbed(formId: string) {
    navigator.clipboard.writeText(getEmbedCode(formId));
    setCopiedId(formId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function startCreate() {
    setEditing(true);
    setEditingFormId(null);
    setFormName('');
    setFormClientId(clients.length > 0 ? clients[0].id : '');
    setFields([...DEFAULT_FIELDS]);
    setSettings({ ...DEFAULT_SETTINGS });
    setSettingsOpen(false);
    setSavedFormId(null);
  }

  function startEdit(form: FormWithClient) {
    setEditing(true);
    setEditingFormId(form.id);
    setFormName(form.form_name);
    setFormClientId(form.client_id);
    setFields(form.fields.map((f) => ({ ...f })));
    setSettings({ ...DEFAULT_SETTINGS, ...form.settings });
    setSettingsOpen(false);
    setSavedFormId(null);
  }

  function cancelEdit() {
    setEditing(false);
    setEditingFormId(null);
    setSavedFormId(null);
  }

  function addField() {
    setFields([
      ...fields,
      { name: `field_${Date.now()}`, label: '', type: 'text', required: false },
    ]);
  }

  function updateField(index: number, updates: Partial<FormField>) {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  }

  function removeField(index: number) {
    setFields(fields.filter((_, i) => i !== index));
  }

  function moveField(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= fields.length) return;
    const updated = [...fields];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    setFields(updated);
  }

  async function handleSave() {
    if (!formName.trim() || !formClientId) {
      setMessage('Form name and client are required.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    if (fields.length === 0) {
      setMessage('Add at least one field.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }
    // Auto-generate field names from labels if empty
    const cleanFields = fields.map((f) => ({
      ...f,
      name: f.name || f.label.toLowerCase().replace(/\s+/g, '_'),
      label: f.label.trim(),
    }));

    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingFormId || undefined,
          client_id: formClientId,
          form_name: formName.trim(),
          fields: cleanFields,
          settings,
          enabled: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Error: ${data.error}`);
      } else {
        setMessage('Form saved!');
        setSavedFormId(data.form?.id || editingFormId);
        setEditingFormId(data.form?.id || editingFormId);
        fetchForms();
      }
    } catch {
      setMessage('Failed to save form.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 4000);
    }
  }

  async function handleDelete(formId: string) {
    if (!confirm('Are you sure you want to delete this form?')) return;
    try {
      await fetch('/api/admin/forms', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: formId }),
      });
      fetchForms();
      if (editingFormId === formId) {
        cancelEdit();
      }
    } catch {}
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
          <h1 className="text-lg font-semibold text-[#1a1a2e]">Form Builder</h1>
          <Link
            href="/admin"
            className="text-sm text-[#0091ae] hover:text-[#007a94] transition-colors"
          >
            Back to Settings
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* ========== FORMS LIST ========== */}
        {forms.length === 0 && !editing ? (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500 mb-4">
              No forms yet. Create your first lead capture form.
            </p>
            <button
              onClick={startCreate}
              className="px-5 py-2.5 bg-[#ff7a59] hover:bg-[#e8664a] text-white text-sm font-medium rounded-lg transition-colors"
            >
              Create Form
            </button>
          </div>
        ) : (
          <>
            {!editing && (
              <div className="flex justify-end">
                <button
                  onClick={startCreate}
                  className="px-5 py-2.5 bg-[#ff7a59] hover:bg-[#e8664a] text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Create Form
                </button>
              </div>
            )}

            {forms.length > 0 && !editing && (
              <div className="space-y-3">
                {forms.map((form) => (
                  <div
                    key={form.id}
                    className="bg-white border border-gray-200 rounded-xl shadow-sm p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-sm font-semibold text-[#1a1a2e] truncate">
                            {form.form_name}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              form.enabled
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {form.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span>{form.clients?.name || 'Unknown client'}</span>
                          <span>{form.fields.length} field{form.fields.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => copyEmbed(form.id)}
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {copiedId === form.id ? 'Copied!' : 'Copy Embed Code'}
                        </button>
                        <button
                          onClick={() => startEdit(form)}
                          className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-xs rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(form.id)}
                          className="px-3 py-1.5 text-red-500 hover:text-red-700 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ========== FORM EDITOR ========== */}
        {editing && (
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
            <h2 className="text-[#1a1a2e] font-medium">
              {editingFormId ? 'Edit Form' : 'Create New Form'}
            </h2>

            {/* Form name + client */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                  Form Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Schafer Contact Form"
                  className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#0091ae]"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 uppercase tracking-wider mb-1.5">
                  Client
                </label>
                <select
                  value={formClientId}
                  onChange={(e) => setFormClientId(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-4 py-2.5 focus:outline-none focus:border-[#0091ae]"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dynamic field builder */}
            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                Form Fields
              </label>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 bg-[#f5f8fa] border border-gray-200 rounded-lg p-3"
                  >
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => moveField(i, -1)}
                        disabled={i === 0}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                        title="Move up"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </button>
                      <button
                        onClick={() => moveField(i, 1)}
                        disabled={i === fields.length - 1}
                        className="text-gray-400 hover:text-gray-600 disabled:opacity-30 text-xs"
                        title="Move down"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>

                    <div className="flex-1 grid grid-cols-[1fr_auto] gap-2">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) =>
                          updateField(i, {
                            label: e.target.value,
                            name: e.target.value.toLowerCase().replace(/\s+/g, '_'),
                          })
                        }
                        placeholder="Field label"
                        className="bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-3 py-2 focus:outline-none focus:border-[#0091ae]"
                      />
                      <select
                        value={field.type}
                        onChange={(e) =>
                          updateField(i, { type: e.target.value as FormField['type'] })
                        }
                        className="bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-3 py-2 focus:outline-none focus:border-[#0091ae]"
                      >
                        {FIELD_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>

                      {field.type === 'select' && (
                        <input
                          type="text"
                          value={field.options?.join(', ') || ''}
                          onChange={(e) =>
                            updateField(i, {
                              options: e.target.value
                                .split(',')
                                .map((o) => o.trim())
                                .filter(Boolean),
                            })
                          }
                          placeholder="Options (comma-separated)"
                          className="col-span-2 bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-3 py-2 focus:outline-none focus:border-[#0091ae]"
                        />
                      )}
                    </div>

                    <label className="flex items-center gap-1.5 shrink-0 pt-2">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(i, { required: e.target.checked })}
                        className="rounded border-gray-300 text-[#0091ae] focus:ring-[#0091ae]"
                      />
                      <span className="text-xs text-gray-500">Required</span>
                    </label>

                    <button
                      onClick={() => removeField(i)}
                      className="text-red-500 hover:text-red-700 shrink-0 pt-2"
                      title="Remove field"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addField}
                className="mt-2 px-4 py-2 bg-white border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                + Add Field
              </button>
            </div>

            {/* Settings (collapsible) */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => setSettingsOpen(!settingsOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[#1a1a2e] hover:bg-gray-50 transition-colors rounded-lg"
              >
                <span>Form Settings</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${settingsOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {settingsOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-200 pt-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Heading</label>
                    <input
                      type="text"
                      value={settings.heading || ''}
                      onChange={(e) => setSettings({ ...settings, heading: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-3 py-2 focus:outline-none focus:border-[#0091ae]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <textarea
                      value={settings.description || ''}
                      onChange={(e) => setSettings({ ...settings, description: e.target.value })}
                      rows={2}
                      className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-3 py-2 focus:outline-none focus:border-[#0091ae]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Submit Button Text</label>
                    <input
                      type="text"
                      value={settings.submitButtonText || ''}
                      onChange={(e) => setSettings({ ...settings, submitButtonText: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-3 py-2 focus:outline-none focus:border-[#0091ae]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Success Message</label>
                    <input
                      type="text"
                      value={settings.successMessage || ''}
                      onChange={(e) => setSettings({ ...settings, successMessage: e.target.value })}
                      className="w-full bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-3 py-2 focus:outline-none focus:border-[#0091ae]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={settings.accentColor || '#ff7a59'}
                        onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                        className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={settings.accentColor || '#ff7a59'}
                        onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                        className="flex-1 bg-white border border-gray-300 rounded-lg text-sm text-[#33475b] px-3 py-2 focus:outline-none focus:border-[#0091ae]"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Save / Cancel */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-[#ff7a59] hover:bg-[#e8664a] text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingFormId ? 'Update Form' : 'Save Form'}
              </button>
              <button
                onClick={cancelEdit}
                className="px-6 py-2.5 bg-white border border-gray-300 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              {message && (
                <span
                  className={`text-sm ${message.startsWith('Error') ? 'text-red-500' : 'text-emerald-600'}`}
                >
                  {message}
                </span>
              )}
            </div>

            {/* Embed code section (shown after saving) */}
            {savedFormId && (
              <div className="border border-gray-200 rounded-lg p-4 bg-[#f5f8fa]">
                <h3 className="text-sm font-medium text-[#1a1a2e] mb-2">Embed Code</h3>
                <pre className="bg-white border border-gray-200 rounded-lg p-3 text-xs text-[#33475b] overflow-x-auto whitespace-pre-wrap break-all">
                  {getEmbedCode(savedFormId)}
                </pre>
                <div className="flex items-center gap-3 mt-3">
                  <button
                    onClick={() => copyEmbed(savedFormId)}
                    className="px-4 py-2 bg-white border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    {copiedId === savedFormId ? 'Copied!' : 'Copy'}
                  </button>
                  <p className="text-xs text-gray-500">
                    Paste this code into your website&apos;s HTML where you want the form to appear.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  );
}
