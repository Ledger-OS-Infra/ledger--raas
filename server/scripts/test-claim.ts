import { claimEvent } from "../idempotency/claimEvent";

async function main() {
  const first = await claimEvent("manual_test_evt_1");
  const second = await claimEvent("manual_test_evt_1");
  console.log("First claim:", first);
  console.log("Second claim:", second);
  process.exit(0);
}

main();