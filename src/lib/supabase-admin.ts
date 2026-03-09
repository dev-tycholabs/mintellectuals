import { createClient } from "@supabase/supabase-js";

/**
 * Supabase admin client using the service role key.
 * Use this for background jobs / server-side operations that don't have a user session.
 * NEVER expose this on the client.
 */
export function createAdminSupabaseClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        throw new Error(
            "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
        );
    }

    return createClient(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}
