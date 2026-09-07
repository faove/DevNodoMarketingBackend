function readCookie(name: string): string | null {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
}

type ApiInit = Omit<RequestInit, 'body'> & { body?: unknown };

async function request<T>(url: string, init: ApiInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    headers.set('Accept', 'application/json');
    headers.set('X-Requested-With', 'XMLHttpRequest');

    const xsrfToken = readCookie('XSRF-TOKEN');
    if (xsrfToken) {
        headers.set('X-XSRF-TOKEN', xsrfToken);
    }

    let body: BodyInit | undefined;
    if (init.body !== undefined) {
        headers.set('Content-Type', 'application/json');
        body = JSON.stringify(init.body);
    }

    const response = await fetch(url, {
        ...init,
        headers,
        body,
        credentials: 'same-origin',
    });

    if (!response.ok) {
        let message = `Error ${response.status}`;
        try {
            const data = await response.json();
            message = data.message || message;
        } catch {
            // respuesta sin cuerpo JSON
        }
        throw new Error(message);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

export const api = {
    get: <T>(url: string) => request<T>(url, { method: 'GET' }),
    post: <T>(url: string, body?: unknown) => request<T>(url, { method: 'POST', body }),
};
