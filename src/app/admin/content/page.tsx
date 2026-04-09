export const dynamic = "force-dynamic";
import { PageHeader } from "@/components/ui/page-header";
import { ContentTabs } from "@/components/admin/content/content-tabs";
import { getAnnouncements, getBlogPosts, getEmailTemplates } from "@/actions/content";

export default async function AdminContentPage() {
  const [announcements, blogPosts, emailTemplates] = await Promise.all([
    getAnnouncements(),
    getBlogPosts(),
    getEmailTemplates()
  ]);

  const initialData = { announcements, blogPosts, emailTemplates };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Content Management</h1>
        <p className="text-muted-foreground mt-2">
          Manage announcements, blog posts, and email templates.
        </p>
      </div>
      
      <ContentTabs initialData={initialData} />
    </div>
  );
}
