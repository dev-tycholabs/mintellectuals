import { createClient } from './supabase';

interface SignupParams {
    email: string;
    password: string;
    fullName: string;
}

interface LoginParams {
    email: string;
    password: string;
}

export async function signUp({ email, password, fullName }: SignupParams) {
    const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');

    // Create ERC-4337 smart wallet for the new user
    if (data.session) {
        await createWallet();
    }

    return data;
}

export async function createWallet(): Promise<string | null> {
    try {
        const res = await fetch('/api/wallet/create', { method: 'POST' });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Wallet creation failed');
        return data.walletAddress;
    } catch (err) {
        console.error('Wallet creation error:', err);
        return null;
    }
}

export async function signIn({ email, password }: LoginParams) {
    const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    return data;
}

export async function signInWithGoogle() {
    const supabase = createClient();

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: `${window.location.origin}/api/auth/callback`,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    });

    if (error) throw error;
    return data;
}

export async function signOut() {
    const res = await fetch('/api/auth/logout', { method: 'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Logout failed');
    return data;
}

export async function getUser() {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
}
