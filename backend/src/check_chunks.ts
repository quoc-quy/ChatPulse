import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.join(__dirname, '../.env') })

import trafficRagService from './services/ai/traffic_rag.service'

async function debugScores() {
  await trafficRagService.initializeVectorStore()
  const query = 'Nồng độ cồn khi xe máy bị phạt bao nhiêu tiền và trừ bao nhiêu điểm GPLX theo luật mới?'
  
  // Call retrieve with topK = 8
  const retrieved = await (trafficRagService as any).retrieve(query, 8)
  console.log('--- Top 8 retrieved chunks ---')
  retrieved.forEach((chunk: any, i: number) => {
    console.log(`\n================= CHUNK ${i + 1} =================`)
    console.log(`Doc: ${chunk.metadata.soHieu} | Article: ${chunk.metadata.article} | Clause: ${chunk.metadata.clause}`)
    console.log(`Content:\n${chunk.pageContent.slice(0, 800)}\n`)
  })
}

debugScores().catch(console.error)










