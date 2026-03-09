import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getOAuth2Client } from '@/lib/google-calendar';
import { google } from 'googleapis';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (!code) {
        return NextResponse.redirect(`${appUrl}/dashboard/profile?error=no_code`);
    }

    try {
        const oauth2Client = getOAuth2Client();
        const { tokens } = await oauth2Client.getToken(code);
        oauth2Client.setCredentials(tokens);

        // Get the user's calendar email
        const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client });
        const calendarList = await calendarApi.calendarList.get({ calendarId: 'primary' });
        const calendarEmail = calendarList.data.id || '';

        // Save tokens to Supabase profile
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

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.redirect(`${appUrl}/login`);
        }

        await supabase
            .from('profiles')
            .update({
                google_calendar_token: {
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expiry_date: tokens.expiry_date,
                },
                google_calendar_email: calendarEmail,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        return NextResponse.redirect(`${appUrl}/dashboard/profile?calendar=connected`);
    } catch (err) {
        console.error('Google Calendar callback error:', err);
        return NextResponse.redirect(`${appUrl}/dashboard/profile?error=calendar_failed`);
    }
}
