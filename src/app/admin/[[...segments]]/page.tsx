import { notFound } from "next/navigation";
import { protectPage } from "@/auth/protect-page";
import { LiveWorkspace } from "@/components/live-workspace";
import { Empty } from "@/components/ui";
import { AppError } from "@/domain/errors";
export default async function Page({
  params,
}: {
  params: Promise<{ segments?: string[] }>;
}) {
  const { segments = [] } = await params;
  if (
    segments.length > 1 ||
    (segments[0] &&
      ![
        "overview",
        "marketplaces",
        "users",
        "sellers",
        "transactions",
        "disputes",
        "moderation",
      ].includes(segments[0]))
  )
    notFound();
  let auth;
  try {
    auth = await protectPage(
      "/admin" + (segments.length ? "/" + segments.join("/") : ""),
      undefined,
      "admin",
    );
  } catch (error) {
    if (error instanceof AppError)
      return (
        <Empty
          title="Access denied"
          text={error.message}
          href="/"
          action="Go home"
        />
      );
    throw error;
  }
  return <LiveWorkspace auth={auth} area="admin" segments={segments} />;
}
