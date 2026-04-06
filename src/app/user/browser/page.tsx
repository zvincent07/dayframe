import { Suspense } from "react";
import { EmbeddedBrowser } from "@/components/dashboard/embedded-browser";
import { BrowserSkeleton } from "@/components/skeletons/browser-skeleton";

export default function BrowserPage() {
  return (
    <div className="flex h-full flex-col">
      <Suspense fallback={<BrowserSkeleton />}>
        <EmbeddedBrowser fullPage />
      </Suspense>
    </div>
  );
}
