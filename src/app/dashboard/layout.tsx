import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import DashboardSidebar from "@/components/DashboardSidebar";
import DashboardNav from "@/components/DashboardNav";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createServerSupabaseClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, wallet_address, is_expert")
        .eq("id", user.id)
        .single();

    const displayName =
        profile?.full_name || user.user_metadata?.full_name || "there";

    return (
        <div className="min-h-screen">
            <DashboardNav
                userEmail={user.email || ""}
                displayName={displayName}
                userId={user.id}
                walletAddress={profile?.wallet_address}
            />
            <div className="pt-[73px]">
                <DashboardSidebar isExpert={profile?.is_expert ?? false} />
                <main className="ml-64">{children}</main>
            </div>
        </div>
    );
}
