const BASE_URL = "http://localhost:3001";

export const http = async <T>(path: string, init?: RequestInit) => {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok)
    throw new Error(`Error ${init?.method ?? "GET"} ${path} ${res.status}`);

  return res.status === 204 ? (undefined as T) : await (res.json() as T);
};
