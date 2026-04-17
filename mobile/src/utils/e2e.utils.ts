import 'react-native-get-random-values'

if (typeof (globalThis as any).window === 'undefined') {
  ;(globalThis as any).window = globalThis
}

import JSEncrypt from 'jsencrypt'
import CryptoJS from 'crypto-js'

export const E2E = {
  // 1. Tạo cặp khóa RSA cho người dùng mới
  generateRSAKeys: (): Promise<{ privateKey: string; publicKey: string }> => {
    return new Promise((resolve) => {
      // Đã đồng bộ lên 2048 bit khớp với Web
      const crypt = new JSEncrypt({ default_key_size: '2048' })

      crypt.getKey(() => {
        const privateKey = crypt.getPrivateKey()
        const publicKey = crypt.getPublicKey()
        resolve({ privateKey, publicKey })
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
      return decrypted ? (decrypted as string) : null
    } catch (error) {
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
    if (!aesKey) return '🔒 Lỗi khóa giải mã'
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, aesKey)
      const decoded = bytes.toString(CryptoJS.enc.Utf8)
      if (!decoded) return '🔒 Không thể giải mã tin nhắn (Sai key)'
      return decoded
    } catch (error) {
      return '🔒 Lỗi dữ liệu mã hóa'
    }
  }
}
