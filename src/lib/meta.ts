const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

interface MetaFieldData {
  name: string;
  values: string[];
}

interface MetaLeadResponse {
  id: string;
  created_time: string;
  field_data: MetaFieldData[];
  ad_id?: string;
  form_id?: string;
  campaign_id?: string;
  campaign_name?: string;
}

interface MetaAdInfo {
  name: string;
  campaign?: { name: string };
}

interface MetaFormInfo {
  id: string;
  name: string;
}

export async function fetchLeadById(leadgenId: string, accessToken: string): Promise<MetaLeadResponse> {
  const res = await fetch(
    `${GRAPH_API_BASE}/${leadgenId}?fields=id,created_time,field_data,ad_id,form_id,campaign_id,campaign_name&access_token=${accessToken}`
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta lead fetch failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

export async function fetchAdInfo(adId: string, accessToken: string): Promise<MetaAdInfo | null> {
  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${adId}?fields=name,campaign{name}&access_token=${accessToken}`
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchFormInfo(formId: string, accessToken: string): Promise<MetaFormInfo | null> {
  try {
    const res = await fetch(
      `${GRAPH_API_BASE}/${formId}?fields=id,name&access_token=${accessToken}`
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchPageForms(pageId: string, accessToken: string): Promise<MetaFormInfo[]> {
  const res = await fetch(
    `${GRAPH_API_BASE}/${pageId}/leadgen_forms?access_token=${accessToken}`
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Meta forms fetch failed (${res.status}): ${body.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.data || [];
}

export async function fetchFormLeads(formId: string, accessToken: string): Promise<MetaLeadResponse[]> {
  const allLeads: MetaLeadResponse[] = [];
  let url: string | null = `${GRAPH_API_BASE}/${formId}/leads?fields=id,created_time,field_data,ad_id,form_id,campaign_id,campaign_name&access_token=${accessToken}&limit=50`;

  while (url) {
    const res: Response = await fetch(url);
    if (!res.ok) break;
    const data = await res.json();
    if (data.data) allLeads.push(...data.data);
    url = (data.paging?.next as string) || null;
  }

  return allLeads;
}

export function parseLeadFields(fieldData: MetaFieldData[]): {
  name: string;
  email: string | null;
  phone: string | null;
  formResponses: Array<{ question: string; answer: string }>;
} {
  let name = '';
  let email: string | null = null;
  let phone: string | null = null;
  const formResponses: Array<{ question: string; answer: string }> = [];

  for (const field of fieldData) {
    const value = field.values?.[0] || '';
    const key = field.name.toLowerCase();

    if (key === 'full_name' || key === 'name') {
      name = value;
    } else if (key === 'first_name') {
      name = value + (name ? ' ' + name : '');
    } else if (key === 'last_name') {
      name = (name ? name + ' ' : '') + value;
    } else if (key === 'email') {
      email = value || null;
    } else if (key === 'phone_number' || key === 'phone') {
      phone = value || null;
    }

    formResponses.push({ question: field.name, answer: value });
  }

  return { name: name || 'Unknown', email, phone, formResponses };
}
