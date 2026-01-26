import express from 'express'
import { config } from 'dotenv'
import usersRouter from './routes/users.routes'
import databaseService from './services/database.services'
config()

const app = express()
const port = process.env.PORT

app.use(express.json()) //parse JSON to body
app.use('/users', usersRouter)
databaseService.connect()

//default global error 
// app.use(defaultErrorHandler)

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
