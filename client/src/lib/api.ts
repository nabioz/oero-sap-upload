import type { ProcessResult } from '../../../shared/types';
import { clearAuth } from '../components/AuthGate';

const API_BASE = import.meta.env.VITE_API_URL || '';

export async function processXmlFile(formData: FormData, token?: string): Promise<ProcessResult> {
    const authToken = token || localStorage.getItem('auth_token');

    const headers: Record<string, string> = {};
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(`${API_BASE}/api/process-xml`, {
        method: 'POST',
        body: formData,
        headers,
    });

    if (response.status === 401) {
        clearAuth();
        throw new Error('AUTH_EXPIRED');
    }

    if (response.status === 403) {
        throw new Error('Email not authorized to use this application');
    }

    return response.json();
}
