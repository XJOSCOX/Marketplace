"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { commerceMutation } from "@/lib/client-api";
export function SetupButton({
  tenant,
  action,
  children,
}: {
  tenant: string;
  action: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        className="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setMessage("");
          try {
            await commerceMutation(`/api/v1/marketplaces/${tenant}/setup`, {
              action,
            });
            setMessage("Saved.");
            router.refresh();
          } catch (e) {
            setMessage((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Saving…" : children}
      </button>
      {message && (
        <p role="status" className="form-feedback">
          {message}
        </p>
      )}
    </div>
  );
}
export function ImageUpload({
  tenant,
  productId,
}: {
  tenant: string;
  productId?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <div className="upload-field">
      <label>
        {productId ? "Primary product image" : "Marketplace logo"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={busy}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 5 * 1024 * 1024) {
              setMessage("Choose an image under 5 MB.");
              return;
            }
            setBusy(true);
            setMessage("Uploading…");
            try {
              const response = await fetch(
                `/api/v1/marketplaces/${tenant}/assets${productId ? "?productId=" + productId : ""}`,
                {
                  method: "POST",
                  headers: { "Content-Type": file.type },
                  body: file,
                },
              );
              const json = await response.json();
              if (!response.ok) throw new Error(json.error.message);
              setMessage("Image saved.");
              router.refresh();
            } catch (error) {
              setMessage((error as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <small>
        PNG, JPEG or WebP · up to 5 MB / 16 megapixels. Images are optimized and
        metadata removed.
      </small>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
export function ShareStorefront({ href }: { href: string }) {
  const [message, setMessage] = useState("");
  return (
    <div>
      <button
        type="button"
        className="button secondary"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              new URL(href, window.location.origin).href,
            );
            setMessage("Storefront link copied.");
          } catch {
            setMessage("Open the storefront and copy its address to share.");
          }
        }}
      >
        Copy storefront link
      </button>
      {message && (
        <p role="status" className="form-feedback">
          {message}
        </p>
      )}
    </div>
  );
}
