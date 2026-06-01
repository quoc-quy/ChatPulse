import dotenv from 'dotenv'
import path from 'path'
dotenv.config({ path: path.resolve(__dirname, '../../../.env') })

import { ChatGroq } from '@langchain/groq'
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { Document } from '@langchain/core/documents'
import fs from 'fs'
import { BM25 } from './bm25'

// ─────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────

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
  url?: string // Nhận trường url mới được bổ sung từ metadata.json
}

interface VectorChunk {
  pageContent: string
  metadata: {
    source: string
    soHieu: string
    tenVanBan: string
    loai: string
    ngayBanHanh: string
    theHieuLuc: string
    hieuLuc: string
    phamVi: string
    tuKhoa: string[]
    chuThe: string
    lienQuanDen: string[]
    ghiChu: string
    article?: string
    clause?: string
  }
  embedding: number[]
}

// ─────────────────────────────────────────────
// STRUCTURED RESPONSE TYPES — dùng chung ở backend và frontend
// ─────────────────────────────────────────────

export interface LegalReference {
  location: string // VD: "Điểm e, Khoản 4, Điều 6"
  documentId: string // VD: "168/2024/NĐ-CP"
  documentName: string // Tên đầy đủ văn bản
  url?: string // Đường dẫn trực tiếp từ file cấu hình hệ thống
}

export interface PenaltyInfo {
  vehicleType: string // VD: "Xe máy", "Ô tô", "Xe đạp"
  fineRange: string // VD: "800.000 – 1.000.000 VNĐ"
  additionalPenalties: string[] // VD: ["Tước GPLX 1–3 tháng", "Tạm giữ xe 7 ngày"]
  pointDeduction?: string // VD: "2 điểm GPLX"
}

export interface TrafficViolationCard {
  type: 'violation'
  title: string
  behavior: string // Hành vi vi phạm
  userFriendlyExplanation: string
  penalties: PenaltyInfo[] // Mức phạt theo từng loại phương tiện
  legalRefs: LegalReference[] // Căn cứ pháp lý
  practicalAdvice: string
  note?: string // Lưu ý đặc biệt
}

export interface GeneralInfoCard {
  type: 'general'
  title: string
  summary: string // Câu trả lời trực tiếp 1–2 câu
  userFriendlyExplanation: string
  details: string[] // Các điểm giải thích thêm
  legalRefs: LegalReference[]
  practicalAdvice: string
  note?: string
}

export interface NotFoundCard {
  type: 'not_found'
  message: string
}

export type TrafficResponseCard = TrafficViolationCard | GeneralInfoCard | NotFoundCard

export interface TrafficResponse {
  card: TrafficResponseCard
  rawText: string // Giữ text gốc để fallback nếu cần
}

// ─────────────────────────────────────────────
// CACHE VERSION
// ─────────────────────────────────────────────
const CACHE_VERSION = '3'

class TrafficRagService {
  private vectorStore: VectorChunk[] = []
  private metaMap: Map<string, DocumentMeta> = new Map()
  private llm: ChatGroq
  private embeddings: HuggingFaceInferenceEmbeddings
  private isInitialized = false
  private bm25Instance: BM25 | null = null

  private readonly synonymMap: Record<string, string[]> = {
    'xe máy': ['xe mô tô', 'xe gắn máy', 'xe máy'],
    'bằng lái': ['giấy phép lái xe', 'GPLX'],
    'đèn đỏ': ['tín hiệu đèn màu đỏ', 'đèn đỏ giao thông'],
    'nồng độ cồn': ['nồng độ cồn trong máu', 'nồng độ cồn trong hơi thở', 'say rượu'],
    'phạt nguội': ['xử phạt qua hình ảnh', 'camera phạt nguội'],
    'quá tốc độ': ['vượt quá tốc độ', 'chạy quá tốc độ quy định'],
    'vượt đèn đỏ': ['không chấp hành tín hiệu đèn đỏ'],
    'điểm bằng lái': ['điểm GPLX', 'trừ điểm giấy phép lái xe', 'hệ thống điểm'],
    'sang tên xe': ['chuyển quyền sở hữu xe', 'đổi tên chủ xe'],
    'đăng kiểm': ['kiểm định an toàn kỹ thuật', 'kiểm định xe'],
    csgt: ['cảnh sát giao thông', 'CSGT'],
    oto: ['ô tô', 'xe ô tô', 'xe hơi'],
    'xe tải': ['xe vận tải', 'xe chở hàng'],
    'cao tốc': ['đường cao tốc', 'freeway'],
    'mũ bảo hiểm': ['nón bảo hiểm', 'helmet'],
    'rẽ phải đèn đỏ': ['rẽ phải khi đèn đỏ', 'quẹo phải đèn đỏ'],
    'xe công nghệ': ['grab', 'be', 'gojek', 'taxi công nghệ']
  }

