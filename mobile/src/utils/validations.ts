export const validateEmail = (email: string): string | null => {
  if (!email) return "Email không được để trống";

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return "Định dạng email không hợp lệ (ví dụ: m@example.com)";
  }
  return null;
};

export const validateLoginIdentifier = (
  identifier: string,
): string | null => {
  if (!identifier || identifier.trim().length === 0) {
    return "Email hoặc username không được để trống";
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
export const validateUserName = (userName: string): string | null => {
  if (!userName || userName.trim().length === 0) {
    return "Tên người dùng không được để trống";
  }
  if (userName.length < 3) {
    return "Tên người dùng phải có ít nhất 3 ký tự";
  }
  return null;
};

export const validatePhone = (phone: string): string | null => {
  if (!phone) return "Số điện thoại không được để trống";
  const phoneRegex = /^[0-9]{10,11}$/;
  if (!phoneRegex.test(phone)) {
    return "Số điện thoại không hợp lệ (10-11 chữ số)";
  }
  return null;
};
