/* eslint-disable @typescript-eslint/no-unused-vars */
import JSEncrypt from 'jsencrypt'
import CryptoJS from 'crypto-js'

export const E2E = {
  // ✅ FIX 1: Chuyển thành Promise và gọi crypt.getKey()
  generateRSAKeys: (): Promise<{ privateKey: string; publicKey: string }> => {
    return new Promise((resolve) => {
      const crypt = new JSEncrypt({ default_key_size: '2048' })

      // Bắt buộc phải gọi getKey() có callback để không làm đơ trình duyệt
      crypt.getKey(() => {
        resolve({
          privateKey: crypt.getPrivateKey(),
          publicKey: crypt.getPublicKey()
        })
      })
    })
  },

  extractPublicKeyFromPrivate: (privateKey: string): string | null => {
    try {
      const crypt = new JSEncrypt()
      crypt.setPrivateKey(privateKey)
      return crypt.getPublicKey() || null
    } catch {
      return null
    }
  },

  encryptAESKeyWithRSA: (aesKey: string, publicKey: string) => {
    const crypt = new JSEncrypt()
    crypt.setPublicKey(publicKey)
    return crypt.encrypt(aesKey) as string
  },

  decryptAESKeyWithRSA: (encryptedAesKey: string, privateKey: string): string | null => {
    try {
      const crypt = new JSEncrypt()
      crypt.setPrivateKey(privateKey)
      const decrypted = crypt.decrypt(encryptedAesKey)
      if (decrypted === false || decrypted === null) {
        return null
      }
      return decrypted as string
    } catch (error) {
      console.error('Lỗi khi giải mã AES key bằng RSA:', error)
      return null
    }
  },

  generateRandomAESKey: () => {
    return CryptoJS.lib.WordArray.random(256 / 8).toString()
  },

  encryptMessageAES: (message: string, aesKey: string) => {
    return CryptoJS.AES.encrypt(message, aesKey).toString()
  },

  decryptMessageAES: (ciphertext: string, aesKey: string) => {
    if (!aesKey) return '🔒 Lỗi khóa giải mã (Key trống)'
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, aesKey)
      const decoded = bytes.toString(CryptoJS.enc.Utf8)
      if (!decoded) return '🔒 Không thể giải mã tin nhắn (Sai key)'
      return decoded
    } catch (error) {
      return '🔒 Lỗi giải mã tin nhắn (Dữ liệu hỏng)'
    }
  }
}
