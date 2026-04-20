import {
  S3Client,
  PutObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand
} from '@aws-sdk/client-s3'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

const s3Client = new S3Client({
  region: process.env.AWS_REGION as string,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string
  }
})

// Dùng multipart upload khi file > 5MB
const MULTIPART_THRESHOLD = 5 * 1024 * 1024
// Mỗi part tối thiểu 5MB (yêu cầu của S3)
const PART_SIZE = 5 * 1024 * 1024

export interface FileUploadResult {
  url: string
  originalName: string
  size: number
  mimeType: string
}

/**
 * Upload file lên S3.
 * - File <= 5MB: single PutObject
 * - File > 5MB: Multipart Upload (chia nhỏ từng part 5MB, upload song song từng phần)
 * Trả về object chứa đầy đủ metadata thay vì chỉ URL.
 */
export const uploadFileToS3 = async (file: Express.Multer.File): Promise<FileUploadResult> => {
  const extension = path.extname(file.originalname)
  const uniqueFilename = `${uuidv4()}${extension}`
  const key = `files/${uniqueFilename}`
  const bucket = process.env.AWS_S3_BUCKET_NAME as string

  // S3 metadata chỉ nhận ASCII — encode tên file gốc để tránh lỗi ký tự Unicode
  const encodedOriginalName = encodeURIComponent(file.originalname)

  if (file.buffer.length > MULTIPART_THRESHOLD) {
    // ── MULTIPART UPLOAD ───────────────────────────────────────────
    let uploadId: string | undefined
    try {
      const createRes = await s3Client.send(
        new CreateMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          ContentType: file.mimetype,
          Metadata: {
            'original-name': encodedOriginalName,
            'file-size': String(file.buffer.length)
          }
        })
      )
      uploadId = createRes.UploadId!

      const totalParts = Math.ceil(file.buffer.length / PART_SIZE)
      const uploadedParts: { ETag: string; PartNumber: number }[] = []

      for (let i = 0; i < totalParts; i++) {
        const start = i * PART_SIZE
        const end = Math.min(start + PART_SIZE, file.buffer.length)
        const partBuffer = file.buffer.slice(start, end)

        const partRes = await s3Client.send(
          new UploadPartCommand({
            Bucket: bucket,
            Key: key,
            UploadId: uploadId,
            PartNumber: i + 1,
            Body: partBuffer,
            ContentLength: partBuffer.length
          })
        )
        uploadedParts.push({ ETag: partRes.ETag!, PartNumber: i + 1 })
      }

      await s3Client.send(
        new CompleteMultipartUploadCommand({
          Bucket: bucket,
          Key: key,
          UploadId: uploadId,
          MultipartUpload: { Parts: uploadedParts }
        })
      )
    } catch (err) {
      // Nếu lỗi giữa chừng → abort để tránh tốn phí lưu trữ S3
      if (uploadId) {
        await s3Client
          .send(new AbortMultipartUploadCommand({ Bucket: bucket, Key: key, UploadId: uploadId }))
          .catch(() => {})
      }
      throw err
    }
  } else {
    // ── SINGLE PUT OBJECT ──────────────────────────────────────────
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          'original-name': encodedOriginalName,
          'file-size': String(file.buffer.length)
        }
      })
    )
  }

  return {
    url: `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`,
    originalName: file.originalname,
    size: file.buffer.length,
    mimeType: file.mimetype
  }
}

export const uploadAvatarToS3 = async (file: Express.Multer.File): Promise<string> => {
  const extension = path.extname(file.originalname)
  const filename = `${uuidv4()}${extension}`
  const key = `avatars/${filename}`

  await s3Client.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype
    })
  )

  return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
}
