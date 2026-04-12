/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import * as yup from 'yup'
import { useMutation } from '@tanstack/react-query'
import authApi from '@/apis/auth.api'
import { toast } from 'react-toastify'
import backgroundLoginImage from '../../public/background-login.png'

type FormData = {
  email: string
}

const schema = yup.object({
  email: yup.string().required('Email là bắt buộc').email('Email không hợp lệ')
})

export function ForgotPasswordForm({ className, ...props }: React.ComponentProps<'div'>) {
  const {
    handleSubmit,
    register,
    formState: { errors },
    setError
  } = useForm<FormData>({
    resolver: yupResolver(schema)
  })

  const forgotPasswordMutation = useMutation({
    mutationFn: (body: FormData) => authApi.forgotPassword(body)
  })

  const onSubmit = handleSubmit((data) => {
    forgotPasswordMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Đã gửi email khôi phục mật khẩu!')
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError: (error: any) => {
        const data = error?.response?.data

        if (data?.errors) {
          Object.entries(data.errors).forEach(([field, errorObj]: any) => {
            setError(field as keyof FormData, {
              type: 'server',
              message: errorObj.msg
            })
          })
          return
        }

        toast.error(data?.message || 'Gửi yêu cầu thất bại')
      }
    })
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
                  <h1 className='text-2xl font-bold'>Forgot Password</h1>
                  <p className='text-muted-foreground'>Enter your email to receive a reset link</p>
                </div>

                <Field>
                  <FieldLabel>Email</FieldLabel>
                  <Input
                    {...register('email')}
                    errorMessage={errors.email?.message}
                    type='email'
                    placeholder='example@gmail.com'
                  />
                </Field>

                <Field>
                  <Button type='submit' className='w-full cursor-pointer'>
                    Send
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
            <div className='hidden md:block relative'>
              <img src={backgroundLoginImage} alt='bg' className='absolute inset-0 w-full h-full object-cover' />
            </div>
          </CardContent>
        </Card>

        <p className='text-center text-sm text-muted-foreground mt-4'>Please check your email after submitting</p>
      </div>
    </div>
  )
}
