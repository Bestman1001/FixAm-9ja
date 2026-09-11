import test from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../auth-recovery-redirect.js", import.meta.url), "utf8");
test("recovery landing preserves credentials on the same origin only", () => {
  let target;
  vm.runInNewContext(source, { URLSearchParams, window: { location: {
    origin: "https://www.fixam9ja.com", search: "", hash: "#type=recovery&access_token=test-only&refresh_token=test-only",
    replace: value => { target = value; },
  } } });
  assert.equal(target, "https://www.fixam9ja.com/reset-password.html#type=recovery&access_token=test-only&refresh_token=test-only");
});
test("ordinary homepage navigation does not redirect", () => {
  vm.runInNewContext(source, { URLSearchParams, window: { location: {
    hash: "#marketplace", replace: () => assert.fail("unexpected redirect"),
  } } });
});
test("expired signup links and successful signup never enter password recovery", () => {
  for (const hash of ["#error=access_denied&error_code=otp_expired", "#type=signup&access_token=test-only"]) {
    vm.runInNewContext(source, { URLSearchParams, window: { location: {
      hash, replace: () => assert.fail("signup incorrectly routed to recovery"),
    } } });
  }
});
