import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import VideoCall from "./VideoCall";

interface PageProps {
    params: Promise<{ appointmentId: string }>;
}

export default async function CallPage({ params }: PageProps) {
    const { appointmentId } = await params;
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Verify user belongs to this appointment
    const { data: appointment } = await supabase
        .from("appointments")
        .select("id, expert_id, booker_id, status, date, start_time, end_time")
        .eq("id", appointmentId)
        .single();

    if (!appointment || (appointment.expert_id !== user.id && appointment.booker_id !== user.id)) {
        redirect("/dashboard/appointments");
    }

    if (appointment.status !== "confirmed") {
        redirect("/dashboard/appointments");
    }

    return <VideoCall appointmentId={appointmentId} />;
}
