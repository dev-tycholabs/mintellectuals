import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createSmartWallet } from '@/lib/wallet';
import { transferWelcomeBonus } from '@/lib/welcome-bonus';

export async function POST() {
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

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check if wallet already exists
        const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_address')
            .eq('id', user.id)
            .single();

        if (profile?.wallet_address) {
            return NextResponse.json({ walletAddress: profile.wallet_address });
        }

        // Create ERC-4337 smart wallet
        const { walletAddress, encryptedSeedPhrase } = await createSmartWallet();

        // Store in profile
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                wallet_address: walletAddress,
                encrypted_seed_phrase: encryptedSeedPhrase,
            })
            .eq('id', user.id);

        if (updateError) {
            return NextResponse.json({ error: 'Failed to save wallet' }, { status: 500 });
        }

        // Send 2 USDT welcome bonus (fire-and-forget — don't block the response)
        transferWelcomeBonus(walletAddress).catch((err) =>
            console.error('Welcome bonus background error:', err)
        );

        return NextResponse.json({ walletAddress });
    } catch (error) {
        console.error('Wallet creation error:', error);
        return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 });
    }
}
