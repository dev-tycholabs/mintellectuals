import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const hash = searchParams.get("hash");

    if (!hash) {
        return NextResponse.json({ error: "hash is required" }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: tx, error } = await supabase
        .from("pending_transactions")
        .select("tx_hash, tx_type, status, payload, created_at, resolved_at, error")
        .eq("tx_hash", hash)
        .eq("user_id", user.id)
        .single();

    if (error || !tx) {
        return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    return NextResponse.json({ transaction: tx });
}
