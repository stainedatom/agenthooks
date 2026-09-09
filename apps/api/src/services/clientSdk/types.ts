/**
 * AgentHooks Client SDK — type definitions.
 *
 * Core shape shared by every entry in the global API helper collection
 * (`agenthooksGlobalApiCollection`).
 */

/** Metadata + source code for a single client-side API helper function. */
export interface AgentHooksHelperDefinition {
  name: string;
  description: string;
  /** Raw JavaScript function source, assigned directly to `window.agenthooks.<name>`. */
  code: string;
}

/** Registry mapping helper names to their definitions. */
export type AgentHooksHelperCollection = Record<string, AgentHooksHelperDefinition>;