// Bundle entry: exposes the portable core as globalThis.InvestorProof (see scripts/build.ts).
import * as core from "./portable";
(globalThis as any).InvestorProof = core;
