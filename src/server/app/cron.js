/**
 * cron job to help maintain accesstoken in case webhook fails
 */

import axios from 'axios'
import { CronJob } from 'cron'

function run () {
  if (process.env.NO_CRON_JOB) {
    console.log('NO_CRON_JOB')
    return
  }
  const rule = process.env.CRON || '* * * */1 * *'
  console.log('Running cron job', rule)
  return new CronJob(rule, function () {
    axios.put(
      `${process.env.RINGCENTRAL_ENGAGE_SOURCE_SERVER}/admin/renew-token`,
      undefined,
      {
        auth: {
          username: process.env.RINGCENTRAL_ADMIN_USERNAME,
          password: process.env.RINGCENTRAL_ADMIN_PASSWORD
        }
      }
    )
      .then(() => {
        console.log('renew request send:', new Date() + '')
      })
      .catch(e => console.error('cron req fails:' + e.message))
  }, null, true)
}

run()
