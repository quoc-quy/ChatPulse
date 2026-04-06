import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD
  }
})

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
