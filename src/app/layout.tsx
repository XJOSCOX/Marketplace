import type { Metadata } from "next";
import { CommerceProvider } from "@/components/commerce-provider";
import { demoEnabled } from "@/lib/supabase/config";
import "./globals.css";
export const metadata: Metadata = {
  title: "GoXAvni Commerce — Good finds. Great possibilities.",
  description:
    "Discover thoughtfully chosen products from independent brands. A tenant-aware commerce demo.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#app-content">
          Skip to content
        </a>
        <div id="app-content">
          {demoEnabled() ? (
            <CommerceProvider>{children}</CommerceProvider>
          ) : (
            children
          )}
        </div>
      </body>
    </html>
  );
}
