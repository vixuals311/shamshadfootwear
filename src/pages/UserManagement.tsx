import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  User,
  Shield,
  MoreHorizontal,
  Trash2,
  UserCheck,
  UserX,
  Loader2,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";
import { useAudit } from "@/context/AuditContext";
import { UserRole, ROLE_PERMISSIONS } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

type AppRole = "admin" | "biller" | "cashier";

interface UserWithRole {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  role: AppRole;
}

const roleLabels: Record<UserRole, { label: string; color: string }> = {
  admin: { label: "Admin", color: "status-badge-danger" },
  biller: { label: "Biller", color: "status-badge-success" },
  cashier: { label: "Cashier", color: "status-badge-warning" },
};

const UserManagement = () => {
  const { user, profile, hasPermission } = useSupabaseAuthContext();
  const { addLog } = useAudit();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [showAddConfirm, setShowAddConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit role state
  const [editRoleUser, setEditRoleUser] = useState<UserWithRole | null>(null);
  const [editRoleValue, setEditRoleValue] = useState<AppRole>("biller");

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "biller" as AppRole,
  });

  // Fetch all users with their roles
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch roles
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("*");

      if (rolesError) throw rolesError;

      // Combine profiles with roles
      const usersWithRoles: UserWithRole[] = (profiles || []).map((p) => {
        const userRole = roles?.find((r) => r.user_id === p.user_id);
        return {
          id: p.id,
          user_id: p.user_id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          is_active: p.is_active,
          created_at: p.created_at,
          role: (userRole?.role as AppRole) || "biller",
        };
      });

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({
        title: "Missing fields",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Sign up the new user (they will be auto-confirmed since we disabled email confirmation)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            name: newUser.name,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Wait a moment for triggers to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Update the profile with phone if provided
        if (newUser.phone) {
          await supabase
            .from("profiles")
            .update({ phone: newUser.phone })
            .eq("user_id", authData.user.id);
        }

        // Update the user's role (trigger creates default 'biller', so we update if different)
        const { error: roleError } = await supabase
          .from("user_roles")
          .update({ role: newUser.role })
          .eq("user_id", authData.user.id);

        // If update failed (no row), try insert
        if (roleError) {
          await supabase
            .from("user_roles")
            .insert({ user_id: authData.user.id, role: newUser.role });
        }

        if (profile) {
          addLog(
            user?.id || "",
            profile.name,
            "create",
            "user",
            undefined,
            newUser.name,
            `Created new ${newUser.role} user`
          );
        }

        toast({
          title: "User created",
          description: `${newUser.name} has been added as a ${newUser.role}`,
        });

        setNewUser({ name: "", email: "", phone: "", password: "", role: "biller" });
        setShowAddConfirm(false);
        setIsAddDialogOpen(false);
        fetchUsers();
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: string) => {
    const targetUser = users.find((u) => u.user_id === userId);
    if (!targetUser) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !targetUser.is_active })
        .eq("user_id", userId);

      if (error) throw error;

      if (profile) {
        addLog(
          user?.id || "",
          profile.name,
          "update",
          "user",
          userId,
          targetUser.name,
          `${targetUser.is_active ? "Deactivated" : "Activated"} user`
        );
      }

      toast({
        title: targetUser.is_active ? "User deactivated" : "User activated",
        description: `${targetUser.name} has been ${targetUser.is_active ? "deactivated" : "activated"}`,
      });

      fetchUsers();
    } catch (error: any) {
      console.error("Error toggling user status:", error);
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;

    const targetUser = users.find((u) => u.user_id === deleteUserId);
    if (!targetUser) return;

    try {
      // Note: We can't delete from auth.users directly, so we just deactivate
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: false })
        .eq("user_id", deleteUserId);

      if (error) throw error;

      if (profile) {
        addLog(
          user?.id || "",
          profile.name,
          "delete",
          "user",
          deleteUserId,
          targetUser.name,
          "Deactivated user (marked as deleted)"
        );
      }

      toast({
        title: "User removed",
        description: `${targetUser.name} has been deactivated`,
      });

      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive",
      });
    }
  };

  const handleChangeRole = async () => {
    if (!editRoleUser) return;

    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: editRoleValue })
        .eq("user_id", editRoleUser.user_id);

      if (error) throw error;

      if (profile) {
        addLog(
          user?.id || "",
          profile.name,
          "update",
          "user",
          editRoleUser.user_id,
          editRoleUser.name,
          `Changed role from ${editRoleUser.role} to ${editRoleValue}`
        );
      }

      toast({
        title: "Role updated",
        description: `${editRoleUser.name}'s role changed to ${editRoleValue}`,
      });

      setEditRoleUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    }
  };

  if (!hasPermission("canManageUsers")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to manage users.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">
            Manage staff accounts and permissions
          </p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4" />
          Add User
        </Button>
      </motion.div>

      {/* Role Permissions Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {(["admin", "biller", "cashier"] as UserRole[]).map((role) => (
          <div key={role} className="bg-card rounded-xl p-4 shadow-card">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-5 h-5 text-primary" />
              <span className={cn("status-badge", roleLabels[role].color)}>
                {roleLabels[role].label}
              </span>
            </div>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {ROLE_PERMISSIONS[role].canManageUsers && <li>• Manage users</li>}
              {ROLE_PERMISSIONS[role].canManageSettings && <li>• Manage settings</li>}
              {ROLE_PERMISSIONS[role].canViewReports && <li>• View reports</li>}
              {ROLE_PERMISSIONS[role].canManageInventory && <li>• Manage inventory</li>}
              {ROLE_PERMISSIONS[role].canManageClients && <li>• Manage clients</li>}
              {ROLE_PERMISSIONS[role].canCreateInvoices && <li>• Create invoices</li>}
              {ROLE_PERMISSIONS[role].canRecordPayments && <li>• Record payments</li>}
              {ROLE_PERMISSIONS[role].canManageRecoveries && <li>• Manage recoveries</li>}
            </ul>
          </div>
        ))}
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </motion.div>

      {/* Users Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card rounded-xl shadow-card overflow-hidden"
      >
        <table className="data-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Created</th>
              <th className="w-12"></th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id} className="group">
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={cn("status-badge", roleLabels[u.role].color)}>
                    {roleLabels[u.role].label}
                  </span>
                </td>
                <td className="text-muted-foreground">{u.phone || "-"}</td>
                <td>
                  <span
                    className={cn(
                      "status-badge",
                      u.is_active ? "status-badge-success" : "status-badge-danger"
                    )}
                  >
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-muted-foreground">
                  {format(new Date(u.created_at), "dd MMM yyyy")}
                </td>
                <td>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={u.user_id === user?.id}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="gap-2"
                        onClick={() => handleToggleActive(u.user_id)}
                      >
                        {u.is_active ? (
                          <>
                            <UserX className="w-4 h-4" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2"
                        onClick={() => {
                          setEditRoleUser(u);
                          setEditRoleValue(u.role);
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                        Change Role
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="gap-2 text-destructive"
                        onClick={() => setDeleteUserId(u.user_id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-8 text-muted-foreground">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new staff account with role-based access.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Min 8 characters"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                placeholder="+92 3XX XXXXXXX"
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value: AppRole) =>
                  setNewUser({ ...newUser, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full Access</SelectItem>
                  <SelectItem value="biller">Biller - Invoices & Inventory</SelectItem>
                  <SelectItem value="cashier">Cashier - Payments & Recoveries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowAddConfirm(true)} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showAddConfirm} onOpenChange={setShowAddConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to add "{newUser.name}" as a {newUser.role}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddUser} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role Dialog */}
      <Dialog open={!!editRoleUser} onOpenChange={() => setEditRoleUser(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              Update the role for {editRoleUser?.name}. This will change their permissions.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{editRoleUser?.name}</p>
                  <p className="text-sm text-muted-foreground">{editRoleUser?.email}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Select New Role</Label>
                <Select
                  value={editRoleValue}
                  onValueChange={(value: AppRole) => setEditRoleValue(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Admin</span>
                        <span className="text-xs text-muted-foreground">Full system access</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="biller">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Biller</span>
                        <span className="text-xs text-muted-foreground">Invoices, inventory & clients</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="cashier">
                      <div className="flex flex-col items-start">
                        <span className="font-medium">Cashier</span>
                        <span className="text-xs text-muted-foreground">Payments & recoveries</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {editRoleUser?.role !== editRoleValue && (
                <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                  <p className="text-sm">
                    <span className="font-medium">Note:</span> Changing from{" "}
                    <span className="font-semibold">{editRoleUser?.role}</span> to{" "}
                    <span className="font-semibold">{editRoleValue}</span> will update this user's permissions immediately.
                  </p>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleUser(null)}>
              Cancel
            </Button>
            <Button 
              onClick={handleChangeRole} 
              disabled={editRoleUser?.role === editRoleValue}
            >
              Update Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
