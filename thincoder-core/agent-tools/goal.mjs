// F-CC4（CONTEXT-COMPACTION.md §6.16.5）：goal 任一状态变更 ⇒ 方向转换轻推（本档只调用；文案/去重单源 = agent-tools/context.mjs）
import { pushContextNudge } from "./context.mjs"
import { requireCompletedResponse } from "../provider/errors.mjs"
import { DESC } from "../tools/shared.mjs"

/**
 * goal tool: lifecycle management for long-running autonomous goals (completion contract).
 * 描述面 = `tool-docs/goal.md`（DESC() 加载）；完成阈 / 阻塞计次 / 每回合注入 = execute 内实现注。
 */
export const goalTool = {
  name: "goal",
  description: DESC("goal"),
  parameters: {
    type: "object",
    properties: {
      action: { type: "string", enum: ["set", "complete", "blocked", "cancel"], description: "Goal lifecycle action" },
      objective: { type: "string", description: "What you are trying to accomplish (for 'set')" },
      criteria: { type: "string", description: "How completion is PROVEN: the exact check to run, e.g. 'npm test passes', 'grep finds no TODO marker' (required for 'set')" },
      reason: { type: "string", description: "The blocking condition (required for 'blocked')" },
    },
    required: ["action"],
  },
  readonly: true,
  async execute(args, ctx) {
    const agent = ctx.agent
    if (args.action === "cancel") {
      agent.goal = null
      if (ctx.depth === 0) pushContextNudge(agent) // F-CC4（depth-0 门）
      return "Goal cancelled. If the goal was blocked or impossible, explain why in your next message — the user can clarify, adjust scope, or confirm cancellation."
    }
    if (args.action === "set") {
      if (!args.objective) return "Error: 'objective' required for 'set' action."
      if (!args.criteria) {
        return "Error: 'criteria' required for 'set' — a goal without a machine-checkable proof of completion is a wish, not a goal. Name the exact check (tests, command output, search result) that proves it's done."
      }
      agent.goal = {
        objective: String(args.objective).slice(0, 500),
        criteria: String(args.criteria).slice(0, 500),
        setAt: Date.now(),
        status: "active",
        turnsUsed: 0,
        _blockTally: null, // { reason, count } — consecutive count of the same blocking condition (for blocked audit)
      }
      if (ctx.depth === 0) pushContextNudge(agent) // F-CC4（depth-0 门）
      return `Goal set: ${agent.goal.objective}\nDone when: ${agent.goal.criteria}\nThe system will inject goal status every turn. Completion and blocked claims are audited — see the reminders.`
    }
    if (!agent.goal || agent.goal.status !== "active") {
      return `Error: no active goal to '${args.action}' (current: ${agent.goal?.status ?? "none"}). Set one first.`
    }
    if (args.action === "complete") {
      const goal = agent.goal
      const goalSignature = JSON.stringify([goal.objective, goal.criteria, goal.status])
      const session = agent._sessionStart
      const goalChanged = () => agent.goal !== goal || session !== agent._sessionStart
        || goalSignature !== JSON.stringify([goal.objective, goal.criteria, goal.status])
      const changedMessage = "Goal completion unverified — the goal or session changed during verification. The current goal was not changed; verify its current criteria before completing it."
      // This independent request must not overwrite the main Responses chain.
      const judgeProvider = agent.provider?.format === "responses"
        ? { ...agent.provider, stateful: false, _responsesChain: null } : agent.provider
      // Evidence chain threshold: files were mutated this run without verify — refuse completion (aligns with completion guard)
      if (agent._mutatedThisRun && !agent._verifiedThisRun) {
        return "Error: files were modified but verify has not run. Run the check your criteria names AND the verify tool before marking the goal complete — false completion is the worst outcome of autonomous work."
      }

      // Independent judge: verify the goal was actually achieved
      // Only applies when the agent is at depth 0 (not a subagent) and has history to review
      if (ctx.depth === 0 && agent.history.length > 2) {
        try {
          // Extract recent activity: last 4 assistant messages (summarizing what was done)
          const recent = agent.history.filter(m => m.role === "assistant").slice(-4)
          const activity = recent.map(m => (m.content ?? "").slice(0, 500)).join("\n---\n")
          const { chat } = await import("../provider/index.mjs")
          const judgeRes = await chat(judgeProvider, {
            messages: [{
              role: "user",
              content: `You are an independent goal judge. Evaluate whether this goal has been achieved based on the agent's activity.

Goal: ${goal.objective}
Success criteria: ${goal.criteria}

Recent agent activity:
${activity || "(no activity recorded)"}

Has this goal been achieved? Answer ONLY "YES" or "NO" followed by a one-sentence reason.`,
            }],
            tools: [],
            signal: AbortSignal.timeout(10_000),
            // §18.6 D-TR4/D-TR6（2026-09-04 fix round1）：goal 独立评审调用经 chat()
            // 唯一采集点——补轨迹元数据 + traces 开关透传（agent.config.traces.enabled
            // ——关=不落盘必须全覆盖——与 agent.mjs/context.mjs 同模式）
            logCtx: {
              stage: "goal", kind: "goal",
              role: agent._role ?? null, depth: ctx.depth,
              session: agent._sessionStart ?? null, cwd: agent.cwd,
              traces: agent.config?.traces?.enabled !== false,
            },
          })
          if (goalChanged()) return changedMessage
          requireCompletedResponse(judgeProvider, judgeRes, "goal verification")
          const verdict = (judgeRes.content ?? "").trim()
          if (/^NO\b/i.test(verdict)) {
            return `Goal NOT complete (judge says NO): ${verdict.slice(2).trim()}\n\nContinue working or report blocked if this is a true impasse.`
          }
          if (!/^YES\b/i.test(verdict)) {
            return `Goal completion unverified — judge response ambiguous: "${verdict.slice(0, 200)}". Re-check your criteria and try again with clear evidence.`
          }
        } catch {
          if (goalChanged()) return changedMessage
          if (judgeProvider?.format === "responses") {
            return "Goal completion unverified — the judge request did not complete. The goal remains active; verify the criteria and retry or report the blocker."
          }
          // Preserve the existing fallback for other provider protocols.
        }
      }

      if (goalChanged()) return changedMessage
      agent.goal.status = "complete"
      if (ctx.depth === 0) pushContextNudge(agent) // F-CC4（depth-0 门）
      return `Goal verified complete ✓: ${agent.goal.objective}\nIn your next message, summarize the evidence (what check ran, what it showed) — the user should be able to audit this claim.`
    }
    if (args.action === "blocked") {
      if (!args.reason) return "Error: 'reason' required for 'blocked' action."
      // Blocked audit: same condition must appear 3 consecutive times (only counts as real blocking if different approaches still hit the same wall)
      const tally = agent.goal._blockTally
      const count = tally?.reason === args.reason ? tally.count + 1 : 1
      agent.goal._blockTally = { reason: args.reason, count }
      if (count < 3) {
        return `Blocked not accepted yet (${count}/3 for this condition). Try a genuinely different approach first; report blocked only if the same condition stops you ${3 - count} more time(s).`
      }
      agent.goal.status = "blocked"
      if (ctx.depth === 0) pushContextNudge(agent) // F-CC4（depth-0 门）
      return `Goal marked blocked after 3 attempts: ${args.reason}\nExplain the blocker to the user in your next message — what you tried, and what you need (clarification, permission, a decision).`
    }
    return `Error: unknown action '${args.action}'.`
  },
}
