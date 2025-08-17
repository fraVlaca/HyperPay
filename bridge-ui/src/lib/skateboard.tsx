import { createContext, useCallback, useContext, useMemo, useState } from "react";

type Ctx = {
  visible: boolean;
  show: () => void;
  hide: () => void;
};

const SkateboardCtx = createContext<Ctx | null>(null);

export function SkateboardProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const show = useCallback(() => setVisible(true), []);
  const hide = useCallback(() => setVisible(false), []);
  const value = useMemo(() => ({ visible, show, hide }), [visible, show, hide]);

  return <SkateboardCtx.Provider value={value}>{children}</SkateboardCtx.Provider>;
}

export function useSkateboard() {
  const ctx = useContext(SkateboardCtx);
  if (!ctx) {
    throw new Error("useSkateboard must be used within SkateboardProvider");
  }
  return ctx;
}
