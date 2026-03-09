import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

// GET /api/skills?q=sol — search skills for typeahead
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim() || '';

    if (q.length < 1) {
        return NextResponse.json({ skills: [] });
    }

    const supabase = await getSupabase();

    const { data, error } = await supabase
        .from('skills')
        .select('name')
        .ilike('name', `${q}%`)
        .order('usage_count', { ascending: false })
        .limit(10);

    if (error) {
        return NextResponse.json({ skills: [] });
    }

    return NextResponse.json({ skills: data.map((s: { name: string }) => s.name) });
}

// POST /api/skills — ensure skills exist in DB (called on profile save)
export async function POST(request: Request) {
    const supabase = await getSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { skills } = await request.json();
    if (!Array.isArray(skills)) {
        return NextResponse.json({ error: 'skills must be an array' }, { status: 400 });
    }

    // Upsert each skill — insert if new, ignore if exists
    const uniqueSkills = [...new Set(skills.map((s: string) => String(s).trim()).filter(Boolean))];

    if (uniqueSkills.length > 0) {
        await supabase
            .from('skills')
            .upsert(
                uniqueSkills.map(name => ({ name })),
                { onConflict: 'name', ignoreDuplicates: true }
            );
    }

    return NextResponse.json({ ok: true });
}

