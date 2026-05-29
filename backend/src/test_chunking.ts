import fs from 'fs'
import path from 'path'
import { Document } from '@langchain/core/documents'

interface DocumentMeta {
  cleaned_path: string
  so_hieu: string
  ten_van_ban: string
  loai: string
  ngay_ban_hanh: string
  the_hieu_luc: string
  hieu_luc: string
  pham_vi: string
  tu_khoa: string[]
  chu_the_ap_dung: string
  lien_quan_den: string[]
  ghi_chu: string
  van_ban_bi_bai_bo: string[]
}

function buildChunkHeader(meta: DocumentMeta): string {
  const lines: string[] = [
    `[VĂN BẢN: ${meta.so_hieu} — ${meta.ten_van_ban}]`,
    `[LOẠI: ${meta.loai} | HIỆU LỰC TỪ: ${meta.the_hieu_luc} | TRẠNG THÁI: ${meta.hieu_luc}]`,
    `[PHẠM VI: ${meta.pham_vi}]`
  ]
  if (meta.ghi_chu) lines.push(`[GHI CHÚ: ${meta.ghi_chu}]`)
  if (meta.van_ban_bi_bai_bo.length > 0) lines.push(`[THAY THẾ/BÃI BỎ: ${meta.van_ban_bi_bai_bo.join(', ')}]`)
  return lines.join('\n')
}

function structuralChunking(content: string, meta: DocumentMeta, maxLen = 700): Document[] {
  const chunks: Document[] = []
  const docHeader = buildChunkHeader(meta)
  
  // Only split on "Điều X. " or "ĐIỀU X. " at the start of a line (with dot after the number)
  const articles = content.split(/(?=\n\s*(?:Điều|ĐIỀU)\s+\d+\.\s+)/g)
  
  for (const article of articles) {
    if (!article.trim()) continue
    
    const lines = article.trim().split('\n')
    const articleTitle = lines[0].trim()
    
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

function run() {
  const filePath = path.join(__dirname, 'data/cleaned/nghi_dinh/168_2024_ND-CP_619502.txt')
  const content = fs.readFileSync(filePath, 'utf-8')
  
  const meta: DocumentMeta = {
    cleaned_path: 'cleaned/nghi_dinh/168_2024_ND-CP_619502.txt',
    so_hieu: '168/2024/NĐ-CP',
    ten_van_ban: 'Nghị định quy định xử phạt...',
    loai: 'Nghị định',
    ngay_ban_hanh: '26/12/2024',
    the_hieu_luc: '01/01/2025',
    hieu_luc: 'Còn hiệu lực',
    pham_vi: 'Xử phạt vi phạm hành chính...',
    tu_khoa: [],
    chu_the_ap_dung: '',
    lien_quan_den: [],
    ghi_chu: '',
    van_ban_bi_bai_bo: []
  }
  
  const chunks = structuralChunking(content, meta)
  const chunks7 = chunks.filter((c) => c.metadata.article === 'Điều 7')
  console.log(`Generated chunks count for Article 7: ${chunks7.length}`)
  
  chunks7.forEach((c, idx) => {
    console.log(`\n=== CHUNK ${idx + 1} (${c.metadata.clause}) ===`)
    console.log(`Length: ${c.pageContent.length}`)
    console.log(c.pageContent.slice(0, 300) + '\n...')
  })
}

run()
