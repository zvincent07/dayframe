export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/ui/page-header";
import { ContentTabs } from "@/components/admin/content/content-tabs";
import { getAnnouncements, getBlogPosts, getEmailTemplates, getJournalPrompts } from "@/actions/content";

export default async function AdminContentPage() {
  const [announcements, blogPosts, emailTemplates, journalPrompts] = await Promise.all([
    getAnnouncements(),
    getBlogPosts(),
    getEmailTemplates(),
    getJournalPrompts()
  ]);

  const initialData = { announcements, blogPosts, emailTemplates, journalPrompts };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage announcements, blog posts, email templates, and journal prompts.
        </p>
      </div>
      
      <ContentTabs initialData={initialData} />
    </div>
  );
}
