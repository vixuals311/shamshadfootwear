import * as React from "react";
import { cn } from "@/lib/utils";

interface MobileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function MobileCard({ children, className, ...props }: MobileCardProps) {
  return (
    <div 
      className={cn(
        "bg-card rounded-xl p-4 shadow-card border border-border/50",
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}

interface MobileCardRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
}

export function MobileCardRow({ label, value, className, ...props }: MobileCardRowProps) {
  return (
    <div 
      className={cn("flex justify-between items-center py-1.5", className)} 
      {...props}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

interface MobileCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}

export function MobileCardHeader({ 
  title, 
  subtitle, 
  icon, 
  actions, 
  className, 
  ...props 
}: MobileCardHeaderProps) {
  return (
    <div 
      className={cn("flex items-start justify-between gap-3 mb-3", className)} 
      {...props}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon && (
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-medium text-foreground truncate">{title}</p>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}
