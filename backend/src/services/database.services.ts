import { MongoClient, ServerApiVersion } from 'mongodb'
import { config } from 'dotenv'
config()

const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@cluster0.ptzh2gl.mongodb.net/?appName=Cluster0`

class DatabaseService {
  private client: MongoClient
  constructor() {
    this.client = new MongoClient(uri)

    async function run() {}
  }

  async connect() {
    try {
      await this.client.db('admin').command({ ping: 1 })
      console.log('Pinged your deployment. You successfully connected to MongoDB!')
    } finally {
      await this.client.close()
    }
  }
}

const databaseService = new DatabaseService()
export default databaseService
