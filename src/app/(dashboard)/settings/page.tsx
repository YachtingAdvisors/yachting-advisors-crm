'use client';

import { useEffect, useState } from 'react';
import { useClient } from '@/contexts/client-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, X, RefreshCw, Trash2 } from 'lucide-react';
import { CLIENT_VERTICALS } from '@/lib/client-verticals';
import { type ClientType, type DealStage } from '@/lib/types';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { isAdminUser, clientId, client, loading } = useClient();
  const router = useRouter();
  const [emails, setEmails] = useState<string[]>([]);
  const [phones, setPhones] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [sheetSources, setSheetSources] = useState<any[]>([]);
  const [newSheetUrl, setNewSheetUrl] = useState('');
  const [newSheetGid, setNewSheetGid] = useState('');
  const [newSheetName, setNewSheetName] = useState('');
  const [stages, setStages] = useState<DealStage[]>([]);
  const [newStageName, setNewStageName] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!loading && !isAdminUser) {
      router.push('/');
    }
  }, [loading, isAdminUser, router]);

  useEffect(() => {
    if (!clientId) return;
    // Fetch notification settings
    fetch(`/api/admin/settings?client_id=${clientId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setEmails(data.settings.notification_emails || []);
          setPhones(data.settings.notification_phones || []);
        }
      });
    // Fetch sheet sources
    fetch('/api/admin/sheet-sources')
      .then((r) => r.json())
      .then((data) => setSheetSources(data.sources || []));
    // Fetch pipeline stages
    fetch(`/api/deal-stages?client_id=${clientId}`)
      .then((r) => r.json())
      .then((data) => setStages(data.stages || []));
  }, [clientId]);

  const saveNotifications = async () => {
    await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, notification_emails: emails, notification_phones: phones }),
    });
    toast.success('Notification settings saved');
  };

  const addSheetSource = async () => {
    if (!newSheetUrl) return;
    const res = await fetch('/api/admin/sheet-sources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newSheetUrl, gid: newSheetGid, source_name: newSheetName, client_id: clientId }),
    });
    if (res.ok) {
      toast.success('Sheet source added');
      setNewSheetUrl(''); setNewSheetGid(''); setNewSheetName('');
      const data = await fetch('/api/admin/sheet-sources').then((r) => r.json());
      setSheetSources(data.sources || []);
    }
  };

  const removeSheetSource = async (id: string) => {
    await fetch(`/api/admin/sheet-sources?id=${id}`, { method: 'DELETE' });
    setSheetSources((prev) => prev.filter((s) => s.id !== id));
    toast.success('Sheet source removed');
  };

  const syncSheets = async () => {
    setSyncing(true);
    await fetch('/api/cron/sync-sheets');
    setSyncing(false);
    toast.success('Sync complete');
  };

  const addStage = async () => {
    if (!newStageName) return;
    const res = await fetch('/api/deal-stages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_id: clientId, name: newStageName }),
    });
    if (res.ok) {
      const { stage } = await res.json();
      setStages((prev) => [...prev, stage]);
      setNewStageName('');
      toast.success('Stage added');
    }
  };

  const removeStage = async (id: string) => {
    const res = await fetch(`/api/deal-stages?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setStages((prev) => prev.filter((s) => s.id !== id));
      toast.success('Stage removed');
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to remove stage');
    }
  };

  const seedDefaultStages = async () => {
    if (!client) return;
    const vertical = CLIENT_VERTICALS[client.type as ClientType] || CLIENT_VERTICALS.other;
    for (const stage of vertical.defaultStages) {
      await fetch('/api/deal-stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, name: stage.name, color: stage.color, is_won: stage.is_won, is_lost: stage.is_lost }),
      });
    }
    const data = await fetch(`/api/deal-stages?client_id=${clientId}`).then((r) => r.json());
    setStages(data.stages || []);
    toast.success('Default stages created');
  };

  if (!isAdminUser) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground text-sm">Manage your CRM configuration</p>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="sheets">Google Sheets</TabsTrigger>
        </TabsList>

        {/* Pipeline Stages */}
        <TabsContent value="pipeline" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Pipeline Stages</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {stages.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm mb-3">No stages configured</p>
                  <Button onClick={seedDefaultStages} className="gold-gradient text-navy font-semibold">
                    Create Default Stages
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {stages.map((stage) => (
                    <div key={stage.id} className="flex items-center gap-3 p-2 rounded-lg bg-card">
                      <div className="w-3 h-3 rounded-full" style={{ background: stage.color }} />
                      <span className="flex-1 text-sm font-medium">{stage.name}</span>
                      {stage.is_won && <Badge variant="secondary" className="text-emerald-400">Won</Badge>}
                      {stage.is_lost && <Badge variant="secondary" className="text-red-400">Lost</Badge>}
                      <Button variant="ghost" size="icon" onClick={() => removeStage(stage.id)} className="text-muted-foreground hover:text-destructive">
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <Input
                  placeholder="New stage name"
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addStage()}
                />
                <Button onClick={addStage} size="sm"><Plus className="w-4 h-4" /></Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">Email Recipients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {emails.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1.5">
                    {email}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setEmails((prev) => prev.filter((e) => e !== email))} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="email@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
                <Button size="sm" onClick={() => { if (newEmail) { setEmails((prev) => [...prev, newEmail]); setNewEmail(''); } }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="text-base">SMS Recipients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {phones.map((phone) => (
                  <Badge key={phone} variant="secondary" className="gap-1.5">
                    {phone}
                    <X className="w-3 h-3 cursor-pointer" onClick={() => setPhones((prev) => prev.filter((p) => p !== phone))} />
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input placeholder="+14155551234" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
                <Button size="sm" onClick={() => { if (newPhone) { setPhones((prev) => [...prev, newPhone]); setNewPhone(''); } }}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <Button onClick={saveNotifications} className="w-full gold-gradient text-navy font-semibold">Save Notification Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Google Sheets */}
        <TabsContent value="sheets" className="space-y-4 mt-4">
          <Card className="glass-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Google Sheet Sources</CardTitle>
              <Button onClick={syncSheets} disabled={syncing} variant="outline" size="sm">
                <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? 'animate-spin' : ''}`} /> Sync Now
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {sheetSources.map((source) => (
                <div key={source.id} className="flex items-center gap-3 p-3 rounded-lg bg-card">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{source.source_name || source.spreadsheet_id}</p>
                    <p className="text-xs text-muted-foreground">ID: {source.spreadsheet_id}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeSheetSource(source.id)} className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Separator />
              <div className="space-y-3">
                <div>
                  <Label>Sheet URL or ID</Label>
                  <Input placeholder="https://docs.google.com/spreadsheets/d/..." value={newSheetUrl} onChange={(e) => setNewSheetUrl(e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>GID (optional)</Label>
                    <Input placeholder="0" value={newSheetGid} onChange={(e) => setNewSheetGid(e.target.value)} />
                  </div>
                  <div>
                    <Label>Source Name</Label>
                    <Input placeholder="My Sheet" value={newSheetName} onChange={(e) => setNewSheetName(e.target.value)} />
                  </div>
                </div>
                <Button onClick={addSheetSource} className="w-full gold-gradient text-navy font-semibold">Add Sheet Source</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
