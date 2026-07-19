/**
 * Table-driven authorization matrix tests.
 * Covers owner/other × global × secure for read/write.
 */
import { assertEquals } from "@std/assert";
import {
  type AuthzAction,
  type AuthzDecision,
  canAccess,
  decideAccess,
  type MemoAuthzFlags,
} from "../src/domain/authorize.ts";

const OWNER = "owner-user-id";
const OTHER = "other-user-id";

interface Case {
  name: string;
  actor: string;
  global: boolean;
  secure: boolean;
  action: AuthzAction;
  can: boolean;
  decision: AuthzDecision;
}

const cases: Case[] = [
  // --- owner: always allow ---
  {
    name: "owner private read",
    actor: OWNER,
    global: false,
    secure: false,
    action: "read",
    can: true,
    decision: "allow",
  },
  {
    name: "owner private write",
    actor: OWNER,
    global: false,
    secure: false,
    action: "write",
    can: true,
    decision: "allow",
  },
  {
    name: "owner global read",
    actor: OWNER,
    global: true,
    secure: false,
    action: "read",
    can: true,
    decision: "allow",
  },
  {
    name: "owner global write",
    actor: OWNER,
    global: true,
    secure: false,
    action: "write",
    can: true,
    decision: "allow",
  },
  {
    name: "owner secure read",
    actor: OWNER,
    global: false,
    secure: true,
    action: "read",
    can: true,
    decision: "allow",
  },
  {
    name: "owner secure write",
    actor: OWNER,
    global: false,
    secure: true,
    action: "write",
    can: true,
    decision: "allow",
  },
  {
    name: "owner global+secure read",
    actor: OWNER,
    global: true,
    secure: true,
    action: "read",
    can: true,
    decision: "allow",
  },
  {
    name: "owner global+secure write",
    actor: OWNER,
    global: true,
    secure: true,
    action: "write",
    can: true,
    decision: "allow",
  },

  // --- other + private (global=false, secure=false) ---
  {
    name: "other private read → deny (404)",
    actor: OTHER,
    global: false,
    secure: false,
    action: "read",
    can: false,
    decision: "not_found",
  },
  {
    name: "other private write → deny (404)",
    actor: OTHER,
    global: false,
    secure: false,
    action: "write",
    can: false,
    decision: "not_found",
  },

  // --- other + global only ---
  {
    name: "other global read → allow",
    actor: OTHER,
    global: true,
    secure: false,
    action: "read",
    can: true,
    decision: "allow",
  },
  {
    name: "other global write → forbidden",
    actor: OTHER,
    global: true,
    secure: false,
    action: "write",
    can: false,
    decision: "forbidden",
  },

  // --- other + secure only ---
  {
    name: "other secure read → deny (404)",
    actor: OTHER,
    global: false,
    secure: true,
    action: "read",
    can: false,
    decision: "not_found",
  },
  {
    name: "other secure write → deny (404)",
    actor: OTHER,
    global: false,
    secure: true,
    action: "write",
    can: false,
    decision: "not_found",
  },

  // --- other + global && secure: still owner-only ---
  {
    name: "other global+secure read → deny (404)",
    actor: OTHER,
    global: true,
    secure: true,
    action: "read",
    can: false,
    decision: "not_found",
  },
  {
    name: "other global+secure write → deny (404)",
    actor: OTHER,
    global: true,
    secure: true,
    action: "write",
    can: false,
    decision: "not_found",
  },
];

for (const c of cases) {
  Deno.test(`canAccess: ${c.name}`, () => {
    const memo: MemoAuthzFlags = {
      ownerId: OWNER,
      global: c.global,
      secure: c.secure,
    };
    assertEquals(
      canAccess(c.actor, memo, c.action),
      c.can,
      `canAccess failed for ${c.name}`,
    );
  });

  Deno.test(`decideAccess: ${c.name}`, () => {
    const memo: MemoAuthzFlags = {
      ownerId: OWNER,
      global: c.global,
      secure: c.secure,
    };
    assertEquals(
      decideAccess(c.actor, memo, c.action),
      c.decision,
      `decideAccess failed for ${c.name}`,
    );
  });
}
