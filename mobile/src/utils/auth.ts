// File: mobile/src/utils/auth.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export const clearAuthData = async () => {
  try {
    // Chỉ xóa các key liên quan đến phiên đăng nhập
    await Promise.all([
      AsyncStorage.removeItem("access_token"),
      AsyncStorage.removeItem("refresh_token"),
      AsyncStorage.removeItem("profile"),
    ]);
  } catch (error) {
    console.error("Lỗi khi dọn dẹp bộ nhớ:", error);
  }
};
