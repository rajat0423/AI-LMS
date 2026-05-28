import { useEffect, useState } from 'react';
import { apiUrl, API_BASE_URL } from '../api';
import AuthContext from './auth-context';

const USER_STORAGE_KEY = 'nlm-user';
const TOKEN_STORAGE_KEY = 'nlm-access-token';
const DEFAULT_SCORES = {
    confidence: 76,
    communication: 72,
    professional: 81,
    employability: 78,
};

function normalizeYearValue(year) {
    if (typeof year === 'number' && year >= 1 && year <= 4) {
        return year;
    }

    if (typeof year === 'string') {
        const trimmedYear = year.trim();
        if (!trimmedYear) {
            return 3;
        }

        if (/^\d+$/.test(trimmedYear)) {
            const numericYear = Number(trimmedYear);
            if (numericYear >= 1 && numericYear <= 4) {
                return numericYear;
            }
        }

        const match = trimmedYear.match(/([1-4])/);
        if (match) {
            return Number(match[1]);
        }
    }

    return 3;
}

function formatYearLabel(year) {
    return `Year ${normalizeYearValue(year)}`;
}

function getStoredValue(key) {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        return window.localStorage.getItem(key);
    } catch {
        return null;
    }
}

function parseStoredJson(key) {
    const value = getStoredValue(key);
    if (!value) {
        return null;
    }

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
}

function splitDisplayName(firstName, lastName) {
    return [firstName, lastName].filter(Boolean).join(' ').trim() || 'Student';
}

function readApiError(payload, fallbackMessage) {
    if (!payload || typeof payload !== 'object') {
        return fallbackMessage;
    }

    if (typeof payload.detail === 'string' && payload.detail.trim()) {
        return payload.detail;
    }

    if (payload.error && typeof payload.error.message === 'string' && payload.error.message.trim()) {
        return payload.error.message;
    }

    return fallbackMessage;
}

function buildClientUser(apiUser, overrides = {}) {
    const yearNumber = normalizeYearValue(overrides.year ?? apiUser?.year);

    return {
        id: apiUser?.user_id || overrides.id || '',
        email: apiUser?.email || overrides.email || '',
        firstName: apiUser?.first_name || overrides.firstName || '',
        lastName: apiUser?.last_name || overrides.lastName || '',
        name: splitDisplayName(
            apiUser?.first_name || overrides.firstName,
            apiUser?.last_name || overrides.lastName,
        ),
        role: apiUser?.role_name || overrides.role || 'student',
        year: formatYearLabel(yearNumber),
        yearNumber,
        avatar: apiUser?.avatar_url || overrides.avatar || null,
        authProvider: apiUser?.auth_provider || overrides.authProvider || 'local',
        scores: overrides.scores || DEFAULT_SCORES,
    };
}

async function requestJson(path, options = {}) {
    let response;
    try {
        response = await fetch(apiUrl(path), {
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
            ...options,
        });
    } catch {
        throw new Error(`Unable to reach the backend. Please make sure the backend is running and reachable at ${API_BASE_URL || 'the local /api proxy path'}.`);
    }

    const responseText = await response.text();
    let payload = null;

    if (responseText) {
        try {
            payload = JSON.parse(responseText);
        } catch {
            payload = null;
        }
    }

    if (!response.ok) {
        throw new Error(readApiError(payload, 'Request failed. Please try again.'));
    }

    return payload;
}

export function AuthProvider({ children }) {
    const [user, setUser] = useState(() => {
        const savedUser = parseStoredJson(USER_STORAGE_KEY);
        return savedUser
            ? {
                ...savedUser,
                year: formatYearLabel(savedUser.yearNumber ?? savedUser.year),
                yearNumber: normalizeYearValue(savedUser.yearNumber ?? savedUser.year),
            }
            : null;
    });
    const [token, setToken] = useState(() => getStoredValue(TOKEN_STORAGE_KEY));
    const [isLoadingAuth, setIsLoadingAuth] = useState(() => !!getStoredValue(TOKEN_STORAGE_KEY));

    const persistAuth = (nextUser, nextToken) => {
        setUser(nextUser);
        setToken(nextToken);

        if (typeof window === 'undefined') {
            return;
        }

        if (nextUser) {
            window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
        } else {
            window.localStorage.removeItem(USER_STORAGE_KEY);
        }

        if (nextToken) {
            window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
        } else {
            window.localStorage.removeItem(TOKEN_STORAGE_KEY);
        }
    };

    const syncUserFromApi = (apiUser, overrides = {}) => {
        const nextUser = buildClientUser(apiUser, {
            scores: user?.scores || DEFAULT_SCORES,
            avatar: user?.avatar || null,
            authProvider: user?.authProvider || 'local',
            ...overrides,
        });
        persistAuth(nextUser, token);
        return nextUser;
    };

    const login = async ({ email, password, year }) => {
        const payload = await requestJson('/api/v1/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });

        const nextUser = buildClientUser(payload.user, { year });
        persistAuth(nextUser, payload.access_token);
        return nextUser;
    };

    const register = async ({ email, password, firstName, lastName, year }) => {
        await requestJson('/api/v1/auth/register', {
            method: 'POST',
            body: JSON.stringify({
                email,
                password,
                first_name: firstName,
                last_name: lastName,
                year: normalizeYearValue(year),
            }),
        });

        return login({ email, password, year });
    };

    const loginWithGoogle = async ({ credential, year }) => {
        const payload = await requestJson('/api/v1/auth/google', {
            method: 'POST',
            body: JSON.stringify({ credential, year }),
        });

        const nextUser = buildClientUser(payload.user, { year });
        persistAuth(nextUser, payload.access_token);
        return nextUser;
    };

    const updateYear = (year) => {
        const yearNumber = normalizeYearValue(year);
        setUser((currentUser) => (
            currentUser
                ? {
                    ...currentUser,
                    year: formatYearLabel(yearNumber),
                    yearNumber,
                }
                : currentUser
        ));
    };

    const logout = () => {
        window.google?.accounts?.id?.disableAutoSelect?.();
        persistAuth(null, null);
    };

    useEffect(() => {
        if (!token) {
            setIsLoadingAuth(false);
            return;
        }

        let isActive = true;

        const restoreSession = async () => {
            setIsLoadingAuth(true);
            try {
                const payload = await requestJson('/api/v1/auth/me', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!isActive) {
                    return;
                }

                const savedUser = parseStoredJson(USER_STORAGE_KEY);
                const nextUser = buildClientUser(payload, {
                    year: savedUser?.yearNumber ?? savedUser?.year,
                    scores: savedUser?.scores || DEFAULT_SCORES,
                });
                persistAuth(nextUser, token);
            } catch {
                if (isActive) {
                    persistAuth(null, null);
                }
            } finally {
                if (isActive) {
                    setIsLoadingAuth(false);
                }
            }
        };

        restoreSession();

        return () => {
            isActive = false;
        };
    }, [token]);

    useEffect(() => {
        if (!token || !user || typeof window === 'undefined') {
            return;
        }

        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    }, [token, user]);

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                login,
                register,
                loginWithGoogle,
                logout,
                updateYear,
                syncUserFromApi,
                isAuthenticated: !!user && !!token,
                isLoadingAuth,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}
