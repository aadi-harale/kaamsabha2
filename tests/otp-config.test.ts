import test from "node:test";
import assert from "node:assert/strict";
import { resolveOtpRuntimeConfig } from "../lib/otp-config.ts";

test("OTP runtime uses explicit configured secret when available",()=>{
  const config=resolveOtpRuntimeConfig({KAAMSABHA_OTP_SECRET:"real-secret",KAAMSABHA_DEMO_MODE:"false"});
  assert.equal(config?.source,"configured");
  assert.equal(config?.secret,"real-secret");
  assert.equal(config?.demo,false);
});

test("SIH deployment gets demo OTP fallback when no secret is configured",()=>{
  const config=resolveOtpRuntimeConfig({VERCEL_PROJECT_ID:"prj_demo"});
  assert.equal(config?.source,"demo-fallback");
  assert.equal(config?.demo,true);
  assert.match(config?.secret??"",/prj_demo/);
});

test("explicitly disabling demo mode requires a real OTP secret",()=>{
  assert.equal(resolveOtpRuntimeConfig({KAAMSABHA_DEMO_MODE:"false"}),null);
});
