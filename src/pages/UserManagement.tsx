import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Plus,
  User,
  Shield,
  Mail,
  Phone,
  MoreHorizontal,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
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
import { useAuth } from "@/context/AuthContext";
import { useAudit } from "@/context/AuditContext";
import { UserRole, ROLE_PERMISSIONS } from "@/types";
import { format } from "date-fns";

const roleLabels: Record<UserRole, { label: string; color: string }> = {
  admin: { label: "Admin", color: "status-badge-danger" },
  biller: { label: "Biller", color: "status-badge-success" },
  cashier: { label: "Cashier", color: "status-badge-warning" },
};

const UserManagement = () => {
  const { currentUser, users, createUser, updateUser, deleteUser, hasPermission } = useAuth();
  const { addLog } = useAudit();
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [showAddConfirm, setShowAddConfirm] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    role: "biller" as UserRole,
  });

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = () => {
    if (newUser.name && newUser.email) {
      const success = createUser({
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        role: newUser.role,
        isActive: true,
      });

      if (success && currentUser) {
        addLog(
          currentUser.id,
          currentUser.name,
          "create",
          "user",
          undefined,
          newUser.name,
          `Created new ${newUser.role} user`
        );
        setNewUser({ name: "", email: "", phone: "", role: "biller" });
        setShowAddConfirm(false);
        setIsAddDialogOpen(false);
      }
    }
  };

  const handleToggleActive = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (user && currentUser) {
      updateUser(userId, { isActive: !user.isActive });
      addLog(
        currentUser.id,
        currentUser.name,
        "update",
        "user",
        userId,
        user.name,
        `${user.isActive ? "Deactivated" : "Activated"} user`
      );
    }
  };

  const handleDeleteUser = () => {
    if (deleteUserId && currentUser) {
      const user = users.find((u) => u.id === deleteUserId);
      const success = deleteUser(deleteUserId);
      if (success && user) {
        addLog(
          currentUser.id,
          currentUser.name,
          "delete",
          "user",
          deleteUserId,
          user.name,
          "Deleted user"
        );
      }
      setDeleteUserId(null);
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
            {filteredUsers.map((user) => (
              <tr key={user.id} className="group">
                <td>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={cn("status-badge", roleLabels[user.role].color)}>
                    {roleLabels[user.role].label}
                  </span>
                </td>
                <td className="text-muted-foreground">{user.phone || "-"}</td>
                <td>
                  <span
                    className={cn(
                      "status-badge",
                      user.isActive ? "status-badge-success" : "status-badge-danger"
                    )}
                  >
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-muted-foreground">
                  {format(user.createdAt, "dd MMM yyyy")}
                </td>
                <td>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        disabled={user.id === currentUser?.id}
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="gap-2"
                        onClick={() => handleToggleActive(user.id)}
                      >
                        {user.isActive ? (
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
                        className="gap-2 text-destructive"
                        onClick={() => setDeleteUserId(user.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
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
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@example.com"
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
                onValueChange={(value: UserRole) =>
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
            <Button onClick={() => setShowAddConfirm(true)}>Add User</Button>
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
            <AlertDialogAction onClick={handleAddUser}>Add User</AlertDialogAction>
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
    </div>
  );
};

export default UserManagement;
