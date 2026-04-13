import useQueryParams from '@/hooks/useQueryParams'
import axios from 'axios'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'react-toastify'

export default function VerifyEmail() {
  const { token } = useQueryParams()
  const navigate = useNavigate()
  const [message, setMessage] = useState('')

  useEffect(() => {
    const controller = new AbortController()

    if (token) {
      axios
        .post(
          '/auth/verify-email',
          { email_verify_token: token },
          {
            baseURL: import.meta.env.VITE_API_URL,
            signal: controller.signal
          }
        )
        .then((res) => {
          setMessage(res.data.message)
          toast.success('Xác thực tài khoản thành công')
          navigate('/')
        })
    }

    return () => {
      controller.abort()
    }
  }, [token])

  return <div>{message}</div>
}
