import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';

    if (!code) {
        return NextResponse.redirect(`${origin}/login?error=no_code`);
    }

    try {
        const cookieStore = await cookies();

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    },
                },
            }
        );

        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.error('Auth code exchange failed:', error.message);
            return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
        }

        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('id, wallet_address')
                .eq('id', user.id)
                .single();

            if (!profile) {
                await supabase.from('profiles').insert({
                    id: user.id,
                    full_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
                    email: user.email,
                    avatar_url: user.user_metadata?.avatar_url || null,
                });
            }

            // Create ERC-4337 smart wallet if not already created
            if (!profile?.wallet_address) {
                try {
                    const { createSmartWallet } = await import('@/lib/wallet');
                    const { transferWelcomeBonus } = await import('@/lib/welcome-bonus');
                    const { walletAddress, encryptedSeedPhrase } = await createSmartWallet();
                    await supabase
                        .from('profiles')
                        .update({
                            wallet_address: walletAddress,
                            encrypted_seed_phrase: encryptedSeedPhrase,
                        })
                        .eq('id', user.id);

                    // Send 2 USDT welcome bonus (fire-and-forget)
                    transferWelcomeBonus(walletAddress).catch((err) =>
                        console.error('Welcome bonus background error:', err)
                    );
                } catch (err) {
                    console.error('Wallet creation failed during OAuth callback:', err);
                    // Don't block login if wallet creation fails — it can be retried
                }
            }
        }

        return NextResponse.redirect(`${origin}${next}`);
    } catch (err) {
        console.error('Auth callback unexpected error:', err);
        return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
    }
}
