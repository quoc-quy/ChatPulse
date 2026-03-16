import { v2 as cloudinary } from 'cloudinary'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'

const cloudName = process.env.CLOUDINARY_CLOUD_NAME
const apiKey = process.env.CLOUDINARY_API_KEY
const apiSecret = process.env.CLOUDINARY_API_SECRET

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret
})

export const uploadImageBufferToCloudinary = (buffer: Buffer, folder = 'chatpulse/avatars') => {
  if (!cloudName || !apiKey || !apiSecret) {
    return Promise.reject(
      new ErrorWithStatus({
        message: 'Thiếu cấu hình Cloudinary: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET',
        status: httpStatus.BAD_REQUEST
      })
    )
  }

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image'
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Upload avatar thất bại'))
          return
        }
        resolve(result.secure_url)
      }
    )

    stream.end(buffer)
  })
}
