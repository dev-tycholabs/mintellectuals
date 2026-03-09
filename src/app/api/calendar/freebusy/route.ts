import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getFreeBusy, toTZDateTime } from '@/lib/google-calendar';

// GET /api/calendar/freebusy?expert_id=xxx&date=2025-03-15
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const expertId = searchParams.get('expert_id');
        const date = searchParams.get('date');

        if (!expertId || !date) {
            return NextResponse.json({ error: 'expert_id and date required' }, { status: 400 });
        }

        const cookieStore = await cookies();
        const supabase = createServerClient(
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

        // Fetch expert's Google Calendar tokens
        const { data: expert } = await supabase
            .from('profiles')
            .select('google_calendar_token, google_calendar_email, timezone')
            .eq('id', expertId)
            .single();

        if (!expert?.google_calendar_token || !expert?.google_calendar_email) {
            return NextResponse.json({ error: 'Expert has not connected Google Calendar' }, { status: 404 });
        }

        const tz = expert.timezone || 'UTC';
        const timeMin = toTZDateTime(date, '00:00', tz);
        const timeMax = toTZDateTime(date, '23:59', tz);

        const busySlots = await getFreeBusy(
            expert.google_calendar_token,
            expert.google_calendar_email,
            timeMin,
            timeMax,
            tz
        );

        return NextResponse.json({ busy: busySlots, timezone: tz });
    } catch (err) {
        console.error('FreeBusy error:', err);
        return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
    }
}
