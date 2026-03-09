import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import CoinManager from "./CoinManager";

export default async function CoinPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_expert")
        .eq("id", user.id)
        .single();

    if (!profile?.is_expert) redirect("/dashboard");

    const { data: coin } = await supabase
        .from("expert_coins")
        .select("*")
        .eq("expert_id", user.id)
        .single();

    return (
        <div className="relative min-h-screen overflow-hidden">
            <div className="floating-orb w-96 h-96 bg-violet-600 -top-20 -right-48" />
            <div className="floating-orb w-80 h-80 bg-amber-500 bottom-40 -left-40" style={{ animationDelay: "2s" }} />

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
                <h1 className="text-3xl font-bold text-primary mb-2">Manage Your Coin</h1>
                <p className="text-secondary mb-8">Control access to your services using your personal coin.</p>
                <CoinManager coin={coin} />
            </div>
        </div>
    );
}
