import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getCoinBalance } from '@/lib/contracts/check-balance';

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

// GET /api/conversations/gating?conversation_id=xxx
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const conversationId = searchParams.get('conversation_id');

        if (!conversationId) {
            return NextResponse.json({ error: 'conversation_id required' }, { status: 400 });
        }

        const supabase = await getSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: convo } = await supabase
            .from('conversations')
            .select('participant_1, participant_2')
            .eq('id', conversationId)
            .single();

        if (!convo) {
            return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
        }

        const otherUserId = convo.participant_1 === user.id ? convo.participant_2 : convo.participant_1;

        const { data: expertCoin } = await supabase
            .from('expert_coins')
            .select('coin_address, coin_symbol, gate_dm, cost_dm')
            .eq('expert_id', otherUserId)
            .single();

        if (!expertCoin?.gate_dm || !expertCoin.cost_dm) {
            return NextResponse.json({ gated: false });
        }

        // Get sender's wallet
        const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_address')
            .eq('id', user.id)
            .single();

        if (!profile?.wallet_address) {
            return NextResponse.json({
                gated: true,
                hasAccess: false,
                required: expertCoin.cost_dm,
                balance: 0,
                coin_symbol: expertCoin.coin_symbol,
                message: `You need at least ${expertCoin.cost_dm} $${expertCoin.coin_symbol} to message this expert. Please create a wallet first.`,
            });
        }

        const balance = await getCoinBalance(expertCoin.coin_address, profile.wallet_address);
        const hasAccess = balance >= expertCoin.cost_dm;

        return NextResponse.json({
            gated: true,
            hasAccess,
            required: expertCoin.cost_dm,
            balance,
            coin_symbol: expertCoin.coin_symbol,
            ...(!hasAccess && {
                message: `You need at least ${expertCoin.cost_dm} $${expertCoin.coin_symbol} to message this expert. You hold ${balance}.`,
            }),
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
