import databaseService from './database.services'
import { ErrorWithStatus } from '~/models/errors'
import httpStatus from '~/constants/httpStatus'
import { hashPassword } from '~/utils/crypto'
import { sendOtpEmail } from '~/utils/email'
import { Otp } from '~/models/schemas/otp.schema'

class ForgotPasswordService {
  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString()
  }

  /**
   * Bước 1: Nhận email → tạo OTP → lưu DB → gửi mail
   */
  async forgotPassword(email: string) {
    const user = await databaseService.users.findOne({ email })
    if (!user) {
      throw new ErrorWithStatus({
        message: 'Email không tồn tại trong hệ thống',
        status: httpStatus.NOT_FOUND
      })
    }

    // Xóa OTP cũ nếu có
    await databaseService.otps.deleteMany({ email })

    // Tạo OTP mới, tăng thời gian hết hạn lên 5 phút cho Mobile thoải mái thao tác
    const otp = this.generateOtp()
    const expires_at = new Date(Date.now() + 5 * 60 * 1000)

    await databaseService.otps.insertOne(new Otp({ email, otp, expires_at }))
    await sendOtpEmail(email, otp)

    return {
      message: `Mã OTP đã được gửi đến ${email}. Vui lòng kiểm tra hộp thư.`
    }
  }

  /**
   * Bước 2: Nhận email + OTP + password mới → xác thực → đổi mật khẩu
   */
  async resetPassword(email: string, otp: string, password: string) {
    // Chỉ tìm theo email để lấy bản ghi OTP mới nhất của tài khoản này
    const otpRecord = await databaseService.otps.findOne({ email })

    // Xác thực: Ép cả 2 về dạng chuỗi .toString() để chống lệch kiểu dữ liệu String/Number
    if (!otpRecord || otpRecord.otp.toString() !== otp.toString()) {
      throw new ErrorWithStatus({
        message: 'Mã OTP không chính xác',
        status: httpStatus.UNPROCESSABLE_ENTITY
      })
    }

    // Kiểm tra thời gian hết hạn mã số
    if (new Date() > otpRecord.expires_at) {
      await databaseService.otps.deleteOne({ _id: otpRecord._id })
      throw new ErrorWithStatus({
        message: 'Mã OTP đã hết hạn. Vui lòng yêu cầu lại.',
        status: httpStatus.UNPROCESSABLE_ENTITY
      })
    }

    const user = await databaseService.users.findOneAndUpdate(
      { email },
      { $set: { password: hashPassword(password), updated_at: new Date() } },
      { returnDocument: 'after' }
    )

    if (!user) {
      throw new ErrorWithStatus({
        message: 'Không tìm thấy người dùng',
        status: httpStatus.NOT_FOUND
      })
    }

    // Xóa OTP đã kích hoạt thành công
    await databaseService.otps.deleteOne({ _id: otpRecord._id })

    // Đăng xuất toàn bộ thiết bị cũ (Xóa tất cả refresh token)
    await databaseService.refreshTokens.deleteMany({ user_id: user._id })

    return { message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.' }
  }
}

const forgotPasswordService = new ForgotPasswordService()
export default forgotPasswordService
