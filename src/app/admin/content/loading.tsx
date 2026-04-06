import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-9 w-[300px] mb-2" />
        <Skeleton className="h-5 w-[450px]" />
      </div>
      <div className="space-y-4">
        <div className="flex gap-4 border-b pb-4">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-4 pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-2 rounded-lg border p-4">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
