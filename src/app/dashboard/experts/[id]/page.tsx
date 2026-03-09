import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import ExpertProfile from "./ExpertProfile";

interface Props {
    params: Promise<{ id: string }>;
}

export default async function ExpertDetailPage({ params }: Props) {
    const { id } = await params;
    const supabase = await createServerSupabaseClient();

    const { data: expert } = await supabase
        .from("profiles")
        .select("id, full_name, headline, bio, expertise, hourly_rate, location, avatar_url, twitter_url, linkedin_url, website_url, twitter_verified, linkedin_verified, google_calendar_email")
        .eq("id", id)
        .eq("is_expert", true)
        .single();

    if (!expert) notFound();

    // Fetch expert's coin gating settings
    const { data: expertCoin } = await supabase
        .from("expert_coins")
        .select("coin_address, coin_symbol, coin_name, gate_dm, cost_dm, gate_audio, cost_audio, gate_video, cost_video")
        .eq("expert_id", id)
        .single();

    return (
        <div className="relative min-h-screen overflow-hidden">
            <div className="floating-orb w-96 h-96 bg-violet-600 -top-20 -right-48" />
            <div className="floating-orb w-80 h-80 bg-cyan-500 bottom-40 -left-40" style={{ animationDelay: "2s" }} />

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
                <ExpertProfile expert={expert} gating={expertCoin} />
            </div>
        </div>
    );
}
