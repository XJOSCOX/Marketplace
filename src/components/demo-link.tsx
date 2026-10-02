"use client";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
export default function DemoLink(props: ComponentProps<typeof NextLink>) {
  const path = usePathname();
  let href = props.href;
  if (
    path.startsWith("/demo/") &&
    typeof href === "string" &&
    (href.startsWith("/m/") || href === "/admin" || href.startsWith("/admin/"))
  )
    href = "/demo" + href;
  return <NextLink {...props} href={href} />;
}
