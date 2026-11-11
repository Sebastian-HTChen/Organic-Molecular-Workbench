import type { OrcaConfig } from "./types";

export interface OrcaRecommendation {
  name: string;
  description: string;
  config: Pick<OrcaConfig, "functional" | "basis_set" | "task">;
}

export const orcaRecommendations: OrcaRecommendation[] = [
  {
    name: "Routine geometry optimization",
    description: "A practical starting point for ordinary organic molecules. Optimize first, then consider a larger-basis single point.",
    config: { functional: "B3LYP", basis_set: "def2-SVP", task: "optimization" },
  },
  {
    name: "Dispersion-aware optimization",
    description: "A dispersion-corrected hybrid for noncovalent interactions and conformational studies; more costly than the routine preset.",
    config: { functional: "wB97X-D3", basis_set: "def2-TZVP", task: "optimization" },
  },
  {
    name: "Higher-quality single point",
    description: "Refine the energy on an already optimized geometry. This is not a Gibbs free-energy calculation.",
    config: { functional: "PBE0", basis_set: "def2-TZVP", task: "single_point" },
  },
  {
    name: "Optimization and frequencies",
    description: "Optimize and request a Hessian. Check for imaginary frequencies; thermochemistry also requires a suitable temperature and standard state.",
    config: { functional: "B3LYP", basis_set: "def2-SVP", task: "opt_freq" },
  },
];
