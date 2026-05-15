import { ChatGroq } from '@langchain/groq'
import { HuggingFaceInferenceEmbeddings } from '@langchain/community/embeddings/hf'
import { PromptTemplate } from '@langchain/core/prompts'
import { StringOutputParser } from '@langchain/core/output_parsers'
import { Document } from '@langchain/core/documents'
import path from 'path'
import fs from 'fs'

interface VectorDoc {
  pageContent: string
  metadata: {
    source: string
    article?: string
    clause?: string
  }
  embedding: number[]
}

class TrafficRagService {
  private vectorStore: VectorDoc[] = []
  private llm: ChatGroq
  private embeddings: HuggingFaceInferenceEmbeddings
  private isInitialized = false

  constructor() {
    this.llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY,
      model: process.env.GROQ_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
      temperature: 0.2,
      maxTokens: 700
    })

    this.embeddings = new HuggingFaceInferenceEmbeddings({
      apiKey: process.env.HUGGINGFACEHUB_API_KEY,
      model: 'BAAI/bge-m3'
    })
  }

  private synonymMap: Record<string, string[]> = {
    'xe máy': ['xe mô tô', 'xe gắn máy'],
    'vỉa hè': ['hè phố'],
    'kẹt xe': ['ùn tắc giao thông'],
    'đèn đỏ': ['tín hiệu đèn màu đỏ'],
    'bằng lái': ['giấy phép lái xe'],
    'nồng độ cồn': ['nồng độ cồn trong máu', 'nồng độ cồn trong hơi thở'],
    'phạt nguội': ['xử phạt qua hình ảnh'],
    'quá tốc độ': ['vượt quá tốc độ quy định']
  }

  private expandQuery(query: string): string {
    let expanded = query.toLowerCase()

    for (const [term, synonyms] of Object.entries(this.synonymMap)) {
      if (expanded.includes(term)) {
        expanded += ' ' + synonyms.join(' ')
      }
    }

    return expanded
  }

  private getAllFiles(dirPath: string, files: string[] = []): string[] {
    for (const file of fs.readdirSync(dirPath)) {
      const fullPath = path.join(dirPath, file)
      if (fs.statSync(fullPath).isDirectory()) {
        this.getAllFiles(fullPath, files)
      } else {
        files.push(fullPath)
      }
    }
    return files
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0
    let normA = 0
    let normB = 0

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }

    if (!normA || !normB) return 0
    return dot / (Math.sqrt(normA) * Math.sqrt(normB))
  }

  private structuralChunking(content: string, sourceName: string, maxLen = 600): Document[] {
    const chunks: Document[] = []
    const parts = content.split(/(?=\n?Điều\s+\d+|\n?Khoản\s+\d+)/g)

    let current = ''

    for (const part of parts) {
      if (current.length + part.length > maxLen && current.trim()) {
        chunks.push(this.buildChunk(current, sourceName))
        current = ''
      }
      current += part + '\n'
    }

    if (current.trim()) {
      chunks.push(this.buildChunk(current, sourceName))
    }

    return chunks
  }

  private buildChunk(content: string, sourceName: string): Document {
    const articleMatch = content.match(/Điều\s+(\d+[A-Za-z]*)/i)
    const clauseMatch = content.match(/Khoản\s+(\d+[A-Za-z]*)/i)

    return new Document({
      pageContent: content.trim(),
      metadata: {
        source: sourceName,
        article: articleMatch ? `Điều ${articleMatch[1]}` : 'Không xác định',
        clause: clauseMatch ? `Khoản ${clauseMatch[1]}` : 'Không xác định'
      }
    })
  }

  async initializeVectorStore() {
    if (this.isInitialized) return

    const basePath = path.join(__dirname, '../../data')
    const cleanedPath = path.join(basePath, 'cleaned')
    const dbPath = path.join(basePath, 'vector_db.json')

    if (fs.existsSync(dbPath)) {
      this.vectorStore = JSON.parse(fs.readFileSync(dbPath, 'utf-8'))
      this.isInitialized = true
      return
    }

    const files = this.getAllFiles(cleanedPath)
    const rawChunks: Document[] = []

    for (const filePath of files) {
      if (!filePath.endsWith('.txt')) continue
      const content = fs.readFileSync(filePath, 'utf-8')
      const source = path.basename(filePath)
      rawChunks.push(...this.structuralChunking(content, source))
    }

    const batchSize = 10

    for (let i = 0; i < rawChunks.length; i += batchSize) {
      const batch = rawChunks.slice(i, i + batchSize)
      const vectors = await this.embeddings.embedDocuments(batch.map((d) => d.pageContent))

      for (let j = 0; j < batch.length; j++) {
        this.vectorStore.push({
          pageContent: batch[j].pageContent,
          metadata: batch[j].metadata as any,
          embedding: vectors[j]
        })
      }

      await new Promise((r) => setTimeout(r, 500))
    }

    fs.writeFileSync(dbPath, JSON.stringify(this.vectorStore))
    this.isInitialized = true
  }

  async askTrafficQuestion(query: string) {
    await this.initializeVectorStore()

    const expandedQuery = this.expandQuery(query)
    const [queryEmbedding] = await this.embeddings.embedDocuments([expandedQuery])

    const numbersInQuery = query.match(/\d+([.,]\d+)?/g) || []
    const queryWords = expandedQuery.split(/\s+/).filter((w) => w.length > 2)

    const scoredDocs = this.vectorStore.map((doc) => {
      const vecScore = this.cosineSimilarity(queryEmbedding, doc.embedding)
      const content = doc.pageContent.toLowerCase()
      let keywordBoost = 0

      for (const num of numbersInQuery) {
        const alt = num.replace('.', ',')
        if (content.includes(num) || content.includes(alt)) keywordBoost += 0.06
      }

      for (const word of queryWords) {
        if (content.includes(word)) keywordBoost += 0.004
      }

      return { ...doc, score: vecScore + keywordBoost }
    })

    let topDocs = scoredDocs
      .filter((d) => d.score > 0.2)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)

    if (!topDocs.length) {
      topDocs = scoredDocs.sort((a, b) => b.score - a.score).slice(0, 2)
    }

    const context = topDocs
      .map(
        (doc) =>
          `\n[Nguồn: ${doc.metadata.source}]\n[Vị trí: ${doc.metadata.article}, ${doc.metadata.clause}]\n${doc.pageContent}`
      )
      .join('\n\n---\n\n')
      .slice(0, 12000)

    const prompt = PromptTemplate.fromTemplate(`
Bạn là AI tư vấn luật giao thông Việt Nam.
Chỉ trả lời dựa trên ngữ cảnh.
Nếu có nhiều văn bản liên quan, ưu tiên văn bản mới nhất.
Không đủ dữ liệu thì trả lời đúng câu:
"Không tìm thấy căn cứ pháp lý rõ ràng trong dữ liệu hiện có."

Trả lời theo mẫu:

Trả lời nhanh:
...

Giải thích:
...

Căn cứ pháp lý: (Viết liền mạch thành 1 câu chuẩn pháp lý. Ví dụ: Khoản ..., Điều ..., [Tên văn bản hoặc File nguồn].)

Ngữ cảnh:
{context}

Câu hỏi:
{query}

Trả lời:
`)

    const chain = prompt.pipe(this.llm).pipe(new StringOutputParser())

    return await chain.invoke({ context, query })
  }
}

export default new TrafficRagService()
