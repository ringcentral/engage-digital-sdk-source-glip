
/**
 * lambda file
 */
import serverlessHTTP from 'serverless-http'
import app1 from './server'
import axios from 'axios'

export const app = serverlessHTTP(app1)

export const maintain = async () => {
  console.log('send renew request')
  await axios.put(
    `${process.env.RINGCENTRAL_ENGAGE_SOURCE_SERVER}/admin/renew-token`,
    undefined,
    {
      auth: {
        username: process.env.RINGCENTRAL_ADMIN_USERNAME,
        password: process.env.RINGCENTRAL_ADMIN_PASSWORD
      }
    }
  )
}
