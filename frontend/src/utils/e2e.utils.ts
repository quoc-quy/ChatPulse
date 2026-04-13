/* eslint-disable @typescript-eslint/no-unused-vars */
import JSEncrypt from 'jsencrypt'
import CryptoJS from 'crypto-js'

export const E2E = {
  // 1. Tạo cặp khóa RSA cho người dùng mới
  generateRSAKeys: () => {
    const crypt = new JSEncrypt({ default_key_size: '2048' })
    const privateKey = crypt.getPrivateKey()
    const publicKey = crypt.getPublicKey()
    return { privateKey, publicKey }
  },

  // Dùng JSEncrypt đúng cách thay vì (window as any).JSEncrypt không tồn tại
  extractPublicKeyFromPrivate: (privateKey: string): string | null => {
    try {
      const crypt = new JSEncrypt()
      crypt.setPrivateKey(privateKey)
      return crypt.getPublicKey() || null
    } catch {
      return null
    }
  },

  // 2. Mã hóa khóa AES bằng RSA Public Key của người nhận
  encryptAESKeyWithRSA: (aesKey: string, publicKey: string) => {
    const crypt = new JSEncrypt()
    crypt.setPublicKey(publicKey)
    return crypt.encrypt(aesKey) as string
  },

  // 3. Giải mã khóa AES bằng RSA Private Key của mình
  decryptAESKeyWithRSA: (encryptedAesKey: string, privateKey: string) => {
    const crypt = new JSEncrypt()
    crypt.setPrivateKey(privateKey)
    return crypt.decrypt(encryptedAesKey) as string
  },

  // 4. Tạo một khóa AES ngẫu nhiên cho mỗi tin nhắn
  generateRandomAESKey: () => {
    return CryptoJS.lib.WordArray.random(256 / 8).toString()
  },

  // 5. Mã hóa nội dung tin nhắn bằng khóa AES
  encryptMessageAES: (message: string, aesKey: string) => {
    return CryptoJS.AES.encrypt(message, aesKey).toString()
  },

  // 6. Giải mã nội dung tin nhắn bằng khóa AES
  decryptMessageAES: (ciphertext: string, aesKey: string) => {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, aesKey)
      const decoded = bytes.toString(CryptoJS.enc.Utf8)
      // ✅ Kiểm tra kết quả giải mã hợp lệ (tránh trả về chuỗi rỗng khi sai key)
      if (!decoded) return '🔒 Không thể giải mã tin nhắn'
      return decoded
    } catch (error) {
      return '🔒 Lỗi giải mã tin nhắn'
    }
  }
}
