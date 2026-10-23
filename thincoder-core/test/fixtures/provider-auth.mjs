import { AuthService } from "../../auth/service.mjs"

const blocked = () => { throw new Error("Unexpected external access in provider auth fixture") }

/** Real per-service inference state, with synthetic credentials and no storage or network. */
export function providerAuthStub(overrides = {}) {
  const service = new AuthService({ store: {}, fetch: blocked, now: () => Date.now() })
  service.recordUsageLimit = blocked
  const descriptors = Object.getOwnPropertyDescriptors(overrides)
  delete descriptors.getAuthContext
  Object.defineProperties(service, descriptors)
  service.getAuthContext = async (profileId, ...args) => {
    service.assertInferenceAvailable(profileId)
    return (overrides.getAuthContext ?? blocked).call(service, profileId, ...args)
  }
  return service
}
