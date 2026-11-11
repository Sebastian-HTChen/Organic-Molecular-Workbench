import type { HealthStatus, Molecule } from "./types";

const API_BASE = "/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, init);
  } catch {
    throw new ApiError(
      "Cannot reach the RDKit backend. Start the FastAPI server on port 8000 and retry.",
      0,
      "backend_unavailable",
    );
  }

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const detail =
      typeof body === "object" && body !== null && "detail" in body
        ? (body as { detail: unknown }).detail
        : null;
    if (typeof detail === "object" && detail !== null && "message" in detail) {
      const error = detail as { message: unknown; code?: unknown };
      throw new ApiError(
        String(error.message),
        response.status,
        typeof error.code === "string" ? error.code : undefined,
      );
    }
    if (Array.isArray(detail)) {
      const messages = detail.map((item) =>
        typeof item === "object" && item !== null && "msg" in item
          ? String((item as { msg: unknown }).msg)
          : "Invalid request",
      );
      throw new ApiError(messages.join("; "), response.status, "validation_error");
    }
    throw new ApiError(`Backend request failed (${response.status}).`, response.status);
  }

  return (await response.json()) as T;
}

export function generateFromSmiles(smiles: string, name: string): Promise<Molecule> {
  return request<Molecule>("/molecules/from-smiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ smiles, name }),
  });
}

export function generateFromMolBlock(molBlock: string, name: string): Promise<Molecule> {
  return request<Molecule>("/molecules/from-mol", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mol_block: molBlock, name }),
  });
}

export function optimizeGeometry(
  molBlock: string,
  name: string,
  method: "MMFF94" | "UFF",
  maxIterations: number,
): Promise<Molecule> {
  return request<Molecule>("/molecules/optimize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mol_block: molBlock, name, method, max_iterations: maxIterations }),
  });
}

export function getHealth(): Promise<HealthStatus> {
  return request<HealthStatus>("/health");
}
