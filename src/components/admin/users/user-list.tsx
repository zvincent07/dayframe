"use client";

import { useState, useEffect, useCallback, useOptimistic, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  MoreHorizontal, 
  Search, 
  UserCog, 
  Ban, 
  Trash2, 
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  KeyRound
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { deleteUser, toggleUserBan, updateUserRole, sendPasswordResetLink } from "@/app/admin/users/actions";
import { hasPermission } from "@/permissions";
import { Role } from "@/permissions/roles";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserDetailsDialog } from "./user-details-dialog";
import { AddUserDialog } from "./add-user-dialog";
import { User, UserFilter } from "@/types/user";

// Force rebuild to resolve hydration mismatch
interface UserListProps {
  users: User[];
  totalPages: number;
  currentPage: number;
  currentUserId?: string;
}

export function UserList({ users, totalPages, currentPage, currentUserId }: UserListProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const roleFilter = searchParams.get("role") || "all";
  const statusFilter = searchParams.get("status") || "all";
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  // Auto-refresh every 5 seconds to show new users without manual refresh
  useEffect(() => {
    const interval = setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const [optimisticUsers, addOptimisticUser] = useOptimistic(
    users,
    (state: User[], updatedUser: User) => {
      return state.map((user) => (user._id === updatedUser._id ? updatedUser : user));
    }
  );

  const updateFilters = useCallback((newFilters: UserFilter) => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Reset page on filter change
    if (newFilters.page) {
      params.set("page", newFilters.page.toString());
    } else {
      // Only reset to page 1 if we're changing filters, not if we're just navigating pages
      if (newFilters.page === undefined) {
        params.set("page", "1");
      }
    }

    if (newFilters.search !== undefined) {
      if (newFilters.search) params.set("search", newFilters.search);
      else params.delete("search");
    }

    if (newFilters.role !== undefined) {
      if (newFilters.role !== "all") params.set("role", newFilters.role);
      else params.delete("role");
    }

    if (newFilters.status !== undefined) {
      if (newFilters.status !== "all") params.set("status", newFilters.status);
      else params.delete("status");
    }

    router.push(`/admin/users?${params.toString()}`);
  }, [router, searchParams]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== (searchParams.get("search") || "")) {
        updateFilters({ search: searchTerm });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm, searchParams, updateFilters]);

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setIsDetailsOpen(true);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    // 1. Optimistic Update
    const userToUpdate = optimisticUsers.find(u => u._id === userId);
    if (userToUpdate) {
      startTransition(() => {
        addOptimisticUser({ ...userToUpdate, role: newRole as Role });
      });
    }

    // 2. Server Action
    try {
      const result = await updateUserRole(userId, newRole as Role);
      if (result.success) {
        toast.success("User role updated successfully");
      } else {
        toast.error(result.error || "Failed to update role");
        // Implicit rollback happens when server revalidates and sends old data back
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleBanToggle = async (userId: string, currentStatus: boolean) => {
    // 1. Optimistic Update
    const userToUpdate = optimisticUsers.find(u => u._id === userId);
    if (userToUpdate) {
      startTransition(() => {
        addOptimisticUser({ ...userToUpdate, isBanned: !currentStatus });
      });
    }

    // 2. Server Action
    try {
      const result = await toggleUserBan(userId, !currentStatus);
      if (result.success) {
        toast.success(currentStatus ? "User unbanned successfully" : "User banned successfully");
      } else {
        toast.error(result.error || "Failed to update ban status");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleSendResetLink = async (userId: string) => {
    setIsLoading(true);
    try {
      const result = await sendPasswordResetLink(userId);
      if (result.success) {
        toast.success("Password reset link sent to user");
      } else {
        toast.error(result.error || "Failed to send reset link");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    setIsLoading(true);
    try {
      const result = await deleteUser(userToDelete._id);
      if (result.success) {
        toast.success("User deleted successfully");
      } else {
        toast.error(result.error || "Failed to delete user");
      }
    } catch {
      toast.error("An error occurred");
    } finally {
      setIsLoading(false);
      setUserToDelete(null);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20";
      case "mentor":
        return "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-400 ring-1 ring-zinc-500/20";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col sm:flex-row flex-1 items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select
              value={roleFilter}
              onValueChange={(value) => updateFilters({ role: value })}
            >
              <SelectTrigger className="flex-1 sm:w-[130px]" suppressHydrationWarning>
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="mentor">Mentor</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(value) => updateFilters({ status: value })}
            >
              <SelectTrigger className="flex-1 sm:w-[130px]" suppressHydrationWarning>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="banned">Banned</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AddUserDialog />
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block rounded-md border dark:bg-[#18181b]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {optimisticUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              optimisticUsers.map((user) => (
                <TableRow key={user._id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium flex items-center gap-1">
                          {user.name}
                          {currentUserId === user._id && (
                            <span className="text-xs text-muted-foreground font-normal ml-1">(You)</span>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.isBanned ? (
                      <Badge variant="destructive" className="flex w-fit items-center gap-1">
                        <Ban className="h-3 w-3" />
                        Banned
                      </Badge>
                    ) : hasPermission(user, "view:settings") || user.emailVerified ? (
                      <Badge variant="outline" className="flex w-fit items-center gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="flex w-fit items-center gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
                        <Clock className="h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {format(new Date(user.createdAt), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild suppressHydrationWarning>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user._id)}>
                          Copy user ID
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                          <UserCog className="mr-2 h-4 w-4" />
                          View details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel>Role</DropdownMenuLabel>
                        <DropdownMenuRadioGroup 
                          value={user.role} 
                          onValueChange={(value) => handleRoleChange(user._id, value)}
                        >
                          <DropdownMenuRadioItem value="user">User</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="mentor">Mentor</DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleSendResetLink(user._id)}>
                          <KeyRound className="mr-2 h-4 w-4" />
                          Send password reset
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleBanToggle(user._id, !!user.isBanned)}
                          className={user.isBanned ? "text-green-600" : "text-amber-600"}
                        >
                          <Ban className="mr-2 h-4 w-4" />
                          {user.isBanned ? "Unban user" : "Ban user"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => handleDeleteClick(user)}
                          className="text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete user
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {optimisticUsers.length === 0 ? (
          <div className="rounded-lg border bg-card dark:bg-[#18181b] p-8 text-center text-muted-foreground">
            No users found.
          </div>
        ) : (
          optimisticUsers.map((user) => (
            <div key={user._id} className="rounded-lg border bg-card dark:bg-[#18181b] p-4 shadow-sm space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatarUrl || ""} alt={user.name} />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium flex items-center gap-1">
                      {user.name}
                      {currentUserId === user._id && (
                        <span className="text-xs text-muted-foreground font-normal ml-1">(You)</span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground break-all">
                      {user.email}
                    </span>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild suppressHydrationWarning>
                    <Button variant="ghost" size="icon" className="-mr-2 h-8 w-8">
                      <span className="sr-only">Open menu</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user._id)}>
                      Copy user ID
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleViewDetails(user)}>
                      <UserCog className="mr-2 h-4 w-4" />
                      View details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Role</DropdownMenuLabel>
                    <DropdownMenuRadioGroup 
                      value={user.role} 
                      onValueChange={(value) => handleRoleChange(user._id, value)}
                    >
                      <DropdownMenuRadioItem value="user">User</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="mentor">Mentor</DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleSendResetLink(user._id)}>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Send password reset
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => handleBanToggle(user._id, !!user.isBanned)}
                      className={user.isBanned ? "text-green-600" : "text-amber-600"}
                    >
                      <Ban className="mr-2 h-4 w-4" />
                      {user.isBanned ? "Unban user" : "Ban user"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteClick(user)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete user
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={getRoleBadgeColor(user.role)}>
                    {user.role}
                  </Badge>
                  {user.isBanned ? (
                    <Badge variant="destructive" className="flex items-center gap-1 text-[10px] px-1.5 h-5">
                      <Ban className="h-3 w-3" />
                      Banned
                    </Badge>
                  ) : hasPermission(user, "view:settings") || user.emailVerified ? (
                    <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 text-[10px] px-1.5 h-5">
                      <CheckCircle2 className="h-3 w-3" />
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex items-center gap-1 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800 text-[10px] px-1.5 h-5">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateFilters({ page: currentPage - 1 })}
              disabled={currentPage <= 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateFilters({ page: currentPage + 1 })}
              disabled={currentPage >= totalPages}
            >
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {selectedUser && (
        <UserDetailsDialog 
          user={selectedUser} 
          open={isDetailsOpen} 
          onOpenChange={setIsDetailsOpen} 
        />
      )}

      <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user
              <span className="font-medium text-foreground"> {userToDelete?.name} </span>
              and remove their data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
