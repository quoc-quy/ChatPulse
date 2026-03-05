
export const validateEmail = (email: string): string | null => {
  if (!email) return "Email không được để trống";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Định dạng email không hợp lệ (ví dụ: m@example.com)";
  }
  return null;
};

export const validatePassword = (password: string): string | null => {
  if (!password) return "Mật khẩu không được để trống";
  if (password.length < 6) {
    return "Mật khẩu phải có ít nhất 6 ký tự";
  }
  return null;
};

export const validateFullName = (name: string): string | null => {
  if (!name || name.trim().length === 0) {
    return "Họ và tên không được để trống";
  }
  return null;
};
