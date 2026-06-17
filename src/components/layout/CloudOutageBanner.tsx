import { AlertTriangle, Loader2 } from "lucide-react";
import type { CloudOutageState } from "@/hooks/useCloudOutageFailover";

interface Props {
  state: CloudOutageState;
}

export function CloudOutageBanner({ state }: Props) {
  if (!state.outage && !state.hydrating) return null;

  return (
    <div className="bg-warning/15 border-b border-warning/30 text-warning-foreground px-4 py-2 text-sm flex items-center gap-2">
      {state.hydrating ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      )}
      <span className="flex-1">
        {state.hydrating
          ? "Cloud unreachable — loading latest data from backup mirror..."
          : "Cloud unreachable — running in read-only failover mode. New entries will sync when connection returns."}
      </span>
      {state.lastHydratedAt && !state.hydrating && (
        <span className="text-xs opacity-75 hidden sm:inline">
          Mirror loaded {new Date(state.lastHydratedAt).toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}