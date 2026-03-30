'use client';

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { createBrowserClient } from '@/lib/supabase';
import { isAdmin, type Client } from '@/lib/types';
import { useRouter } from 'next/navigation';

interface ClientContextValue {
  clientId: string | null;
  setClientId: (id: string | null) => void;
  client: Client | null;
  clients: Client[];
  isAdminUser: boolean;
  user: { id: string; email: string } | null;
  loading: boolean;
}

const ClientContext = createContext<ClientContextValue>({
  clientId: null,
  setClientId: () => {},
  client: null,
  clients: [],
  isAdminUser: false,
  user: null,
  loading: true,
});

export function useClient() {
  return useContext(ClientContext);
}

export function ClientProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createBrowserClient();

  useEffect(() => {
    async function init() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser?.email) {
        router.push('/login');
        return;
      }
      setUser({ id: authUser.id, email: authUser.email });

      const res = await fetch('/api/admin/clients');
      if (res.ok) {
        const data = await res.json();
        const clientList = data.clients || [];
        setClients(clientList);
        if (clientList.length > 0 && !clientId) {
          setClientId(clientList[0].id);
        }
      }
      setLoading(false);
    }
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isAdminUser = isAdmin(user?.email);
  const client = clients.find((c) => c.id === clientId) || null;

  return (
    <ClientContext.Provider
      value={{ clientId, setClientId, client, clients, isAdminUser, user, loading }}
    >
      {children}
    </ClientContext.Provider>
  );
}
