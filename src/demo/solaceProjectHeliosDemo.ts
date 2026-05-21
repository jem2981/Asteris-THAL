import { ContinuityBridge } from "../index.js";

const bridge = ContinuityBridge.forSolace();
const thread = bridge.createThread("Project Helios material continuity");

console.log("Asteris-THAL Continuity Bridge v0.1 Demo");
console.log("");
console.log(`Agent initialized: ${bridge.identity.name}`);
console.log(`State: ${bridge.identity.state}`);
console.log("");

const carbonFiber = bridge.storeInitialMemory(
  thread.id,
  "Project Helios uses carbon-fiber panels for a lightweight drone frame."
);

console.log("Memory stored:");
console.log(carbonFiber.content);
console.log(`Status: ${carbonFiber.status}`);
console.log(`Confidence: ${carbonFiber.confidence.toFixed(2)}`);
console.log("");

const conflictResult = bridge.receiveClaim(
  thread.id,
  "Project Helios does not use carbon fiber. It uses aluminum."
);

if (!conflictResult.conflict) {
  throw new Error("Expected Project Helios material conflict was not detected.");
}

console.log("Conflict detected:");
console.log(conflictResult.conflict.summary);
console.log("State changed: ACTIVE_STABLE -> CONFLICT");
console.log("Action: preserved both records; clarification required.");
console.log("");

const recovery = bridge.recovery.recoverProjectHeliosMaterial({
  threadId: thread.id,
  conflictId: conflictResult.conflict.id,
  aluminumMemoryId: conflictResult.memory.id,
  carbonFiberMemoryId: carbonFiber.id,
  clarification: "Use aluminum as the current design. Keep carbon fiber as an earlier rejected option."
});

console.log("Clarification received:");
console.log("Use aluminum as current design; carbon fiber retained as rejected prior option.");
console.log("");
console.log("Recovery complete:");
console.log(`Aluminum status: ${recovery.aluminum.status}`);
console.log(`Carbon fiber status: ${recovery.carbonFiber.status}`);
console.log("State changed: RECOVERY -> ACTIVE_STABLE");
console.log("");
console.log("Result: PASS");
