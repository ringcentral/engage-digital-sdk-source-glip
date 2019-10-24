/**
 * demo config
 */

import RingCentral from '@ringcentral/sdk'

const rc = new RingCentral({
  server: process.env.RINGCENTRAL_SERVER_URL,
  clientId: process.env.RINGCENTRAL_CLIENT_ID,
  clientSecret: process.env.RINGCENTRAL_CLIENT_SECRET
})

async function getMessages() {
  await rc.login({
    username: process.env.RINGCENTRAL_USERNAME,
    extension: process.env.RINGCENTRAL_EXTENSION,
    password: process.env.RINGCENTRAL_PASSWORD
  })
  let res = await rc.get('/restapi/v1.0/glip/recent/chats')
  if (!res || !res.records || !res.records.length) {
    return []
  }
  let rec = res.records[0]
  res = await rc.get(`/restapi/v1.0/glip/chats/${rec.id}`)
  if (!res || !res.records) {
    return []
  }
  let final = []
  let ids = res.records.map(r => r.creatorId)
  let ids = ids.length
    ? await rc.get(`/restapi/v1.0/glip/persons/${ids.join(',')}`)
    : []
  if (!ids || !ids.length) {
    return []
  }
  let idsMap = ids.reduce((p, o) => {
    return {
      ...p,
      [o.id]: o
    }
  }, {})
  for (let r of res.records) {
    let per = idsMap[r.creatorId]
    return {
      id: r.id,
      body: r.text,
      thread_id: rec.id,
      created_at: r.creationTime,
      user: {
        id: r.creatorId,
        firstname: per.firstName,
        lastname: per.lastName,
        screenname: `${er.firstName} ${per.lastName}`,
        created_at: per.creationTime,
        updated_at: per.lastModifiedTime
      }
    }
  }
  return final
}

/**
 * handle all request
 * @param {object} body, request body
 * @param {object} req, express request
 */
exports.onRequest = async (body, req) => {
  console.log('body:', body)
  const { action, params } = body
  console.log('param', params)
  let result
  // check https://github.com/ringcentral/engage-digital-source-sdk/wiki for more info
  switch (action) {
    case 'implementation.info':
      result = {
        objects:
        {
          messages: ['create', 'show', 'list'],
          private_messages: ['create', 'show', 'list'],
          threads: ['create', 'show', 'list']
        },
        options: []
      }
      break

    case 'threads.list':
    case 'private_messages.list':
    case 'messages.list':
      result = await getMessages()
      break
    case 'threads.show':
    case 'private_messages.show':
    case 'messages.show':
      result = ''
      break
    default:
      result = {}
  }
  return result
}

// extends or override express app as you need
exports.appExtend = (app) => {
  // app.get('/some-route', (req, res) => res.end('some'))
}
