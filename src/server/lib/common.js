/**
 * common APIs
 */

import _ from 'lodash'

async function getMember (user, id) {
  let res = await user.rc.get(
    `/restapi/v1.0/glip/persons/${id}`
  )
  if (!res || !res.data) {
    return null
  }
  return res.data
}

/**
 * get member info
 * @param {object} user user instance
 * @param {array or string} ids ids array or id string
 */
export const getMembers = async (user, _ids) => {
  const ids = _.uniq(_ids)
  let arr
  if (ids.length === 1) {
    const r = await getMember(user, ids[0])
    if (r) {
      arr = [r]
    }
  } else {
    arr = await user.rc.batchGet(
      '/restapi/v1.0/glip/persons',
      ids, 10
    )
  }
  if (!arr || !arr.length) {
    return []
  }
  return arr.reduce((p, o) => {
    p.idsMap = {
      ...p.idsMap,
      [o.id]: o
    }
    p.users.push({
      id: o.id,
      screenname: `${o.firstName} ${o.lastName}`,
      created_at: o.creationTime,
      updated_at: o.lastModifiedTime
    })
    return p
  }, {
    idsMap: {},
    users: []
  })
}
