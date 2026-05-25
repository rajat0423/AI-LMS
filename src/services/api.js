import { apiUrl } from '../api';

export function getAuthHeaders(token) {
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

export const apiService = {
    getAssessment: async (token) => {
        const res = await fetch(apiUrl('/api/v1/assessment'), { headers: getAuthHeaders(token) });
        if (!res.ok) throw new Error("Failed to fetch assessment");
        return res.json();
    },
    getProfile: async (token) => {
        const res = await fetch(apiUrl('/api/v1/auth/me'), { headers: getAuthHeaders(token) });
        if (!res.ok) throw new Error("Failed to fetch profile");
        return res.json();
    },
    getStats: async (token) => {
        const res = await fetch(apiUrl('/api/v1/my/stats'), { headers: getAuthHeaders(token) });
        if (!res.ok) throw new Error("Failed to fetch stats");
        return res.json();
    },
    getProgress: async (token) => {
        const res = await fetch(apiUrl('/api/v1/my/progress'), { headers: getAuthHeaders(token) });
        if (!res.ok) throw new Error("Failed to fetch progress");
        return res.json();
    },
    updateProfile: async (token, data) => {
        const res = await fetch(apiUrl('/api/v1/auth/profile'), {
            method: 'PUT',
            headers: getAuthHeaders(token),
            body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error("Failed to update profile");
        return res.json();
    },
    changePassword: async (token, data) => {
        const res = await fetch(apiUrl('/api/v1/auth/change-password'), {
            method: 'PUT',
            headers: getAuthHeaders(token),
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err?.error?.message || err?.detail || "Failed to change password");
        }
        return res.json();
    },
    getNotifications: async (token) => {
        const res = await fetch(apiUrl('/api/v1/notifications/'), { headers: getAuthHeaders(token) });
        if (!res.ok) throw new Error("Failed to fetch notifications");
        return res.json();
    },
    getUnreadCount: async (token) => {
        const res = await fetch(apiUrl('/api/v1/notifications/unread-count'), { headers: getAuthHeaders(token) });
        if (!res.ok) throw new Error("Failed to fetch unread count");
        return res.json();
    },
    search: async (token, query) => {
        const res = await fetch(apiUrl(`/api/v1/search?q=${encodeURIComponent(query)}`), { headers: getAuthHeaders(token) });
        if (!res.ok) throw new Error("Search failed");
        return res.json();
    },
    getSubscription: async (token) => {
        const res = await fetch(apiUrl('/api/v1/payments/my/subscription'), { headers: getAuthHeaders(token) });
        if (!res.ok) return null;
        return res.json();
    },
    getModules: async (token) => {
        const res = await fetch(apiUrl('/api/v1/modules'), { headers: getAuthHeaders(token) });
        if (!res.ok) throw new Error("Failed to fetch modules");
        return res.json();
    },
};
