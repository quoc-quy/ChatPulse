import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'sonner'
import { ToastContainer } from 'react-toastify'
import './index.css'
import { AppProvider } from './context/app.context'
import { SocketProvider } from './context/socket.context'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Toaster richColors />
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AppProvider>
          {/* BỌC SOCKET PROVIDER Ở ĐÂY */}
          <SocketProvider>
            <App />
          </SocketProvider>
        </AppProvider>
        <ToastContainer />
        {/* <ReactQueryDevtools initialIsOpen={false} /> */}
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
