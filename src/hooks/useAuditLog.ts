import { supabase } from "@/integrations/supabase/client";

export type AuditAction = 
  | "create" 
  | "update" 
  | "delete" 
  | "save_draft" 
  | "login" 
  | "logout" 
  | "export" 
  | "import" 
  | "print";

export type AuditEntity = 
  | "invoice" 
  | "product" 
  | "client" 
  | "recovery" 
  | "brand" 
  | "user" 
  | "payment" 
  | "settings";

interface AuditLogParams {
  action: AuditAction;
  entityType: AuditEntity;
  entityId?: string;
  details?: Record<string, any>;
  userName?: string;
}

export const logAuditEvent = async ({
  action,
  entityType,
  entityId,
  details,
  userName,
}: AuditLogParams): Promise<void> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from("audit_logs").insert({
      action,
      entity_type: entityType,
      entity_id: entityId || null,
      details: details || null,
      user_id: user?.id || null,
      user_name: userName || user?.email || "System",
    });

    if (error) {
      console.error("Failed to log audit event:", error);
    }
  } catch (error) {
    console.error("Audit logging error:", error);
  }
};

export const useAuditLog = () => {
  const log = async (params: AuditLogParams) => {
    await logAuditEvent(params);
  };

  return { log };
};
