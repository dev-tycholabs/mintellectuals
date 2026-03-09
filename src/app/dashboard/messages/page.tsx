import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import MessagesView from "./MessagesView";

export default async function MessagesPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    return (
        <div className="h-[calc(100vh-73px)]">
            <Suspense fallback={<div className="flex items-center justify-center h-full text-muted text-sm">Loading...</div>}>
                <MessagesView currentUserId={user.id} />
            </Suspense>
        </div>
    );
}
