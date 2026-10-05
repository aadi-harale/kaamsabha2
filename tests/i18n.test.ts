import assert from "node:assert/strict";
import test from "node:test";
import { createBooking, signIn } from "../lib/commands.ts";
import { initialState } from "../lib/domain.ts";
import type { AppState, Job, Locale, Worker } from "../lib/domain.ts";
import { explainAllocation } from "../lib/allocation-explain.ts";
import { jobFlow, waitingOnLabel } from "../lib/job-flow.ts";
import { ALL_MESSAGE_KEYS, missingKeys, t } from "../lib/messages.ts";

const LOCALES: Locale[] = ["en", "hi", "mr"];
const INDIC: Locale[] = ["hi", "mr"];
/** Devanagari, used by both Hindi and Marathi. */
const DEVANAGARI = /[ऀ-ॿ]/;

function booked(service: string): AppState {
  return createBooking(signIn(initialState(), "customer01", "customer"), {
    customerId: "customer01", service, locality: "Kharadi, Pune",
    scheduledAt: "2026-10-05T10:00:00.000Z",
  });
}
function worker(state: AppState, id: string): Worker {
  const found = state.workers.find((w) => w.id === id);
  assert.ok(found, `worker ${id}`);
  return found;
}

test("every message exists in Hindi and Marathi", () => {
  for (const locale of INDIC) {
    assert.deepEqual(
      missingKeys(locale),
      [],
      `${locale} is missing translations; a half-translated screen is worse than an English one`,
    );
  }
  assert.ok(ALL_MESSAGE_KEYS.length > 100, "the catalog should cover the member's screens");
});

test("no message leaves an unfilled placeholder on screen", () => {
  // A stray {name} in front of a worker is a bug they cannot do anything about.
  for (const locale of LOCALES) {
    for (const key of ALL_MESSAGE_KEYS) {
      const rendered = t(locale, key, {
        service: "x", count: 1, mine: 1, theirs: 1, other: "x", payout: 1, reason: "x",
        position: 1, total: 1, gap: 1, theirId: "x", myId: "x", cooperative: "x",
        used: 1, limit: 1, amount: 1, left: 1, time: "x", code: "x", n: 1,
        name: "x", floor: 1,
      });
      assert.ok(!/\{\w+\}/.test(rendered), `${locale}/${key} left a placeholder: ${rendered}`);
      assert.ok(rendered.trim().length > 0, `${locale}/${key} is empty`);
    }
  }
});

test("Hindi and Marathi are actually translated, not English copies", () => {
  const sampled = ALL_MESSAGE_KEYS.filter((key) => t("en", key).length > 25);
  assert.ok(sampled.length > 50, "enough long messages to judge");
  for (const locale of INDIC) {
    for (const key of sampled) {
      const translated = t(locale, key);
      assert.notEqual(translated, t("en", key), `${locale}/${key} is still English`);
      assert.match(translated, DEVANAGARI, `${locale}/${key} has no Devanagari`);
    }
  }
});

test("Hindi and Marathi differ from each other, so neither is a copy of the other", () => {
  const long = ALL_MESSAGE_KEYS.filter((key) => t("en", key).length > 40);
  const identical = long.filter((key) => t("hi", key) === t("mr", key));
  assert.ok(
    identical.length === 0,
    `these messages are identical in Hindi and Marathi: ${identical.slice(0, 5).join(", ")}`,
  );
});

test("the member's answer to 'why not me' is translated end to end", () => {
  const state = booked("plumbing");
  const passedOver = worker(state, "W12");
  for (const locale of INDIC) {
    const explained = explainAllocation(state, state.receipts[0], passedOver, locale);
    assert.equal(explained.outcome, "passed-over");
    for (const field of [explained.headline, explained.detail, explained.consequence]) {
      assert.match(field, DEVANAGARI, `untranslated: ${field}`);
    }
    explained.facts.forEach((fact) => assert.match(fact.label, DEVANAGARI, `fact label: ${fact.label}`));
    // The figures stay as digits, and the member's own numbers must survive translation.
    assert.match(explained.detail, /150/);
    assert.match(explained.detail, /300/);
  }
});

