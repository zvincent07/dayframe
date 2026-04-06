import { auth } from "@/auth";
import { requirePermission } from "@/permissions";
import { PageHeader } from "@/components/ui/page-header";
import { getBookmarks } from "./actions";
import { BookmarkList } from "@/components/dashboard/bookmark-list";
import { BookmarkAddForm } from "@/components/dashboard/bookmark-add-form";

export default async function BookmarksPage() {
  const session = await auth();
  requirePermission(session?.user, "view:own-bookmarks");
  const items = await getBookmarks();

  return (
    <div className="space-y-6">
      <PageHeader title="Bookmarks" description="Your saved links, videos, and resources." />

      <BookmarkAddForm />

      <BookmarkList initialItems={items} />
    </div>
  );
}
