import { ApiError } from "@/features/molecule/api";

import type { OrcaConfig, OrcaInput } from "./types";

export async function generateOrcaInput(
  molBlock: string,
  name: string,
  config: OrcaConfig,
): Promise<OrcaInput> {
  let response: Response;
  try {
    response = await fetch("/api/v1/calculations/orca/input", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mol_block: molBlock, name, ...config }),
    });
  } catch {
    throw new ApiError("Cannot reach the calculation-input service.", 0, "backend_unavailable");
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(body?.detail?.message ?? "The ORCA input configuration is invalid.", response.status);
  }
  return response.json() as Promise<OrcaInput>;
}
