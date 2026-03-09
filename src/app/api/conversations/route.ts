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

// GET - List all conversations for current user
export async function GET() {
    try {
        const supabase = await getSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data, error } = await supabase
            .from('conversations')
            .select(`
                id,
                participant_1,
                participant_2,
                last_message_at,
                p1:profiles!conversations_participant_1_fkey(id, full_name, headline, avatar_url),
                p2:profiles!conversations_participant_2_fkey(id, full_name, headline, avatar_url)
            `)
            .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
            .order('last_message_at', { ascending: false });

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        // Reshape: attach the "other" participant as `other_user`
        const conversations = (data || []).map((c) => {
            const isP1 = c.participant_1 === user.id;
            return {
                id: c.id,
                last_message_at: c.last_message_at,
                other_user: (isP1 ? c.p2 : c.p1) || { id: isP1 ? c.participant_2 : c.participant_1, full_name: 'Unknown User' },
            };
        });

        return NextResponse.json({ conversations });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create or get existing conversation with another user
export async function POST(request: Request) {
    try {
        const { participant_id } = await request.json();
        const supabase = await getSupabase();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!participant_id || participant_id === user.id) {
            return NextResponse.json({ error: 'Invalid participant' }, { status: 400 });
        }

        // Check if conversation already exists (in either direction)
        const { data: existing } = await supabase
            .from('conversations')
            .select('id')
            .or(
                `and(participant_1.eq.${user.id},participant_2.eq.${participant_id}),and(participant_1.eq.${participant_id},participant_2.eq.${user.id})`
            )
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ conversation_id: existing.id });
        }

        // Token gating check: see if the other participant has DM gating enabled
        const { data: expertCoin } = await supabase
            .from('expert_coins')
            .select('coin_address, coin_symbol, gate_dm, cost_dm')
            .eq('expert_id', participant_id)
            .single();

        if (expertCoin?.gate_dm && expertCoin.cost_dm > 0) {
            // Get the current user's wallet address
            const { data: senderProfile } = await supabase
                .from('profiles')
                .select('wallet_address')
                .eq('id', user.id)
                .single();

            if (!senderProfile?.wallet_address) {
                return NextResponse.json({
                    error: 'TOKEN_GATE',
                    message: `You need to hold at least ${expertCoin.cost_dm} $${expertCoin.coin_symbol} to message this expert. Please create a wallet first.`,
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

        // Create new conversation
        const { data, error } = await supabase
            .from('conversations')
            .insert({
                participant_1: user.id,
                participant_2: participant_id,
            })
            .select('id')
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ conversation_id: data.id }, { status: 201 });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
