export interface BM25Document {
  id: string
  text: string
}

export class BM25 {
  private k1: number
  private b: number
  private documents: BM25Document[] = []
  private docTokens: string[][] = []
  private docLengths: number[] = []
  private avgDocLength = 0
  private docFreqs: Map<string, number> = new Map()
  private idfs: Map<string, number> = new Map()

  constructor(documents: BM25Document[], k1 = 1.5, b = 0.75) {
    this.documents = documents
    this.k1 = k1
    this.b = b
    this.initialize()
  }

  // Tokenize tiếng Việt cơ bản: Chuyển thường, loại bỏ ký tự đặc biệt, tách từ bằng khoảng trắng
  private tokenize(text: string): string[] {
    if (!text) return []
    const cleaned = text
      .toLowerCase()
      .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'<>]/g, ' ')
      .trim()
    return cleaned.split(/\s+/).filter((token) => token.length > 1) // Bỏ qua từ quá ngắn (1 ký tự)
  }

  private initialize(): void {
    const N = this.documents.length
    if (N === 0) return

    let totalLength = 0
    this.docTokens = new Array(N)
    this.docLengths = new Array(N)

    // Token hóa và đếm tần suất từ trong tài liệu
    for (let i = 0; i < N; i++) {
      const tokens = this.tokenize(this.documents[i].text)
      this.docTokens[i] = tokens
      this.docLengths[i] = tokens.length
      totalLength += tokens.length

      // Lưu trữ tần suất xuất hiện của từ (chỉ đếm 1 lần mỗi tài liệu để tính DF)
      const uniqueTokensInDoc = new Set(tokens)
      uniqueTokensInDoc.forEach((token) => {
        this.docFreqs.set(token, (this.docFreqs.get(token) || 0) + 1)
      })
    }

    this.avgDocLength = totalLength / N

    // Tính IDF cho tất cả các từ khóa
    this.docFreqs.forEach((df, term) => {
      // Công thức IDF chuẩn của BM25 với hằng số làm mượt
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1)
      this.idfs.set(term, idf > 0 ? idf : 0.0001) // Tránh IDF âm
    })
  }

  // Tính điểm BM25 cho một truy vấn trên một tài liệu cụ thể
  public getScore(query: string, docIndex: number): number {
    const queryTokens = this.tokenize(query)
    const docTokens = this.docTokens[docIndex]
    const docLength = this.docLengths[docIndex]
    
    if (docIndex >= this.documents.length || docLength === 0) return 0

    // Tính toán Tần suất Từ (Term Frequency - TF) trong tài liệu
    const tfMap: Map<string, number> = new Map()
    docTokens.forEach((token) => {
      tfMap.set(token, (tfMap.get(token) || 0) + 1)
    })

    let score = 0
    queryTokens.forEach((term) => {
      const tf = tfMap.get(term) || 0
      if (tf === 0) return

      const idf = this.idfs.get(term) || 0
      const numerator = tf * (this.k1 + 1)
      const denominator = tf + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength))
      
      score += idf * (numerator / denominator)
    })

    return score
  }

  // Tìm kiếm xếp hạng các tài liệu dựa trên câu hỏi
  public search(query: string, topK = 15): { id: string; score: number; index: number }[] {
    const scores = this.documents.map((doc, index) => {
      return {
        id: doc.id,
        score: this.getScore(query, index),
        index
      }
    })

    return scores
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }
}
