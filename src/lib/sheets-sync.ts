/**
 * Google Sheets → CRM lead sync.
 * Fetches a publicly-shared Google Sheet as CSV, parses rows,
 * and upserts new leads into Supabase.
 */

export interface SheetConfig {
  spreadsheetId: string;
  clientId: string;
  clientName: string;
  sourceName: string;
  gid?: string;
}

// Fallback hardcoded configs (used if sheet_sources table doesn't exist yet)
const FALLBACK_CONFIGS = [
  { spreadsheetId: '1x2x69VEIz7rifRVH7XXf8D4gxlycwh81Ex6OquPWrlc', clientName: 'Schafer Yachts', sourceName: 'Schafer Benetti Allora' },
  { spreadsheetId: '1ydCsmKxOYikuLvD999AJdm5RmQSmKnSZW7jFqdFXd-4', clientName: 'Schafer Yachts', sourceName: 'Schafer PBIBS' },
];

export async function fetchSheetConfigs(supabase: any): Promise<SheetConfig[]> {
  try {
    const { data, error } = await supabase
      .from('sheet_sources')
      .select('*, clients(id, name)')
      .eq('enabled', true);

    if (error || !data || data.length === 0) {
      // Fall back to hardcoded configs
      const configs: SheetConfig[] = [];
      for (const fb of FALLBACK_CONFIGS) {
        const { data: client } = await supabase
          .from('clients')
          .select('id, name')
          .ilike('name', fb.clientName)
          .maybeSingle();
        if (client) {
          configs.push({
            spreadsheetId: fb.spreadsheetId,
            clientId: client.id,
            clientName: client.name,
            sourceName: fb.sourceName,
          });
        }
      }
      return configs;
    }

    return data.map((row: any) => ({
      spreadsheetId: row.spreadsheet_id,
      clientId: row.clients?.id || row.client_id,
      clientName: row.clients?.name || 'Unknown',
      sourceName: row.source_name,
      gid: row.gid || undefined,
    }));
  } catch {
    return [];
  }
}

export function parseSpreadsheetId(url: string): string | null {
  // Handle full URLs like https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit...
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  // If it's already just an ID
  if (/^[a-zA-Z0-9_-]+$/.test(url.trim())) return url.trim();
  return null;
}

interface ParsedLead {
  meta_lead_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  campaign: string | null;
  ad_name: string | null;
  form_name: string | null;
  platform: string | null;
  form_responses: Array<{ question: string; answer: string }>;
  created_time: string | null;
}

function parseCSV(csv: string): Record<string, string>[] {
  const lines = csv.split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = parseCSVLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || '').trim();
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function cleanPhone(phone: string): string | null {
  if (!phone) return null;
  const cleaned = phone.replace(/^p:/, '').trim();
  return cleaned || null;
}

// Standard columns that are NOT form responses — everything else is a custom form field
const STANDARD_COLUMNS = new Set([
  'id', 'created_time', 'ad_id', 'ad_name', 'adset_id', 'adset_name',
  'campaign_id', 'campaign_name', 'form_id', 'form_name', 'is_organic',
  'platform', 'email', 'full_name', 'phone_number', 'lead_status',
]);

/** Turn a snake_case CSV header into a readable question label */
function headerToLabel(header: string): string {
  return header
    .replace(/[_]+/g, ' ')
    .replace(/[?.]+$/g, '')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

export function parseSheetRows(rows: Record<string, string>[]): ParsedLead[] {
  return rows
    .filter(row => {
      const id = row['id'] || '';
      const email = row['email'] || '';
      if (!id || id.includes('test lead')) return false;
      if (email === 'test@meta.com') return false;
      return true;
    })
    .map(row => {
      // Dynamically capture ALL non-standard columns as form responses
      const formResponses: Array<{ question: string; answer: string }> = [];
      for (const [key, value] of Object.entries(row)) {
        if (!STANDARD_COLUMNS.has(key) && value && value.trim()) {
          formResponses.push({
            question: headerToLabel(key),
            answer: value.trim(),
          });
        }
      }

      // Determine source from platform field
      const platform = (row['platform'] || '').toLowerCase();
      const source = platform === 'ig' || platform === 'instagram' ? 'Instagram' : 'Meta';

      return {
        meta_lead_id: row['id'] || '',
        name: row['full_name'] || 'Unknown',
        email: row['email'] || null,
        phone: cleanPhone(row['phone_number'] || ''),
        campaign: row['campaign_name'] || null,
        ad_name: row['ad_name'] || null,
        form_name: row['form_name'] || null,
        platform: row['platform'] || null,
        form_responses: formResponses,
        created_time: row['created_time'] || null,
      };
    });
}

export async function fetchSheetCSV(spreadsheetId: string, gid = '0'): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`Failed to fetch sheet (${res.status}): ${await res.text().catch(() => '')}`);
  }
  return res.text();
}

