/**
 * messages API
 */

import { getMembers } from './common'
import { listThreads } from './threads'

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
    return {
      actions: ['show', 'reply'],
      id: d.id,
      thread_id: d.chatId || d.groupId,
      body: d.text || '',
      author: {
        id: u.id,
        screenname: `${u.firstName} ${u.lastName}`,
        created_at: u.creationTime,
        updated_at: u.lastModifiedTime
      },
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
export const listMessages = async (user, tid) => {
  // /restapi/v1.0/glip/chats/chatId/posts
  if (tid) {
    const res = await user.rc.get(user.rc.server + `/restapi/v1.0/glip/chats/${tid}/posts?recordCount=10`)
    if (!res || !res.data || !res.data.records) {
      return []
    }
    return formatMessage(user, res.data.records)
  }
  let threads = await listThreads(user)
  let f = []
  for (let t of threads) {
    let { id } = t
    let arr = await listMessages(user, id)
    f = [
      ...f,
      ...arr
    ]
  }
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
  let r = await user.rc.post(
    `/restapi/v1.0/glip/chats/${tid}/posts`,
    data
  )
  if (r && r.data) {
    return formatMessage(user, [r.data]).then(r => r[0])
  }
}
