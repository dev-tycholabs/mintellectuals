import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function getSupabase() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll(); },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) =>
                        cookieStore.set(name, value, options)
                    );
                },
            },
        }
    );
}

// GET - Fetch messages for a conversation
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversation_id');
        const cursor = searchParams.get('cursor'); // for pagination
        const limit = 50;

        if (!conversationId) {
            return NextResponse.json({ error: 'conversation_id required' }, { status: 400 });
        }

        const supabase = await getSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        let query = supabase
            .from('messages')
            .select('id, sender_id, content, created_at, read_at')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (cursor) {
            query = query.lt('created_at', cursor);
        }

        const { data, error } = await query;
        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        // Mark unread messages from the other person as read
        const unreadIds = (data || [])
            .filter((m) => m.sender_id !== user.id && !m.read_at)
            .map((m) => m.id);

        if (unreadIds.length > 0) {
            await supabase
                .from('messages')
                .update({ read_at: new Date().toISOString() })
                .in('id', unreadIds);
        }

        return NextResponse.json({
            messages: (data || []).reverse(), // return in chronological order
            has_more: (data || []).length === limit,
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Send a message
export async function POST(request: Request) {
    try {
        const { conversation_id, content } = await request.json();
        const supabase = await getSupabase();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!conversation_id || !content?.trim()) {
            return NextResponse.json({ error: 'conversation_id and content required' }, { status: 400 });
        }

        // Token gating check: find the other participant and check their DM gating
        const { data: convo } = await supabase
            .from('conversations')
            .select('participant_1, participant_2')
            .eq('id', conversation_id)
            .single();

        if (convo) {
            const otherUserId = convo.participant_1 === user.id ? convo.participant_2 : convo.participant_1;

            const { data: expertCoin } = await supabase
                .from('expert_coins')
                .select('coin_address, coin_symbol, gate_dm, cost_dm')
                .eq('expert_id', otherUserId)
                .single();

            if (expertCoin?.gate_dm && expertCoin.cost_dm > 0) {
                const { data: senderProfile } = await supabase
                    .from('profiles')
                    .select('wallet_address')
                    .eq('id', user.id)
                    .single();

                if (!senderProfile?.wallet_address) {
                    return NextResponse.json({
                        error: 'TOKEN_GATE',
                        message: `You need at least ${expertCoin.cost_dm} $${expertCoin.coin_symbol} to message this expert.`,
                        required: expertCoin.cost_dm,
                        coin_symbol: expertCoin.coin_symbol,
                    }, { status: 403 });
                }

                const { getCoinBalance } = await import('@/lib/contracts/check-balance');
                const balance = await getCoinBalance(expertCoin.coin_address, senderProfile.wallet_address);

                if (balance < expertCoin.cost_dm) {
                    return NextResponse.json({
                        error: 'TOKEN_GATE',
                        message: `You need at least ${expertCoin.cost_dm} $${expertCoin.coin_symbol} to message this expert. You hold ${balance}.`,
                        required: expertCoin.cost_dm,
                        balance,
                        coin_symbol: expertCoin.coin_symbol,
                    }, { status: 403 });
                }
            }
        }

        // Insert message
        const { data, error } = await supabase
            .from('messages')
            .insert({
                conversation_id,
                sender_id: user.id,
                content: content.trim(),
            })
            .select('id, sender_id, content, created_at, read_at')
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        // Update conversation's last_message_at
        await supabase
            .from('conversations')
            .update({ last_message_at: new Date().toISOString() })
            .eq('id', conversation_id);

        return NextResponse.json(data, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
