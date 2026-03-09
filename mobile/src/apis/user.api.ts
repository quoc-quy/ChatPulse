import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";
// const API_URL = "http://localhost:4000";

<<<<<<< HEAD
// const authHeader = async () => {
//   const token = await AsyncStorage.getItem("access_token");
//   return {
//     Authorization: `Bearer ${token}`,
//   };
// };

// Không cần định nghĩa API_URL hay authHeader ở đây nữa
// vì đã có instance 'api' lo liệu việc gắn Token và Base URL.

export const searchUsers = (keyword: string) => {
  return api.get(`/users/search`, {
    params: { q: keyword },
  });
};

export const blockUser = (userId: string) => {
  return api.post(`/users/block`, { userId });
};

export const unblockUser = (userId: string) => {
  return api.delete(`/users/block/${userId}`);
=======
const API_URL = "http://localhost:4001";

// Hàm helper để tự động lấy Token đính kèm vào Header
const getAuthHeaders = async () => {
  const token = await AsyncStorage.getItem("access_token");
  return {
    Authorization: `Bearer ${token}`,
  };
};

// --- Task KAN-92: Search & Block ---

export const searchUsers = async (keyword: string) => {
  const headers = await getAuthHeaders();
  return axios.get(`${API_URL}/users/search`, {
    headers,
    params: { q: keyword }
  });
};

export const blockUser = async (userId: string) => {
  const headers = await getAuthHeaders();
  // Lưu ý: Key gửi lên phải khớp với Backend (user_id hoặc blocked_user_id)
  return axios.post(`${API_URL}/users/block`, { blocked_user_id: userId }, { headers });
};

export const unblockUser = async (userId: string) => {
  const headers = await getAuthHeaders();
  return axios.delete(`${API_URL}/users/unblock/${userId}`, { headers });
>>>>>>> fix/search-logic
};

// --- Task KAN-88: Profile & Settings ---
// Lấy thông tin cá nhân (Profile)
export const getMeApi = async () => {
  const headers = await getAuthHeaders();
  return axios.get(`${API_URL}/users/me`, { headers });
};

// Cập nhật Profile
export const updateMeApi = async (body: any) => {
  const headers = await getAuthHeaders();
  return axios.patch(`${API_URL}/users/update-profile`, body, { headers });
};