import axios from 'axios'
import mammoth from 'mammoth'
import xlsx from 'xlsx'
import Groq from 'groq-sdk'

const pdf = require('pdf-parse')

const MAX_TEXT_LENGTH = 50_000

const IMAGE_MIME_TYPES: Record<string, 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp'
}

export type ExtractionResult = {
  text: string
  sourceType: 'text' | 'document' | 'image' | 'spreadsheet' | 'unsupported'
}

async function extractTextFromImage(buffer: Buffer, mimeType: string): Promise<string> {
  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY as string })
    const base64Image = buffer.toString('base64')
    const dataUrl = `data:${mimeType};base64,${base64Image}`

    const completion = await groq.chat.completions.create({
      model: 'llama-3.2-11b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Hãy trích xuất văn bản có trong ảnh này.' },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 1024
    })

    return completion.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Lỗi khi trích xuất text từ ảnh bằng Groq Vision:', error)
    return ''
  }
}

export async function extractTextFromUrl(url: string): Promise<ExtractionResult> {
  try {
    // FIX LỖI: Tránh tải những URL bị rỗng hoặc không hợp lệ gây Crash Nodejs
    if (!url || !url.startsWith('http')) {
      return { text: '', sourceType: 'unsupported' }
    }

    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 30_000
    })
    const buffer = Buffer.from(response.data)

    const cleanUrl = url.split('?')[0]
    const fileExtension = cleanUrl.split('.').pop()?.toLowerCase() || ''

    switch (fileExtension) {
      case 'txt': {
        const text = buffer.toString('utf-8').substring(0, MAX_TEXT_LENGTH)
        return { text, sourceType: 'text' }
      }
      case 'pdf': {
        const pdfData = await pdf(buffer)
        const text = (pdfData.text || '').substring(0, MAX_TEXT_LENGTH)
        return { text, sourceType: 'document' }
      }
      case 'docx': {
        const docxData = await mammoth.extractRawText({ buffer })
        const text = (docxData.value || '').substring(0, MAX_TEXT_LENGTH)
        return { text, sourceType: 'document' }
      }
      case 'doc': {
        const docData = await mammoth.extractRawText({ buffer })
        const text = (docData.value || '').substring(0, MAX_TEXT_LENGTH)
        return { text, sourceType: 'document' }
      }
      case 'xlsx':
      case 'xls':
      case 'csv': {
        const workbook = xlsx.read(buffer, { type: 'buffer' })
        let excelText = ''
        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName]
          excelText += `[Sheet: ${sheetName}]\n` + xlsx.utils.sheet_to_txt(sheet) + '\n'
        })
        return { text: excelText.substring(0, MAX_TEXT_LENGTH), sourceType: 'spreadsheet' }
      }
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'webp': {
        const mimeType = IMAGE_MIME_TYPES[fileExtension] || 'image/jpeg'
        const text = await extractTextFromImage(buffer, mimeType)
        return { text, sourceType: 'image' }
      }
      default:
        return { text: '', sourceType: 'unsupported' }
    }
  } catch (error) {
    console.error('Lỗi khi trích xuất text từ file đính kèm:', error)
    return { text: '', sourceType: 'unsupported' }
  }
}

export async function extractPlainTextFromUrl(url: string): Promise<string> {
  const result = await extractTextFromUrl(url)
  return result.text
}
