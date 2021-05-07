/**
 * threads related API
 */

/**
 * list recent threads
 * @param {object} user , user instance
 * @returns {array}
 */
export const listThreads = async (user) => {
  let res = await user.rc.get(user.rc.server + '/restapi/v1.0/glip/conversations?recordCount=10')
  if (!res || !res.data || !res.data.records || !res.data.records.length) {
    return []
  }
  return res.data.records.map(r => {
    return {
      actions: ['show', 'reply'],
      id: r.id
    }
  })
}

/**
 * show thread content, from conversation
 * @param {object} user user instance
 * @param {string} tid thread id string
 */
export const showThread = async (user, tid) => {
  // GET /restapi/v1.0/glip/conversations/6090260482
  let res = await user.rc.get(`/restapi/v1.0/glip/conversations/${tid}`)
  if (!res || !res.data) {
    return ''
  }
  return res.data
}