  constructor() {
    this.llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.05,
      maxTokens: 1200
    })

    this.embeddings = new HuggingFaceInferenceEmbeddings({
      apiKey: process.env.HUGGINGFACEHUB_API_KEY,
      model: 'BAAI/bge-m3'
    })
  }

  private expandQuery(query: string): string {
    const q = query.toLowerCase()
    const extras: string[] = []

    for (const [term, synonyms] of Object.entries(this.synonymMap)) {
      if (q.includes(term.toLowerCase())) extras.push(...synonyms)
    }

    for (const meta of this.metaMap.values()) {
      for (const kw of meta.tu_khoa) {
        if (q.includes(kw.toLowerCase()) && !extras.includes(kw)) {
          extras.push(kw)
        }
      }
    }

    return extras.length > 0 ? `${query} ${extras.join(' ')}` : query
  }

  private buildChunkHeader(meta: DocumentMeta): string {
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

  private structuralChunking(content: string, meta: DocumentMeta, maxLen = 700): Document[] {
    const chunks: Document[] = []
    const docHeader = this.buildChunkHeader(meta)
    
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

  private getCacheKey(activeMeta: DocumentMeta[]): string {
    const signature = activeMeta
      .map((m) => `${m.so_hieu}|${m.the_hieu_luc}|${m.hieu_luc}|${m.tu_khoa.join(',')}`)
      .sort()
      .join('::')
    const hash = Buffer.from(signature).toString('base64').slice(0, 48)
    return `v${CACHE_VERSION}_${hash}`
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0,
      na = 0,
      nb = 0
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      na += a[i] * a[i]
      nb += b[i] * b[i]
    }
    if (!na || !nb) return 0
    return dot / (Math.sqrt(na) * Math.sqrt(nb))
  }

  async initializeVectorStore(): Promise<void> {
    if (this.isInitialized) return

    const basePath = path.join(__dirname, '../../data')
    const cleanedPath = path.join(basePath, 'cleaned')
    const metaPath = path.join(cleanedPath, 'metadata.json')
    const dbPath = path.join(basePath, 'vector_db.json')

    const allMeta: DocumentMeta[] = JSON.parse(fs.readFileSync(metaPath, 'utf-8'))

    const seenPaths = new Set<string>()
    const activeMeta = allMeta.filter((m) => {
      if (m.hieu_luc !== 'Còn hiệu lực') return false
      const normPath = m.cleaned_path.replace(/\\/g, '/')
      if (seenPaths.has(normPath)) return false
      seenPaths.add(normPath)
      return true
    })

    for (const m of activeMeta) this.metaMap.set(m.so_hieu, m)

    const cacheKey = this.getCacheKey(activeMeta)
    if (fs.existsSync(dbPath)) {
      try {
        const raw = fs.readFileSync(dbPath, 'utf-8')
        const cached = JSON.parse(raw)
        if (cached.cacheKey === cacheKey && Array.isArray(cached.docs) && cached.docs.length > 0) {
          this.vectorStore = cached.docs
          this.initBM25()
          this.isInitialized = true
          return
        }
      } catch {
        console.log('[RAG] Cache lỗi → Re-index')
      }
    }

    const allChunks: Document[] = []
    for (const meta of activeMeta) {
      const relPath = meta.cleaned_path.replace(/\\/g, '/')
      const filePath = path.join(cleanedPath, relPath.replace(/^cleaned\//i, ''))
      if (!fs.existsSync(filePath)) continue

      const content = fs.readFileSync(filePath, 'utf-8')
      allChunks.push(...this.structuralChunking(content, meta))
    }

    const BATCH = 8
    for (let i = 0; i < allChunks.length; i += BATCH) {
      const batch = allChunks.slice(i, i + BATCH)
      const vectors = await this.embeddings.embedDocuments(batch.map((d) => d.pageContent))

      for (let j = 0; j < batch.length; j++) {
        this.vectorStore.push({
          pageContent: batch[j].pageContent,
          metadata: batch[j].metadata as VectorChunk['metadata'],
          embedding: vectors[j]
        })
      }
      if (i % 40 === 0 && i > 0) await new Promise((r) => setTimeout(r, 800))
      else await new Promise((r) => setTimeout(r, 200))
    }

    fs.writeFileSync(dbPath, JSON.stringify({ cacheKey, docs: this.vectorStore }))
    this.initBM25()
    this.isInitialized = true
  }

  private initBM25(): void {
    if (this.vectorStore.length > 0) {
      const bm25Docs = this.vectorStore.map((chunk, index) => ({
        id: String(index),
        text: chunk.pageContent
      }))
      this.bm25Instance = new BM25(bm25Docs)
    }
  }

  private async retrieve(query: string, topK = 5): Promise<VectorChunk[]> {
    const expandedQuery = this.expandQuery(query)
    
    // 1. Tìm kiếm tương đồng vector (Cosine Similarity)
    const [queryVec] = await this.embeddings.embedDocuments([expandedQuery])
    const queryLower = expandedQuery.toLowerCase()
    const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2)
    const queryNumbers = query.match(/\d+([.,]\d+)?/g) || []

    const vectorScored = this.vectorStore.map((chunk) => {
      let score = this.cosineSimilarity(queryVec, chunk.embedding)

      for (const num of queryNumbers) {
        const alt = num.replace('.', ',')
        if (chunk.pageContent.includes(num) || chunk.pageContent.includes(alt)) score += 0.06
      }

      for (const kw of chunk.metadata.tuKhoa) {
        if (queryLower.includes(kw.toLowerCase())) score += 0.08
      }

      for (const word of queryWords) {
        if (word.length > 3 && chunk.pageContent.toLowerCase().includes(word)) score += 0.003
      }

      const year = parseInt(chunk.metadata.ngayBanHanh.split('/').pop() || '2000')
      if (year >= 2024) score += 0.02
      else if (year >= 2022) score += 0.01

      // Tăng điểm cho các điều khoản trừ điểm/tước bằng lái xe nếu câu hỏi hỏi về điểm GPLX
      if (queryLower.includes('điểm') || queryLower.includes('gplx') || queryLower.includes('bằng lái') || queryLower.includes('tước')) {
        const textWithoutHeader = chunk.pageContent.substring(chunk.pageContent.indexOf('\n\n') + 2).toLowerCase()
        if (textWithoutHeader.includes('trừ điểm') || textWithoutHeader.includes('tước quyền sử dụng') || textWithoutHeader.includes('tước gplx') || chunk.metadata.clause?.includes('12') || chunk.metadata.clause?.includes('13') || chunk.metadata.clause?.includes('15') || chunk.metadata.clause?.includes('16')) {
          score += 0.20
        }
      }

      // Tăng điểm định hướng theo loại phương tiện trong câu hỏi
      const hasOto = queryLower.includes('ô tô') || queryLower.includes('oto') || queryLower.includes('xe hơi')
      const hasXeMay = (queryLower.includes('xe máy') || queryLower.includes('mô tô') || queryLower.includes('xe gắn máy') || queryLower.includes('gắn máy')) && !queryLower.includes('chuyên dùng') && !queryLower.includes('đại') && !queryLower.includes('đạp')
      const hasXeDap = queryLower.includes('xe đạp')
      const hasChuyenDung = queryLower.includes('chuyên dùng')

      if (chunk.metadata.soHieu === '168/2024/NĐ-CP') {
        if (hasXeMay) {
          if (chunk.metadata.article === 'Điều 7') {
            score += 0.35 // Boost mạnh cho xe máy
          } else if (chunk.metadata.article === 'Điều 6' || chunk.metadata.article === 'Điều 8' || chunk.metadata.article === 'Điều 9') {
            score -= 0.40 // Phạt nặng nếu hỏi xe máy nhưng trích ô tô/chuyên dùng/xe đạp
          }
        } else if (hasOto) {
          if (chunk.metadata.article === 'Điều 6') {
            score += 0.35 // Boost mạnh cho ô tô
          } else if (chunk.metadata.article === 'Điều 7' || chunk.metadata.article === 'Điều 8' || chunk.metadata.article === 'Điều 9') {
            score -= 0.40 // Phạt nặng nếu hỏi ô tô nhưng trích xe máy/chuyên dùng/xe đạp
          }
        } else if (hasXeDap) {
          if (chunk.metadata.article === 'Điều 9') {
            score += 0.35 // Boost xe đạp
          } else if (chunk.metadata.article === 'Điều 6' || chunk.metadata.article === 'Điều 7' || chunk.metadata.article === 'Điều 8') {
            score -= 0.40 // Phạt
          }
        } else if (hasChuyenDung) {
          if (chunk.metadata.article === 'Điều 8') {
            score += 0.35 // Boost xe chuyên dùng
          } else if (chunk.metadata.article === 'Điều 6' || chunk.metadata.article === 'Điều 7' || chunk.metadata.article === 'Điều 9') {
            score -= 0.40 // Phạt
          }
        }
      }

      return { chunk, score }
    })

    // Sắp xếp các đoạn theo độ tương đồng vector (giảm dần)
    const vectorSorted = [...vectorScored].sort((a, b) => b.score - a.score).slice(0, 15)

    // 2. Tìm kiếm từ khóa BM25
    const bm25Sorted = this.bm25Instance ? this.bm25Instance.search(expandedQuery, 15) : []

    // 3. Trộn kết quả bằng Reciprocal Rank Fusion (RRF)
    const rrfScores = new Map<number, number>()
    const k = 60 // Hằng số làm mượt RRF chuẩn

    vectorSorted.forEach((item, index) => {
      const chunkIndex = this.vectorStore.indexOf(item.chunk)
      if (chunkIndex !== -1) {
        const rrfContribution = 1 / (k + index + 1)
        rrfScores.set(chunkIndex, (rrfScores.get(chunkIndex) || 0) + rrfContribution)
      }
    })

    bm25Sorted.forEach((match, index) => {
      const chunkIndex = match.index
      const rrfContribution = 1 / (k + index + 1)
      rrfScores.set(chunkIndex, (rrfScores.get(chunkIndex) || 0) + rrfContribution)
    })

    // Phạt điểm RRF cho các điều khoản không đúng loại phương tiện và boost RRF cho các điều khoản đúng loại phương tiện
    const hasOto = queryLower.includes('ô tô') || queryLower.includes('oto') || queryLower.includes('xe hơi')
    const hasXeMay = (queryLower.includes('xe máy') || queryLower.includes('mô tô') || queryLower.includes('xe gắn máy') || queryLower.includes('gắn máy')) && !queryLower.includes('chuyên dùng') && !queryLower.includes('đại') && !queryLower.includes('đạp')
    const hasXeDap = queryLower.includes('xe đạp')
    const hasChuyenDung = queryLower.includes('chuyên dùng')

    for (const [chunkIndex, rrfScore] of rrfScores.entries()) {
      const chunk = this.vectorStore[chunkIndex]
      if (chunk.metadata.soHieu === '168/2024/NĐ-CP') {
        if (hasXeMay) {
          if (chunk.metadata.article === 'Điều 6' || chunk.metadata.article === 'Điều 8' || chunk.metadata.article === 'Điều 9') {
            rrfScores.set(chunkIndex, rrfScore - 0.2) // Phạt nặng RRF
          } else if (chunk.metadata.article === 'Điều 7') {
            rrfScores.set(chunkIndex, rrfScore + 0.05) // Thêm điểm cộng RRF
          }
        } else if (hasOto) {
          if (chunk.metadata.article === 'Điều 7' || chunk.metadata.article === 'Điều 8' || chunk.metadata.article === 'Điều 9') {
            rrfScores.set(chunkIndex, rrfScore - 0.2)
          } else if (chunk.metadata.article === 'Điều 6') {
            rrfScores.set(chunkIndex, rrfScore + 0.05)
          }
        } else if (hasXeDap) {
          if (chunk.metadata.article === 'Điều 6' || chunk.metadata.article === 'Điều 7' || chunk.metadata.article === 'Điều 8') {
            rrfScores.set(chunkIndex, rrfScore - 0.2)
          } else if (chunk.metadata.article === 'Điều 9') {
            rrfScores.set(chunkIndex, rrfScore + 0.05)
          }
        } else if (hasChuyenDung) {
          if (chunk.metadata.article === 'Điều 6' || chunk.metadata.article === 'Điều 7' || chunk.metadata.article === 'Điều 9') {
            rrfScores.set(chunkIndex, rrfScore - 0.2)
          } else if (chunk.metadata.article === 'Điều 8') {
            rrfScores.set(chunkIndex, rrfScore + 0.05)
          }
        }
      }
    }

    // Tăng điểm RRF trực tiếp cho các điều khoản trừ điểm / GPLX nếu câu hỏi hỏi về điểm GPLX
    if (queryLower.includes('điểm') || queryLower.includes('gplx') || queryLower.includes('bằng lái') || queryLower.includes('tước')) {
      for (const [chunkIndex, rrfScore] of rrfScores.entries()) {
        const chunk = this.vectorStore[chunkIndex]
        const textWithoutHeader = chunk.pageContent.substring(chunk.pageContent.indexOf('\n\n') + 2).toLowerCase()
        if (textWithoutHeader.includes('trừ điểm') || textWithoutHeader.includes('tước quyền sử dụng') || textWithoutHeader.includes('tước gplx') || chunk.metadata.clause?.includes('12') || chunk.metadata.clause?.includes('13') || chunk.metadata.clause?.includes('15') || chunk.metadata.clause?.includes('16')) {
          rrfScores.set(chunkIndex, rrfScore + 0.05)
        }
      }
    }

    // Chọn ra các tài liệu có điểm RRF cao nhất
    const finalRanked = Array.from(rrfScores.entries())
      .map(([chunkIndex, rrfScore]) => ({
        chunk: this.vectorStore[chunkIndex],
        rrfScore
      }))
      .sort((a, b) => b.rrfScore - a.rrfScore)
      .map((item) => item.chunk)

    // Lấy top K tài liệu có RRF tốt nhất
    let topDocs = finalRanked.slice(0, Math.max(topK, 5))
    if (topDocs.length === 0) {
      topDocs = this.vectorStore.slice(0, 3)
    }

    // Đa dạng hóa nguồn tài liệu (tránh chỉ hiển thị duy nhất 1 văn bản)
    const countPerDoc: Record<string, number> = {}
    const diversified: VectorChunk[] = []
    for (const chunk of topDocs) {
      const key = chunk.metadata.soHieu
      if (!countPerDoc[key]) countPerDoc[key] = 0
      if (countPerDoc[key] < 4) {
        diversified.push(chunk)
        countPerDoc[key]++
      }
    }

    return diversified.length < 2 ? topDocs.slice(0, topK) : diversified.slice(0, topK)
  }

  private buildContext(chunks: VectorChunk[]): string {
    return chunks
      .map((chunk, i) => {
        const m = chunk.metadata
        return [
          `━━━ ĐOẠN ${i + 1} ━━━`,
          chunk.pageContent,
          m.article ? `📍 Vị trí: ${m.article}${m.clause ? `, ${m.clause}` : ''}` : ''
        ]
          .filter(Boolean)
          .join('\n')
      })
      .join('\n\n')
      .slice(0, 14000)
  }

  promptTemplate = PromptTemplate.fromTemplate(`
Bạn là AI tư vấn luật giao thông đường bộ Việt Nam, phiên bản 2025.

NHIỆM VỤ:
Dựa hoàn toàn vào NGỮ CẢNH PHÁP LUẬT được cung cấp để trả lời câu hỏi người dùng.
Mục tiêu là:
- Trả lời chính xác theo văn bản pháp luật
- Giải thích dễ hiểu cho người dân bình thường
- Trả về JSON để frontend hiển thị dạng thẻ (card)

━━━ QUY TẮC BẮT BUỘC ━━━
1. CHỈ sử dụng thông tin từ NGỮ CẢNH. Không tự suy diễn.
2. Nếu không đủ thông tin → trả về:
{{"type":"not_found","message":"Không tìm thấy thông tin trong cơ sở dữ liệu pháp luật hiện có."}}
3. Không được trích dẫn văn bản đã hết hiệu lực hoặc bị thay thế.
4. Chỉ trả về JSON hợp lệ. Không markdown. Không backtick. Không giải thích ngoài JSON.
5. Ngôn ngữ trả lời phải:
   - Ngắn gọn
   - Rõ ràng
   - Dễ hiểu với người không học luật
   - Không dùng văn phong quá pháp lý
6. Chỉ dùng các văn bản CÒN HIỆU LỰC. Nếu văn bản có ghi chú "Bãi bỏ" hoặc "Hết hiệu lực", KHÔNG được trích dẫn.
7. Nếu có nhiều điều khoản liên quan, hãy tóm tắt chung vào phần "behavior" và liệt kê chi tiết trong "penalties" theo từng loại phương tiện.
8. Câu trả lời phải ngắn gọn, súc tích, ưu tiên thông tin trực tiếp, tránh giải thích dài dòng.
9. Luôn cung cấp CĂN CỨ PHÁP LÝ rõ ràng cho mỗi điểm nếu có trong ngữ cảnh.
10. QUAN TRỌNG: NGUYÊN TẮC LOẠI TRỪ VI PHẠM
TRƯỚC KHI kết luận một hành vi là vi phạm và áp dụng mức phạt, BẮT BUỘC phải phân tích kỹ câu hỏi xem có chứa các yếu tố MIỄN TRỪ TRÁCH NHIỆM hay không. 
Các trường hợp miễn trừ phổ biến:
- Tình thế cấp thiết (chở người đi cấp cứu, tránh tai nạn...).
- Nhường đường cho xe ưu tiên đang phát tín hiệu (xe cứu thương, cứu hỏa...).
- Tuân thủ hiệu lệnh của người điều khiển giao thông (CSGT) trái với biển báo/đèn tín hiệu.
👉 Nếu thuộc trường hợp miễn trừ: Vẫn dùng schema "violation" nhưng tại "userFriendlyExplanation" phải khẳng định rõ là KHÔNG BỊ XỬ PHẠT và giải thích lý do. Tại mảng "penalties", trường "fineRange" ghi "Không bị xử phạt", các hình phạt khác để trống.

━━━ SCHEMA JSON ━━━

Nếu là câu hỏi về VI PHẠM / XỬ PHẠT:
{{
  "type": "violation",
  "title": "<Tiêu đề ngắn gọn>",
  "behavior": "<Hành vi vi phạm>",
  "userFriendlyExplanation": "<Giải thích đơn giản, dễ hiểu cho người dân>",
  "penalties": [
    {{
      "vehicleType": "<Loại phương tiện>",
      "fineRange": "<Mức phạt tiền>",
      "additionalPenalties": ["<Hình phạt bổ sung>"],
      "pointDeduction": "<Số điểm GPLX bị trừ hoặc null>"
    }}
  ],
  "legalRefs": [
    {{
      "location": "<Điều/Khoản/Điểm>",
      "documentId": "<Số hiệu>",
      "documentName": "<Tên đầy đủ văn bản>"
    }}
  ],
  "practicalAdvice": "<Lời khuyên thực tế cho người dân>",
  "note": "<Lưu ý thêm hoặc null>"
}}

Nếu là câu hỏi THÔNG TIN CHUNG:
{{
  "type": "general",
  "title": "<Tiêu đề ngắn>",
  "summary": "<Trả lời trực tiếp dễ hiểu>",
  "userFriendlyExplanation": "<Giải thích đơn giản, như đang giải thích cho người dân>",
  "details": [
    "<Ý chính 1>",
    "<Ý chính 2>",
    "<Ý chính 3>"
  ],
  "legalRefs": [
    {{
      "location": "<Điều/Khoản>",
      "documentId": "<Số hiệu>",
      "documentName": "<Tên đầy đủ>"
    }}
  ],
  "practicalAdvice": "<Khuyến nghị thực tế>",
  "note": "<Lưu ý hoặc null>"
}}

━━━ NGỮ CẢNH PHÁP LUẬT ━━━
{context}

━━━ CÂU HỎI NGƯỜI DÙNG ━━━
{query}

━━━ JSON RESPONSE ━━━
`)

  private parseStructuredResponse(raw: string): TrafficResponseCard {
    try {
      const cleaned = raw
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim()
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')

      const parsed = JSON.parse(jsonMatch[0])
      if (!['violation', 'general', 'not_found'].includes(parsed.type)) {
        throw new Error('Unknown type')
      }

      // Khớp số hiệu văn bản (documentId) với metaMap để tự động chèn url gốc chính xác
      if (parsed.legalRefs && Array.isArray(parsed.legalRefs)) {
        for (const ref of parsed.legalRefs) {
          if (ref.documentId) {
            const meta = this.metaMap.get(ref.documentId)
            if (meta && meta.url) {
              ref.url = meta.url
            }
          }
        }
      }

      return parsed as TrafficResponseCard
    } catch (err) {
      console.warn('[RAG] JSON parse thất bại, dùng fallback general card:', err)
      return {
        type: 'general',
        title: 'Thông tin tra cứu',
        summary: 'Hệ thống đã tìm thấy thông tin liên quan.',
        userFriendlyExplanation: 'Dưới đây là các điểm chính được trích xuất từ dữ liệu pháp luật.',
        details: raw
          .split('\n')
          .filter((l) => l.trim().length > 0)
          .slice(0, 8),
        legalRefs: [],
        practicalAdvice: 'Luôn tuân thủ luật giao thông để đảm bảo an toàn cho bạn và người khác.',
        note: undefined
      } as GeneralInfoCard
    }
  }

  async askTrafficQuestion(query: string): Promise<TrafficResponse> {
    await this.initializeVectorStore()
    const topChunks = await this.retrieve(query, 8)
    const context = this.buildContext(topChunks)
    const chain = this.promptTemplate.pipe(this.llm).pipe(new StringOutputParser())

    try {
      const rawText = await chain.invoke({ context, query })
      const card = this.parseStructuredResponse(rawText)
      return { card, rawText }
    } catch (err: any) {
      console.error('[RAG] LLM error:', err?.message)
      throw new Error('Không thể xử lý câu hỏi lúc này. Vui lòng thử lại.')
    }
  }

  async forceReindex(): Promise<void> {
    const basePath = path.join(__dirname, '../../data')
    const dbPath = path.join(basePath, 'vector_db.json')
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath)
    this.vectorStore = []
    this.metaMap.clear()
    this.isInitialized = false
    console.log('[RAG] Cache xóa. Sẽ re-index lần gọi tiếp theo.')
  }

  getStats() {
    return {
      initialized: this.isInitialized,
      totalChunks: this.vectorStore.length,
      totalDocs: this.metaMap.size,
      docList: Array.from(this.metaMap.values()).map((m) => ({
        soHieu: m.so_hieu,
        loai: m.loai,
        hieuLuc: m.hieu_luc,
        tuKhoaCount: m.tu_khoa.length
      }))
    }
  }
}

export default new TrafficRagService()
