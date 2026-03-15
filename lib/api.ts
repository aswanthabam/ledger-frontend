import * as SecureStore from './secure-store';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'https://ledger-backend-xi.vercel.app';

async function getHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    const token = await SecureStore.getItemAsync('authToken');
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

async function handleResponse(res: Response) {
    if (res.status === 401) {
        // Token expired or invalid — clear it
        await SecureStore.deleteItemAsync('authToken');
        throw new Error('UNAUTHORIZED');
    }
    if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
    }
    return res.json();
}

export async function apiGet(path: string) {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}${path}`, { method: 'GET', headers });
    return handleResponse(res);
}

export async function apiPost(path: string, body?: any) {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
}

export async function apiPatch(path: string, body?: any) {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}${path}`, {
        method: 'PATCH',
        headers,
        body: body ? JSON.stringify(body) : undefined,
    });
    return handleResponse(res);
}

export async function apiDelete(path: string) {
    const headers = await getHeaders();
    const res = await fetch(`${API_URL}${path}`, { method: 'DELETE', headers });
    return handleResponse(res);
}

// Auth-specific: verify Google token with backend
export async function verifyGoogleToken(googleToken: string, deviceInfo: string) {
    const res = await fetch(`${API_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ googleToken, deviceInfo }),
    });
    return handleResponse(res);
}

export async function logout() {
    return apiPost('/api/auth/logout');
}
