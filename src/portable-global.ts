// Bundle entry: exposes the portable core as globalThis.WhatAreYouBuilding (see scripts/build.ts).
import * as core from "./portable";
(globalThis as any).WhatAreYouBuilding = core;
