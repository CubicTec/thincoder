/** 官方 API 规格与账户目录分别取值；测试不进行真实推理。 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { specForModel, providerSpec } from '../model-specs.mjs'
import { resolveEffortPatch } from '../session-slot-write.mjs'
import { assembleBuiltinTools } from '../tools/index.mjs'
import { buildBody } from '../provider/responses-request.mjs'

for (const model of ['gpt-6-astra', 'gpt-6.1-sol', 'gpt-6-luna']) {
  test(`${model} exposes vision and encodes each supported reasoning level`, async () => {
    assert.ok((await assembleBuiltinTools({model})).some(t => t.name === 'read_image'))
    const provider = {name:'openai-responses',format:'responses',model,baseURL:'https://api.openai.com/v1',apiKey:'synthetic-test-key'}
    const efforts = model === 'gpt-6-luna' ? ['none','low','medium','high','xhigh','max'] : ['low','medium','high','xhigh','max']
    assert.deepEqual(specForModel(model).reasoningEffortEnum, efforts)
    for (const effort of efforts) {
      assert.equal(resolveEffortPatch(effort, model), effort)
      const {body} = buildBody({...provider,reasoningEffort:effort},[{role:'user',content:'hello'}],[])
      assert.deepEqual(body.reasoning,{effort})
      assert.equal(Object.hasOwn(body,'max_output_tokens'),false)
    }
    assert.equal(resolveEffortPatch('off',model),model === 'gpt-6-luna' ? 'off' : null)
    assert.equal(resolveEffortPatch('none',model),model === 'gpt-6-luna' ? 'none' : null)
    assert.equal(resolveEffortPatch('ultra',model),null)
    assert.equal(specForModel(model).budgetSource,undefined)
    assert.equal(providerSpec({...provider,context:200}).context,204800)
    assert.equal(specForModel(model).context,1050000)
    assert.equal(specForModel(model).maxOutput,128000)
    assert.equal(specForModel(model).defaultReasoningEffort,'medium')
  })
}
