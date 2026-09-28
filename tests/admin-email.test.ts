import assert from "node:assert/strict";
import test from "node:test";
import { findUniqueAccountByEmail } from "../src/lib/admin-email";

test("email selection is literal, normalized and not a wildcard", async () => {
  const users = [
    { id: "wrong", email: "anaXsilva@example.com" },
    { id: "right", email: "Ana_Silva@example.com" },
  ];
  assert.equal(
    await findUniqueAccountByEmail(" ANA_SILVA@example.com ", async () => users),
    "right",
  );
  await assert.rejects(findUniqueAccountByEmail("ana%silva@example.com", async () => users));
});
test("ambiguity across pages and lookup failures prevent admin promotion", async () => {
  const first = Array.from({ length: 200 }, (_, i) => ({
    id: String(i),
    email: i === 0 ? "a@b.com" : `u${i}@b.com`,
  }));
  await assert.rejects(
    findUniqueAccountByEmail("a@b.com", async (page) =>
      page === 1 ? first : [{ id: "other", email: "A@B.COM" }],
    ),
    /ambíguo/,
  );
  await assert.rejects(
    findUniqueAccountByEmail("a@b.com", async () => {
      throw new Error("offline");
    }),
    /offline/,
  );
});
