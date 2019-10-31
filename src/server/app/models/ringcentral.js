/**
 * User class
 */

import RingCentral from 'ringcentral-js-concise'
import delay from 'timeout-as-promise'
import { Service } from './Service'

export const subscribeInterval = () => '/restapi/v1.0/subscription/~?threshold=120&interval=35'

export class User extends Service {}

User.init = async ({ code, state }) => {
  const rc = new RingCentral(
    process.env.RINGCENTRAL_CLIENT_ID,
    process.env.RINGCENTRAL_CLIENT_SECRET,
    process.env.RINGCENTRAL_SERVER
  )
  await rc.authorize({
    code,
    redirectUri: process.env.RINGCENTRAL_ENGAGE_SOURCE_SERVER + '/rc/oauth'
  })
  const token = rc.token()
  let where = {
    id: token.owner_id
  }
  let user = await User.findOne({
    where
  })
  let existInDB = !!user
  if (user) {
    let update = {
      token
    }
    if (state === 'user') {
      update.enabled = true
    }
    await User.update(update, {
      where
    })
    Object.assign(user, update)
    return { user, existInDB }
  }
  user = await User.create({
    id: token.owner_id,
    token
  })
  return { user, existInDB }
}

Object.defineProperty(User.prototype, 'rc', {
  get: function () {
    const rc = new RingCentral(
      process.env.RINGCENTRAL_CLIENT_ID,
      process.env.RINGCENTRAL_CLIENT_SECRET,
      process.env.RINGCENTRAL_SERVER
    )
    if (this.token) {
      rc.token(this.token)
    }
    return rc
  }
})

// User.prototype.validate = async function () {
//   try {
//     await this.rc.get('/restapi/v1.0/account/~/extension/~')
//     return true
//   } catch (e) {
//     if (!e.data) {
//       throw e
//     }
//     const { errorCode } = e.data
//     if (errorCode === 'OAU-232' || errorCode === 'CMN-405') {
//       await this.check()
//       await User.destroy({
//         where: {
//           id: this.id
//         }
//       })
//       console.log(`User ${this.id} had been deleted`)
//       return false
//     }
//     throw e
//   }
// }

User.prototype.authorizeUri = function (state = 'hoder') {
  return this.rc.authorizeUri(process.env.RINGCENTRAL_ENGAGE_SOURCE_SERVER + '/rc/oauth', {
    state,
    responseType: 'code'
  })
}

User.prototype.removeWebHook = function () {
  return this.ensureWebHook(true)
}

User.prototype.ensureWebHook = async function (removeOnly = false) {
  try {
    const r = await this.rc.get('/restapi/v1.0/subscription')
    for (const sub of r.data.records) {
      if (sub.deliveryMode.address === process.env.RINGCENTRAL_ENGAGE_SOURCE_SERVER + '/rc/webhook') {
        await this.rc.delete(`/restapi/v1.0/subscription/${sub.id}`)
      }
    }
  } catch (e) {
    console.log(e, 'ensureWebHook error')
  }

  if (!removeOnly) {
    await this.setupWebHook()
  }
}

User.prototype.setupWebHook = async function () {
  let done = false
  while (!done) {
    try {
      await this.rc.post('/restapi/v1.0/subscription', {
        eventFilters: [
          '/restapi/v1.0/glip/posts',
          '/restapi/v1.0/glip/groups',
          '/restapi/v1.0/account/~/extension/~',
          '/restapi/v1.0/account/~/extension/~/message-store',
          subscribeInterval()
        ],
        expiresIn: 1799,
        deliveryMode: {
          transportType: 'WebHook',
          address: process.env.RINGCENTRAL_ENGAGE_SOURCE_SERVER + '/rc/webhook'
        }
      })
      done = true
    } catch (e) {
      const errorCode = e.data.errorCode
      if (errorCode === 'SUB-406' || errorCode === 'SUB-521') {
        await delay(10000)
        continue
      }
      throw e
    }
  }
}

User.prototype.getSubscriptions = async function () {
  try {
    const r = await this.rc.get('/restapi/v1.0/subscription')
    return r.data.records
  } catch (e) {
    console.log(e)
    return []
  }
}

User.prototype.refresh = async function () {
  try {
    let { rc } = this
    await rc.refresh()
    let token = rc.token()
    await User.update({
      token
    }, {
      where: {
        id: this.id
      }
    })
    this.token = token
    return true
  } catch (e) {
    console.log('User refresh token', e)
    await User.destroy({
      where: {
        id: this.id
      }
    })
    console.log(`User ${this.id} refresh token has expired`)
    return false
  }
}

User.prototype.getGroup = async function (groupId) {
  try {
    const r = await this.rc.get(`/restapi/v1.0/glip/groups/${groupId}`)
    return r.data
  } catch (e) {
    if (e.status === 404) {
      return undefined
    }
    throw e
  }
}

User.prototype.sendMessage = async function (groupId, messageObj) {
  const r = await this.rc.post(`/restapi/v1.0/glip/groups/${groupId}/posts`, messageObj)
  let mark = await this.markAsUnread(groupId).catch(e => {
    console.log(e.stack)
  })
  return {
    sendResult: r.data,
    markAsUnreadResult: mark
  }
}

User.prototype.markAsUnread = async function (groupId) {
  const r = await this.rc.post(`restapi/v1.0/glip/chats/${groupId}/unread`)
  return r.data
}
