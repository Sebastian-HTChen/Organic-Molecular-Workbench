export type OrcaTask = "single_point" | "optimization" | "frequency" | "opt_freq";

export interface OrcaConfig {
  functional: string;
  basis_set: string;
  task: OrcaTask;
  charge: number;
  multiplicity: number;
  nprocs: number;
  maxcore_mb: number;
}

export interface OrcaInput {
  input_text: string;
  filename: string;
  provider: "ORCA";
  execution: "not_submitted";
}
