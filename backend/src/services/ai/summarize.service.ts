import { extractTextFromUrl, type ExtractionResult } from '~/utils/fileExtractor'
import aiService from './ai.service'
import { PromptBuilder } from './prompt.builder'
import { ErrorWithStatus } from '~/models/errors'

// ================================================================
// KIỂU DỮ LIỆU ĐẦU RA THỐNG NHẤT
// ================================================================
export interface SummarizeResult {
  /** Tóm tắt ngắn gọn chính */
  summary: string
  /** Loại nội dung được tóm tắt */
  sourceType: 'text' | 'image' | 'document' | 'spreadsheet' | 'chat' | 'unsupported'
  /** Các điểm chính (tùy loại) */
  keyPoints?: string[]
  /** Thêm metadata tùy loại */
  extra?: Record<string, unknown>
}

// ================================================================
// SERVICE TÓM TẮT ĐA ĐỊNH DẠNG
// ================================================================
class SummarizeService {
  // ──────────────────────────────────────────────────────────────
  // 1. TÓM TẮT TEXT THUẦN
  // ──────────────────────────────────────────────────────────────
  async summarizeText(textContent: string): Promise<SummarizeResult> {
    if (!textContent.trim()) {
      return { summary: 'Nội dung rỗng, không có gì để tóm tắt.', sourceType: 'text' }
    }

    const prompt = PromptBuilder.buildTextSummaryPrompt(textContent)
    const raw = await aiService.callWithJsonResponse(prompt)

    return {
      summary: raw.summary || 'Không thể tóm tắt nội dung này.',
      sourceType: 'text',
      keyPoints: raw.keyPoints || [],
      extra: { sentiment: raw.sentiment }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 2. TÓM TẮT HÌNH ẢNH (OCR rồi summarize)
  // ──────────────────────────────────────────────────────────────
  async summarizeImage(imageUrl: string): Promise<SummarizeResult> {
    const extraction = await extractTextFromUrl(imageUrl)

    if (!extraction.text.trim()) {
      return {
        summary: 'Ảnh không chứa văn bản có thể đọc được hoặc không nhận diện được nội dung.',
        sourceType: 'image'
      }
    }

    const prompt = PromptBuilder.buildImageContentSummaryPrompt(extraction.text)
    const raw = await aiService.callWithJsonResponse(prompt)

    return {
      summary: raw.summary || extraction.text.substring(0, 200),
      sourceType: 'image',
      keyPoints: raw.keyPoints || [],
      extra: { contentType: raw.contentType, extractedText: extraction.text }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 3. TÓM TẮT TÀI LIỆU (PDF, DOCX, DOC, TXT)
  // ──────────────────────────────────────────────────────────────
  async summarizeDocument(documentUrl: string): Promise<SummarizeResult> {
    const cleanUrl = documentUrl.split('?')[0]
    const fileExtension = cleanUrl.split('.').pop()?.toLowerCase() || 'unknown'

    const extraction = await extractTextFromUrl(documentUrl)

    if (!extraction.text.trim()) {
      return {
        summary: `Không thể đọc nội dung file .${fileExtension}. File có thể bị mã hóa hoặc định dạng không hỗ trợ.`,
        sourceType: 'document'
      }
    }

    const prompt = PromptBuilder.buildDocumentSummaryPrompt(extraction.text, fileExtension)
    const raw = await aiService.callWithJsonResponse(prompt)

    return {
      summary: raw.summary || 'Không thể tóm tắt tài liệu này.',
      sourceType: 'document',
      keyPoints: raw.keyPoints || [],
      extra: {
        mainTopics: raw.mainTopics || [],
        documentType: raw.documentType,
        fileExtension
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 4. TÓM TẮT BẢNG TÍNH (XLSX, XLS, CSV)
  // ──────────────────────────────────────────────────────────────
  async summarizeSpreadsheet(spreadsheetUrl: string): Promise<SummarizeResult> {
    const extraction = await extractTextFromUrl(spreadsheetUrl)

    if (!extraction.text.trim()) {
      return {
        summary: 'Không thể đọc nội dung bảng tính. File có thể rỗng hoặc bị lỗi.',
        sourceType: 'spreadsheet'
      }
    }

    const prompt = PromptBuilder.buildSpreadsheetSummaryPrompt(extraction.text)
    const raw = await aiService.callWithJsonResponse(prompt)

    return {
      summary: raw.summary || 'Không thể phân tích bảng tính này.',
      sourceType: 'spreadsheet',
      extra: {
        sheetsAnalyzed: raw.sheetsAnalyzed || [],
        dataInsights: raw.dataInsights || [],
        rowCount: raw.rowCount
      }
    }
  }

  // ──────────────────────────────────────────────────────────────
  // 5. ĐIỂM VÀO THỐNG NHẤT: Tự động nhận diện loại và tóm tắt
  // ──────────────────────────────────────────────────────────────
  async summarizeAuto(input: {
    type: 'text' | 'media' | 'image' | 'file' | string
    content: string
    fileUrl?: string
  }): Promise<SummarizeResult> {
    const { type, content, fileUrl } = input

    // Xử lý theo type của message
    if (type === 'text') {
      return this.summarizeText(content)
    }

    // Với media/file: parse JSON content để lấy URL + extension
    const url = fileUrl || this.parseUrlFromContent(content)
    if (!url) {
      return { summary: 'Không tìm thấy URL để tóm tắt.', sourceType: 'unsupported' }
    }

    const cleanUrl = url.split('?')[0]
    const ext = cleanUrl.split('.').pop()?.toLowerCase() || ''

    // Phân loại theo extension
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) {
      return this.summarizeImage(url)
    }

    if (['xlsx', 'xls', 'csv'].includes(ext)) {
      return this.summarizeSpreadsheet(url)
    }

    if (['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
      return this.summarizeDocument(url)
    }

    // Fallback: thử trích xuất chung
    const extraction = await extractTextFromUrl(url)
    if (extraction.text.trim()) {
      return this.summarizeText(extraction.text)
    }

    return { summary: 'Định dạng file không được hỗ trợ để tóm tắt.', sourceType: 'unsupported' }
  }

  // ──────────────────────────────────────────────────────────────
  // HELPER: Parse URL từ content JSON (cấu trúc ChatPulse)
  // ──────────────────────────────────────────────────────────────
  private parseUrlFromContent(content: string): string | null {
    try {
      const parsed = JSON.parse(content)
      // Hỗ trợ cả single file và array files
      if (Array.isArray(parsed)) return parsed[0]?.url || null
      return parsed.url || null
    } catch {
      // content là URL thuần túy
      if (content.startsWith('http')) return content
      return null
    }
  }
}

export const summarizeService = new SummarizeService()
export default summarizeService
