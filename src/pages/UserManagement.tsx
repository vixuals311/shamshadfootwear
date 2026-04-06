import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Search, Plus, User, Shield, MoreHorizontal, Trash2,
  UserCheck, UserX, Loader2, Edit2, Settings2, Clock,
  Monitor, Smartphone, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";
import { UserRole, ROLE_DEFAULT_PAGES, PAGE_METADATA, PageKey } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { format } from "date-fns";

type AppRole = "admin" | "manager" | "biller" | "cashier";

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
  manager: { label: "Manager", color: "status-badge-default" },
  biller: { label: "Biller", color: "status-badge-success" },
  cashier: { label: "Cashier", color: "status-badge-warning" },
  biller_cashier: { label: "Biller/Cashier", color: "status-badge-warning" },
};

// All assignable pages (excluding 'users' which is admin-only)
const ASSIGNABLE_PAGES: PageKey[] = [
  "dashboard", "inventory", "add_product", "price_check", "clients", "bulk_clients", "invoices", 
  "payments", "cheques", "recovery", "city_recovery", "returns", "reports", 
  "audit_logs", "settings",
];

const UserManagement = () => {
  const { user, profile, hasPermission } = useSupabaseAuthContext();
  const { log: auditLog } = useAuditLog();
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

  // Page permissions state
  const [permUser, setPermUser] = useState<UserWithRole | null>(null);
  const [permLoading, setPermLoading] = useState(false);
  const [permPages, setPermPages] = useState<Record<string, boolean>>({});
  const [permSaving, setPermSaving] = useState(false);

  // Session timeout state
  const [timeoutUser, setTimeoutUser] = useState<UserWithRole | null>(null);
  const [timeoutValue, setTimeoutValue] = useState(480);
  const [timeoutSaving, setTimeoutSaving] = useState(false);

  // Max devices state
  const [maxDevicesUser, setMaxDevicesUser] = useState<UserWithRole | null>(null);
  const [maxDevicesValue, setMaxDevicesValue] = useState(3);
  const [maxDevicesSaving, setMaxDevicesSaving] = useState(false);

  // Active sessions state
  const [sessionsUser, setSessionsUser] = useState<UserWithRole | null>(null);
  const [sessionsData, setSessionsData] = useState<any[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "biller" as AppRole,
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles").select("*").order("created_at", { ascending: false });
      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles").select("*");
      if (rolesError) throw rolesError;

      const usersWithRoles: UserWithRole[] = (profiles || []).map((p) => {
        const userRole = roles?.find((r) => r.user_id === p.user_id);
        return {
          id: p.id, user_id: p.user_id, name: p.name, email: p.email,
          phone: p.phone, is_active: p.is_active, created_at: p.created_at,
          role: (userRole?.role as AppRole) || "biller",
        };
      });
      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast({ title: "Error", description: "Failed to load users", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const filteredUsers = users.filter(
    (u) => u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast({ title: "Missing fields", description: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email, password: newUser.password,
        options: { data: { name: newUser.name } },
      });
      if (authError) throw authError;
      if (authData.user) {
        await new Promise(resolve => setTimeout(resolve, 500));
        if (newUser.phone) {
          await supabase.from("profiles").update({ phone: newUser.phone }).eq("user_id", authData.user.id);
        }
        const { error: roleError } = await supabase.from("user_roles")
          .update({ role: newUser.role }).eq("user_id", authData.user.id);
        if (roleError) {
          await supabase.from("user_roles").insert({ user_id: authData.user.id, role: newUser.role });
        }
        await auditLog({
          action: "create",
          entityType: "user",
          entityId: authData.user.id,
          details: { name: newUser.name, email: newUser.email, role: newUser.role },
        });
        toast({ title: "User created", description: `${newUser.name} has been added as a ${newUser.role}` });
        setNewUser({ name: "", email: "", phone: "", password: "", role: "biller" });
        setShowAddConfirm(false);
        setIsAddDialogOpen(false);
        fetchUsers();
      }
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast({ title: "Error", description: error.message || "Failed to create user", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (userId: string) => {
    const targetUser = users.find((u) => u.user_id === userId);
    if (!targetUser) return;
    try {
      const { error } = await supabase.from("profiles").update({ is_active: !targetUser.is_active }).eq("user_id", userId);
      if (error) throw error;
      await auditLog({
        action: "update",
        entityType: "user",
        entityId: userId,
        details: { name: targetUser.name, action: targetUser.is_active ? "deactivated" : "activated" },
      });
      toast({ title: targetUser.is_active ? "User deactivated" : "User activated", description: `${targetUser.name} has been ${targetUser.is_active ? "deactivated" : "activated"}` });
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to update user status", variant: "destructive" });
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserId) return;
    const targetUser = users.find((u) => u.user_id === deleteUserId);
    if (!targetUser) return;
    try {
      const { error } = await supabase.from("profiles").update({ is_active: false }).eq("user_id", deleteUserId);
      if (error) throw error;
      await auditLog({
        action: "delete",
        entityType: "user",
        entityId: deleteUserId,
        details: { name: targetUser.name },
      });
      toast({ title: "User removed", description: `${targetUser.name} has been deactivated` });
      setDeleteUserId(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error", description: "Failed to delete user", variant: "destructive" });
    }
  };

  const handleChangeRole = async () => {
    if (!editRoleUser) return;
    try {
      const { error } = await supabase.from("user_roles").update({ role: editRoleValue }).eq("user_id", editRoleUser.user_id);
      if (error) throw error;
      // Clear custom overrides when role changes so defaults take effect
      await supabase.from("user_page_permissions").delete().eq("user_id", editRoleUser.user_id);
      await auditLog({
        action: "update",
        entityType: "user",
        entityId: editRoleUser.user_id,
        details: { name: editRoleUser.name, previousRole: editRoleUser.role, newRole: editRoleValue },
      });
      toast({ title: "Role updated", description: `${editRoleUser.name}'s role changed to ${editRoleValue}` });
      setEditRoleUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update role", variant: "destructive" });
    }
  };

  // Page permissions management
  const openPagePermissions = async (targetUser: UserWithRole) => {
    setPermUser(targetUser);
    setPermLoading(true);
    try {
      // Get merged page access from DB function
      const { data, error } = await supabase.rpc("get_user_page_access", { _user_id: targetUser.user_id });
      if (error) throw error;
      const accessMap: Record<string, boolean> = {};
      (data || []).forEach((row: { page_key: string; has_access: boolean }) => {
        accessMap[row.page_key] = row.has_access;
      });
      setPermPages(accessMap);
    } catch (error) {
      console.error("Error loading page permissions:", error);
      // Fallback to role defaults
      const defaults: Record<string, boolean> = {};
      ASSIGNABLE_PAGES.forEach(p => {
        defaults[p] = ROLE_DEFAULT_PAGES[targetUser.role]?.includes(p) ?? false;
      });
      setPermPages(defaults);
    } finally {
      setPermLoading(false);
    }
  };

  const handleSavePagePermissions = async () => {
    if (!permUser) return;
    setPermSaving(true);
    try {
      // Delete existing overrides
      await supabase.from("user_page_permissions").delete().eq("user_id", permUser.user_id);
      
      // Calculate which pages differ from role defaults and save as overrides
      const roleDefaults = ROLE_DEFAULT_PAGES[permUser.role] || [];
      const overrides: { user_id: string; page_key: string; has_access: boolean }[] = [];
      
      ASSIGNABLE_PAGES.forEach(pageKey => {
        const defaultAccess = roleDefaults.includes(pageKey);
        const currentAccess = permPages[pageKey] ?? defaultAccess;
        if (currentAccess !== defaultAccess) {
          overrides.push({ user_id: permUser.user_id, page_key: pageKey, has_access: currentAccess });
        }
      });

      if (overrides.length > 0) {
        const { error } = await supabase.from("user_page_permissions").insert(overrides);
        if (error) throw error;
      }

      await auditLog({
        action: "update",
        entityType: "user",
        entityId: permUser.user_id,
        details: { name: permUser.name, action: "updated_page_permissions", overrides: overrides.length },
      });
      toast({ title: "Permissions updated", description: `Page access updated for ${permUser.name}` });
      setPermUser(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save permissions", variant: "destructive" });
    } finally {
      setPermSaving(false);
    }
  };

  const openSessionTimeout = async (targetUser: UserWithRole) => {
    setTimeoutUser(targetUser);
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("session_timeout_minutes")
        .eq("user_id", targetUser.user_id)
        .maybeSingle();
      setTimeoutValue(data?.session_timeout_minutes ?? 480);
    } catch {
      setTimeoutValue(480);
    }
  };

  const handleSaveSessionTimeout = async () => {
    if (!timeoutUser) return;
    setTimeoutSaving(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ session_timeout_minutes: timeoutValue })
        .eq("user_id", timeoutUser.user_id);
      if (error) throw error;
      await auditLog({
        action: "update",
        entityType: "user",
        entityId: timeoutUser.user_id,
        details: { name: timeoutUser.name, action: "updated_session_timeout", timeout_minutes: timeoutValue },
      });
      toast({ title: "Session timeout updated", description: `${timeoutUser.name}'s session timeout set to ${timeoutValue} minutes` });
      setTimeoutUser(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update timeout", variant: "destructive" });
    } finally {
      setTimeoutSaving(false);
    }
  };

  const openMaxDevices = async (targetUser: UserWithRole) => {
    setMaxDevicesUser(targetUser);
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("max_devices")
        .eq("user_id", targetUser.user_id)
        .maybeSingle();
      setMaxDevicesValue(data?.max_devices ?? 3);
    } catch {
      setMaxDevicesValue(3);
    }
  };

  const handleSaveMaxDevices = async () => {
    if (!maxDevicesUser) return;
    setMaxDevicesSaving(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ max_devices: maxDevicesValue })
        .eq("user_id", maxDevicesUser.user_id);
      if (error) throw error;
      await auditLog({
        action: "update",
        entityType: "user",
        entityId: maxDevicesUser.user_id,
        details: { name: maxDevicesUser.name, action: "updated_max_devices", max_devices: maxDevicesValue },
      });
      toast({ title: "Max devices updated", description: `${maxDevicesUser.name} can now use ${maxDevicesValue === 0 ? 'unlimited' : maxDevicesValue} device(s)` });
      setMaxDevicesUser(null);
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update", variant: "destructive" });
    } finally {
      setMaxDevicesSaving(false);
    }
  };

  const openActiveSessions = async (targetUser: UserWithRole) => {
    setSessionsUser(targetUser);
    setSessionsLoading(true);
    try {
      // First, clean up stale sessions (no heartbeat for 2+ minutes)
      const staleThreshold = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      await supabase
        .from("user_sessions")
        .update({ is_active: false })
        .eq("user_id", targetUser.user_id)
        .eq("is_active", true)
        .lt("last_active_at", staleThreshold);

      const { data, error } = await supabase
        .from("user_sessions")
        .select("*")
        .eq("user_id", targetUser.user_id)
        .eq("is_active", true)
        .order("last_active_at", { ascending: false });
      if (error) throw error;
      setSessionsData(data || []);
    } catch {
      setSessionsData([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const handleTerminateSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from("user_sessions")
        .update({ is_active: false })
        .eq("id", sessionId);
      if (error) throw error;
      setSessionsData((prev) => prev.filter((s) => s.id !== sessionId));
      toast({ title: "Session terminated" });
    } catch {
      toast({ title: "Error", description: "Failed to terminate session", variant: "destructive" });
    }
  };

  const handleTerminateAllSessions = async () => {
    if (!sessionsUser) return;
    try {
      const { error } = await supabase
        .from("user_sessions")
        .update({ is_active: false })
        .eq("user_id", sessionsUser.user_id)
        .eq("is_active", true);
      if (error) throw error;
      setSessionsData([]);
      await auditLog({
        action: "update",
        entityType: "user",
        entityId: sessionsUser.user_id,
        details: { name: sessionsUser.name, action: "terminated_all_sessions" },
      });
      toast({ title: "All sessions terminated" });
    } catch {
      toast({ title: "Error", description: "Failed to terminate sessions", variant: "destructive" });
    }
  };

  const parseDeviceInfo = (ua: string | null): { label: string; isMobile: boolean } => {
    if (!ua) return { label: "Unknown Device", isMobile: false };
    const isMobile = /mobile|android|iphone|ipad/i.test(ua);
    const browserMatch = ua.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/i);
    const browser = browserMatch ? browserMatch[1] : "Browser";
    const osMatch = ua.match(/(Windows|Mac OS|Linux|Android|iOS|iPhone OS)[\s/]?[\d._]*/i);
    const os = osMatch ? osMatch[0].replace(/_/g, ".") : "";
    return { label: `${browser} on ${os || (isMobile ? "Mobile" : "Desktop")}`, isMobile };
  };

  if (!hasPermission("canManageUsers")) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <Shield className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You don't have permission to manage users.</p>
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
    <div className="space-y-4 lg:space-y-6">
      {/* Page Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-sm text-muted-foreground">Manage staff accounts, roles & page access</p>
        </div>
        <Button size="sm" className="gap-2 w-full sm:w-auto" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="w-4 h-4" /> Add User
        </Button>
      </motion.div>

      {/* Role Cards */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 lg:mx-0 lg:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible">
        {(["admin", "manager", "biller", "cashier"] as UserRole[]).map((r) => (
          <div key={r} className="bg-card rounded-xl p-4 shadow-card min-w-[200px] lg:min-w-0 shrink-0 lg:shrink">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-primary" />
              <span className={cn("status-badge text-xs", roleLabels[r].color)}>{roleLabels[r].label}</span>
            </div>
            <ul className="text-xs space-y-1 text-muted-foreground">
              {ROLE_DEFAULT_PAGES[r].map(p => (
                <li key={p}>• {PAGE_METADATA[p]?.label || p}</li>
              ))}
            </ul>
          </div>
        ))}
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </motion.div>

      {/* Desktop Table */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card rounded-xl shadow-card hidden lg:block">
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
                  <span className={cn("status-badge", roleLabels[u.role]?.color || "status-badge-default")}>
                    {roleLabels[u.role]?.label || u.role}
                  </span>
                </td>
                <td className="text-muted-foreground">{u.phone || "-"}</td>
                <td>
                  <span className={cn("status-badge", u.is_active ? "status-badge-success" : "status-badge-danger")}>
                    {u.is_active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="text-muted-foreground">{format(new Date(u.created_at), "dd MMM yyyy")}</td>
                <td>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity" disabled={u.user_id === user?.id}>
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2" onClick={() => handleToggleActive(u.user_id)}>
                        {u.is_active ? <><UserX className="w-4 h-4" /> Deactivate</> : <><UserCheck className="w-4 h-4" /> Activate</>}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => { setEditRoleUser(u); setEditRoleValue(u.role); }}>
                        <Edit2 className="w-4 h-4" /> Change Role
                      </DropdownMenuItem>
                      {u.role !== "admin" && (
                        <DropdownMenuItem className="gap-2" onClick={() => openPagePermissions(u)}>
                          <Settings2 className="w-4 h-4" /> Page Access
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem className="gap-2" onClick={() => openSessionTimeout(u)}>
                        <Clock className="w-4 h-4" /> Session Timeout
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => openMaxDevices(u)}>
                        <Monitor className="w-4 h-4" /> Max Devices
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2" onClick={() => openActiveSessions(u)}>
                        <Smartphone className="w-4 h-4" /> Active Sessions
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setDeleteUserId(u.user_id)}>
                        <Trash2 className="w-4 h-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">No users found</td></tr>
            )}
          </tbody>
        </table>
      </motion.div>

      {/* Mobile Card View */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="space-y-3 lg:hidden">
        {filteredUsers.map((u) => (
          <div key={u.id} className="bg-card rounded-xl p-4 shadow-card border border-border/50">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-foreground truncate">{u.name}</p>
                  <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="shrink-0" disabled={u.user_id === user?.id}>
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="gap-2" onClick={() => handleToggleActive(u.user_id)}>
                    {u.is_active ? <><UserX className="w-4 h-4" /> Deactivate</> : <><UserCheck className="w-4 h-4" /> Activate</>}
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2" onClick={() => { setEditRoleUser(u); setEditRoleValue(u.role); }}>
                    <Edit2 className="w-4 h-4" /> Change Role
                  </DropdownMenuItem>
                  {u.role !== "admin" && (
                    <DropdownMenuItem className="gap-2" onClick={() => openPagePermissions(u)}>
                      <Settings2 className="w-4 h-4" /> Page Access
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem className="gap-2" onClick={() => openSessionTimeout(u)}>
                    <Clock className="w-4 h-4" /> Session Timeout
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2" onClick={() => openMaxDevices(u)}>
                    <Monitor className="w-4 h-4" /> Max Devices
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2" onClick={() => openActiveSessions(u)}>
                    <Smartphone className="w-4 h-4" /> Active Sessions
                  </DropdownMenuItem>
                  <DropdownMenuItem className="gap-2 text-destructive" onClick={() => setDeleteUserId(u.user_id)}>
                    <Trash2 className="w-4 h-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Role:</span>
                <span className={cn("ml-2 status-badge", roleLabels[u.role]?.color || "status-badge-default")}>
                  {roleLabels[u.role]?.label || u.role}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <span className={cn("ml-2 status-badge", u.is_active ? "status-badge-success" : "status-badge-danger")}>
                  {u.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="col-span-2 pt-1 text-muted-foreground">
                <span>Phone: </span><span className="text-foreground">{u.phone || "-"}</span>
              </div>
              <div className="col-span-2 text-muted-foreground">
                <span>Created: </span><span className="text-foreground">{format(new Date(u.created_at), "dd MMM yyyy")}</span>
              </div>
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-muted-foreground bg-card rounded-xl">No users found</div>
        )}
      </motion.div>

      {/* Add User Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new staff account with role-based access.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input id="name" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Enter full name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@example.com" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="Min 8 characters" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={newUser.phone} onChange={(e) => {
                const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 11);
                let formatted = raw;
                if (raw.length > 4) {
                  formatted = raw.slice(0, 4) + "-" + raw.slice(4);
                }
                setNewUser({ ...newUser, phone: formatted });
              }} placeholder="0XXX-XXXXXXX" maxLength={12} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={newUser.role} onValueChange={(value: AppRole) => setNewUser({ ...newUser, role: value })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin - Full Access</SelectItem>
                  <SelectItem value="manager">Manager - All except Users</SelectItem>
                  <SelectItem value="biller">Biller - Invoices & Inventory</SelectItem>
                  <SelectItem value="cashier">Cashier - Payments & Recoveries</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => setShowAddConfirm(true)} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Add User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showAddConfirm} onOpenChange={setShowAddConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add User</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to add "{newUser.name}" as a {newUser.role}?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAddUser} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Add User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this user? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Change Role Dialog */}
      <Dialog open={!!editRoleUser} onOpenChange={() => setEditRoleUser(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>Update the role for {editRoleUser?.name}. Custom page overrides will be reset.</DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
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
              <Select value={editRoleValue} onValueChange={(value: AppRole) => setEditRoleValue(value)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Admin</span>
                      <span className="text-xs text-muted-foreground">Full system access including user management</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Manager</span>
                      <span className="text-xs text-muted-foreground">All access except user management</span>
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
                  <span className="font-semibold">{editRoleValue}</span> will update permissions immediately and reset any custom page overrides.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoleUser(null)}>Cancel</Button>
            <Button onClick={handleChangeRole} disabled={editRoleUser?.role === editRoleValue}>Update Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Page Permissions Dialog */}
      <Dialog open={!!permUser} onOpenChange={() => setPermUser(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Page Access - {permUser?.name}</DialogTitle>
            <DialogDescription>
              Customize which pages this {permUser?.role} can access. Toggle overrides role defaults.
            </DialogDescription>
          </DialogHeader>
          {permLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="py-4 space-y-3 max-h-[400px] overflow-y-auto">
              {ASSIGNABLE_PAGES.map(pageKey => {
                const meta = PAGE_METADATA[pageKey];
                const isDefault = ROLE_DEFAULT_PAGES[permUser?.role || "biller"]?.includes(pageKey);
                const isEnabled = permPages[pageKey] ?? isDefault;
                const isOverride = isEnabled !== isDefault;
                
                return (
                  <div key={pageKey} className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    isOverride ? "border-primary/30 bg-primary/5" : "border-border bg-card"
                  )}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm text-foreground">{meta.label}</p>
                        {isOverride && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            Override
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{meta.description}</p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(checked) => {
                        setPermPages(prev => ({ ...prev, [pageKey]: checked }));
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPermUser(null)}>Cancel</Button>
            <Button onClick={handleSavePagePermissions} disabled={permSaving}>
              {permSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Timeout Dialog */}
      <Dialog open={!!timeoutUser} onOpenChange={() => setTimeoutUser(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Session Timeout</DialogTitle>
            <DialogDescription>
              Set the inactivity timeout for {timeoutUser?.name}. They will be auto-logged out after this period of inactivity.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{timeoutUser?.name}</p>
                <p className="text-sm text-muted-foreground">{timeoutUser?.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Inactivity Timeout</Label>
              <Select value={String(timeoutValue)} onValueChange={(v) => setTimeoutValue(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="480">8 hours</SelectItem>
                  <SelectItem value="720">12 hours</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">User will be automatically logged out after this period of inactivity.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTimeoutUser(null)}>Cancel</Button>
            <Button onClick={handleSaveSessionTimeout} disabled={timeoutSaving}>
              {timeoutSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Max Devices Dialog */}
      <Dialog open={!!maxDevicesUser} onOpenChange={() => setMaxDevicesUser(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Max Devices</DialogTitle>
            <DialogDescription>
              Set the maximum number of simultaneous logins for {maxDevicesUser?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">{maxDevicesUser?.name}</p>
                <p className="text-sm text-muted-foreground">{maxDevicesUser?.email}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Maximum Devices</Label>
              <Select value={String(maxDevicesValue)} onValueChange={(v) => setMaxDevicesValue(Number(v))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 device</SelectItem>
                  <SelectItem value="2">2 devices</SelectItem>
                  <SelectItem value="3">3 devices</SelectItem>
                  <SelectItem value="5">5 devices</SelectItem>
                  <SelectItem value="0">Unlimited</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {maxDevicesValue === 0
                  ? "User can log in from unlimited devices."
                  : `User can be logged in on up to ${maxDevicesValue} device(s) simultaneously.`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMaxDevicesUser(null)}>Cancel</Button>
            <Button onClick={handleSaveMaxDevices} disabled={maxDevicesSaving}>
              {maxDevicesSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Sessions Dialog */}
      <Dialog open={!!sessionsUser} onOpenChange={() => setSessionsUser(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Active Sessions — {sessionsUser?.name}</DialogTitle>
            <DialogDescription>
              View and manage active device sessions for this user.
            </DialogDescription>
          </DialogHeader>
          {sessionsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : sessionsData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No active sessions</div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto py-2">
              {sessionsData.map((s) => {
                const { label, isMobile } = parseDeviceInfo(s.device_info);
                return (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0">
                      {isMobile
                        ? <Smartphone className="w-5 h-5 text-muted-foreground" />
                        : <Monitor className="w-5 h-5 text-muted-foreground" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{label}</p>
                      <p className="text-xs text-muted-foreground">
                        Last active: {format(new Date(s.last_active_at), "dd MMM, h:mm a")}
                      </p>
                      {s.ip_address && (
                        <p className="text-xs text-muted-foreground">IP: {s.ip_address}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-destructive hover:text-destructive"
                      onClick={() => handleTerminateSession(s.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionsUser(null)}>Close</Button>
            {sessionsData.length > 0 && (
              <Button variant="destructive" onClick={handleTerminateAllSessions}>
                Terminate All
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default UserManagement;
