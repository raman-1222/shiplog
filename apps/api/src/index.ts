import express from "express"
import cors from "cors"
import dotenv from "dotenv"
import { webhookRouter } from "./routes/webhooks"
import { healthRouter } from "./routes/health"

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())

// Must be before express.json()
app.use("/webhooks/github", express.raw({ type: "*/*" }))
app.use(express.json())

app.use("/health", healthRouter)
app.use("/webhooks", webhookRouter)

app.listen(PORT, () => {
  console.log(`ShipLog API running on port 3001`)
})