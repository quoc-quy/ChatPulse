// Bước 1: Polyfill DOMException TRƯỚC TIÊN — dùng require() thay vì import
// vì import bị hoist lên đầu file bởi Metro bundler, khiến polyfill chạy quá muộn.
// require() chạy theo đúng thứ tự trong file nên đảm bảo DOMException tồn tại
// trước khi bất kỳ module nào (socket.io-client, crypto-js, v.v.) được load.
if (typeof globalThis.DOMException === 'undefined') {
  class DOMException extends Error {
    code: number
    constructor(message?: string, name?: string) {
      super(message)
      this.name = name || 'Error'
      this.code = 0
    }
  }
  ;(globalThis as any).DOMException = DOMException
}

// Bước 2: Sau khi polyfill xong mới require các module cần DOMException
require('react-native-get-random-values')

// ✅ BƯỚC 2.5: registerGlobals() PHẢI được gọi TRƯỚC KHI load bất kỳ module LiveKit nào
// Đây là bước khởi tạo WebRTC native bridge và các polyfills cho LiveKit React Native
// Nếu thiếu bước này → "WebRTC isn't detected" hoặc thiếu polyfills → LiveKit không hoạt động đúng
console.log('[index.ts] BUNDLE VERSION: v5 — registerGlobals() from @livekit/react-native will be called')
try {
  const { registerGlobals } = require('@livekit/react-native')
  registerGlobals()
  console.log('[index.ts] ✅ registerGlobals() from @livekit/react-native called successfully — WebRTC and LiveKit are ready')
} catch (e) {
  console.error('[index.ts] ❌ registerGlobals() FAILED:', e)
}

// Bước 3: Load App và đăng ký
const { registerRootComponent } = require('expo')
const { default: App } = require('./App')

registerRootComponent(App)
