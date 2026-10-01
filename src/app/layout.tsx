import type { Metadata } from "next";
import { CommerceProvider } from "@/components/commerce-provider";
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
        <CommerceProvider>
          <div id="app-content">{children}</div>
        </CommerceProvider>
      </body>
    </html>
  );
}