/**
 * Discover all tab gids from a Google Spreadsheet.
 * Fetches the HTML page and extracts gid values from the sheet tab markup.
 * Falls back to just ['0'] if discovery fails.
 */
export async function discoverSheetGids(spreadsheetId: string): Promise<string[]> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/pubhtml`;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return ['0'];
    const html = await res.text();
    // Google Sheets pubhtml has tab links with gid= params
    const gidMatches = html.match(/gid=(\d+)/g);
    if (!gidMatches || gidMatches.length === 0) return ['0'];
    const gids = [...new Set(gidMatches.map(m => m.replace('gid=', '')))];
    return gids;
  } catch {
    return ['0'];
  }
}

/**
 * Sync ALL tabs from a spreadsheet, not just a single gid.
 * Discovers tabs automatically, fetches each, and syncs leads from all.
 */
export async function syncAllSheetTabs(
  supabase: any,
  config: SheetConfig
): Promise<{ synced: number; skipped: number; errors: number; tabs: number }> {
  // If a specific gid is set, only sync that one
  const gids = config.gid ? [config.gid] : await discoverSheetGids(config.spreadsheetId);

  let totalSynced = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let tabsProcessed = 0;

  for (const gid of gids) {
    try {
      const csv = await fetchSheetCSV(config.spreadsheetId, gid);
      const rows = parseCSV(csv);
      // Only process sheets that look like lead data (have 'id' and 'email' columns)
      if (rows.length === 0 || !rows[0]['id'] || !rows[0]['email']) continue;

      const leads = parseSheetRows(rows);
      tabsProcessed++;

      for (const lead of leads) {
        try {
          const { error } = await supabase.from('leads').upsert(
            {
              meta_lead_id: lead.meta_lead_id,
              client_id: config.clientId,
              name: lead.name,
              email: lead.email,
              phone: lead.phone,
              source: lead.platform === 'ig' ? 'Instagram' : 'Meta',
              campaign: lead.campaign,
              ad_name: lead.ad_name,
              form_name: lead.form_name,
              form_responses: lead.form_responses,
              status: 'New',
            },
            { onConflict: 'meta_lead_id', ignoreDuplicates: true }
          );

          if (error) {
            if (error.code === '23505') totalSkipped++;
            else totalErrors++;
          } else {
            totalSynced++;
          }
        } catch {
          totalErrors++;
        }
      }
    } catch {
      // Tab couldn't be fetched — skip it
    }
  }

  return { synced: totalSynced, skipped: totalSkipped, errors: totalErrors, tabs: tabsProcessed };
}

export async function syncSheetByConfig(
  supabase: any,
  config: SheetConfig
): Promise<{ synced: number; skipped: number; errors: number }> {
  const csv = await fetchSheetCSV(config.spreadsheetId, config.gid || '0');
  const rows = parseCSV(csv);
  const leads = parseSheetRows(rows);

  let synced = 0;
  let skipped = 0;
  let errors = 0;

  for (const lead of leads) {
    try {
      const { error } = await supabase.from('leads').upsert(
        {
          meta_lead_id: lead.meta_lead_id,
          client_id: config.clientId,
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          source: 'Meta',
          campaign: lead.campaign,
          ad_name: lead.ad_name,
          form_name: lead.form_name,
          form_responses: lead.form_responses,
          status: 'New',
        },
        { onConflict: 'meta_lead_id', ignoreDuplicates: true }
      );

      if (error) {
        if (error.code === '23505') {
          skipped++;
        } else {
          console.error(`[Sheets Sync] DB error for ${lead.meta_lead_id}:`, error);
          errors++;
        }
      } else {
        synced++;
      }
    } catch (err) {
      console.error(`[Sheets Sync] Error processing lead ${lead.meta_lead_id}:`, err);
      errors++;
    }
  }

  return { synced, skipped, errors };
}
