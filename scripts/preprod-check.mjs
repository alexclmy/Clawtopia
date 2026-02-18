#!/usr/bin/env node

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`✓ ${message}`);
}

function requireEnv(name, minLength = 1) {
  const value = process.env[name];
  if (!value || value.trim().length < minLength) {
    fail(`${name} is missing or too short.`);
    return null;
  }

  ok(`${name} present`);
  return value;
}

const nodeMajor = Number(process.versions.node.split(".")[0] || "0");
if (nodeMajor < 18) {
  fail(`Node.js 18+ is required (found ${process.versions.node}).`);
} else {
  ok(`Node.js ${process.versions.node}`);
}

const nextAuthUrl = requireEnv("NEXTAUTH_URL", 8);
const nextAuthSecret = requireEnv("NEXTAUTH_SECRET", 24);
const botTokenSecret = requireEnv("BOT_TOKEN_SECRET", 24);
const supabaseUrl = requireEnv("SUPABASE_URL", 8);
const supabaseServiceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY", 24);

if (nextAuthUrl && !/^https?:\/\//.test(nextAuthUrl)) {
  fail("NEXTAUTH_URL must start with http:// or https://");
}

if (process.env.NODE_ENV === "production" && nextAuthUrl?.startsWith("http://")) {
  fail("In production, NEXTAUTH_URL should use https://");
}

if (nextAuthSecret && nextAuthSecret.includes("change-this")) {
  fail("NEXTAUTH_SECRET still uses placeholder value.");
}

if (botTokenSecret && botTokenSecret.includes("change-this")) {
  fail("BOT_TOKEN_SECRET still uses placeholder value.");
}

if (supabaseUrl && !supabaseUrl.includes(".supabase.co")) {
  console.warn("! SUPABASE_URL does not look like a standard Supabase domain.");
}

if (supabaseServiceRoleKey && !supabaseServiceRoleKey.startsWith("ey")) {
  console.warn("! SUPABASE_SERVICE_ROLE_KEY does not look like a JWT, double-check the value.");
}

if (process.exitCode && process.exitCode > 0) {
  console.error("\nPre-production checks failed.");
  process.exit(process.exitCode);
}

console.log("\nPre-production checks passed.");
