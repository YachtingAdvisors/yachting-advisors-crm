'use client';

import { useEffect, useState, useCallback } from 'react';
import { useClient } from '@/contexts/client-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Mail, Phone } from 'lucide-react';
import { getContactDisplayName, type Contact } from '@/lib/types';
import { formatDate, formatPhone } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';

export default function ContactsPage() {
  const { clientId, loading } = useClient();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [fetching, setFetching] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchContacts = useCallback(async () => {
    if (!clientId) return;
    setFetching(true);
    const params = new URLSearchParams({ client_id: clientId });
    if (search) params.set('search', search);
    const res = await fetch(`/api/contacts?${params}`);
    const data = await res.json();
    setContacts(data.contacts || []);
    setTotal(data.total || 0);
    setFetching(false);
  }, [clientId, search]);

  useEffect(() => {
    if (!loading) fetchContacts();
  }, [fetchContacts, loading]);

  const handleCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        first_name: form.get('first_name'),
        last_name: form.get('last_name'),
        email: form.get('email'),
        phone: form.get('phone'),
        company: form.get('company'),
        type: form.get('type') || 'individual',
      }),
    });
    if (res.ok) {
      toast.success('Contact created');
      setDialogOpen(false);
      fetchContacts();
    } else {
      const err = await res.json();
      toast.error(err.error || 'Failed to create contact');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground text-sm">{total} contacts</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger
            render={<Button className="gold-gradient text-navy font-semibold hover:opacity-90" />}
          >
            <Plus className="w-4 h-4 mr-2" /> Add Contact
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New Contact</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>First Name *</Label>
                  <Input name="first_name" required />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input name="last_name" />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input name="email" type="email" />
              </div>
              <div>
                <Label>Phone</Label>
                <Input name="phone" />
              </div>
              <div>
                <Label>Company</Label>
                <Input name="company" />
              </div>
              <div>
                <Label>Type</Label>
                <Select name="type" defaultValue="individual">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full gold-gradient text-navy font-semibold">Create Contact</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search contacts..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Contact List */}
      {fetching ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-20 rounded-xl bg-card animate-pulse" />)}
        </div>
      ) : contacts.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">No contacts found. Add your first contact to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <Link key={contact.id} href={`/contacts/${contact.id}`}>
              <Card className="glass-card glass-card-hover transition-all cursor-pointer">
                <CardContent className="py-4 flex items-center gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-gold/20 text-gold text-sm font-semibold">
                      {contact.first_name[0]}{contact.last_name?.[0] || ''}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{getContactDisplayName(contact)}</p>
                    {contact.company && <p className="text-sm text-muted-foreground truncate">{contact.company}</p>}
                  </div>
                  <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
                    {contact.email && (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5" /> {contact.email}
                      </span>
                    )}
                    {contact.phone && (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" /> {formatPhone(contact.phone)}
                      </span>
                    )}
                  </div>
                  <div className="hidden md:flex items-center gap-2">
                    {contact.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDate(contact.created_at)}
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
