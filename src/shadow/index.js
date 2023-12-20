import fetch from '../fetch.js'
import {
  formatUrl,
  genMetaData,
  getFingerprint,
  getMtgSig,
  getReqSig
} from './guard.js'
import { guardVersion, csecPlatform, yodaReady } from './const.js'

class ShadowGuard {
  version = guardVersion

  constructor(opts) {
    this.context = {
      dfpId: opts?.dfpId,
      version: this.version
    }
  }

  async init(actUrl) {
    actUrl = actUrl instanceof URL ? actUrl.toString() : actUrl

    this.meta = await genMetaData(actUrl, this.version)

    if (!this.context.dfpId) {
      this.context.dfpId = await this.getWebDfpId(this.meta)
    }

    this.meta.k3 = this.context.dfpId
    this.context.meta = this.meta

    return this
  }

  async getWebDfpId(metaData) {
    const fp = await getFingerprint(metaData, this.version)
    const res = await fetch.post(
      'https://appsec-mobile.meituan.com/v1/webdfpid',
      {
        data: fp
      }
    )

    return res.data.dfp
  }

  async getReqSig(reqOpt) {
    const guardURL = new URL(formatUrl(reqOpt.url || ''))

    guardURL.searchParams.append('yodaReady', yodaReady)
    guardURL.searchParams.append('csecplatform', csecPlatform)
    guardURL.searchParams.append('csecversion', this.version)
    reqOpt.url = guardURL.toString()

    const reqSig = await getReqSig(reqOpt)

    return { guardURL, reqSig }
  }

  async getMtgSig(reqSig, isShort) {
    return getMtgSig(reqSig, {
      ...this.context,
      isShort
    })
  }

  /**
   * @param {FetchOptions} reqOpt
   * @param {boolean} isShort
   * @returns
   */
  async sign(reqOpt, isShort) {
    if (!reqOpt) return reqOpt

    const { guardURL, reqSig } = await this.getReqSig(reqOpt)
    const mtgSig = await this.getMtgSig(reqSig, isShort)

    guardURL.searchParams.append('mtgsig', JSON.stringify(mtgSig.data))

    return guardURL.toString()
  }
}

export default ShadowGuard
