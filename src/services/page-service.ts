const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || `Request failed: ${res.status}`);
  }

  return res.json();
}

export interface Page {
  id: string;
  title: string;
  icon?: string;
  cover?: string;
  content: object;
  parentId: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePagePayload {
  title?: string;
  parentId?: string | null;
  icon?: string;
}

export interface UpdatePagePayload {
  title?: string;
  icon?: string;
  cover?: string;
  content?: object;
  parentId?: string | null;
  order?: number;
}

export const pageService = {
  list(): Promise<Page[]> {
    return request("/pages");
  },

  get(id: string): Promise<Page> {
    return request(`/pages/${id}`);
  },

  create(payload: CreatePagePayload = {}): Promise<Page> {
    return request("/pages", {
      method: "POST",
      body: JSON.stringify({ title: "Untitled", ...payload }),
    });
  },

  update(id: string, payload: UpdatePagePayload): Promise<Page> {
    return request(`/pages/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  delete(id: string): Promise<void> {
    return request(`/pages/${id}`, { method: "DELETE" });
  },

  move(id: string, parentId: string | null, order: number): Promise<Page> {
    return request(`/pages/${id}/move`, {
      method: "PATCH",
      body: JSON.stringify({ parentId, order }),
    });
  },
};
