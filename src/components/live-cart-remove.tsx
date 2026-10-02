"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
export function RemoveCartItem({ tenant, id }: { tenant: string; id: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <>
      <button
        className="text-button"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            const r = await fetch(
              `/api/v1/marketplaces/${tenant}/cart?itemId=${id}`,
              { method: "DELETE" },
            );
            if (!r.ok) setMessage("Could not remove this item.");
            else router.refresh();
          } catch {
            setMessage("Connection failed.");
          } finally {
            setPending(false);
          }
        }}
      >
        Remove
      </button>
      {message && <p role="alert">{message}</p>}
    </>
  );
}
