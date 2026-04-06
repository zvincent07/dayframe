import { PageHeaderSkeleton } from "@/components/skeletons/page-header-skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <PageHeaderSkeleton />
    </div>
  );
}
