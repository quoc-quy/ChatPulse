import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf'
import { Document } from '@langchain/core/documents'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

interface DocumentMeta {
  filename: string
  ten_van_ban: string
  so_hieu: string
  loai: string
  ngay_ban_hanh: string
  the_hieu_luc: string
  hieu_luc: string
  pham_vi: string
  tu_khoa: string[]
  chu_the_ap_dung: string
  lien_quan_den: string[]
  van_ban_bi_bai_bo: string[]
  ghi_chu: string
  cleaned_date: string
  cleaned_path: string
}

interface VectorChunk {
  pageContent: string
  metadata: any
  embedding: number[]
}

const basePath = path.join(__dirname, 'data')
const cleanedPath = path.join(basePath, 'cleaned')
const metaPath = path.join(cleanedPath, 'metadata.json')
const dbPath = path.join(basePath, 'vector_db.json')

function getCacheKey(activeMeta: DocumentMeta[]): string {
  const signature = activeMeta
    .map((m) => `${m.so_hieu}|${m.the_hieu_luc}|${m.hieu_luc}|${m.tu_khoa.join(',')}`)
    .sort()
    .join('::')
  const hash = Buffer.from(signature).toString('base64').slice(0, 48)
  return `v3_${hash}` // Sử dụng CACHE_VERSION = '3'
}

function buildChunkHeader(meta: DocumentMeta): string {
  const lines: string[] = [
    `[VĂN BẢN: ${meta.so_hieu} — ${meta.ten_van_ban}]`,
    `[LOẠI: ${meta.loai} | HIỆU LỰC TỪ: ${meta.the_hieu_luc} | TRẠNG THÁI: ${meta.hieu_luc}]`,
    `[PHẠM VI: ${meta.pham_vi}]`
  ]
  if (meta.ghi_chu) lines.push(`[GHI CHÚ: ${meta.ghi_chu}]`)
  if (meta.van_ban_bi_bai_bo.length > 0) lines.push(`[THAY THẾ/BÃI BỎ: ${meta.van_ban_bi_bai_bo.join(', ')}]`)
  if (meta.lien_quan_den.length > 0) lines.push(`[VĂN BẢN LIÊN QUAN: ${meta.lien_quan_den.join(', ')}]`)
  return lines.join('\n')
}

function structuralChunking(content: string, meta: DocumentMeta, maxLen = 700): Document[] {
  const chunks: Document[] = []
  const docHeader = buildChunkHeader(meta)
  
  // Tách thành các Điều
  const articles = content.split(/(?=\n\s*(?:Điều|ĐIỀU)\s+\d+\.\s+)/g)
  
  for (const article of articles) {
    if (!article.trim()) continue
    
    const lines = article.trim().split('\n')
    const articleTitle = lines[0].trim()
    
    // Tách tiếp thành các Khoản (bằng từ khóa Khoản hoặc số đầu dòng như "1. ", "2. ")
    const clauses = article.split(/(?=\n?(?:Khoản|KHOẢN)\s+\d+|\n\s*\d+\.\s+)/g)
    
    let currentClauseBuffer = ''
    const flush = (clauseText: string) => {
      if (!clauseText.trim()) return
      
      const articleMatch = articleTitle.match(/(?:Điều|ĐIỀU)\s+(\d+[A-Za-z]*)/i)
      const clauseMatch = clauseText.match(/(?:(?:Khoản|KHOẢN)\s+(\d+[A-Za-z]*)|^\s*(\d+)\.\s+)/i)
      const clauseNum = clauseMatch ? (clauseMatch[1] || clauseMatch[2]) : ''
      const clauseLabel = clauseNum ? `Khoản ${clauseNum}` : ''
      
      const chunkHeader = `${docHeader}\n[MỤC/ĐIỀU: ${articleTitle}]`
      
      chunks.push(
        new Document({
          pageContent: `${chunkHeader}\n\n${clauseText.trim()}`,
          metadata: {
            source: path.basename(meta.cleaned_path),
            soHieu: meta.so_hieu,
            tenVanBan: meta.ten_van_ban,
            loai: meta.loai,
            ngayBanHanh: meta.ngay_ban_hanh,
            theHieuLuc: meta.the_hieu_luc,
            hieuLuc: meta.hieu_luc,
            phamVi: meta.pham_vi,
            tuKhoa: meta.tu_khoa,
            chuThe: meta.chu_the_ap_dung,
            lienQuanDen: meta.lien_quan_den,
            ghiChu: meta.ghi_chu,
            article: articleMatch ? `Điều ${articleMatch[1]}` : '',
            clause: clauseLabel
          }
        })
      )
    }

    for (const clause of clauses) {
      if (currentClauseBuffer.length + clause.length > maxLen && currentClauseBuffer.trim()) {
        flush(currentClauseBuffer)
        currentClauseBuffer = ''
      }
      currentClauseBuffer += clause + '\n'
    }
    flush(currentClauseBuffer)
  }
  
  return chunks
}

