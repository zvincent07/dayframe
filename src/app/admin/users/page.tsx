import { Suspense } from "react";
import { getUsers } from "@/app/admin/users/actions";
import { UserList } from "@/components/admin/users/user-list";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { Metadata } from "next";
import { auth } from "@/auth";
import { Role } from "@/permissions/roles";

export const metadata: Metadata = {
  title: "User Management | DayFrame Admin",
  description: "Manage users, roles, and permissions.",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await auth();
  const currentUserId = session?.user?.id;

  const params = await searchParams;
  const page = typeof params.page === "string" ? parseInt(params.page) : 1;
  const search = typeof params.search === "string" ? params.search : undefined;
  const role = typeof params.role === "string" ? params.role : undefined;
  const status = typeof params.status === "string" ? params.status : undefined;

  let isBanned: boolean | undefined;
  let emailVerified: boolean | undefined;

  switch (status) {
    case "active":
      isBanned = false;
      emailVerified = true;
      break;
    case "pending":
      isBanned = false;
      emailVerified = false;
      break;
    case "banned":
      isBanned = true;
      break;
  }

  const { users, pages } = await getUsers(page, 10, {
    search,
    role: role as Role,
    isBanned,
    emailVerified,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Manage user accounts, roles, and access." />

      <Suspense fallback={<UsersTableSkeleton />}>
        <UserList 
          users={users} 
          totalPages={pages} 
          currentPage={page} 
          currentUserId={currentUserId}
        />
      </Suspense>
    </div>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <Skeleton className="h-10 w-full sm:max-w-xs" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-10 w-[130px]" />
          <Skeleton className="h-10 w-[130px]" />
          <Skeleton className="h-10 w-[110px]" />
        </div>
      </div>
      <div className="rounded-md border p-4">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                </div>
              </div>
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-4 w-[100px]" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
