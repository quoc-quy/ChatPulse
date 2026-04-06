/* eslint-disable @typescript-eslint/no-unused-vars */
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useMutation } from '@tanstack/react-query'
import authApi from '@/apis/auth.api'
import { toast } from 'react-toastify'
import backgroundLoginImage from '../../public/background-login.png'

type FormData = {
  password: string
  confirm_password: string
}

const schema = yup.object({
  password: yup.string().required('Password là bắt buộc').min(6, 'Ít nhất 6 ký tự'),
  confirm_password: yup
    .string()
    .oneOf([yup.ref('password')], 'Mật khẩu không khớp')
    .required('Xác nhận mật khẩu là bắt buộc')
})

export default function ResetPassword() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const location = useLocation()
  const query = new URLSearchParams(location.search)
  const token = query.get('token')

  const {
    handleSubmit,
    register,
    formState: { errors },
    setError
  } = useForm<FormData>({
    resolver: yupResolver(schema)
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (body: FormData & { forgot_password_token: string }) => {
      return authApi.resetPassword(body)
    }
  })

  const onSubmit = handleSubmit((data) => {
    if (!token) {
      toast.error('Token không hợp lệ')
      return
    }

    resetPasswordMutation.mutate(
      {
        password: data.password,
        confirm_password: data.confirm_password,
        forgot_password_token: token as string
      },
      {
        onSuccess: () => {
          toast.success('Đổi mật khẩu thành công!')
          navigate('/signin')
        }
      }
    )
  })

  return (
    <div className='min-h-screen flex items-center justify-center bg-muted px-4'>
      <div className='w-full max-w-4xl'>
        <Card className='overflow-hidden shadow-xl rounded-2xl'>
          <CardContent className='grid p-0 md:grid-cols-2'>
            {/* FORM */}
            <form className='p-6 md:p-8' onSubmit={onSubmit}>
              <FieldGroup>
                <div className='flex flex-col items-center gap-2 text-center'>
                  <h1 className='text-2xl font-bold'>Reset Password</h1>
                  <p className='text-muted-foreground'>Enter your new password</p>
                </div>

                <Field>
                  <FieldLabel>Password</FieldLabel>
                  <Input
                    {...register('password')}
                    errorMessage={errors.password?.message}
                    type='password'
                    placeholder='Enter new password'
                  />
                </Field>

                <Field>
                  <FieldLabel>Confirm Password</FieldLabel>
                  <Input
                    {...register('confirm_password')}
                    errorMessage={errors.confirm_password?.message}
                    type='password'
                    placeholder='Confirm password'
                  />
                </Field>

                <Field>
                  <Button type='submit' className='w-full'>
                    Reset Password
                  </Button>
                </Field>

                <FieldDescription className='text-center'>
                  Back to{' '}
                  <Link to='/signin' className='underline'>
                    Sign In
                  </Link>
                </FieldDescription>
              </FieldGroup>
            </form>

            {/* IMAGE */}
            <div className='hidden md:block relative h-full'>
              <img src={backgroundLoginImage} alt='bg' className='w-full h-full object-cover' />
            </div>
          </CardContent>
        </Card>

        <p className='text-center text-sm text-muted-foreground mt-4'>Your password will be updated immediately</p>
      </div>
    </div>
  )
}