async function run() {
  console.log('🔄 Đang khởi tạo bộ nạp tăng cường cho Vector DB...')
  
  if (!fs.existsSync(dbPath)) {
    console.log('🔴 LỖI: Không tìm thấy vector_db.json gốc để nâng cấp!')
    return
  }
  
  const rawDb = fs.readFileSync(dbPath, 'utf-8')
  const cached = JSON.parse(rawDb)
  const currentDocs: VectorChunk[] = cached.docs || []
  console.log(`📦 Số lượng chunks hiện tại trong vector_db: ${currentDocs.length}`)

  // Đọc metadata mới để lọc active documents
  const allMeta: DocumentMeta[] = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))
  const seenPaths = new Set<string>()
  const activeMeta = allMeta.filter((m) => {
    if (m.hieu_luc !== 'Còn hiệu lực') return false
    const normPath = m.cleaned_path.replace(/\\/g, '/')
    if (seenPaths.has(normPath)) return false
    seenPaths.add(normPath)
    return true
  })
  
  const newCacheKey = getCacheKey(activeMeta)
  console.log(`🔑 Cache Key mới sẽ lưu: "${newCacheKey}"`)

  // Kiểm tra xem Nghị định 168 đã được index chưa
  const hasND168 = currentDocs.some((d) => d.metadata.soHieu === '168/2024/NĐ-CP')
  if (hasND168) {
    console.log('🎉 Nghị định 168 đã được lập chỉ mục sẵn rồi! Chỉ cần cập nhật Cache Key.')
    cached.cacheKey = newCacheKey
    fs.writeFileSync(dbPath, JSON.stringify(cached))
    console.log('✅ Đã cập nhật Cache Key thành công!')
    return
  }

  // Nếu chưa có, chúng ta sẽ index duy nhất Nghị định 168
  const meta168 = activeMeta.find((m) => m.so_hieu === '168/2024/NĐ-CP')
  if (!meta168) {
    console.log('🔴 Không tìm thấy metadata cho Nghị định 168/2024/NĐ-CP!')
    return
  }

  const relPath = meta168.cleaned_path.replace(/\\/g, '/')
  const filePath = path.join(cleanedPath, relPath.replace(/^cleaned\//i, ''))
  console.log(`📄 Đọc tệp tin Nghị định 168 từ: ${filePath}`)
  if (!fs.existsSync(filePath)) {
    console.log('🔴 LỖI: Tệp tin không tồn tại trên đĩa!')
    return
  }

  const content = fs.readFileSync(filePath, 'utf-8')
  const chunks168 = structuralChunking(content, meta168)
  console.log(`🔪 Chia tệp thành ${chunks168.length} chunks. Bắt đầu gọi API nhúng vector...`)

  const embeddings = new HuggingFaceInferenceEmbeddings({
    apiKey: process.env.HUGGINGFACEHUB_API_KEY,
    model: 'BAAI/bge-m3'
  })

  const newChunks: VectorChunk[] = []
  const BATCH = 8
  for (let i = 0; i < chunks168.length; i += BATCH) {
    const batch = chunks168.slice(i, i + BATCH)
    console.log(`📡 Đang gửi batch ${Math.floor(i / BATCH) + 1}/${Math.ceil(chunks168.length / BATCH)}...`)
    const vectors = await embeddings.embedDocuments(batch.map((d) => d.pageContent))

    for (let j = 0; j < batch.length; j++) {
      newChunks.push({
        pageContent: batch[j].pageContent,
        metadata: batch[j].metadata,
        embedding: vectors[j]
      })
    }
    // Nghỉ 200ms để tránh rate limit
    await new Promise((r) => setTimeout(r, 200))
  }

  console.log(`✅ Đã hoàn thành nhúng ${newChunks.length} chunks của Nghị định 168.`)
  
  // Trộn vào database cũ
  const mergedDocs = [...currentDocs, ...newChunks]
  console.log(`📈 Tổng số chunks sau khi trộn: ${mergedDocs.length}`)

  // Ghi lại xuống file
  fs.writeFileSync(dbPath, JSON.stringify({
    cacheKey: newCacheKey,
    docs: mergedDocs
  }))
  console.log('💾 Đã lưu thành công vector_db.json mới!')
}

run().catch(console.error)
