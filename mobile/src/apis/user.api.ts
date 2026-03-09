import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

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