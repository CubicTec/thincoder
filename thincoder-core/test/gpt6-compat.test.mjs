/** Supported common capabilities; account-specific capacity is deliberately not inferred. */
import test from 'node:test'
import assert from 'node:assert/strict'
import { specForModel, providerSpec } from '../model-specs.mjs'
import { resolveEffortPatch } from '../session-slot-write.mjs'
import { assembleBuiltinTools } from '../tools/index.mjs'
import { buildBody } from '../provider/responses-request.mjs'

for (const model of ['gpt-6-astra', 'gpt-6.1-sol', 'gpt-6-luna']) {
  test(`${model} exposes vision and encodes each supported reasoning level`, async () => {
    assert.ok((await assembleBuiltinTools({model})).some(t => t.name === 'read_image'))
    const provider = {name:'openai-chatgpt',model,baseURL:'https://api.openai.com/v1',auth:{type:'chatgpt_oauth',enabled:true,credentialRef:'fixture'}}
    for (const effort of ['low','medium','high','xhigh','max']) {
      assert.equal(resolveEffortPatch(effort, model), effort)
      const {body} = buildBody({...provider,reasoningEffort:effort},[{role:'user',content:'hello'}],[])
      assert.deepEqual(body.reasoning,{effort})
      assert.equal(Object.hasOwn(body,'max_output_tokens'),false)
    }
    // A UI must not claim OFF when this client has no supported off request.
    assert.equal(resolveEffortPatch('off',model),null)
    assert.equal(resolveEffortPatch('none',model),null)
    assert.equal(specForModel(model).budgetSource,'conservative')
    assert.equal(providerSpec({...provider,context:200}).context,204800)
    assert.equal(specForModel(model).context,128000)
  })
}
