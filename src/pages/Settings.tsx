import { useState, useEffect } from "react";
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
import { useSupabaseAuthContext } from "@/context/SupabaseAuthContext";

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

const Settings = () => {
  const { toast } = useToast();
  const { profile, hasPermission } = useSupabaseAuthContext();
  const [loading, setLoading] = useState(true);
  
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
  }, []);

  // Payment account handlers
  const handleAddAccount = async () => {
    if (!newAccountName.trim()) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("payment_accounts").insert({
        name: newAccountName.trim(),
      });

      if (error) throw error;

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
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold text-foreground">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account and preferences
        </p>
      </motion.div>

      {/* Profile Section */}
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
            <Input id="name" defaultValue={profile?.name || "User"} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" defaultValue={profile?.email || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" defaultValue={profile?.phone || ""} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Input id="role" defaultValue="User" disabled />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button>Save Changes</Button>
        </div>
      </motion.div>

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

      {/* Business Section */}
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
            <Input id="business" defaultValue="BillFlow Inc." />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tax">Tax ID</Label>
            <Input id="tax" defaultValue="XX-XXXXXXX" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="address">Business Address</Label>
            <Input id="address" defaultValue="123 Business Street, Suite 100" />
          </div>
        </div>
      </motion.div>

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
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Payment Reminders</p>
              <p className="text-sm text-muted-foreground">
                Alerts for overdue invoices
              </p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">New Client Notifications</p>
              <p className="text-sm text-muted-foreground">
                When a new client is added
              </p>
            </div>
            <Switch />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Email Reports</p>
              <p className="text-sm text-muted-foreground">
                Weekly summary of sales and payments
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>
      </motion.div>

      {/* Security Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-card rounded-xl p-6 shadow-card"
      >
        <div className="flex items-center gap-3 mb-6">
          <Shield className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-foreground">Security</h3>
        </div>
        <div className="space-y-4">
          <Button variant="outline">Change Password</Button>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Two-Factor Authentication</p>
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security
              </p>
            </div>
            <Switch />
          </div>
        </div>
      </motion.div>

      {/* Data Section */}
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
    </div>
  );
};

export default Settings;
