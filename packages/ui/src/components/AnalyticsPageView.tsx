"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { emit } from "@/lib/analytics";

function normalizePath(path: string): string {
  return (path.split("?")[0] ?? path).split("#")[0] ?? path;
}

/** True when the browser asks not to be tracked (Do Not Track / Global Privacy Control). */
function isOptedOut(): boolean {
  if (typeof navigator === "undefined") return true;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.doNotTrack === "1" || nav.globalPrivacyControl === true;
}

/** Fires `page_view` on mount and on every App Router pathname change, unless opted out. */
export default function AnalyticsPageView() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname && !isOptedOut()) {
      emit("page_view", { path: normalizePath(pathname) });
    }
  }, [pathname]);

  return null;
}
