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
        const storedState = cookieStore.get('linkedin_oauth_state')?.value;

        cookieStore.delete('linkedin_oauth_state');

        if (error || !code || !state || state !== storedState) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?social_error=linkedin`
            );
        }

        // Exchange code for token
        const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/social/linkedin/callback`,
                client_id: process.env.LINKEDIN_CLIENT_ID!,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
            }),
        });

        if (!tokenRes.ok) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?social_error=linkedin`
            );
        }

        const { access_token } = await tokenRes.json();

        // Get LinkedIn user info via OpenID userinfo endpoint
        const userRes = await fetch('https://api.linkedin.com/v2/userinfo', {
            headers: { Authorization: `Bearer ${access_token}` },
        });

        if (!userRes.ok) {
            return NextResponse.redirect(
                `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?social_error=linkedin`
            );
        }

        const linkedinUser = await userRes.json();
        // sub is the stable LinkedIn member ID
        const linkedinId = linkedinUser.sub;
        const linkedinName = linkedinUser.name || '';

        // Save verified LinkedIn ID to profile
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
                linkedin_verified: linkedinId,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?social_verified=linkedin&linkedin_name=${encodeURIComponent(linkedinName)}`
        );
    } catch {
        return NextResponse.redirect(
            `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/profile?social_error=linkedin`
        );
    }
}
