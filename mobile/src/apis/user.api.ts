import { api } from "./api";

/**
 * Đăng ký tài khoản (ĐÃ ĐỔI RUỘT: Ép tự động gọi sang API Mobile để nhận OTP số)
 */
export const registerApi = (data: any) => {
  return api.post("/auth/register-mobile", data);
};

/**
 * Đăng ký tài khoản dành riêng cho Mobile (Nhận OTP qua Nodemailer)
 */
export const registerMobileApi = (data: any) => {
  return api.post("/auth/register-mobile", data);
};

/**
 * API xác thực mã OTP số để kích hoạt tài khoản đăng ký mới trên Mobile
 * POST /auth/verify-register-mobile
 */
export const verifyRegisterApi = (data: { email: string; otp: string }) => {
  return api.post("/auth/verify-register-mobile", data);
};

/**
 * Đăng nhập tài khoản
 */
export const loginApi = (data: any) => {
  return api.post("/auth/login", data);
};

/**
 * Gửi yêu cầu quên mật khẩu (Mobile OTP)
 * POST /auth/forgot-password-mobile
 */
export const forgotPasswordApi = (email: string) => {
  return api.post("/auth/forgot-password-mobile", { email });
};

/**
 * Xác thực mã số OTP và đặt lại mật khẩu mới cho Mobile
 * POST /auth/reset-password-mobile
 */
export const resetPasswordApi = (body: {
  email: string;
  otp: string;
  password: string;
  confirm_password: string;
}) => {
  return api.post("/auth/reset-password-mobile", body);
};

/**
 * Lấy thông tin cá nhân của người dùng hiện tại
 */
export const getMeApi = () => {
  return api.get("/users/me");
};

/**
 * Cập nhật thông tin cá nhân (Profile)
 */
export const updateMeApi = (body: any) => {
  return api.patch("/users/update-profile", body);
};

/**
 * Đổi mật khẩu trực tiếp (Khi đã đăng nhập)
 */
export const changePasswordApi = (body: {
  old_password: string;
  password: string;
  confirm_password: string;
}) => {
  return api.put("/users/change-password", body);
};

/**
 * Tìm kiếm người dùng theo từ khóa
 */
export const searchUsers = (keyword: string) => {
  return api.get(`/users/search`, {
    params: { q: keyword },
  });
};

/**
 * Chặn người dùng
 */
export const blockUser = (userId: string) => {
  return api.post(`/users/block`, { blocked_user_id: userId });
};

/**
 * Bỏ chặn người dùng
 */
export const unblockUser = (userId: string) => {
  return api.delete(`/users/unblock/${userId}`);
};

/**
 * Upload hình ảnh đại diện (Multipart/Form-Data)
 */
export const uploadAvatarApi = (formData: FormData) => {
  return api.post("/users/upload-avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
