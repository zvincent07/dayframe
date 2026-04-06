import { PageHeader } from "@/components/ui/page-header"
import { NewsFilters } from "@/components/dashboard/news-filters"
import { NewsCard } from "@/components/dashboard/news-card"
import { getNewsData } from "@/lib/news"

export default async function NewsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const topic = (sp?.topic as string) || "Top Headlines";
  const items = await getNewsData(topic);
  return (
    <div className="min-w-0 space-y-6">
      <PageHeader title="World News" description="Top headlines from around the globe." />
      <NewsFilters topic={topic} />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {items.length === 0 ? (
          <div className="text-sm text-muted-foreground">No headlines found. Try adjusting filters.</div>
        ) : (
          items.map((a, i) => (
            <NewsCard key={`${a.url}-${i}`} article={a as unknown as { title: string; description: string; url: string; image?: string; source: string; publishedAt?: string; }} />
          ))
        )}
      </div>
    </div>
  )
}
