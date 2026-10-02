import { notFound } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { supabaseConfig } from "@/lib/supabase/config";
import { safeNext } from "@/domain/api";
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ mode: string }>;
  searchParams: Promise<{ next?: string }>;
}) {
  const { mode } = await params;
  const { next } = await searchParams;
  if (!["sign-in", "sign-up"].includes(mode)) notFound();
  return (
    <AuthForm
      signup={mode === "sign-up"}
      next={safeNext(next)}
      configured={!!supabaseConfig()}
    />
  );
}
