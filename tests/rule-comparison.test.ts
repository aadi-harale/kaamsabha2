import assert from "node:assert/strict";
import test from "node:test";
import { initialState, workerDailyLimit } from "../lib/domain.ts";
import type { AppState } from "../lib/domain.ts";
import {
  compareRulebooks, DEMAND_SEED, JOB_MINUTES, RULEBOOKS, runRulebook, simulateDemand,
} from "../lib/rule-comparison.ts";

function coop(state: AppState, n = 32) {
  return compareRulebooks(state, n).outcomes.find((o) => o.rulebook.id === "cooperative")!;
}
function ranked(state: AppState, n = 32) {
  return compareRulebooks(state, n).outcomes.find((o) => o.rulebook.id === "rating-ranked")!;
}

test("the comparison is deterministic, so every demo and every judge sees the same numbers", () => {
  const a = compareRulebooks(initialState());
  const b = compareRulebooks(initialState());
  assert.equal(a.headline, b.headline);
  assert.deepEqual(
    a.outcomes.map((o) => o.shares.map((s) => `${s.workerId}:${s.jobs}`)),
    b.outcomes.map((o) => o.shares.map((s) => `${s.workerId}:${s.jobs}`)),
  );
  // And it is seeded by the project's stated seed.
  assert.equal(DEMAND_SEED, 26089);
  assert.deepEqual(simulateDemand(initialState(), 8), simulateDemand(initialState(), 8, 26089));
});

test("both rulebooks are handed exactly the same jobs and the same people", () => {
  const comparison = compareRulebooks(initialState());
  const [first, ...rest] = comparison.outcomes;
  for (const outcome of rest) {
    assert.equal(
      outcome.shares.length,
      first.shares.length,
      "every rule considers the same member set",
    );
    assert.deepEqual(
      outcome.shares.map((s) => s.workerId).sort(),
      first.shares.map((s) => s.workerId).sort(),
    );
    assert.equal(
      outcome.assignments.length + outcome.unfilled,
      comparison.demand.length,
      "every job is either assigned or recorded as unfilled",
    );
  }
});

test("the cooperative rule never hands new work to someone already at their limit", () => {
  // This is the promise the rule actually makes. It does not promise that a job already
  // underway stops at the line, and the demo must not claim it does.
  const outcome = coop(initialState());
  assert.equal(outcome.jobsPastSafeLimit, 0);
  outcome.assignments.forEach((assignment) => {
    assert.equal(assignment.pastSafeLimit, false, `${assignment.workerName} was already at their limit`);
  });
});

test("an over-run under the cooperative rule is bounded by the one job that caused it", () => {
  const outcome = coop(initialState());
  outcome.shares.filter((share) => share.finishedOverLimit).forEach((share) => {
    const overBy = share.endedAt - share.limit;
    assert.ok(
      overBy <= JOB_MINUTES,
      `${share.name} ran ${overBy} min over, which is more than the single job that took them there`,
    );
    assert.ok(share.startedAt < share.limit, "they were under the limit when that job was offered");
  });
});

test("a member who was already over their limit is not counted as pushed there by the rule", () => {
  // Overstating the case would be as dishonest as understating it.
  const state = initialState();
  const over = state.workers.find((w) => w.workloadTodayMinutes > workerDailyLimit(w));
  assert.ok(over, "the seed must contain a member who starts over their limit");
  const share = coop(state).shares.find((s) => s.workerId === over.id);
  assert.equal(share?.jobs, 0, "the cooperative rule gives them nothing");
  assert.ok(share!.endedAt > share!.limit, "they are still over, from where they started");
  assert.equal(share?.finishedOverLimit, false, "but the rule did not put them there");
});

test("the rating-ranked rule does push people past their limit, which is the point of the contrast", () => {
  const outcome = ranked(initialState());
  assert.ok(
    outcome.jobsPastSafeLimit > 0,
    "the comparison is pointless if the alternative never breaches a protection",
  );
});

