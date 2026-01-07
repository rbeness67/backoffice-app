function getAuthHeaders() {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing token");
  return { Authorization: `Bearer ${token}` };
}

export async function getDocumentDownloadUrl(documentId: string) {
  const res = await fetch(
    `${import.meta.env.VITE_API_URL}/documents/${documentId}/download-url`,
    { headers: getAuthHeaders() }
  );
  const text = await res.text();
  if (!res.ok) throw new Error(text || "Failed to get download url");
  return JSON.parse(text) as { downloadUrl: string };
}
