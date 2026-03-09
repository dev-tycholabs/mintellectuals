import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        const cookieStore = await cookies();
        const storedState = cookieStore.get('twitter_oauth_state')?.value;
        const codeVerifier = cookieStore.get('twitter_code_verifier')?.value;

        // Clean up cookies
        cookieStore.delete('twitter_oauth_state');
        cookieStore.delete('twitter_code_verifier');

        if (error || !code || !state || state !== storedState || !codeVerifier) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?social_error=twitter`
            );
        }

        // Exchange code for token (confidential client requires Basic Auth)
        const basicAuth = Buffer.from(
            `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
        ).toString('base64');

        const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${basicAuth}`,
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/social/twitter/callback`,
                code_verifier: codeVerifier,
            }),
        });

        if (!tokenRes.ok) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?social_error=twitter`
            );
        }

        const { access_token } = await tokenRes.json();

        // Get Twitter user info
        const userRes = await fetch('https://api.twitter.com/2/users/me', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        if (!userRes.ok) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?social_error=twitter`
            );
        }

        const { data: twitterUser } = await userRes.json();
        const twitterUsername = twitterUser.username;

        // Save verified username to profile
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
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/login`
            );
        }

        await supabase
            .from('profiles')
            .update({
                twitter_verified: twitterUsername,
                twitter_url: `https://x.com/${twitterUsername}`,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?social_verified=twitter`
        );
    } catch {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?social_error=twitter`
        );
    }
}
