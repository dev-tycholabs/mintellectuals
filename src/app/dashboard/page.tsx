import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import DashboardContent from './DashboardContent';

export default async function DashboardPage() {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url, wallet_address')
        .eq('id', user.id)
        .single();

    return <DashboardContent user={user} profile={profile} />;
}
