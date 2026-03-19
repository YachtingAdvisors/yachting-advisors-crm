'use client';

import { useEffect, useState } from 'react';
import { Client } from '@/lib/types';

interface Props {
  value: string | null;
  onChange: (clientId: string | null) => void;
  showAll?: boolean;
}

export default function ClientSelector({ value, onChange, showAll = false }: Props) {
  const [clients, setClients] = useState<Client[]>([]);

  useEffect(() => {
    fetch('/api/admin/clients')
      .then((r) => r.json())
      .then((d) => setClients(d.clients || []))
      .catch(() => {});
  }, []);

  if (clients.length <= 1 && !showAll) return null;

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value || null)}
      className="bg-[#141620] border border-gray-700 rounded-lg text-sm text-gray-200 px-3 py-2 focus:outline-none focus:border-blue-500"
    >
      {showAll && <option value="">All Clients</option>}
      {clients.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>
  );
}
