import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import TransactionActivity from "@/components/TransactionActivity";

export default async function ActivityPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    return (
        <div className="relative min-h-screen overflow-hidden">
            <div className="floating-orb w-96 h-96 bg-cyan-600 -top-20 -right-48" />
            <div className="floating-orb w-80 h-80 bg-violet-500 bottom-40 -left-40" style={{ animationDelay: "2s" }} />

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
                <h1 className="text-3xl font-bold text-primary mb-2">Transaction Activity</h1>
                <p className="text-secondary mb-8">Track your blockchain transactions in real time.</p>
                <TransactionActivity />
            </div>
        </div>
    );
}
