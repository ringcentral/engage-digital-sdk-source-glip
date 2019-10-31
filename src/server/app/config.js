import { sign } from 'ringcentral-engage-source/dist/common/sign'
import { formatMessage } from '../lib/messages'
import axios from 'axios'
import _ from 'lodash'

// handle post added event
export const onPostAdd = async ({
  text, // original text
  isTalkToSelf, // post message to self with message start with '#me'
  textFiltered, // text without metion user
  group,
  user,
  message
}) => {
  console.log('recieve msg', message)
  if (user.secret && user.endpoint) {
    const [ event ] = await formatMessage(user, [message.body])
    const data = {
      action: 'messages.create',
      params: {
        actions: ['show', 'reply', 'list'],
        ..._.pick(event, ['id', 'thread_id', 'body', 'author'])
      }
    }
    const sig = sign(data, user.secret)
    await axios.post(user.endpoint, data, {
      headers: {
        'X-SMCCSDK-SIGNATURE': sig,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).catch(e => console.log(e))
  }
}

export const skills = []
