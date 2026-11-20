"use client";

import { useEffect, useMemo } from "react";

export type FeatureFlagName =
  | "newSearchBar"
  | "analyticsDebugPanel"
  | "accountHistoryTab";

const FEATURE_FLAGS: Record<FeatureFlagName, boolean> = {
  newSearchBar: false,
  analyticsDebugPanel: process.env.NODE_ENV === "development",
  accountHistoryTab: true,
};

type FlagListener = (flag: FeatureFlagName, enabled: boolean) => void;
const listeners: FlagListener[] = [];

/** Reports every flag evaluation so it can be tracked as an analytics event. */
export function onFlagEvaluated(listener: FlagListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index !== -1) listeners.splice(index, 1);
  };
}

export function useFeatureFlag(flag: FeatureFlagName): boolean {
  const enabled = useMemo(() => FEATURE_FLAGS[flag] ?? false, [flag]);

  useEffect(() => {
    for (const listener of listeners) listener(flag, enabled);
  }, [flag, enabled]);

  return enabled;
}
