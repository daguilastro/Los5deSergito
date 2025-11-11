// Wrapper para hacer fetch de forma comprensible

export async function apiFetch(
  url: string | URL,
  data: any = null,
  method: string = "GET",
  headers: Record<string, string> = {}
) {
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...headers,
    },
    body: data == null ? undefined : JSON.stringify(data),
  });

  return res;
}
