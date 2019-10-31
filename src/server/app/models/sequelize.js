import Sequelize from 'dynamo-sequelize'

const config = {
  define: {
    timestamps: true
  },
  logging: false
}

if (process.env.DIALECT === 'dynamodb') {
  config.dialect = 'dynamo'
}

console.log(process.env.RINGCENTRAL_DATABASE_CONNECTION_URI, 'process.env.RINGCENTRAL_DATABASE_CONNECTION_URI')
const sequelize = new Sequelize(
  process.env.RINGCENTRAL_DATABASE_CONNECTION_URI,
  config
)

export default sequelize
