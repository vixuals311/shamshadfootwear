import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import {
  User,
  Bell,
  Shield,
  Building2,
  Database,
  Plus,
  Trash2,
  Loader2,
  CreditCard,
  Ruler,
  GripVertical,
  Tag,
  Save,
  KeyRound,
  Clock,
  Smartphone,
  Home,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";
import { DataBackupRestore } from "@/components/admin/DataBackupRestore";

interface PaymentAccount {
  id: string;
  name: string;
}

interface ProductCategory {
  id: string;
  name: string;
  display_order: number;
}

interface DefaultSizeRange {
  id: string;
  category: string;
  size_range: string;
  pairs_per_bundle: number;
  display_order: number;
}

interface ProfileSettings {
  name: string;
  email: string;
  phone: string;
}

interface BusinessSettings {
  businessName: string;
  taxId: string;
  address: string;
}

interface NotificationSettings {
  lowStockAlerts: boolean;
  paymentReminders: boolean;
  newClientNotifications: boolean;
  emailReports: boolean;
}

interface SecuritySettings {
  requirePinOnLogin: boolean;
  adminPin: string;
  sessionTimeoutMinutes: number;
  enforceSingleSession: boolean;
}

interface DefaultLandingPages {
  admin: string;
  manager: string;
  biller: string;
  cashier: string;
}

const LANDING_PAGE_OPTIONS = [
  { value: "/", label: "Dashboard" },
  { value: "/inventory", label: "Inventory" },
  { value: "/clients", label: "Clients" },
  { value: "/invoices", label: "Invoices" },
  { value: "/payments", label: "Payments" },
  { value: "/recovery", label: "Recovery" },
  { value: "/returns", label: "Returns" },
  { value: "/reports", label: "Reports" },
];

const Settings = () => {
  const { toast } = useToast();
  const { log } = useAuditLog();
  const { profile, role, hasPermission, user } = useSupabaseAuthContext();
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // Payment accounts state
  const [accounts, setAccounts] = useState<PaymentAccount[]>([]);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState("");
  const [deleteAccountId, setDeleteAccountId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Product categories state
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteCategoryId, setDeleteCategoryId] = useState<string | null>(null);
  const [deleteCategoryName, setDeleteCategoryName] = useState("");

  // Size ranges state
  const [sizeRanges, setSizeRanges] = useState<DefaultSizeRange[]>([]);
  const [isAddSizeRangeOpen, setIsAddSizeRangeOpen] = useState(false);
  const [newSizeRange, setNewSizeRange] = useState({
    category: "",
    size_range: "",
    pairs_per_bundle: 6,
  });
  const [deleteSizeRangeId, setDeleteSizeRangeId] = useState<string | null>(null);
  const [draggedSizeRange, setDraggedSizeRange] = useState<string | null>(null);

  // Profile settings state (admin only)
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({
    name: "",
    email: "",
    phone: "",
  });
  const [initialProfileSettings, setInitialProfileSettings] = useState<ProfileSettings>({
    name: "",
    email: "",
    phone: "",
  });

  // Business settings state
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>({
    businessName: "BillFlow Inc.",
    taxId: "",
    address: "",
  });
  const [initialBusinessSettings, setInitialBusinessSettings] = useState<BusinessSettings>({
    businessName: "BillFlow Inc.",
    taxId: "",
    address: "",
  });

  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    lowStockAlerts: true,
    paymentReminders: true,
    newClientNotifications: false,
    emailReports: true,
  });
  const [initialNotificationSettings, setInitialNotificationSettings] = useState<NotificationSettings>({
    lowStockAlerts: true,
    paymentReminders: true,
    newClientNotifications: false,
    emailReports: true,
  });

  // Security settings state (admin only)
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    requirePinOnLogin: false,
    adminPin: "",
    sessionTimeoutMinutes: 480,
    enforceSingleSession: true,
  });
  const [initialSecuritySettings, setInitialSecuritySettings] = useState<SecuritySettings>({
    requirePinOnLogin: false,
    adminPin: "",
    sessionTimeoutMinutes: 480,
    enforceSingleSession: true,
  });

  const isAdmin = role === "admin";

  // Default landing pages state (admin only)
  const [landingPages, setLandingPages] = useState<DefaultLandingPages>({
    admin: "/",
    manager: "/",
    biller: "/clients",
    cashier: "/",
  });
  const [initialLandingPages, setInitialLandingPages] = useState<DefaultLandingPages>({
    admin: "/",
    manager: "/",
    biller: "/clients",
    cashier: "/",
  });

  // Online billing toggle (admin only)
  const [onlineBillingEnabled, setOnlineBillingEnabled] = useState(true);
  const [initialOnlineBillingEnabled, setInitialOnlineBillingEnabled] = useState(true);

  // Client portal session timeout (admin only)
  const [portalTimeout, setPortalTimeout] = useState(10);
  const [initialPortalTimeout, setInitialPortalTimeout] = useState(10);

  // Check for unsaved changes
  useEffect(() => {
    const profileChanged = isAdmin && JSON.stringify(profileSettings) !== JSON.stringify(initialProfileSettings);
    const businessChanged = JSON.stringify(businessSettings) !== JSON.stringify(initialBusinessSettings);
    const notificationChanged = JSON.stringify(notificationSettings) !== JSON.stringify(initialNotificationSettings);
    const securityChanged = isAdmin && JSON.stringify(securitySettings) !== JSON.stringify(initialSecuritySettings);
    const landingChanged = isAdmin && JSON.stringify(landingPages) !== JSON.stringify(initialLandingPages);
    const billingChanged = isAdmin && onlineBillingEnabled !== initialOnlineBillingEnabled;
    
    setHasUnsavedChanges(profileChanged || businessChanged || notificationChanged || securityChanged || landingChanged || billingChanged);
  }, [profileSettings, businessSettings, notificationSettings, securitySettings, landingPages, onlineBillingEnabled, initialProfileSettings, initialBusinessSettings, initialNotificationSettings, initialSecuritySettings, initialLandingPages, initialOnlineBillingEnabled, isAdmin]);

  // Fetch data
  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch payment accounts
      const { data: accountsData, error: accountsError } = await supabase
        .from("payment_accounts")
        .select("*")
        .order("name");

      if (accountsError) throw accountsError;
      setAccounts(
        (accountsData || []).map((a) => ({
          id: a.id,
          name: a.name,
        }))
      );

      // Fetch product categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("product_categories")
        .select("*")
        .order("display_order");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Fetch size ranges
      const { data: sizeData, error: sizeError } = await supabase
        .from("default_size_ranges")
        .select("*")
        .order("category")
        .order("display_order");

      if (sizeError) throw sizeError;
      setSizeRanges(sizeData || []);

      // Set profile settings from context
      if (profile) {
        const profileData = {
          name: profile.name || "",
          email: profile.email || "",
          phone: profile.phone || "",
        };
        setProfileSettings(profileData);
        setInitialProfileSettings(profileData);
      }

      // Fetch application settings
      const { data: appSettings } = await supabase
        .from("application_settings")
        .select("*");

      if (appSettings) {
        const businessSetting = appSettings.find(s => s.setting_key === "business_info");
        const notificationSetting = appSettings.find(s => s.setting_key === "notifications");
        
        if (businessSetting?.setting_value) {
          const biz = businessSetting.setting_value as Record<string, string>;
          const bizData = {
            businessName: biz.businessName || "BillFlow Inc.",
            taxId: biz.taxId || "",
            address: biz.address || "",
          };
          setBusinessSettings(bizData);
          setInitialBusinessSettings(bizData);
        }
        
        if (notificationSetting?.setting_value) {
          const notif = notificationSetting.setting_value as Record<string, boolean>;
          const notifData = {
            lowStockAlerts: notif.lowStockAlerts ?? true,
            paymentReminders: notif.paymentReminders ?? true,
            newClientNotifications: notif.newClientNotifications ?? false,
            emailReports: notif.emailReports ?? true,
          };
          setNotificationSettings(notifData);
          setInitialNotificationSettings(notifData);
        }

        // Fetch landing pages setting
        const landingSetting = appSettings.find(s => s.setting_key === "default_landing_pages");
        if (landingSetting?.setting_value) {
          const lp = landingSetting.setting_value as Record<string, string>;
          const lpData = {
            admin: lp.admin || "/",
            manager: lp.manager || "/",
            biller: lp.biller || "/clients",
            cashier: lp.cashier || "/",
          };
          setLandingPages(lpData);
          setInitialLandingPages(lpData);
        }

        // Fetch online billing setting
        const billingSetting = appSettings.find(s => s.setting_key === "online_billing_enabled");
        if (billingSetting?.setting_value !== undefined) {
          const enabled = (billingSetting.setting_value as any) === true || billingSetting.setting_value === "true";
          setOnlineBillingEnabled(enabled);
          setInitialOnlineBillingEnabled(enabled);
        }
      }

      // Fetch admin security settings if admin
      if (isAdmin && user) {
        const { data: secData } = await supabase
          .from("admin_security_settings")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (secData) {
          const secSettings = {
            requirePinOnLogin: secData.require_pin_on_login || false,
            adminPin: "", // Don't expose the hash
            sessionTimeoutMinutes: secData.session_timeout_minutes || 480,
            enforceSingleSession: true,
          };
          setSecuritySettings(secSettings);
          setInitialSecuritySettings({ ...secSettings });
        }
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [profile, isAdmin, user]);

  // Universal save function
  const handleSaveAllSettings = async () => {
    if (!hasUnsavedChanges) return;

    setIsSaving(true);
    try {
      // Save profile (admin only)
      if (isAdmin && JSON.stringify(profileSettings) !== JSON.stringify(initialProfileSettings)) {
        const { error } = await supabase
          .from("profiles")
          .update({
            name: profileSettings.name,
            phone: profileSettings.phone,
          })
          .eq("user_id", user?.id);
        if (error) throw error;
      }

      // Save business settings
      if (JSON.stringify(businessSettings) !== JSON.stringify(initialBusinessSettings)) {
        // Check if setting exists
        const { data: existingBiz } = await supabase
          .from("application_settings")
          .select("id")
          .eq("setting_key", "business_info")
          .maybeSingle();
        
        if (existingBiz) {
          const { error } = await supabase
            .from("application_settings")
            .update({
              setting_value: JSON.parse(JSON.stringify(businessSettings)),
              updated_by: user?.id,
            })
            .eq("setting_key", "business_info");
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("application_settings")
            .insert([{
              setting_key: "business_info",
              setting_value: JSON.parse(JSON.stringify(businessSettings)),
              updated_by: user?.id,
            }]);
          if (error) throw error;
        }
      }

      // Save notification settings
      if (JSON.stringify(notificationSettings) !== JSON.stringify(initialNotificationSettings)) {
        // Check if setting exists
        const { data: existingNotif } = await supabase
          .from("application_settings")
          .select("id")
          .eq("setting_key", "notifications")
          .maybeSingle();
        
        if (existingNotif) {
          const { error } = await supabase
            .from("application_settings")
            .update({
              setting_value: JSON.parse(JSON.stringify(notificationSettings)),
              updated_by: user?.id,
            })
            .eq("setting_key", "notifications");
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("application_settings")
            .insert([{
              setting_key: "notifications",
              setting_value: JSON.parse(JSON.stringify(notificationSettings)),
              updated_by: user?.id,
            }]);
          if (error) throw error;
        }
      }

      // Save security settings (admin only)
      if (isAdmin && JSON.stringify(securitySettings) !== JSON.stringify(initialSecuritySettings)) {
        // Check if setting exists
        const { data: existingSec } = await supabase
          .from("admin_security_settings")
          .select("id")
          .eq("user_id", user?.id)
          .maybeSingle();
        
        if (existingSec) {
          const updateData: {
            require_pin_on_login: boolean;
            session_timeout_minutes: number;
            admin_pin_hash?: string;
          } = {
            require_pin_on_login: securitySettings.requirePinOnLogin,
            session_timeout_minutes: securitySettings.sessionTimeoutMinutes,
          };
          
          if (securitySettings.adminPin && securitySettings.adminPin.length >= 4) {
            updateData.admin_pin_hash = securitySettings.adminPin;
          }
          
          const { error } = await supabase
            .from("admin_security_settings")
            .update(updateData)
            .eq("user_id", user?.id);
          if (error) throw error;
        } else {
          const insertData: {
            user_id: string;
            require_pin_on_login: boolean;
            session_timeout_minutes: number;
            admin_pin_hash?: string;
          } = {
            user_id: user?.id || "",
            require_pin_on_login: securitySettings.requirePinOnLogin,
            session_timeout_minutes: securitySettings.sessionTimeoutMinutes,
          };
          
          if (securitySettings.adminPin && securitySettings.adminPin.length >= 4) {
            insertData.admin_pin_hash = securitySettings.adminPin;
          }
          
          const { error } = await supabase
            .from("admin_security_settings")
            .insert([insertData]);
          if (error) throw error;
        }
      }

      // Save landing pages (admin only)
      if (isAdmin && JSON.stringify(landingPages) !== JSON.stringify(initialLandingPages)) {
        const { data: existingLp } = await supabase
          .from("application_settings")
          .select("id")
          .eq("setting_key", "default_landing_pages")
          .maybeSingle();
        
        if (existingLp) {
          const { error } = await supabase
            .from("application_settings")
            .update({
              setting_value: JSON.parse(JSON.stringify(landingPages)),
              updated_by: user?.id,
            })
            .eq("setting_key", "default_landing_pages");
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("application_settings")
            .insert([{
              setting_key: "default_landing_pages",
              setting_value: JSON.parse(JSON.stringify(landingPages)),
              updated_by: user?.id,
            }]);
          if (error) throw error;
        }
      }

      // Save online billing setting (admin only)
      if (isAdmin && onlineBillingEnabled !== initialOnlineBillingEnabled) {
        const { data: existingBilling } = await supabase
          .from("application_settings")
          .select("id")
          .eq("setting_key", "online_billing_enabled")
          .maybeSingle();
        
        if (existingBilling) {
          const { error } = await supabase
            .from("application_settings")
            .update({
              setting_value: JSON.parse(JSON.stringify(onlineBillingEnabled)),
              updated_by: user?.id,
            })
            .eq("setting_key", "online_billing_enabled");
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("application_settings")
            .insert([{
              setting_key: "online_billing_enabled",
              setting_value: JSON.parse(JSON.stringify(onlineBillingEnabled)),
              updated_by: user?.id,
            }]);
          if (error) throw error;
        }
        window.dispatchEvent(new Event("online-billing-changed"));
      }

      // Update initial values to reflect saved state
      setInitialProfileSettings({ ...profileSettings });
      setInitialBusinessSettings({ ...businessSettings });
      setInitialNotificationSettings({ ...notificationSettings });
      setInitialSecuritySettings({ ...securitySettings, adminPin: "" });
      setSecuritySettings(prev => ({ ...prev, adminPin: "" }));
      setInitialLandingPages({ ...landingPages });
      setInitialOnlineBillingEnabled(onlineBillingEnabled);

      await log({
        action: "update",
        entityType: "settings",
        details: { 
          sections: [
            ...(JSON.stringify(profileSettings) !== JSON.stringify(initialProfileSettings) ? ["profile"] : []),
            ...(JSON.stringify(businessSettings) !== JSON.stringify(initialBusinessSettings) ? ["business"] : []),
            ...(JSON.stringify(notificationSettings) !== JSON.stringify(initialNotificationSettings) ? ["notifications"] : []),
            ...(JSON.stringify(securitySettings) !== JSON.stringify(initialSecuritySettings) ? ["security"] : []),
            ...(JSON.stringify(landingPages) !== JSON.stringify(initialLandingPages) ? ["landing_pages"] : []),
            ...(onlineBillingEnabled !== initialOnlineBillingEnabled ? ["online_billing"] : []),
          ],
        },
      });

      toast({
        title: "Success",
        description: "All settings saved successfully",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Payment account handlers
  const handleAddAccount = async () => {
    if (!newAccountName.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("payment_accounts").insert({
        name: newAccountName.trim(),
      });

      if (error) throw error;

      await log({ action: "create", entityType: "settings", details: { type: "payment_account", name: newAccountName.trim() } });
      toast({ title: "Success", description: "Bank account added" });
      setNewAccountName("");
      setIsAddAccountOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error adding account:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add account",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deleteAccountId) return;

    try {
      const { error } = await supabase
        .from("payment_accounts")
        .delete()
        .eq("id", deleteAccountId);

      if (error) throw error;

      await log({ action: "delete", entityType: "settings", entityId: deleteAccountId, details: { type: "payment_account" } });
      toast({ title: "Success", description: "Bank account deleted" });
      setDeleteAccountId(null);
      fetchData();
    } catch (error: any) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete account",
        variant: "destructive",
      });
    }
  };

  // Category handlers
  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    setIsSubmitting(true);
    try {
      const maxOrder = Math.max(...categories.map(c => c.display_order), 0);
      const { error } = await supabase.from("product_categories").insert({
        name: newCategoryName.trim().toLowerCase(),
        display_order: maxOrder + 1,
      });

      if (error) throw error;

      await log({ action: "create", entityType: "settings", details: { type: "product_category", name: newCategoryName.trim() } });
      toast({ title: "Success", description: "Category added" });
      setNewCategoryName("");
      setIsAddCategoryOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error adding category:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add category",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategoryId) return;

    try {
      // First delete all size ranges for this category
      await supabase
        .from("default_size_ranges")
        .delete()
        .eq("category", deleteCategoryName as "men" | "women" | "children" | "unisex");

      const { error } = await supabase
        .from("product_categories")
        .delete()
        .eq("id", deleteCategoryId);

      if (error) throw error;

      await log({ action: "delete", entityType: "settings", entityId: deleteCategoryId, details: { type: "product_category", name: deleteCategoryName } });
      toast({ title: "Success", description: "Category deleted" });
      setDeleteCategoryId(null);
      setDeleteCategoryName("");
      fetchData();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  // Size range handlers
  const handleAddSizeRange = async () => {
    if (!newSizeRange.size_range.trim() || !newSizeRange.category) return;

    setIsSubmitting(true);
    try {
      const categorySizeRanges = sizeRanges.filter(sr => sr.category === newSizeRange.category);
      const maxOrder = Math.max(...categorySizeRanges.map(sr => sr.display_order), 0);
      
      const { error } = await supabase.from("default_size_ranges").insert({
        category: newSizeRange.category as "men" | "women" | "children" | "unisex",
        size_range: newSizeRange.size_range.trim(),
        pairs_per_bundle: newSizeRange.pairs_per_bundle,
        display_order: maxOrder + 1,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Size range added" });
      setNewSizeRange({ category: categories[0]?.name || "", size_range: "", pairs_per_bundle: 6 });
      setIsAddSizeRangeOpen(false);
      fetchData();
    } catch (error: any) {
      console.error("Error adding size range:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add size range",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSizeRange = async () => {
    if (!deleteSizeRangeId) return;

    try {
      const { error } = await supabase
        .from("default_size_ranges")
        .delete()
        .eq("id", deleteSizeRangeId);

      if (error) throw error;

      toast({ title: "Success", description: "Size range deleted" });
      setDeleteSizeRangeId(null);
      fetchData();
    } catch (error: any) {
      console.error("Error deleting size range:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete size range",
        variant: "destructive",
      });
    }
  };

  // Drag and drop for size ranges
  const handleDragStart = (id: string) => {
    setDraggedSizeRange(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string, category: string) => {
    e.preventDefault();
    if (!draggedSizeRange || draggedSizeRange === targetId) return;

    const draggedItem = sizeRanges.find(sr => sr.id === draggedSizeRange);
    if (!draggedItem || draggedItem.category !== category) return;

    setSizeRanges(prev => {
      const categorySizeRanges = prev.filter(sr => sr.category === category);
      const otherSizeRanges = prev.filter(sr => sr.category !== category);
      
      const dragIdx = categorySizeRanges.findIndex(sr => sr.id === draggedSizeRange);
      const targetIdx = categorySizeRanges.findIndex(sr => sr.id === targetId);
      
      if (dragIdx === -1 || targetIdx === -1) return prev;

      const newOrder = [...categorySizeRanges];
      const [dragged] = newOrder.splice(dragIdx, 1);
      newOrder.splice(targetIdx, 0, dragged);

      return [...otherSizeRanges, ...newOrder];
    });
  };

  const handleDragEnd = async () => {
    if (!draggedSizeRange) return;

    const draggedItem = sizeRanges.find(sr => sr.id === draggedSizeRange);
    if (!draggedItem) return;

    const categorySizeRanges = sizeRanges.filter(sr => sr.category === draggedItem.category);
    
    // Update display_order for all items in this category
    try {
      for (let i = 0; i < categorySizeRanges.length; i++) {
        await supabase
          .from("default_size_ranges")
          .update({ display_order: i + 1 })
          .eq("id", categorySizeRanges[i].id);
      }
      toast({ title: "Success", description: "Order updated" });
    } catch (error) {
      console.error("Error updating order:", error);
      toast({
        title: "Error",
        description: "Failed to save order",
        variant: "destructive",
      });
      fetchData();
    }

    setDraggedSizeRange(null);
  };

  // Group size ranges by category
  const sizeRangesByCategory = categories.reduce((acc, cat) => {
    acc[cat.name] = sizeRanges.filter((sr) => sr.category === cat.name);
    return acc;
  }, {} as Record<string, DefaultSizeRange[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-24">
      {/* Page Header with Universal Save Button */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-2xl font-bold text-foreground">Settings</h2>
          <p className="text-muted-foreground">
            {isAdmin ? "Manage system settings and preferences" : "View notification preferences"}
          </p>
        </div>
        {hasUnsavedChanges && (
          <Button 
            onClick={handleSaveAllSettings} 
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Save All Changes
          </Button>
        )}
      </motion.div>

      {/* Profile Section - Admin Only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-xl p-6 shadow-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Profile</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                value={profileSettings.name}
                onChange={(e) => setProfileSettings(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={profileSettings.email}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input 
                id="phone" 
                value={profileSettings.phone}
                onChange={(e) => setProfileSettings(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={role || "User"} disabled className="bg-muted capitalize" />
            </div>
          </div>
        </motion.div>
      )}

      {/* Bank Details Section - Admin Only */}
      {hasPermission("canManageSettings") && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card rounded-xl p-6 shadow-card"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Bank Details / Payment Accounts</h3>
            </div>
            <Button size="sm" className="gap-2" onClick={() => setIsAddAccountOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Account
            </Button>
          </div>
          <div className="space-y-3">
            {accounts.length > 0 ? (
              accounts.map((account) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-primary" />
                    <span className="font-medium">{account.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteAccountId(account.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No bank accounts configured</p>
                <p className="text-sm">Add your first bank account to get started</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Product Categories Section - Admin Only */}
      {hasPermission("canManageSettings") && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="bg-card rounded-xl p-6 shadow-card"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Tag className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Product Categories</h3>
            </div>
            <Button size="sm" className="gap-2" onClick={() => setIsAddCategoryOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Category
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted/50 border border-border"
              >
                <span className="font-medium capitalize">{category.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={() => {
                    setDeleteCategoryId(category.id);
                    setDeleteCategoryName(category.name);
                  }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
          {categories.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No categories configured</p>
            </div>
          )}
        </motion.div>
      )}

      {/* Default Size Ranges Section - Admin Only */}
      {hasPermission("canManageSettings") && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-xl p-6 shadow-card"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Ruler className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Default Size Ranges</h3>
            </div>
            <Button size="sm" className="gap-2" onClick={() => {
              setNewSizeRange({ ...newSizeRange, category: categories[0]?.name || "" });
              setIsAddSizeRangeOpen(true);
            }}>
              <Plus className="w-4 h-4" />
              Add Size Range
            </Button>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            Drag size ranges to reorder them. The order will be consistent across all pages.
          </p>
          
          <div className="space-y-6">
            {categories.map((category) => (
              <div key={category.id}>
                <h4 className="font-medium capitalize mb-3 text-muted-foreground">{category.name}</h4>
                <div className="space-y-2">
                  {sizeRangesByCategory[category.name]?.length > 0 ? (
                    sizeRangesByCategory[category.name].map((sr) => (
                      <div
                        key={sr.id}
                        draggable
                        onDragStart={() => handleDragStart(sr.id)}
                        onDragOver={(e) => handleDragOver(e, sr.id, category.name)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between p-3 rounded-lg bg-muted/50 border cursor-grab active:cursor-grabbing transition-colors ${
                          draggedSizeRange === sr.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-muted/70"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <GripVertical className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{sr.size_range}</span>
                          <span className="text-sm text-muted-foreground">
                            {sr.pairs_per_bundle} pairs/bundle
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteSizeRangeId(sr.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm border border-dashed rounded-lg">
                      No size ranges for {category.name}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Default Landing Page Section - Admin Only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
          className="bg-card rounded-xl p-6 shadow-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <Home className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Default Landing Page</h3>
              <p className="text-sm text-muted-foreground">Set which page each role sees after login</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["admin", "manager", "biller", "cashier"] as const).map((r) => (
              <div key={r} className="space-y-2">
                <Label className="capitalize">{r}</Label>
                <Select
                  value={landingPages[r]}
                  onValueChange={(value) => setLandingPages(prev => ({ ...prev, [r]: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANDING_PAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Online Billing Toggle - Admin Only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.23 }}
          className="bg-card rounded-xl p-6 shadow-card"
        >
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">Billing Mode</h3>
              <p className="text-sm text-muted-foreground">Control how invoices are created in the system</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Online Billing (Invoices)</p>
              <p className="text-sm text-muted-foreground">
                When enabled, the full invoice creation flow is available. When disabled, only manual bills can be added via the Clients section.
              </p>
            </div>
            <Switch 
              checked={onlineBillingEnabled}
              onCheckedChange={(checked) => setOnlineBillingEnabled(checked)}
            />
          </div>
        </motion.div>
      )}

      {/* Business Section - Admin Only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-card rounded-xl p-6 shadow-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Business Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="business">Business Name</Label>
              <Input 
                id="business" 
                value={businessSettings.businessName}
                onChange={(e) => setBusinessSettings(prev => ({ ...prev, businessName: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax">Tax ID</Label>
              <Input 
                id="tax" 
                value={businessSettings.taxId}
                onChange={(e) => setBusinessSettings(prev => ({ ...prev, taxId: e.target.value }))}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address">Business Address</Label>
              <Input 
                id="address" 
                value={businessSettings.address}
                onChange={(e) => setBusinessSettings(prev => ({ ...prev, address: e.target.value }))}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Notifications Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-card rounded-xl p-6 shadow-card"
      >
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Notifications</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Low Stock Alerts</p>
              <p className="text-sm text-muted-foreground">
                Get notified when products are running low
              </p>
            </div>
            <Switch 
              checked={notificationSettings.lowStockAlerts}
              onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, lowStockAlerts: checked }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Payment Reminders</p>
              <p className="text-sm text-muted-foreground">
                Alerts for overdue invoices
              </p>
            </div>
            <Switch 
              checked={notificationSettings.paymentReminders}
              onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, paymentReminders: checked }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Client Notifications</p>
              <p className="text-sm text-muted-foreground">
                When a new client is added
              </p>
            </div>
            <Switch 
              checked={notificationSettings.newClientNotifications}
              onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, newClientNotifications: checked }))}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Reports</p>
              <p className="text-sm text-muted-foreground">
                Weekly summary of sales and payments
              </p>
            </div>
            <Switch 
              checked={notificationSettings.emailReports}
              onCheckedChange={(checked) => setNotificationSettings(prev => ({ ...prev, emailReports: checked }))}
            />
          </div>
        </div>
      </motion.div>

      {/* Enhanced Security Section - Admin Only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card rounded-xl p-6 shadow-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Security Settings</h3>
          </div>
          <div className="space-y-6">
            {/* Admin PIN */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <KeyRound className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Require PIN on Login</p>
                    <p className="text-sm text-muted-foreground">
                      Add an extra PIN verification after password login
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={securitySettings.requirePinOnLogin}
                  onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, requirePinOnLogin: checked }))}
                />
              </div>
              {securitySettings.requirePinOnLogin && (
                <div className="ml-7 space-y-2">
                  <Label htmlFor="adminPin">Set Admin PIN (4-6 digits)</Label>
                  <Input
                    id="adminPin"
                    type="password"
                    placeholder="Enter new PIN"
                    maxLength={6}
                    value={securitySettings.adminPin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setSecuritySettings(prev => ({ ...prev, adminPin: value }));
                    }}
                    className="max-w-xs"
                  />
                  <p className="text-xs text-muted-foreground">Leave blank to keep existing PIN</p>
                </div>
              )}
            </div>

            <Separator />

            {/* Session Timeout */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Session Timeout</p>
                  <p className="text-sm text-muted-foreground">
                    Auto logout after inactivity (minutes)
                  </p>
                </div>
              </div>
              <Select
                value={String(securitySettings.sessionTimeoutMinutes)}
                onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, sessionTimeoutMinutes: Number(value) }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                  <SelectItem value="240">4 hours</SelectItem>
                  <SelectItem value="480">8 hours</SelectItem>
                  <SelectItem value="1440">24 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Single Device Login for Non-Admins */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Single Device Login (Non-Admins)</p>
                  <p className="text-sm text-muted-foreground">
                    Enforce one active session for biller/cashier roles
                  </p>
                </div>
              </div>
              <Switch 
                checked={securitySettings.enforceSingleSession}
                onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, enforceSingleSession: checked }))}
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Data Section - Admin Only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card rounded-xl p-6 shadow-card"
        >
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Data Management</h3>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline">Export All Data</Button>
            <Button variant="outline">Import Data</Button>
            <Button variant="outline">Create Backup</Button>
          </div>
        </motion.div>
      )}

      {/* Floating Save Button */}
      {hasUnsavedChanges && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 right-6 z-50"
        >
          <Button 
            size="lg"
            onClick={handleSaveAllSettings}
            disabled={isSaving}
            className="gap-2 shadow-lg"
          >
            {isSaving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save All Changes
          </Button>
        </motion.div>
      )}

      {/* Add Account Dialog */}
      <Dialog open={isAddAccountOpen} onOpenChange={setIsAddAccountOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Bank Account</DialogTitle>
            <DialogDescription>
              Add a new bank account for payment tracking.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                placeholder="e.g., HBL - Main Account"
                value={newAccountName}
                onChange={(e) => setNewAccountName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddAccountOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddAccount} disabled={isSubmitting || !newAccountName.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Account"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Category</DialogTitle>
            <DialogDescription>
              Add a new product category for your inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="categoryName">Category Name</Label>
              <Input
                id="categoryName"
                placeholder="e.g., sports, formal"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory} disabled={isSubmitting || !newCategoryName.trim()}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Size Range Dialog */}
      <Dialog open={isAddSizeRangeOpen} onOpenChange={setIsAddSizeRangeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Size Range</DialogTitle>
            <DialogDescription>
              Add a new default size range for a product category.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={newSizeRange.category}
                onValueChange={(value) => setNewSizeRange({ ...newSizeRange, category: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name} className="capitalize">
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="sizeRange">Size Range</Label>
              <Input
                id="sizeRange"
                placeholder="e.g., 7-10, 4-6, 1-3"
                value={newSizeRange.size_range}
                onChange={(e) => setNewSizeRange({ ...newSizeRange, size_range: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pairsPerBundle">Pairs Per Bundle</Label>
              <Input
                id="pairsPerBundle"
                type="number"
                min={1}
                value={newSizeRange.pairs_per_bundle}
                onChange={(e) => setNewSizeRange({ ...newSizeRange, pairs_per_bundle: parseInt(e.target.value) || 6 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSizeRangeOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSizeRange} disabled={isSubmitting || !newSizeRange.size_range.trim() || !newSizeRange.category}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Size Range"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation */}
      <AlertDialog open={deleteAccountId !== null} onOpenChange={() => setDeleteAccountId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bank account? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Confirmation */}
      <AlertDialog open={deleteCategoryId !== null} onOpenChange={() => { setDeleteCategoryId(null); setDeleteCategoryName(""); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the category "{deleteCategoryName}"? This will also delete all size ranges associated with this category. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCategory}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Size Range Confirmation */}
      <AlertDialog open={deleteSizeRangeId !== null} onOpenChange={() => setDeleteSizeRangeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Size Range</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this size range? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSizeRange}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Backup & Restore - Admin Only */}
      {isAdmin && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <DataBackupRestore />
        </motion.div>
      )}
    </div>
  );
};

export default Settings;
