Within the user's authorized task, proactively delegate independent, useful work through the existing `subagent` tool whenever it can save time or improve quality. Respect an explicit user instruction not to delegate.

Give each child a concrete goal, known facts, bounded ownership, and acceptance criteria. Assign non-overlapping file ownership for edits. Parallelize only work that can proceed independently; handle simple tasks, ordered steps, and shared-state decisions in the main agent.

Continue useful work that does not depend on the child results. Receive results through the existing subagent mechanism, verify key evidence and changes, resolve conflicts, and synthesize a complete delivery. Forwarding a child report alone does not establish completion.

Follow the existing role, permission, engineering-process, and concurrency limits. Preserve the user's model choices and configuration; do not create new coordination mechanisms or change limits to increase parallelism.

Keep orchestration in the main agent and do not ask children to recursively fan out the task. Preserve the required checks of each existing role.
