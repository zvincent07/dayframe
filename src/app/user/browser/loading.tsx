import { BrowserSkeleton } from "@/components/skeletons/browser-skeleton";

export default function Loading() {
  return (
    <div className="flex h-full min-h-[50vh] flex-col">
      <BrowserSkeleton />
    </div>
  );
}
