export type PresignUploadInput =
  | { filename: string; mimeType: string; key?: string }
  | string;

export async function presignUpload(
  filenameOrInput: string | { filename?: string; mimeType: string; key?: string },
  mimeTypeArg?: string
) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Missing token");

  let body: { filename: string; mimeType: string; key?: string };

  // Old signature: presignUpload(filename, mimeType)
  if (typeof filenameOrInput === "string") {
    const filename = filenameOrInput;
    const mimeType = mimeTypeArg ?? "";
    if (!mimeType) throw new Error("Missing mimeType");
    body = { filename, mimeType };
  } else {
    // New signature: presignUpload({ filename?, mimeType, key? })
    // If filename is omitted, we derive it from the key (last segment)
    const key = filenameOrInput.key;
    const filename =
      filenameOrInput.filename ??
      (key ? key.split("/").pop() || "upload" : "upload");
    body = { filename, mimeType: filenameOrInput.mimeType, key };
  }

  const res = await fetch(`${import.meta.env.VITE_API_URL}/uploads/presign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
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
