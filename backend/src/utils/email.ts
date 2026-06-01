const { SendEmailCommand, SESClient } = require('@aws-sdk/client-ses')
import fs from 'fs'
import path from 'path'
const { config } = require('dotenv')
import nodemailer from 'nodemailer'

config()

// 1. Khởi tạo AWS SES Client
const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string
  }
})

// 2. Khởi tạo Nodemailer Transporter (Gmail SMTP cho Mobile)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
})

const templatesEmail = fs.readFileSync(path.resolve('src/templates/verify-email.html'), 'utf8')

/**
 * HÀM GỬI MAIL TRUNG GIAN (DUNG HÒA GIỮA AWS SES VÀ GMAIL NODEMAILER)
 */
const sendEmailCore = async (toAddress: string, subject: string, body: string) => {
  const toAddressClean = toAddress.trim()

  if (process.env.MAIL_USER && process.env.MAIL_PASSWORD) {
    console.log(`[Nodemailer] Đang gửi mail tới ${toAddressClean} bằng Gmail SMTP...`)

    const mailOptions = {
      from: `"ChatPulse" <${process.env.MAIL_USER}>`,
      to: toAddressClean,
      subject: subject,
      html: body
    }

    try {
      const info = await transporter.sendMail(mailOptions)
      console.log('[Nodemailer] Gửi mail bằng Gmail thành công:', info.messageId)
      return info
    } catch (e) {
      console.error('[Nodemailer] Lỗi gửi mail bằng Gmail:', e)
      throw e
    }
  } else {
    console.log(`[AWS SES] Đang gửi mail tới ${toAddressClean} bằng SES Client...`)
    const fromAddress = (process.env.SES_FROM_ADDRESS || '').trim()

    const command = new SendEmailCommand({
      Destination: { ToAddresses: [toAddressClean] },
      Message: {
        Body: { Html: { Charset: 'UTF-8', Data: body } },
        Subject: { Charset: 'UTF-8', Data: subject }
      },
      Source: fromAddress
    })

    try {
      const result = await sesClient.send(command)
      console.log('[AWS SES] Gửi mail bằng SES thành công:', result.MessageId)
      return result
    } catch (e) {
      console.error('[AWS SES] Lỗi gửi mail bằng SES:', e)
      throw e
    }
  }
}

// --- CÁC HÀM GỬI EMAIL THEO TỪNG TÍNH NĂNG ---

// 1. Gửi Email chứa Link xác thực tài khoản (DÀNH RIÊNG CHO WEB)
export const sendEmailNotification = (
  toAddress: string,
  email_verify_token: string,
  template: string = templatesEmail
) => {
  return sendEmailCore(
    toAddress,
    'ChatPulse – Xác thực tài khoản Web',
    template
      .replace('{{title}}', 'Chào mừng bạn đến với ChatPulse 🎉')
      .replace(
        '{{content}}',
        `
        Tài khoản của bạn đã được tạo thành công trên hệ thống Web.<br/>
        Email: <b>${toAddress}</b><br/><br/>
        Bạn vui lòng xác thực email theo nút bên dưới để bắt đầu đăng nhập và sử dụng.<br/><br/>
        (Đây là email tự động, bạn không cần phản hồi email này)
        `
      )
      .replace('{{titleLink}}', 'Xác thực tài khoản')
      .replace('{{link}}', `${process.env.CLIENT_URL}/verify-email?token=${email_verify_token}`)
  )
}

// 2. Gửi Email quên mật khẩu bằng Link (DÀNH RIÊNG CHO WEB)
export const sendForgotPasswordEmail = (
  toAddress: string,
  forgot_password_token: string,
  template: string = templatesEmail
) => {
  return sendEmailCore(
    toAddress,
    'Reset Password – Chào mừng bạn đến với ChatPulse',
    template
      .replace('{{title}}', 'Bạn đã nhận được email này bởi vì bạn đã yêu cầu thiết lập lại mật khẩu của bạn')
      .replace(
        '{{content}}',
        `
        Tài khoản của bạn với email<br/>
        Email: <b>${toAddress}</b><br/><br/>
        (Đây là email tự động, bạn không cần phản hồi email này)
        `
      )
      .replace('{{titleLink}}', 'Thiết lập lại mật khẩu')
      .replace('{{link}}', `${process.env.CLIENT_URL}/forgot-password?token=${forgot_password_token}`)
  )
}

// 3. Gửi Email chứa mã số OTP Đăng ký tài khoản (DÀNH RIÊNG CHO MOBILE)
export const sendMobileRegisterOtpEmail = async (toEmail: string, otp: string): Promise<void> => {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;">
      <h2 style="color: #4F46E5; margin-bottom: 8px;">Kích hoạt tài khoản Mobile</h2>
      <p style="color: #475569;">Cảm ơn bạn đã đăng ký ChatPulse. Vui lòng dùng mã OTP số dưới đây để kích hoạt ứng dụng di động:</p>
      <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #4F46E5; text-align: center; margin: 24px 0; padding: 16px; background: #EEF2FF; border-radius: 8px;">
        ${otp}
      </div>
      <p style="color: #94a3b8; font-size: 13px;">Mã kích hoạt có hiệu lực trong <strong>10 phút</strong>. Tuyệt đối không chia sẻ mã này cho bất kỳ ai.</p>
    </div>
  `
  await sendEmailCore(toEmail, 'ChatPulse Mobile – Mã OTP xác thực tài khoản', htmlBody)
}

// 4. Gửi Email chứa mã số OTP Đặt lại mật khẩu (DÀNH RIÊNG CHO MOBILE)
export const sendOtpEmail = async (toEmail: string, otp: string): Promise<void> => {
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto; padding: 32px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0;">
      <h2 style="color: #4F46E5; margin-bottom: 8px;">Đặt lại mật khẩu</h2>
      <p style="color: #475569;">Bạn vừa yêu cầu đặt lại mật khẩu ứng dụng Mobile. Dùng mã OTP bên dưới:</p>
      <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #4F46E5; text-align: center; margin: 24px 0; padding: 16px; background: #EEF2FF; border-radius: 8px;">
        ${otp}
      </div>
      <p style="color: #94a3b8; font-size: 13px;">Mã có hiệu lực trong <strong>2 phút</strong>. Không chia sẻ mã này cho bất kỳ ai.</p>
      <p style="color: #94a3b8; font-size: 13px;">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
    </div>
  `
  await sendEmailCore(toEmail, 'Mã OTP đặt lại mật khẩu', htmlBody)
}
