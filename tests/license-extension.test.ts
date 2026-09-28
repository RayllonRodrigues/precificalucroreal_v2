import assert from "node:assert/strict";
import test from "node:test";
import { extendExpiration } from "../src/lib/license-extension";

const clock = () => new Date("2030-01-15T12:00:00Z");
test("license extension retries a conflicting grant instead of losing it", async () => {
  let current: string | null = null;
  let writes = 0;
  const result = await extendExpiration({
    async read() { return current; },
    async compareAndSet(previous, next) {
      if (++writes === 1) { current = "2031-01-15T12:00:00.000Z"; return false; }
      assert.equal(previous, current); current = next; return true;
    },
  }, 2, "months", clock);
  assert.equal(result, "2031-03-15T12:00:00.000Z");
  assert.equal(writes, 2);
});
test("license preserves calendar month overflow and trial exact-day arithmetic", async () => {
  const previous = new Date(2030, 0, 31, 12).toISOString();
  const expected = new Date(previous); expected.setMonth(expected.getMonth() + 1);
  assert.equal(await extendExpiration({read:async()=>previous,compareAndSet:async()=>true},1,"months",clock),expected.toISOString());
  assert.equal(await extendExpiration({read:async()=>null,compareAndSet:async()=>true},2,"days",clock),"2030-01-17T12:00:00.000Z");
});
test("unknown commit outcome is never automatically replayed", async () => {
  let writes=0;
  await assert.rejects(extendExpiration({read:async()=>null,compareAndSet:async()=>{writes++;throw new Error("network");}},1,"months",clock),/network/);
  assert.equal(writes,1);
});
test("conflict retries are bounded and never report false success", async () => {
  let writes=0;
  await assert.rejects(extendExpiration({read:async()=>null,compareAndSet:async()=>{writes++;return false;}},1,"months",clock),/simultaneamente/);
  assert.equal(writes,8);
});
