/**
 * messages API
 */

import { getMembers } from './common'
import { listThreads } from './threads'
import _ from 'lodash'

/**
 * translate `![:Person](xxxx)` to username
 * @param {array} mentions
 * @param {string} text
 */
function translateText (mentions = [], text) {
  for (let m of mentions) {
    const reg = new RegExp(_.escapeRegExp(`![:Person](${m.id})`), 'g')
    text = text.replace(reg, '@' + m.name)
  }
  return text
}

/**
 * format ringcentral message to Dimelo message
 * @param {array} records message array
 */
export async function formatMessage (user, records) {
  const uids = records.map(g => g.creatorId)
  const { idsMap } = await getMembers(user, uids)
  if (!idsMap) {
    return []
  }
  return records.map(d => {
    let u = idsMap[d.creatorId]
    if (!u) {
      return null
    }
    let f = u.firstName || 'NoName'
    let l = u.lastName || ''
    let a = {
      id: u.id,
      firstname: f,
      lastname: l,
      screenname: `${u.firstName || 'NoName'} ${u.lastName || ''}`,
      created_at: u.creationTime,
      updated_at: u.lastModifiedTime
    }
    if (u.id === user.id) {
      a.puppetizable = true
    }
    return {
      actions: ['show', 'reply'],
      id: d.id,
      thread_id: d.chatId || d.groupId,
      body: translateText(d.mentions, d.text || ''),
      updated_at: d.lastModifiedTime,
      created_at: d.creationTime,
      author: a,
      attachments: d.attachments
        ? d.attachments
          .filter(f => f.imageUri)
          .map(f => {
            return {
              imageUri: f.imageUri
            }
          })
        : undefined
    }
  }).filter(d => d)
}

/**
 * list messages
 * @param {object} user user instance
 * @param {string} tid thread id
 */
export const listMessages = async (user, sinceId, tid) => {
  // /restapi/v1.0/glip/chats/chatId/posts
  if (tid) {
    const res = await user.rc.get(user.rc.server + `/restapi/v1.0/glip/chats/${tid}/posts?recordCount=2`)
    if (!res || !res.data || !res.data.records) {
      return []
    }
    return formatMessage(user, res.data.records)
  }
  let threads = await listThreads(user)
  console.log('threads', threads)
  let f = []
  for (let t of threads) {
    let { id } = t
    let arr = await listMessages(user, null, id)
    f = [
      ...f,
      ...arr
    ]
  }
  // console.log(f.map(g => {
  //   return {
  //     id: g.id,
  //     created_at: g.created_at
  //   }
  // }))
  f.sort((a, b) => {
    return a.created_at > b.created_at ? -1 : 1
  })
  // console.log(f.map(g => {
  //   return {
  //     id: g.id,
  //     created_at: g.created_at
  //   }
  // }))
  if (sinceId) {
    let i = _.findIndex(f, d => d.id === sinceId)
    f = f.slice(0, i)
  }
  console.log('fff', f)
  return f
}

/**
 * show message
 * @param {object} user user instance
 * @param {string} tid thread id
 * @param {string} mid message id
 */
export const showMessage = async (user, tid, mid) => {
  // /restapi/v1.0/glip/chats/chatId/posts/postId
  let r = await user.rc.get(`/restapi/v1.0/glip/chats/${tid}/posts/${mid}`)
  if (!r || !r.data) {
    return ''
  }
  r = r.data
  return formatMessage(user, [r.data]).then(r => r[0])
}

export const createMessage = async (user, tid, message) => {
  // /restapi/v1.0/glip/chats/chatId/posts
  const data = {
    text: message.body
  }
  let r = await user.sendMessage(
    tid,
    data
  )
  console.log('send message result', r)
  if (r) {
    return formatMessage(user, [r.sendResult]).then(r => r[0])
  }
}
