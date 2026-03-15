import { NextRequest, NextResponse } from 'next/server';
import { addVisit, removeVisit } from '@/lib/visits';

export async function POST(req: NextRequest) {
  try {
    const { clientId, operatorId, action } = await req.json();

    if (!clientId || !operatorId || ![-1, 0, 1].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    let updated;
    if (action === 1) {
      updated = await addVisit(clientId, operatorId);
    } else if (action === -1) {
      updated = await removeVisit(clientId, operatorId);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json({ client: updated });
  } catch (error) {
    console.error('Visit update error:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 400 });
  }
}

    if (action === 1) {
      if (client.visits >= VISIT_GOAL) {
        return NextResponse.json({ error: 'Visit goal already reached' }, { status: 400 });
      }
      newVisits = Math.min(client.visits + 1, VISIT_GOAL);
    } else if (action === -1) {
      if (client.visits <= 0) {
        return NextResponse.json({ error: 'Visits cannot be negative' }, { status: 400 });
      }
      newVisits = Math.max(client.visits - 1, 0);
    } else if (action === 0) {
      // Reset (reward redemption)
      newVisits = 0;
      rewardClaimed = true;
    }

    const { data: updated, error: updateError } = await supabase
      .from('clients')
      .update({ visits: newVisits, reward_claimed: rewardClaimed })
      .eq('id', clientId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Log the visit
    await supabase.from('visits_log').insert({
      client_id: clientId,
      operator_id: operatorId,
      action: action === 0 ? -VISIT_GOAL : action,
    });

    return NextResponse.json(updated);
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Server error' },
      { status: 500 }
    );
  }
}
