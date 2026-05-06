const assert = require("node:assert/strict");
const test = require("node:test");

const { normalizeInput } = require("../shared/handlers/generateOutfit");

test("normalizeInput does not default missing gender to female", () => {
  const input = normalizeInput({});

  assert.equal(input.gender, "不限");
});