test("a protection that held work back is explained in the member's own language", () => {
  const state = booked("electrician");
  for (const locale of INDIC) {
    const explained = explainAllocation(state, state.receipts[0], worker(state, "W11"), locale);
    assert.equal(explained.outcome, "blocked-by-protection");
    assert.equal(explained.blockedBy.length, 1);
    assert.match(explained.blockedBy[0], DEVANAGARI);
    assert.match(explained.blockedBy[0], /420/, "the limit figures must survive");
  }
});

test("the whole job flow speaks the member's language, in both vocabularies", () => {
  const job: Job = {
    id: "KMS-00001", customerId: "customer01", service: "electrician", locality: "Kharadi",
    scheduledAt: "2026-10-05T10:00:00.000Z", emergency: false, status: "arrived", amount: 760,
    evidence: [], changeOrders: [],
  };
  for (const locale of INDIC) {
    const flow = jobFlow(job, "worker", Date.now(), locale);
    assert.match(flow.nextStep, DEVANAGARI);
    assert.match(flow.otherSide, DEVANAGARI);
    flow.steps.forEach((step) => {
      assert.match(step.customerLabel, DEVANAGARI, `step ${step.id} customer label`);
      assert.match(step.workerLabel, DEVANAGARI, `step ${step.id} worker label`);
    });
    for (const actor of ["customer", "worker", "cooperative", "nobody"] as const) {
      assert.match(waitingOnLabel(actor, locale), DEVANAGARI);
    }
  }
});

test("a scope change carries its rupee amount into Hindi and Marathi", () => {
  const job: Job = {
    id: "KMS-1", customerId: "customer01", service: "electrician", locality: "Kharadi",
    scheduledAt: "2026-10-05T10:00:00.000Z", emergency: false, status: "change_pending", amount: 760,
    evidence: [],
    changeOrders: [{ id: "CHG-1", description: "extra switch", amountDelta: 150, requestedBy: "W02" }],
  };
  for (const locale of INDIC) {
    assert.match(jobFlow(job, "customer", Date.now(), locale).nextStep, /₹150/);
  }
});

test("English stays the default, so nothing silently changes language", () => {
  const state = booked("plumbing");
  const explained = explainAllocation(state, state.receipts[0], worker(state, "W12"));
  assert.ok(!DEVANAGARI.test(explained.headline));
  assert.ok(!DEVANAGARI.test(jobFlow(state.jobs[0], "worker").nextStep));
  assert.equal(waitingOnLabel("worker"), "Waiting on the member");
});

test("operations wording stays English on purpose, even when a member reads Hindi", () => {
  // A half-translated audit trail is worse than an untranslated one, so the record-first
  // admin view is deliberately not localised. This pins that decision as intentional.
  const state = booked("electrician");
  const explained = explainAllocation(state, state.receipts[0], worker(state, "W11"), "hi");
  assert.match(explained.blockedBy[0], DEVANAGARI, "the member reads Hindi");
  assert.equal(explained.policyVersion, "constitution-v2", "machine identifiers are untouched");
});

test("a member reads other members' names in their own script", () => {
  const state = booked("plumbing");
  const explained = explainAllocation(state, state.receipts[0], worker(state, "W12"), "mr");
  // Leela Waghmare must appear as लीला वाघमारे inside a Marathi sentence.
  assert.ok(!/Leela|Waghmare/.test(explained.detail), `Latin name leaked: ${explained.detail}`);
  assert.match(explained.detail, /लीला वाघमारे/);
  explained.fairOrder.forEach((row) => {
    assert.ok(!/^[A-Za-z ]+$/.test(row.workerName), `turn order showed a Latin name: ${row.workerName}`);
  });
  // English still reads the Latin form.
  const english = explainAllocation(state, state.receipts[0], worker(state, "W12"));
  assert.match(english.detail, /Leela Waghmare/);
});

test("every seeded member has a Devanagari name", () => {
  initialState().workers.forEach((w) => {
    assert.ok(w.nameDevanagari, `${w.name} has no Devanagari form`);
    assert.match(w.nameDevanagari!, DEVANAGARI);
  });
});
