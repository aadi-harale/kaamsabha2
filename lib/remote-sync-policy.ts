/**
 * Decides whether the optional Supabase mirror may accept writes.
 *
 * The mirror is written to with the Supabase service-role key, which bypasses row-level
 * security. Its only caller is the browser, and the browser cannot hold a secret, so a write
 * arriving at the server is simply an anonymous write. Opening that is a decision with real
 * consequences — anyone who finds the URL can replace the cooperative's whole register — so it
 * has to be made deliberately and in one obvious place, not implied by a stray env var.
 */

export const DEFAULT_SYNC_WORKSPACE = "shared-demo";

export interface RemoteSyncPolicy {
  /** The mirror is configured at all. */
  configured: boolean;
  /** Anonymous browser writes are permitted. Off unless explicitly turned on. */
  writesAllowed: boolean;
  /** The single workspace this deployment will mirror. */
  workspace: string;
  /** Plain-language explanation, returned to the caller when a write is refused. */
  reason: string;
}

export function remoteSyncPolicy(env: Record<string, string | undefined>): RemoteSyncPolicy {
  const configured = Boolean(
    (env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL) && env.SUPABASE_SERVICE_ROLE_KEY,
  );
  const workspace = (env.KAAMSABHA_SYNC_WORKSPACE || DEFAULT_SYNC_WORKSPACE).trim() || DEFAULT_SYNC_WORKSPACE;
  const optedIn = env.KAAMSABHA_ALLOW_ANONYMOUS_STATE_WRITES?.trim().toLowerCase() === "true";

  if (!configured) {
    return {
      configured: false,
      writesAllowed: false,
      workspace,
      reason: "No Supabase mirror is configured; the register stays on this device.",
    };
  }

  if (!optedIn) {
    return {
      configured: true,
      writesAllowed: false,
      workspace,
      reason:
        "The shared mirror is read-only. Writes arrive with no user identity and are stored with the " +
        "service-role key, so they would let anyone replace the register. Set " +
        "KAAMSABHA_ALLOW_ANONYMOUS_STATE_WRITES=true only for a throwaway demo workspace you are willing " +
        "to let strangers overwrite.",
    };
  }

  return {
    configured: true,
    writesAllowed: true,
    workspace,
    reason: `Anonymous writes are explicitly enabled for the "${workspace}" workspace.`,
  };
}
