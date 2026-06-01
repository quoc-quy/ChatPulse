const host = window.location.hostname
const config = {
  // Nếu có biến môi trường VITE_API_URL thì dùng, ngược lại fallback về localhost (khi chạy local)
  baseUrl: import.meta.env.VITE_API_URL || `http://${host}:4000`
}
export default config
