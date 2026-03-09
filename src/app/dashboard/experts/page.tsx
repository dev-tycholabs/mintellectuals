import { createServerSupabaseClient } from "@/lib/supabase-server";
import ExpertGrid from "./ExpertGrid";

export default async function ExpertsPage() {
    const supabase = await createServerSupabaseClient();

    const { data: experts } = await supabase
        .from("profiles")
        .select("id, full_name, headline, bio, expertise, hourly_rate, location, avatar_url")
        .eq("is_expert", true)
        .order("updated_at", { ascending: false });

    return (
        <div className="relative min-h-screen overflow-hidden">
            <div className="floating-orb w-96 h-96 bg-violet-600 -top-20 -right-48" />
            <div className="floating-orb w-80 h-80 bg-cyan-500 bottom-40 -left-40" style={{ animationDelay: "2s" }} />

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
                <h1 className="text-3xl font-bold text-primary mb-2">Look for Experts</h1>
                <p className="text-secondary mb-8">Find and connect with professionals in your network.</p>
                <ExpertGrid experts={experts || []} />
            </div>
        </div>
    );
}
