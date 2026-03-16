import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";
// const API_URL = "http://localhost:4000";

// const authHeader = async () => {
//   const token = await AsyncStorage.getItem("access_token");
//   return {
//     Authorization: `Bearer ${token}`,
//   };
// };

// Không cần định nghĩa API_URL hay authHeader ở đây nữa
// vì đã có instance 'api' lo liệu việc gắn Token và Base URL.

// --- Task KAN-92: Search & Block ---

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
 * Lưu ý: Truyền blocked_user_id theo đúng yêu cầu của Backend ở phần fix/search-logic
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

// --- Task KAN-88: Profile & Settings ---

/**
 * Lấy thông tin cá nhân của người dùng hiện tại
 */
export const getMeApi = () => {
  return api.get("/users/me");
};

/**
 * Cập nhật thông tin Profile
 */
export const updateMeApi = (body: any) => {
  return api.patch("/users/update-profile", body);
};

/**
 * Upload avatar file (multipart/form-data)
 */
export const uploadAvatarApi = (formData: FormData) => {
  return api.post("/users/upload-avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

export const registerApi = (data: any) => {
  return api.post("/auth/register", data);
};

export const forgotPasswordApi = (email: string) => {
  return api.post("/auth/forgot-password", { email });
};
export const resetPasswordApi = (data: any) => {
  return api.post("/auth/reset-password", data);
};
