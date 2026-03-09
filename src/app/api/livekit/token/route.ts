import { NextRequest, NextResponse } from 'next/server';
import { AccessToken, TrackSource } from 'livekit-server-sdk';
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

export async function POST(request: NextRequest) {
    try {
        const { appointmentId } = await request.json();
        if (!appointmentId) {
            return NextResponse.json({ error: 'appointmentId is required' }, { status: 400 });
        }

        const supabase = await getSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify user is part of this appointment and it's confirmed
        const { data: appointment, error: aptError } = await supabase
            .from('appointments')
            .select('id, expert_id, booker_id, status, date, start_time, end_time, call_type')
            .eq('id', appointmentId)
            .single();

        if (aptError || !appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        if (appointment.expert_id !== user.id && appointment.booker_id !== user.id) {
            return NextResponse.json({ error: 'Not authorized for this appointment' }, { status: 403 });
        }

        if (appointment.status !== 'confirmed') {
            return NextResponse.json({ error: 'Appointment must be confirmed to join call' }, { status: 400 });
        }

        // Token gating re-check for the booker before issuing token
        if (user.id === appointment.booker_id) {
            const callType = appointment.call_type || 'video';

            const { data: expertCoin } = await supabase
                .from('expert_coins')
                .select('coin_address, coin_symbol, gate_audio, cost_audio, gate_video, cost_video')
                .eq('expert_id', appointment.expert_id)
                .single();

            const isGated = callType === 'audio'
                ? expertCoin?.gate_audio && expertCoin.cost_audio > 0
                : expertCoin?.gate_video && expertCoin.cost_video > 0;

            if (isGated) {
                const requiredCost = callType === 'audio' ? expertCoin!.cost_audio : expertCoin!.cost_video;

                const { data: bookerProfile } = await supabase
                    .from('profiles')
                    .select('wallet_address')
                    .eq('id', user.id)
                    .single();

                if (!bookerProfile?.wallet_address) {
                    return NextResponse.json({
                        error: 'TOKEN_GATE',
                        message: `You need at least ${requiredCost} $${expertCoin!.coin_symbol} to join this ${callType} call.`,
                        required: requiredCost,
                        coin_symbol: expertCoin!.coin_symbol,
                    }, { status: 403 });
                }

                const { getCoinBalance } = await import('@/lib/contracts/check-balance');
                const balance = await getCoinBalance(expertCoin!.coin_address, bookerProfile.wallet_address);

                if (balance < requiredCost) {
                    return NextResponse.json({
                        error: 'TOKEN_GATE',
                        message: `You need at least ${requiredCost} $${expertCoin!.coin_symbol} to join this ${callType} call. You hold ${balance}.`,
                        required: requiredCost,
                        balance,
                        coin_symbol: expertCoin!.coin_symbol,
                    }, { status: 403 });
                }
            }
        }

        // Get user's display name
        const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();

        const roomName = `appointment-${appointmentId}`;
        const participantName = profile?.full_name || user.email || 'User';

        const at = new AccessToken(
            process.env.LIVEKIT_API_KEY!,
            process.env.LIVEKIT_API_SECRET!,
            {
                identity: user.id,
                name: participantName,
                ttl: '2h',
            }
        );

        const isAudioOnly = appointment.call_type === 'audio';

        at.addGrant({
            roomJoin: true,
            room: roomName,
            canPublish: true,
            canSubscribe: true,
            canPublishData: true,
            canPublishSources: isAudioOnly
                ? [TrackSource.MICROPHONE]
                : [TrackSource.MICROPHONE, TrackSource.CAMERA, TrackSource.SCREEN_SHARE],
        });

        const token = await at.toJwt();

        return NextResponse.json({
            token,
            roomName,
            wsUrl: process.env.NEXT_PUBLIC_LIVEKIT_URL!,
            callType: appointment.call_type || 'video',
        });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
