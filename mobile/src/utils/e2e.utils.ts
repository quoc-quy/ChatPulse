// File: mobile/src/utils/e2e.utils.ts

// 🚨 BẮT BUỘC: Import polyfill này đầu tiên để tạo môi trường crypto an toàn cho React Native
import 'react-native-get-random-values';

// Polyfill window cho JSEncrypt (vì JSEncrypt thường tìm kiếm đối tượng window của trình duyệt)
if (typeof (globalThis as any).window === 'undefined') {
  (globalThis as any).window = globalThis;
}

import JSEncrypt from 'jsencrypt';
import CryptoJS from 'crypto-js';

export const E2E = {
  // 1. Tạo cặp khóa RSA cho người dùng mới
  // Sửa lại hàm này thành Promise để dùng await
  generateRSAKeys: (): Promise<{privateKey: string, publicKey: string}> => {
    return new Promise((resolve) => {
      // TẠM THỜI: Giảm xuống 1024 để test cho nhanh (bạn có thể đổi lại 2048 sau khi test xong)
      const crypt = new JSEncrypt({ default_key_size: '1024' }); 
      
      // Dùng getKey() thay vì getPrivateKey() để JSEncrypt không chặn luồng giao diện
      crypt.getKey(() => {
        const privateKey = crypt.getPrivateKey();
        const publicKey = crypt.getPublicKey();
        resolve({ privateKey, publicKey });
      });
    });
  },

  // Lấy Public Key từ Private Key
  extractPublicKeyFromPrivate: (privateKey: string): string | null => {
    try {
      const crypt = new JSEncrypt();
      crypt.setPrivateKey(privateKey);
      return crypt.getPublicKey() || null;
    } catch {
      return null;
    }
  },

  // 2. Mã hóa khóa AES bằng RSA Public Key của người nhận
  encryptAESKeyWithRSA: (aesKey: string, publicKey: string) => {
    const crypt = new JSEncrypt();
    crypt.setPublicKey(publicKey);
    return crypt.encrypt(aesKey) as string;
  },

  // 3. Giải mã khóa AES bằng RSA Private Key của mình
  decryptAESKeyWithRSA: (encryptedAesKey: string, privateKey: string) => {
    const crypt = new JSEncrypt();
    crypt.setPrivateKey(privateKey);
    return crypt.decrypt(encryptedAesKey) as string;
  },

  // 4. Tạo một khóa AES ngẫu nhiên cho mỗi tin nhắn
  generateRandomAESKey: () => {
    return CryptoJS.lib.WordArray.random(256 / 8).toString();
  },

  // 5. Mã hóa nội dung tin nhắn bằng khóa AES
  encryptMessageAES: (message: string, aesKey: string) => {
    return CryptoJS.AES.encrypt(message, aesKey).toString();
  },

  // 6. Giải mã nội dung tin nhắn bằng khóa AES
  decryptMessageAES: (ciphertext: string, aesKey: string) => {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, aesKey);
      const decoded = bytes.toString(CryptoJS.enc.Utf8);
      // Kiểm tra kết quả giải mã hợp lệ
      if (!decoded) return '🔒 Không thể giải mã tin nhắn';
      return decoded;
    } catch (error) {
      return '🔒 Lỗi giải mã tin nhắn';
    }
  }
};