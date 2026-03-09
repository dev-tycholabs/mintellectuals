import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createCalendarEvent, toTZDateTime, updateCalendarEvent, deleteCalendarEvent } from '@/lib/google-calendar';

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

// POST - Book an appointment (creates Google Calendar event)
export async function POST(request: Request) {
    try {
        const { expert_id, date, start_time, end_time, note, call_type } = await request.json();
        const supabase = await getSupabase();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        if (user.id === expert_id) {
            return NextResponse.json({ error: 'Cannot book with yourself' }, { status: 400 });
        }

        // Token gating check for audio/video calls
        const resolvedCallType = call_type === 'audio' ? 'audio' : 'video';
        const { data: expertCoin } = await supabase
            .from('expert_coins')
            .select('coin_address, coin_symbol, gate_audio, cost_audio, gate_video, cost_video')
            .eq('expert_id', expert_id)
            .single();

        const isGated = resolvedCallType === 'audio'
            ? expertCoin?.gate_audio && expertCoin.cost_audio > 0
            : expertCoin?.gate_video && expertCoin.cost_video > 0;

        if (isGated) {
            const requiredCost = resolvedCallType === 'audio' ? expertCoin!.cost_audio : expertCoin!.cost_video;
            const coinSymbol = expertCoin!.coin_symbol;

            const { data: bookerProfile } = await supabase
                .from('profiles')
                .select('wallet_address')
                .eq('id', user.id)
                .single();

            if (!bookerProfile?.wallet_address) {
                return NextResponse.json({
                    error: 'TOKEN_GATE',
                    message: `You need at least ${requiredCost} $${coinSymbol} to book a ${resolvedCallType} call. Please create a wallet first.`,
                    required: requiredCost,
                    coin_symbol: coinSymbol,
                }, { status: 403 });
            }

            const { getCoinBalance } = await import('@/lib/contracts/check-balance');
            const balance = await getCoinBalance(expertCoin!.coin_address, bookerProfile.wallet_address);

            if (balance < requiredCost) {
                return NextResponse.json({
                    error: 'TOKEN_GATE',
                    message: `You need at least ${requiredCost} $${coinSymbol} to book a ${resolvedCallType} call. You hold ${balance}.`,
                    required: requiredCost,
                    balance,
                    coin_symbol: coinSymbol,
                }, { status: 403 });
            }
        }

        // Get expert's calendar tokens and booker's info
        const [{ data: expert }, { data: booker }] = await Promise.all([
            supabase.from('profiles').select('google_calendar_token, google_calendar_email, full_name, timezone').eq('id', expert_id).single(),
            supabase.from('profiles').select('full_name, email').eq('id', user.id).single(),
        ]);

        // Create Google Calendar event if expert has connected
        let googleEventId: string | null = null;
        if (expert?.google_calendar_token) {
            try {
                const tz = expert.timezone || 'UTC';
                const event = await createCalendarEvent(expert.google_calendar_token, {
                    summary: `Meeting with ${booker?.full_name || 'Someone'} (Pending)`,
                    description: note || `Booked via Mintellectuals — awaiting confirmation`,
                    startDateTime: toTZDateTime(date, start_time, tz),
                    endDateTime: toTZDateTime(date, end_time, tz),
                    timeZone: tz,
                    attendeeEmail: booker?.email || undefined,
                    status: 'tentative',
                });
                googleEventId = event.id || null;
            } catch (err) {
                console.error('Failed to create calendar event:', err);
                // Continue with booking even if calendar event fails
            }
        }

        const { data, error } = await supabase
            .from('appointments')
            .insert({
                expert_id,
                booker_id: user.id,
                date,
                start_time,
                end_time,
                note,
                call_type: call_type === 'audio' ? 'audio' : 'video',
                google_event_id: googleEventId,
            })
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET - List appointments for current user
export async function GET() {
    try {
        const supabase = await getSupabase();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const [{ data: asExpert }, { data: asBooker }] = await Promise.all([
            supabase
                .from('appointments')
                .select('*, booker:profiles!appointments_booker_id_fkey(full_name, email)')
                .eq('expert_id', user.id)
                .order('date', { ascending: true }),
            supabase
                .from('appointments')
                .select('*, expert:profiles!appointments_expert_id_fkey(full_name, email)')
                .eq('booker_id', user.id)
                .order('date', { ascending: true }),
        ]);

        return NextResponse.json({ asExpert: asExpert || [], asBooker: asBooker || [] });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PATCH - Update appointment status
export async function PATCH(request: Request) {
    try {
        const { id, status } = await request.json();
        const supabase = await getSupabase();

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Fetch the appointment with its current data
        const { data: appointment } = await supabase
            .from('appointments')
            .select('id, expert_id, booker_id, google_event_id, date, start_time, end_time')
            .eq('id', id)
            .single();

        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        // Update status in DB
        const { data, error } = await supabase
            .from('appointments')
            .update({ status })
            .eq('id', id)
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });

        // Sync with Google Calendar
        if (appointment.google_event_id) {
            const { data: expert } = await supabase
                .from('profiles')
                .select('google_calendar_token, full_name')
                .eq('id', appointment.expert_id)
                .single();

            if (expert?.google_calendar_token) {
                try {
                    if (status === 'confirmed') {
                        const { data: booker } = await supabase
                            .from('profiles')
                            .select('full_name')
                            .eq('id', appointment.booker_id)
                            .single();

                        await updateCalendarEvent(expert.google_calendar_token, appointment.google_event_id, {
                            status: 'confirmed',
                            summary: `Meeting with ${booker?.full_name || 'Someone'}`,
                            description: 'Confirmed via Mintellectuals',
                        });
                    } else if (status === 'cancelled') {
                        await deleteCalendarEvent(expert.google_calendar_token, appointment.google_event_id);
                    }
                } catch (err) {
                    console.error('Failed to sync calendar event:', err);
                    // Don't fail the request — DB is already updated
                }
            }
        }

        return NextResponse.json(data);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
