"use client";

import { useEffect } from "react";
import { installAgentHooksMessageListener } from "./messages";

/**
 * React hook that installs the shared AgentHooks host-side message dispatcher
 * for the lifetime of the calling component.
 *
 * Usage:
 *   export default function MyPage() {
 *     useAgentHooksMessageListener();
 *     ...
 *   }
 *
 * The underlying `window` listener is ref-counted inside
 * `installAgentHooksMessageListener`, so multiple mounted components (preview,
 * run modal, chat) share ONE listener — handlers fire exactly once.
 */
export function useAgentHooksMessageListener(): void {
  useEffect(() => installAgentHooksMessageListener(), []);
}