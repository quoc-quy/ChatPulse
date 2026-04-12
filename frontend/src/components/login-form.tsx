/* eslint-disable @typescript-eslint/no-unused-vars */
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldSeparator } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { userRegistrationSchema, type UserSchema } from '@/utils/rules'
import { useMutation } from '@tanstack/react-query'
import authApi from '@/apis/auth.api'
import { toast } from 'react-toastify'
import { useContext, useEffect } from 'react'
import { AppContext } from '@/context/app.context'
import backgroundLoginImage from '../../public/background-login.png'
import userApi from '@/apis/user.api'
import axios from 'axios'

const getGoogleAuthUrl = () => {
  const { VITE_GOOGLE_CLIENT_ID, VITE_GOOGLE_REDIRECT_URI } = import.meta.env
  const url = `https://accounts.google.com/o/oauth2/v2/auth`
  const query = {
    client_id: VITE_GOOGLE_CLIENT_ID,
    redirect_uri: VITE_GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'].join(
      ' '
    ),
    prompt: 'consent',
    access_type: 'offline'
  }
  const queryString = new URLSearchParams(query).toString()
  return `${url}?${queryString}`
}

const googleOauthUrl = getGoogleAuthUrl()

type FormData = Pick<UserSchema, 'email' | 'password'>
const loginSchema = userRegistrationSchema.pick(['email', 'password'])
export function LoginForm({ className, ...props }: React.ComponentProps<'div'>) {
  const [params] = useSearchParams()
  const { setIsAuthenticated, setProfile } = useContext(AppContext)
  const navigate = useNavigate()
  useEffect(() => {
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')

    if (access_token && refresh_token) {
      localStorage.setItem('access_token', access_token)
      localStorage.setItem('refresh_token', refresh_token)

      const fetchProfile = async () => {
        try {
          const response = await axios.get('http://localhost:4000/users/me', {
            headers: { Authorization: `Bearer ${access_token}` }
          })

          const user = response.data.user

          localStorage.setItem('profile', JSON.stringify(user))

          setProfile(user)
          setIsAuthenticated(true)

          toast.success('Đăng nhập thành công')
          window.location.href = '/'
        } catch (error) {
          console.error('Lỗi lấy profile:', error)
          toast.error('Không thể xác thực thông tin người dùng')
        }
      }

      fetchProfile()
    }
  }, [params, navigate, setIsAuthenticated, setProfile])

  const {
    handleSubmit,
    register,
    formState: { errors },
    setError
  } = useForm<FormData>({
    resolver: yupResolver(loginSchema)
  })

  const loginMutation = useMutation({
    mutationFn: (body: FormData) => authApi.login(body)
  })

  const onSubmit = handleSubmit((data) => {
    loginMutation.mutate(data, {
      onSuccess: (data) => {
        navigate('/')
        setIsAuthenticated(true)
        setProfile(data.data.result.user)
        toast.success('Đăng nhập thành công')
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        const data = error?.response?.data

        if (data?.errors) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          Object.entries(data.errors).forEach(([field, errorObj]: any) => {
            setError(field as keyof FormData, {
              type: 'server',
              message: errorObj.msg
            })
          })
          return
        }

        toast.error(data?.message || 'Đăng nhập thất bại')
      }
    })
  })

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className='overflow-hidden p-0'>
        <CardContent className='grid p-0 md:grid-cols-2'>
          <form className='p-6 md:p-8' onSubmit={onSubmit}>
            <FieldGroup>
              <div className='flex flex-col items-center gap-2 text-center'>
                <h1 className='text-2xl font-bold'>Welcome</h1>
                <p className='text-muted-foreground text-balance'>Login to your Chatpulse account</p>
              </div>
              <Field>
                <FieldLabel htmlFor='email'>Email</FieldLabel>
                <Input
                  {...register('email')}
                  errorMessage={errors.email?.message}
                  type='email'
                  placeholder='example@gmail.com'
                />
                {errors.email?.message && <p className='text-red-500 text-sm mt-1'>{errors.email.message}</p>}
              </Field>
              <Field>
                <div className='flex items-center'>
                  <FieldLabel htmlFor='password'>Password</FieldLabel>
                </div>
                <Input {...register('password')} errorMessage={errors.password?.message} type='password' />
                {errors.password?.message && <p className='text-red-500 text-sm mt-1'>{errors.password.message}</p>}
              </Field>
              <Field>
                <Button type='submit' className='cursor-pointer'>
                  Login
                </Button>
              </Field>
              <FieldSeparator className='*:data-[slot=field-separator-content]:bg-card'>
                Or continue with
              </FieldSeparator>
              <Field className='grid grid-cols-3 gap-4'>
                <Link to={googleOauthUrl} className='col-span-3'>
                  <Button
                    variant='outline'
                    type='button'
                    className='w-full flex items-center justify-center gap-3 cursor-pointer'
                  >
                    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 48 48' className='w-5 h-5'>
                      <path
                        fill='#FFC107'
                        d='M43.611 20.083H42V20H24v8h11.303C33.648 32.657 29.196 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 
        12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 29.08 4 24 4 12.955 4 4 12.955 
        4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z'
                      />
                      <path
                        fill='#FF3D00'
                        d='M6.306 14.691l6.571 4.819C14.655 16.108 18.961 13 24 13c3.059 0 5.842 1.154 
        7.961 3.039l5.657-5.657C33.64 6.053 29.08 4 24 4c-7.732 0-14.41 4.388-17.694 10.691z'
                      />
                      <path
                        fill='#4CAF50'
                        d='M24 44c5.145 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 
        24 36c-5.176 0-9.615-3.317-11.283-7.946l-6.522 5.025C9.444 39.556 16.227 44 24 44z'
                      />
                      <path
                        fill='#1976D2'
                        d='M43.611 20.083H42V20H24v8h11.303c-1.011 2.932-3.008 5.293-5.494 
        6.87l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z'
                      />
                    </svg>

                    <span className='text-sm font-medium'>Continue with Google</span>
                  </Button>
                </Link>
              </Field>
              <FieldDescription className='text-center'>
                Don&apos;t have an account? <Link to={'/signup'}>Sign up</Link>
              </FieldDescription>
              <FieldDescription className='text-center'>
                Forgot your password? <Link to={'/forgot-password-form'}>Forgot Password</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className='bg-muted relative hidden md:block'>
            <img src={backgroundLoginImage} alt='Image' className='absolute inset-0 h-full w-full object-cover' />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className='px-6 text-center'>
        By clicking continue, you agree to our <a href='#'>Terms of Service</a> and <a href='#'>Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
