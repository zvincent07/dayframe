"use client";

import { useState, useTransition } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, Megaphone, Mail, PenTool, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { 
  createAnnouncement, deleteAnnouncement, 
  createBlogPost, deleteBlogPost, 
  createEmailTemplate, deleteEmailTemplate, 
  createJournalPrompt, deleteJournalPrompt 
} from "@/actions/content";

export function ContentTabs({ initialData }: { initialData: any }) {
  const [activeTab, setActiveTab] = useState("announcements");
  
  // States
  const [announcements, setAnnouncements] = useState(initialData.announcements || []);
  const [blogPosts, setBlogPosts] = useState(initialData.blogPosts || []);
  const [emailTemplates, setEmailTemplates] = useState(initialData.emailTemplates || []);
  const [journalPrompts, setJournalPrompts] = useState(initialData.journalPrompts || []);
  
  // Dialog Open States
  const [openAnnouncement, setOpenAnnouncement] = useState(false);
  const [openBlog, setOpenBlog] = useState(false);
  const [openEmail, setOpenEmail] = useState(false);
  const [openPrompt, setOpenPrompt] = useState(false);

  const [isPending, startTransition] = useTransition();

  // Handlers
  const handleCreateAnnouncement = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const title = formData.get("title") as string;
      const message = formData.get("message") as string;
      const type = formData.get("type") as string;
      const res = await createAnnouncement({ title, message, type });
      if (res.success) {
        toast.success("Announcement created");
        setAnnouncements([{ _id: res.id, title, message, type, isActive: true }, ...announcements]);
        setOpenAnnouncement(false);
      } else {
        toast.error("Failed to create");
      }
    });
  };

  const handleCreateBlog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const title = formData.get("title") as string;
      const slug = formData.get("slug") as string;
      const content = formData.get("content") as string;
      const status = formData.get("status") as string;
      const res = await createBlogPost({ title, slug, content, status });
      if (res.success) {
        toast.success("Blog post created");
        setBlogPosts([{ _id: res.id, title, slug, content, status }, ...blogPosts]);
        setOpenBlog(false);
      } else {
        toast.error("Failed to create");
      }
    });
  };

  const handleCreateEmail = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const name = formData.get("name") as string;
      const subject = formData.get("subject") as string;
      const bodyHtml = formData.get("bodyHtml") as string;
      const res = await createEmailTemplate({ name, subject, bodyHtml });
      if (res.success) {
        toast.success("Email template created");
        setEmailTemplates([{ _id: res.id, name, subject, bodyHtml }, ...emailTemplates]);
        setOpenEmail(false);
      } else {
        toast.error("Failed to create");
      }
    });
  };

  const handleCreatePrompt = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const text = formData.get("text") as string;
      const category = formData.get("category") as string;
      const res = await createJournalPrompt({ text, category });
      if (res.success) {
        toast.success("Journal prompt created");
        setJournalPrompts([{ _id: res.id, text, category }, ...journalPrompts]);
        setOpenPrompt(false);
      } else {
        toast.error("Failed to create");
      }
    });
  };

  // Delete handlers
  const handleDelete = (type: string, id: string) => {
    startTransition(async () => {
      if (type === "announcement") {
        await deleteAnnouncement(id);
        setAnnouncements(announcements.filter((a: any) => a._id !== id));
      } else if (type === "blog") {
        await deleteBlogPost(id);
        setBlogPosts(blogPosts.filter((b: any) => b._id !== id));
      } else if (type === "email") {
        await deleteEmailTemplate(id);
        setEmailTemplates(emailTemplates.filter((e: any) => e._id !== id));
      } else if (type === "prompt") {
        await deleteJournalPrompt(id);
        setJournalPrompts(journalPrompts.filter((p: any) => p._id !== id));
      }
      toast.success("Item deleted");
    });
  };

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <TabsList className="grid h-9 grid-cols-2 md:grid-cols-4 bg-muted/40 sm:inline-flex sm:h-10 sm:justify-start sm:w-auto border border-border/60">
            <TabsTrigger value="announcements" className="px-2 text-xs sm:px-5 sm:text-sm">Announcements</TabsTrigger>
            <TabsTrigger value="blog" className="px-2 text-xs sm:px-5 sm:text-sm">Blog Posts</TabsTrigger>
            <TabsTrigger value="email" className="px-2 text-xs sm:px-5 sm:text-sm">Email</TabsTrigger>
            <TabsTrigger value="prompts" className="px-2 text-xs sm:px-5 sm:text-sm">Prompts</TabsTrigger>
          </TabsList>
        </div>

        {/* ANNOUNCEMENTS TAB */}
        <TabsContent value="announcements" className="m-0 border-none p-0 outline-none space-y-4">
           <div className="flex justify-between items-center mb-4">
             <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search announcements..." className="pl-8 bg-background" />
             </div>
             <Dialog open={openAnnouncement} onOpenChange={setOpenAnnouncement}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Create</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Announcement</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input name="title" required />
                    </div>
                    <div>
                      <Label>Message</Label>
                      <Textarea name="message" required />
                    </div>
                    <div>
                      <Label>Type</Label>
                      <Select name="type" defaultValue="info">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Warning</SelectItem>
                          <SelectItem value="success">Success</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
           </div>

           <Card>
              <CardContent className="p-0">
                {announcements.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                     <Megaphone className="h-8 w-8 mb-2 opacity-50" />
                     No announcements created.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {announcements.map((item: any) => (
                      <div key={item._id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium flex items-center space-x-2">
                            <span>{item.title}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${item.type === 'info' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'}`}>
                              {item.type}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">{item.message}</div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete("announcement", item._id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
           </Card>
        </TabsContent>

        {/* BLOG POSTS TAB */}
        <TabsContent value="blog" className="m-0 border-none p-0 outline-none space-y-4">
           <div className="flex justify-between items-center mb-4">
             <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search blog posts..." className="pl-8 bg-background" />
             </div>
             <Dialog open={openBlog} onOpenChange={setOpenBlog}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Create</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Blog Post</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateBlog} className="space-y-4">
                    <div>
                      <Label>Title</Label>
                      <Input name="title" required />
                    </div>
                    <div>
                      <Label>Slug</Label>
                      <Input name="slug" required placeholder="my-blog-post" />
                    </div>
                    <div>
                      <Label>Content (Markdown/HTML)</Label>
                      <Textarea name="content" required />
                    </div>
                    <div>
                      <Label>Status</Label>
                      <Select name="status" defaultValue="draft">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="published">Published</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
           </div>
           <Card>
              <CardContent className="p-0">
                {blogPosts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                     <FileText className="h-8 w-8 mb-2 opacity-50" />
                     No blog posts created.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {blogPosts.map((item: any) => (
                      <div key={item._id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{item.title}</div>
                          <div className="text-xs text-muted-foreground">/{item.slug} • status: {item.status}</div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete("blog", item._id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
           </Card>
        </TabsContent>

        {/* EMAIL TEMPLATES TAB */}
        <TabsContent value="email" className="m-0 border-none p-0 outline-none space-y-4">
           <div className="flex justify-between items-center mb-4">
             <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search templates..." className="pl-8 bg-background" />
             </div>
             <Dialog open={openEmail} onOpenChange={setOpenEmail}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Create</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Email Template</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateEmail} className="space-y-4">
                    <div>
                      <Label>Template Name (Internal)</Label>
                      <Input name="name" required placeholder="e.g. Welcome Email" />
                    </div>
                    <div>
                      <Label>Subject Line</Label>
                      <Input name="subject" required />
                    </div>
                    <div>
                      <Label>Body HTML</Label>
                      <Textarea name="bodyHtml" required rows={5} placeholder="<h1>Hello</h1>" />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
           </div>
           <Card>
              <CardContent className="p-0">
                {emailTemplates.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                     <Mail className="h-8 w-8 mb-2 opacity-50" />
                     No email templates created.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {emailTemplates.map((item: any) => (
                      <div key={item._id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{item.name}</div>
                          <div className="text-xs text-muted-foreground">Subject: {item.subject}</div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete("email", item._id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
           </Card>
        </TabsContent>

        {/* PROMPTS TAB */}
        <TabsContent value="prompts" className="m-0 border-none p-0 outline-none space-y-4">
           <div className="flex justify-between items-center mb-4">
             <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input type="search" placeholder="Search prompts..." className="pl-8 bg-background" />
             </div>
             <Dialog open={openPrompt} onOpenChange={setOpenPrompt}>
                <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Prompt</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Journal Prompt</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreatePrompt} className="space-y-4">
                    <div>
                      <Label>Prompt Text</Label>
                      <Input name="text" required placeholder="What are you grateful for today?" />
                    </div>
                    <div>
                      <Label>Category</Label>
                      <Select name="category" defaultValue="General">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="General">General</SelectItem>
                          <SelectItem value="Gratitude">Gratitude</SelectItem>
                          <SelectItem value="Reflection">Reflection</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
           </div>
           <Card>
              <CardContent className="p-0">
                {journalPrompts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                     <PenTool className="h-8 w-8 mb-2 opacity-50" />
                     No journal prompts created.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {journalPrompts.map((item: any) => (
                      <div key={item._id} className="p-4 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-sm">"{item.text}"</div>
                          <div className="text-xs text-muted-foreground mt-1">Category: {item.category}</div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete("prompt", item._id)} disabled={isPending}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
           </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
