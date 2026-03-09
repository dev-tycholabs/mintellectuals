import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import ProfileEditor from "./ProfileEditor";
import GoogleCalendarConnect from "@/components/GoogleCalendarConnect";

export default async function ProfilePage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    const { data: expertCoin } = await supabase
        .from("expert_coins")
        .select("*")
        .eq("expert_id", user.id)
        .single();

    const calendarConnected = !!profile?.google_calendar_token;

    return (
        <div className="relative min-h-screen overflow-hidden">
            <div className="floating-orb w-96 h-96 bg-violet-600 -top-20 -right-48" />
            <div className="floating-orb w-80 h-80 bg-cyan-500 bottom-40 -left-40" style={{ animationDelay: "2s" }} />

            <div className="relative z-10 max-w-5xl mx-auto px-6 py-10">
                <h1 className="text-3xl font-bold text-primary mb-2">My Profile</h1>
                <p className="text-secondary mb-8">Manage your account and public profile.</p>
                <ProfileEditor profile={profile} userEmail={user.email || ""} expertCoin={expertCoin} />

                {profile?.is_expert && (
                    <div className="mt-6">
                        <GoogleCalendarConnect
                            connected={calendarConnected}
                            calendarEmail={profile?.google_calendar_email}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
