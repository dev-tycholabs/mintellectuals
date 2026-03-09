import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Count unread messages where current user is NOT the sender
        const { count, error } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .neq('sender_id', user.id)
            .is('read_at', null)
            .in(
                'conversation_id',
                // subquery: conversations the user is part of
                (await supabase
                    .from('conversations')
                    .select('id')
                    .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
                ).data?.map((c) => c.id) || []
            );

        if (error) return NextResponse.json({ error: error.message }, { status: 400 });
        return NextResponse.json({ count: count || 0 });
    } catch {
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
