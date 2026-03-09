import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { randomBytes, createHash } from 'crypto';

// Twitter OAuth 2.0 with PKCE
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

        const codeVerifier = randomBytes(32).toString('base64url');
        const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
        const state = randomBytes(16).toString('hex');

        // Store verifier + state in cookies for the callback
        cookieStore.set('twitter_code_verifier', codeVerifier, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600,
            path: '/',
        });
        cookieStore.set('twitter_oauth_state', state, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 600,
            path: '/',
        });

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: process.env.TWITTER_CLIENT_ID!,
            redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/social/twitter/callback`,
            scope: 'tweet.read users.read',
            state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
        });

        return NextResponse.redirect(`https://twitter.com/i/oauth2/authorize?${params}`);
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
