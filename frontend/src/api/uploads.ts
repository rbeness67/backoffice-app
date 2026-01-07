export async function presignUpload(filename: string, mimeType: string) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing token");

  const res = await fetch(`${import.meta.env.VITE_API_URL}/uploads/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ filename, mimeType }),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<{ uploadUrl: string; key: string }>;
}

export async function uploadToSignedUrl(uploadUrl: string, file: File) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!res.ok) throw new Error("Upload failed");
}