test("work spreads further under the cooperative rule than under rating ranking", () => {
  const state = initialState();
  const cooperative = coop(state);
  const alternative = ranked(state);
  assert.ok(
    cooperative.membersWithWork > alternative.membersWithWork,
    `cooperative ${cooperative.membersWithWork} vs ranked ${alternative.membersWithWork}`,
  );
  assert.ok(
    cooperative.concentration < alternative.concentration,
    "the cooperative rule must concentrate work less, or the claim is wrong",
  );
  assert.ok(cooperative.busiestMemberJobs < alternative.busiestMemberJobs);
});

test("every member who earns nothing is told why, and protection is not reported as rejection", () => {
  for (const outcome of compareRulebooks(initialState()).outcomes) {
    outcome.shares.forEach((share) => {
      if (share.jobs > 0) {
        assert.equal(share.shutOutReason, "", `${share.name} earned, so needs no shut-out reason`);
      } else {
        assert.ok(share.shutOutReason.length > 10, `${share.name} must be told why`);
      }
    });
  }
  // A member already at their own limit is described as protected, not as passed over.
  const atLimit = initialState().workers.find(
    (w) => w.workloadTodayMinutes >= workerDailyLimit(w),
  );
  assert.ok(atLimit, "the seed must contain a member at their limit for this contrast");
  const share = coop(initialState()).shares.find((s) => s.workerId === atLimit.id);
  assert.equal(share?.jobs, 0);
  assert.match(share?.shutOutReason ?? "", /limit they set for themselves/i);
  assert.match(share?.shutOutReason ?? "", /safety guard/i);
});

test("the cooperative rule leaves work unfilled rather than overworking someone", () => {
  // This is the honest cost of the protection, and federation is the answer to it. If the
  // simulation ever hides this, the demo is overclaiming.
  const outcome = coop(initialState(), 40);
  assert.ok(outcome.unfilled > 0, "at high demand the safe rule must run out of safe capacity");
  assert.equal(outcome.jobsPastSafeLimit, 0, "and it must still refuse to breach a limit");
});

test("the headline is built from the computed numbers, not asserted", () => {
  const comparison = compareRulebooks(initialState());
  const cooperative = comparison.outcomes[0];
  const alternative = comparison.outcomes[1];
  assert.match(comparison.headline, new RegExp(`Same ${comparison.demand.length} jobs`));
  assert.match(comparison.headline, new RegExp(`${cooperative.membersWithWork} members earn`));
  assert.match(comparison.headline, new RegExp(`${alternative.jobsPastSafeLimit} times`));
});

test("the simulation cannot touch the register", () => {
  const state = initialState();
  const before = JSON.stringify(state);
  compareRulebooks(state, 40);
  runRulebook(state, simulateDemand(state, 10), RULEBOOKS[1]);
  assert.equal(JSON.stringify(state), before, "a counterfactual must not mutate real state");
});

test("workload accumulates equally for every rule, so no rule is handed an advantage", () => {
  const state = initialState();
  for (const outcome of compareRulebooks(state).outcomes) {
    outcome.shares.forEach((share) => {
      assert.equal(share.minutesAdded, share.jobs * JOB_MINUTES);
      assert.equal(share.endedAt, share.startedAt + share.jobs * JOB_MINUTES);
    });
  }
});

test("the alternative rulebooks are described as rules, not as named companies", () => {
  const text = RULEBOOKS.map((r) => `${r.name} ${r.rule} ${r.consequence}`).join(" ").toLowerCase();
  for (const brand of ["uber", "ola", "swiggy", "zomato", "urban company", "urbanclap", "amazon"]) {
    assert.ok(!text.includes(brand), `must not name ${brand}; these are rule definitions`);
  }
  // Exactly one rulebook is the one actually in force.
  assert.equal(RULEBOOKS.filter((r) => r.active).length, 1);
  assert.equal(RULEBOOKS.find((r) => r.active)?.id, "cooperative");
});

test("an empty register degrades quietly instead of throwing", () => {
  const empty: AppState = { ...initialState(), workers: [], cooperatives: [] };
  assert.deepEqual(simulateDemand(empty, 10), []);
  const comparison = compareRulebooks(empty, 10);
  comparison.outcomes.forEach((outcome) => {
    assert.equal(outcome.assignments.length, 0);
    assert.equal(outcome.concentration, 0);
    assert.equal(outcome.busiestMemberName, "—");
  });
});
