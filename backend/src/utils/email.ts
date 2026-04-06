const { SendEmailCommand, SESClient } = require('@aws-sdk/client-ses')
import fs from 'fs'
import path from 'path'
const { config } = require('dotenv')

import nodemailer from 'nodemailer'
import e from 'cors'

config()
// Create SES service object.
const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string
  }
})

const templatesEmail = fs.readFileSync(path.resolve('src/templates/verify-email.html'), 'utf8')

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
})

const createSendEmailCommand = ({
  fromAddress,
  toAddresses,
  ccAddresses = [],
  body,
  subject,
  replyToAddresses = []
}: {
  fromAddress: string
  toAddresses: string | string[]
  ccAddresses?: string | string[]
  body: string
  subject: string
  replyToAddresses?: string | string[]
}) => {
  return new SendEmailCommand({
    Destination: {
      /* required */
      CcAddresses: ccAddresses instanceof Array ? ccAddresses : [ccAddresses],
      ToAddresses: toAddresses instanceof Array ? toAddresses : [toAddresses]
    },
    Message: {
      /* required */
      Body: {
        /* required */
        Html: {
          Charset: 'UTF-8',
          Data: body
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject
      }
    },
    Source: fromAddress,
    ReplyToAddresses: replyToAddresses instanceof Array ? replyToAddresses : [replyToAddresses]
  })
}

// const sendVerifyEmail = async (toAddress: string, subject: string, body: string) => {
//   const sendEmailCommand = createSendEmailCommand({
//     fromAddress: process.env.SES_FROM_ADDRESS as string,
//     toAddresses: toAddress,
//     body,
//     subject
//   })

//   try {
//     return await sesClient.send(sendEmailCommand)
//   } catch (e) {
//     console.error('Failed to send email.')
//     return e
//   }
// }
// Hàm gửi mail chung cho cả Web và Mobile
const sendVerifyEmail = async (toAddress: string, subject: string, body: string) => {
  const fromAddress = (process.env.SES_FROM_ADDRESS || '').trim()

  const command = new SendEmailCommand({
    Destination: { ToAddresses: [toAddress.trim()] },
    Message: {
      Body: { Html: { Charset: 'UTF-8', Data: body } },
      Subject: { Charset: 'UTF-8', Data: subject }
    },
    Source: fromAddress
  })

  try {
    const result = await sesClient.send(command)
    console.log('[SES] Gửi mail thành công:', result.MessageId)
    return result
  } catch (e) {
    console.error('[SES] Lỗi gửi mail:', e)
    throw e
  }
}

export const sendEmailNotification = (toAddress: string, template: string = templatesEmail) => {
  return sendVerifyEmail(
    toAddress,
    'Đăng ký thành công – Chào mừng bạn đến với ChatPulse',
    template
      .replace('{{title}}', 'Chào mừng bạn đến với ChatPulse 🎉')
      .replace(
        '{{content}}',
        `
        Tài khoản của bạn đã được tạo thành công<br/>
        email: <b>${toAddress}</b><br/><br/>
        Bạn có thể đăng nhập và bắt đầu sử dụng hệ thống ngay.<br/><br/>
        (Đây là email tự động, bạn không cần phản hồi email này)
        `
      )
      .replace('{{titleLink}}', 'Đăng nhập ngay')
  )
}

export const sendForgotPasswordEmail = (
  toAddress: string,
  forgot_password_token: string,
  template: string = templatesEmail
) => {
  return sendVerifyEmail(
    toAddress,
    'Reset Password – Chào mừng bạn đến với ChatPulse',
    template
      .replace('{{title}}', 'Bạn đã nhận được email này bởi vì bạn đã yêu cầu thiết lập lại mật khẩu của bạn')
      .replace(
        '{{content}}',
        `
        Tài khoản của bạn với email<br/>
        email: <b>${toAddress}</b><br/><br/>
        (Đây là email tự động, bạn không cần phản hồi email này)
        `
      )
      .replace('{{titleLink}}', 'Thiết lập lại mật khẩu')
      .replace('{{link}}', `${process.env.CLIENT_URL}/reset-password?token=${forgot_password_token}`)
  )
}
export const sendOtpEmail = async (toEmail: string, otp: string): Promise<void> => {
  const mailOptions = {
    from: `"ChatPulse" <${process.env.MAIL_USER}>`,
    to: toEmail,
    subject: 'Mã OTP đặt lại mật khẩu',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;">
        <h2 style="color: #4F46E5; margin-bottom: 8px;">Đặt lại mật khẩu</h2>
        <p style="color: #475569;">Bạn vừa yêu cầu đặt lại mật khẩu. Dùng mã OTP bên dưới:</p>
        <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #4F46E5; text-align: center; margin: 24px 0; padding: 16px; background: #EEF2FF; border-radius: 8px;">
          ${otp}
        </div>
        <p style="color: #94a3b8; font-size: 13px;">Mã có hiệu lực trong <strong>2 phút</strong>. Không chia sẻ mã này cho bất kỳ ai.</p>
        <p style="color: #94a3b8; font-size: 13px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
      </div>
    `
  }
 
  await transporter.sendMail(mailOptions)
}