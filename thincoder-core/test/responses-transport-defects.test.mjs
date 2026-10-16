/** Synthetic transport regressions: no credentials, login or external network. */
import test, { afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { chat } from '../provider/responses.mjs'
import { chat as providerChat } from '../provider/core.mjs'
import { buildBody } from '../provider/responses-request.mjs'
import { parseStream } from '../provider/responses-stream.mjs'
import { stageResponsesReplay, commitResponsesReplay, prepareResponsesContext } from '../responses-session.mjs'

const originalFetch = globalThis.fetch
afterEach(() => { globalThis.fetch = originalFetch })
const provider = () => ({ name: 'transport-fixture', format: 'responses', model: 'test-model', baseURL: 'https://api.openai.com/v1', apiKey: 'fixture-only', builtinTools: false })
const tools = [{ type: 'function', function: { name: 'read', parameters: { type: 'object', properties: {} } } }]
const call = { type: 'function_call', id: 'fc_1', call_id: 'call_1', name: 'read', arguments: '{}' }
const user = [{ role: 'user', content: 'earlier' }, { role: 'user', content: 'read' }]
const assistant = { role: 'assistant', content: '', tool_calls: [{ id: call.call_id, function: { name: 'read', arguments: '{}' } }] }
const output = { role: 'tool', tool_call_id: call.call_id, content: 'file contents' }
const frame = (event) => `data: ${JSON.stringify(event)}\n\n`
const complete = (output) => ({ type: 'response.completed', response: { id: 'resp-fixture', status: 'completed', output } })
const response = (events) => new Response(events.map(frame).join(''))

test('stateful replay checks full history, endpoint and credential before sending a suffix', async () => {
  for (const change of ['none', 'endpoint', 'credential', 'prefix', 'instruction']) {
    const p = provider(); const requests = []
    globalThis.fetch = async (_url, opts) => { requests.push(JSON.parse(opts.body)); return response([complete(requests.length === 1 ? [call] : [])]) }
    await chat(p, { messages: user, tools })
    const messages = structuredClone([...user, assistant, output])
    if (change === 'endpoint') p.baseURL = 'https://open.bigmodel.cn/api/v1'
    if (change === 'credential') p.apiKey = 'different-fixture-only'
    if (change === 'prefix') messages[0].content = 'edited earlier context'
    if (change === 'instruction') messages.splice(3, 0, { role: 'developer', content: 'new policy' })
    await chat(p, { messages, tools })
    if (change === 'none') {
      assert.equal(requests[1].previous_response_id, 'resp-fixture')
      assert.deepEqual(requests[1].input.map((item) => item.type), ['function_call_output'])
    } else {
      assert.equal(requests[1].previous_response_id, undefined, change)
      assert.equal(requests[1].input[0].role, 'user', change)
    }
  }
})

test('public API-key Responses entry does not repair or discard broken tool exchanges', async () => {
  let sends = 0
  globalThis.fetch = async () => { sends++; return response([complete([])]) }
  for (const broken of [[...user, assistant], [...user, output], [...user, assistant, output, output]]) {
    await assert.rejects(providerChat(provider(), { messages: broken, tools, logCtx: { traces: false } }), { code: 'invalid_responses_context' })
  }
  assert.equal(sends, 0)
})

test('terminal text completes a partially streamed answer without duplicating emitted tokens', async () => {
  const emitted = []
  const result = await parseStream(response([
    { type: 'response.output_text.delta', delta: 'Hello' },
    complete([{ type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Hello world' }] }]),
  ]), { onToken: (text) => emitted.push(text) })
  assert.equal(result.content, 'Hello world')
  assert.equal(emitted.join(''), result.content)
})

test('invalid and previously executed call identities are rejected before tool release', async () => {
  const { toolMapping } = buildBody(provider(), user, tools)
  for (const invalid of [{ ...call, call_id: 42 }, { ...call, status: 'failed' }]) {
    await assert.rejects(parseStream(response([complete([invalid])]), { provider: provider(), toolMapping }), /Invalid/)
  }
  await assert.rejects(parseStream(response([complete([call])]), { provider: provider(), toolMapping, previousCallIds: [call.call_id] }), /duplicate/)
})

test('an interrupt from a token callback also gates later events in the same network chunk', async () => {
  const controller = new AbortController()
  const result = await parseStream(response([{ type: 'response.output_text.delta', delta: 'partial' }, complete([call])]), {
    signal: controller.signal, onToken() { controller.abort({ interrupt: true, message: 'stop' }) },
  })
  assert.equal(result.terminalStatus, 'interrupted')
  assert.deepEqual(result.toolCalls, [])
})

test('qualified function aliases are canonicalized before native replay', async () => {
  const p = { ...provider(), auth: { type: 'chatgpt_oauth', credentialRef: 'profile' } }
  const { toolMapping } = buildBody(p, user, tools)
  const result = await parseStream(response([complete([{ ...call, name: 'thincoder.read' }])]), { provider: p, toolMapping })
  assert.equal(result.toolCalls[0].name, 'read')
  assert.equal(result.outputItems[0].name, 'read')
  assert.equal(result.outputItems[0].namespace, 'thincoder')
})

test('in-flight provider mutation cannot relabel successful replay', async () => {
  const p = provider()
  globalThis.fetch = async () => { p.model = 'other-model'; p.baseURL = 'https://changed.invalid/v1'; p.apiKey = 'changed-fixture'; return response([complete([])]) }
  const result = await chat(p, { messages: user, tools })
  assert.equal(result.responsesReplay.modelBinding, 'test-model')
  assert.equal(result.responsesReplay.endpointBinding, 'https://api.openai.com/v1')
  assert.throws(() => buildBody(p, user, tools, { responsesContext: result.responsesReplay }), /binding changed/)
})

test('native replay rebuilds on API credential changes and hosted display mirrors are not duplicated', async () => {
  const p = provider()
  const hosted = { type: 'web_search_call', id: 'ws_1', status: 'completed', action: { type: 'search', query: 'fixture', sources: [] } }
  globalThis.fetch = async () => response([complete([hosted, { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Answer' }] }])])
  const agent = { provider: p, history: structuredClone(user) }
  const result = await chat(p, { messages: [{ role: 'system', content: 'system' }, ...agent.history] })
  stageResponsesReplay(agent, result, 'system')
  agent.history.push({ role: 'tool', tool_call_id: 'web_search_call_ws_1', content: JSON.stringify({ id: hosted.id, query: 'fixture' }) }, { role: 'assistant', content: 'Answer' })
  commitResponsesReplay(agent, agent.history.at(-1))
  assert.equal(agent._responsesState.replay.orderedReplayableItems.filter((item) => item.type === 'web_search_call').length, 1)
  const messages = [{ role: 'system', content: 'system' }, ...agent.history]
  assert.ok(prepareResponsesContext(agent, messages))
  p.apiKey = 'different-fixture'
  assert.equal(prepareResponsesContext(agent, messages), undefined)
  assert.match(agent._responsesReplayWarning, /rebuilt/)
})

test('context rewrite gate refuses malformed visible tool exchanges even without a journal', async () => {
  const { assertResponsesHistoryBoundary } = await import('../responses-history-guard.mjs')
  for (const history of [[...user, assistant], [...user, output], [...user, assistant, output, output]]) {
    assert.throws(() => assertResponsesHistoryBoundary({ provider: provider(), history }), { code: 'responses_history_boundary_unresolved' })
  }
  assert.doesNotThrow(() => assertResponsesHistoryBoundary({ provider: provider(), history: [...user, assistant, output] }))
})

test('an interrupt raised by terminal-only text prevents completed tool release', async () => {
  const controller = new AbortController()
  const result = await parseStream(response([complete([
    { type: 'message', role: 'assistant', content: [{ type: 'output_text', text: 'Starting' }] }, call,
  ])]), { signal: controller.signal, onToken() { controller.abort({ interrupt: true, message: 'stop' }) } })
  assert.equal(result.terminalStatus, 'interrupted')
  assert.deepEqual(result.toolCalls, [])
})

test('same-tick account changes cannot split request credentials from inference attribution', async () => {
  const { _setAuthServiceForTest, clearInferenceStatus, getInferenceStatus } = await import('../provider/auth-context.mjs')
  const used = [], paused = []
  const p = { ...provider(), apiKey: undefined, auth: { type: 'chatgpt_oauth', enabled: true, credentialRef: 'race-account-old' } }
  _setAuthServiceForTest({
    async getAuthContext(profileId, { signal }) { used.push(profileId); return { profileId, accessToken: 'fixture-only', signal, release() {} } },
    async recordUsageLimit(profileId) { paused.push(profileId) },
  })
  globalThis.fetch = async () => new Response(JSON.stringify({ error: { code: 'subscription_sharing_usage_limit_exceeded', message: 'Fixture limit' } }), { status: 429 })
  try {
    const pending = providerChat(p, { messages: user, tools, logCtx: { traces: false } })
    p.auth.credentialRef = 'race-account-new'
    await assert.rejects(pending, { code: 'subscription_sharing_usage_limit_exceeded' })
    assert.deepEqual(used, ['race-account-old'])
    assert.deepEqual(paused, ['race-account-old'])
    assert.equal(getInferenceStatus('race-account-old').status, 'usage_limited')
    assert.equal(getInferenceStatus('race-account-new'), null)
  } finally {
    _setAuthServiceForTest(null)
    clearInferenceStatus('race-account-old'); clearInferenceStatus('race-account-new')
  }
})

test('public Responses dispatch snapshots still write the stateful chain back to its owner', async () => {
  const p = provider(), requests = []
  globalThis.fetch = async (_url, opts) => { requests.push(JSON.parse(opts.body)); return response([complete(requests.length === 1 ? [call] : [])]) }
  await providerChat(p, { messages: user, tools, logCtx: { traces: false } })
  assert.equal(p._responsesChain.id, 'resp-fixture')
  await providerChat(p, { messages: [...user, assistant, output], tools, logCtx: { traces: false } })
  assert.equal(requests[1].previous_response_id, 'resp-fixture')
  assert.equal(requests[1].input.length, 1)
  assert.equal(requests[1].input[0].type, 'function_call_output')
})
