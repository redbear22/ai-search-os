import { create } from "zustand";

export interface WorkspaceClient {
  id: string;
  name: string;
  domain: string | null;
  agencyId: string;
  createdAt: string;
  updatedAt: string;
  settings?: {
    reportFrequency: string;
    shareWithClient: boolean;
  } | null;
}

interface WorkspaceStore {
  activeClientId: string | null;
  clients: WorkspaceClient[];
  loading: boolean;
  error: string | null;
  setActiveClientId: (clientId: string | null) => void;
  loadClients: () => Promise<void>;
  switchClient: (clientId: string) => Promise<boolean>;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  activeClientId: null,
  clients: [],
  loading: false,
  error: null,

  setActiveClientId: (clientId) => set({ activeClientId: clientId }),

  loadClients: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/agency/clients");
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Failed to load clients (${res.status})`);
      }
      const payload = (await res.json()) as
        | WorkspaceClient[]
        | { clients: WorkspaceClient[] };
      const clients = Array.isArray(payload) ? payload : payload.clients;
      const { activeClientId } = get();
      const nextActive =
        activeClientId && clients.some((c) => c.id === activeClientId)
          ? activeClientId
          : (clients[0]?.id ?? null);
      set({ clients, activeClientId: nextActive, loading: false });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to load clients",
      });
    }
  },

  switchClient: async (clientId) => {
    set({ error: null });
    try {
      const res = await fetch("/api/workspace/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `Switch failed (${res.status})`);
      }
      set({ activeClientId: clientId });
      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to switch client",
      });
      return false;
    }
  },
}));
