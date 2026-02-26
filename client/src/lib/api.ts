import type { ProcessResult, ScanResult, ProcessItemResult, ProcessInvoiceRequest, ProcessTahsilatRequest } from '../../../shared/types';
import { clearAuth } from '../components/AuthGate';

const API_BASE = import.meta.env.VITE_API_URL || '';

function getAuthHeaders(token?: string): Record<string, string> {
    const authToken = token || localStorage.getItem('auth_token');
    const headers: Record<string, string> = {};
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    return headers;
}

function handleAuthErrors(response: Response): void {
    if (response.status === 401) {
        clearAuth();
        throw new Error('AUTH_EXPIRED');
    }
    if (response.status === 403) {
        throw new Error('Email not authorized to use this application');
    }
}

// Legacy endpoint — still works for backwards compatibility
export async function processXmlFile(formData: FormData, token?: string): Promise<ProcessResult> {
    const response = await fetch(`${API_BASE}/api/process-xml`, {
        method: 'POST',
        body: formData,
        headers: getAuthHeaders(token),
    });
    handleAuthErrors(response);
    return response.json();
}

export async function scanXmlFile(formData: FormData, token?: string): Promise<ScanResult> {
    const response = await fetch(`${API_BASE}/api/scan-xml`, {
        method: 'POST',
        body: formData,
        headers: getAuthHeaders(token),
    });
    handleAuthErrors(response);
    return response.json();
}

export async function processInvoice(request: ProcessInvoiceRequest, token?: string): Promise<ProcessItemResult> {
    const headers = { ...getAuthHeaders(token), 'Content-Type': 'application/json' };
    const response = await fetch(`${API_BASE}/api/process-invoice`, {
        method: 'POST',
        body: JSON.stringify(request),
        headers,
    });
    handleAuthErrors(response);
    return response.json();
}

export async function processTahsilat(request: ProcessTahsilatRequest, token?: string): Promise<ProcessItemResult> {
    const headers = { ...getAuthHeaders(token), 'Content-Type': 'application/json' };
    const response = await fetch(`${API_BASE}/api/process-tahsilat`, {
        method: 'POST',
        body: JSON.stringify(request),
        headers,
    });
    handleAuthErrors(response);
    return response.json();
}
