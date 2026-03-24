import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { parseSpreadsheetId, fetchSheetCSV, syncSheetByConfig } from '@/lib/sheets-sync';

// GET — List all sheet sources
export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('sheet_sources')
    .select('*, clients(id, name)')
    .order('created_at', { ascending: false });

  if (error) {
    // Table might not exist yet
    if (error.code === '42P01' || error.message?.includes('does not exist')) {
      return NextResponse.json({ sources: [], tableMissing: true });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sources = (data || []).map((row: any) => ({
    id: row.id,
    clientId: row.clients?.id || row.client_id,
    clientName: row.clients?.name || 'Unknown',
    spreadsheetId: row.spreadsheet_id,
    gid: row.gid || '0',
    sourceName: row.source_name,
    enabled: row.enabled,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ sources });
}

// POST — Add a new sheet source
export async function POST(req: NextRequest) {
  const supabase = createServiceClient();
  const body = await req.json();

  const { client_id, sheet_url, source_name, gid } = body;

  if (!client_id || !sheet_url || !source_name) {
    return NextResponse.json(
      { error: 'Missing required fields: client_id, sheet_url, source_name' },
      { status: 400 }
    );
  }

  // Parse spreadsheet ID from URL
  const spreadsheetId = parseSpreadsheetId(sheet_url);
  if (!spreadsheetId) {
    return NextResponse.json(
      { error: 'Invalid Google Sheets URL. Paste the full URL or spreadsheet ID.' },
      { status: 400 }
    );
  }

  // Validate the sheet is accessible
  try {
    const csv = await fetchSheetCSV(spreadsheetId, gid || '0');
    if (!csv || csv.length < 10) {
      return NextResponse.json(
        { error: 'Sheet appears empty. Make sure it is shared publicly (Anyone with the link).' },
        { status: 400 }
      );
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: `Cannot access sheet: ${err.message}. Make sure it is shared publicly.` },
      { status: 400 }
    );
  }

  // Insert into DB
  const { data, error } = await supabase
    .from('sheet_sources')
    .insert({
      client_id,
      spreadsheet_id: spreadsheetId,
      gid: gid || '0',
      source_name,
      enabled: true,
    })
    .select('*, clients(id, name)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Trigger immediate sync
  try {
    const syncResult = await syncSheetByConfig(supabase, {
      spreadsheetId,
      clientId: client_id,
      clientName: data.clients?.name || 'Unknown',
      sourceName: source_name,
      gid: gid || undefined,
    });

    return NextResponse.json({
      source: {
        id: data.id,
        clientId: data.client_id,
        clientName: data.clients?.name || 'Unknown',
        spreadsheetId: data.spreadsheet_id,
        gid: data.gid,
        sourceName: data.source_name,
        enabled: data.enabled,
        createdAt: data.created_at,
      },
      sync: syncResult,
    });
  } catch (syncErr: any) {
    // Source was added but sync failed — still return success for the add
    return NextResponse.json({
      source: {
        id: data.id,
        clientId: data.client_id,
        clientName: data.clients?.name || 'Unknown',
        spreadsheetId: data.spreadsheet_id,
        gid: data.gid,
        sourceName: data.source_name,
        enabled: data.enabled,
        createdAt: data.created_at,
      },
      syncError: syncErr.message,
    });
  }
}

// DELETE — Remove a sheet source
export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from('sheet_sources').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
