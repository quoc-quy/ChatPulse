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
};
