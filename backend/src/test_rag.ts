import dotenv from 'dotenv'
import path from 'path'
// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

import trafficRagService from './services/ai/traffic_rag.service'

async function runTest() {
  console.log('🔄 Khởi chạy RAG Service (Re-indexing nếu chưa có cache)...')
  try {
    const start = Date.now()
    await trafficRagService.initializeVectorStore()
    console.log(`⚡️ Hoàn thành khởi tạo trong ${(Date.now() - start) / 1000}s`)

    // In thông tin thống kê để kiểm tra xem Nghị định 168 đã được nạp chưa
    const stats = trafficRagService.getStats()
    console.log('\n📊 THỐNG KÊ VECTOR STORE:')
    console.log(`Số lượng chunks: ${stats.totalChunks}`)
    console.log(`Số lượng văn bản: ${stats.totalDocs}`)
    
    const hasND168 = stats.docList.some((d) => d.soHieu === '168/2024/NĐ-CP')
    if (hasND168) {
      console.log('✅ THÀNH CÔNG: Đã tìm thấy Nghị định 168/2024/NĐ-CP trong vector store!')
    } else {
      console.log('❌ LỖI: Không tìm thấy Nghị định 168/2024/NĐ-CP!')
    }

    const query = 'Nồng độ cồn khi xe máy bị phạt bao nhiêu tiền và trừ bao nhiêu điểm GPLX theo luật mới?'
    console.log(`\n❓ Câu hỏi test: "${query}"`)

    // Kiểm tra các chunk được retrieve trực tiếp
    const topChunks = await (trafficRagService as any).retrieve(query, 5)
    console.log('\n🔍 CÁC ĐOẠN ĐƯỢC TRÍCH XUẤT (RETRIEVED CHUNKS):')
    topChunks.forEach((chunk: any, i: number) => {
      console.log(`--- CHUNK ${i + 1} (RRF hoặc Cosine) ---`)
      console.log(`Văn bản: ${chunk.metadata.tenVanBan} (${chunk.metadata.soHieu})`)
      console.log(`Nội dung (trích): ${chunk.pageContent.slice(0, 300)}...\n`)
    })

    console.log('🤖 Đang hỏi LLM (meta-llama/llama-4-scout)...')
    const response = await trafficRagService.askTrafficQuestion(query)
    
    console.log('\n🟢 KẾT QUẢ TRẢ VỀ CHO FRONTEND:')
    console.log(JSON.stringify(response.card, null, 2))
    
  } catch (error) {
    console.error('🔴 Lỗi khi chạy test:', error)
  }
}

runTest()
