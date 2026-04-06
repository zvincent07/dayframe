import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  children,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4",
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="text-pretty text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
          {children}
        </div>
      )}
    </div>
  );
}
