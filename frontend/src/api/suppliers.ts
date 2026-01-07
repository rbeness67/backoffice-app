export type Supplier = { id: string; name: string };

export async function getSuppliers() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing token");

  const res = await fetch(`${import.meta.env.VITE_API_URL}/suppliers`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ items: Supplier[] }>;
}
