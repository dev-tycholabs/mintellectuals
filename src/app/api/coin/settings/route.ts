import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

const GATING_FIELDS = [
    "gate_dm",
    "gate_audio",
    "gate_video",
    "cost_dm",
    "cost_audio",
    "cost_video",
];

export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const supabase = await createServerSupabaseClient();

        const {
            data: { user },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify expert has a launched coin
        const { data: coin } = await supabase
            .from("expert_coins")
            .select("id")
            .eq("expert_id", user.id)
            .single();

        if (!coin) {
            return NextResponse.json(
                { error: "No coin found. Launch a coin first." },
                { status: 403 }
            );
        }

        // Only allow whitelisted fields
        const updates: Record<string, unknown> = {};
        for (const key of GATING_FIELDS) {
            if (key in body) updates[key] = body[key];
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
        }

        const { data, error } = await supabase
            .from("expert_coins")
            .update(updates)
            .eq("expert_id", user.id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 400 });
        }

        return NextResponse.json({ coin: data });
    } catch {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
