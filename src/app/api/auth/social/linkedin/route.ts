import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { randomBytes } from 'crypto';

export async function GET() {
    try {
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
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const state = randomBytes(16).toString('hex');

        cookieStore.set('linkedin_oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600,
            path: '/',
        });

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: process.env.LINKEDIN_CLIENT_ID!,
            redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/social/linkedin/callback`,
            scope: 'openid profile',
            state,
        });

        return NextResponse.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
