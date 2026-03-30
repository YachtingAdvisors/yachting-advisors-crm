import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase-server';

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { dealId, targetStageId, position } = await req.json();

  if (!dealId || !targetStageId || position == null) {
    return NextResponse.json({ error: 'dealId, targetStageId, and position required' }, { status: 400 });
  }

  // Get current deal
  const { data: deal } = await supabase
    .from('deals')
    .select('*, deal_stages(name)')
    .eq('id', dealId)
    .single();

  if (!deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 });

  const stageChanged = deal.stage_id !== targetStageId;

  // Update the deal
  const { error } = await supabase
    .from('deals')
    .update({ stage_id: targetStageId, position })
    .eq('id', dealId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Log stage change activity
  if (stageChanged) {
    const { data: newStage } = await supabase
      .from('deal_stages')
      .select('name')
      .eq('id', targetStageId)
      .single();

    await supabase.from('activities').insert({
      client_id: deal.client_id,
      type: 'stage_change',
      title: `Deal moved to ${newStage?.name}`,
      description: `"${deal.title}" moved from ${deal.deal_stages?.name} to ${newStage?.name}`,
      deal_id: dealId,
      contact_id: deal.contact_id,
      user_id: user.id,
      user_email: user.email,
    });
  }

  return NextResponse.json({ success: true });
}
