import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ formId: string }> }
) {
  const { formId } = await params;

  const supabase = createServiceClient();
  const { data: form, error } = await supabase
    .from('forms')
    .select('id, form_name, fields, settings, enabled')
    .eq('id', formId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers: corsHeaders });
  }

  if (!form || !form.enabled) {
    return NextResponse.json({ error: 'Form not found' }, { status: 404, headers: corsHeaders });
  }

  return NextResponse.json(
    { form: { id: form.id, form_name: form.form_name, fields: form.fields, settings: form.settings } },
    { headers: corsHeaders }
  );
}
