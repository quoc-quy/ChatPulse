import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Link } from 'react-router-dom'
import { useForm, type Resolver } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { userRegistrationSchema, type UserSchema } from '@/utils/rules'
import { useMutation } from '@tanstack/react-query'
import authApi, { type RegisterBody } from '@/apis/auth.api'
import { toast } from 'react-toastify'
import backgroundRegisterImage from '../../public/background-register.png'

type FormData = UserSchema
export function SignupForm({ className, ...props }: React.ComponentProps<'div'>) {
  const {
    handleSubmit,
    register,
    setError,
    formState: { errors }
  } = useForm<FormData>({
    resolver: yupResolver(userRegistrationSchema) as Resolver<UserSchema>
  })

  const registrationMutation = useMutation({
    mutationFn: (body: RegisterBody) => authApi.register(body)
  })

  const onSubmit = handleSubmit((data) => {
    const body: RegisterBody = {
      ...data,
      date_of_birth: new Date(data.date_of_birth as string).toISOString()
    }
    registrationMutation.mutate(body, {
      onSuccess: () => {
        toast.success('Đăng ký tài khoản thành công, vui lòng kiểm tra email để xác thực tài khoản')
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

        toast.error(data?.message || 'Đăng ký thất bại')
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
                <h1 className='text-2xl font-bold'>Create your account</h1>
              </div>
              <Field>
                <FieldLabel htmlFor='email'>Email</FieldLabel>
                <Input
                  id='email'
                  type='email'
                  {...register('email')}
                  errorMessage={errors.email?.message}
                  placeholder='example@gmail.com'
                />
                {errors.email?.message && <p className='text-red-500 text-sm mt-1'>{errors.email.message}</p>}
              </Field>
              <Field>
                <Field className='grid grid-cols-2 gap-4'>
                  <Field>
                    <FieldLabel htmlFor='password'>Password</FieldLabel>
                    <Input
                      id='password'
                      {...register('password')}
                      errorMessage={errors.password?.message}
                      type='password'
                    />
                    {errors.password?.message && <p className='text-red-500 text-sm mt-1'>{errors.password.message}</p>}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor='confirm-password'>Confirm Password</FieldLabel>
                    <Input
                      id='confirm-password'
                      {...register('confirm_password')}
                      errorMessage={errors.confirm_password?.message}
                      type='password'
                    />
                    {errors.confirm_password?.message && (
                      <p className='text-red-500 text-sm mt-1'>{errors.confirm_password.message}</p>
                    )}
                  </Field>
                </Field>
              </Field>
              <Field>
                <Field className='grid grid-cols-2 gap-4'>
                  <Field>
                    <FieldLabel htmlFor='username'>Username</FieldLabel>
                    <Input
                      id='username'
                      {...register('userName')}
                      errorMessage={errors.userName?.message}
                      type='text'
                    />
                    {errors.userName?.message && <p className='text-red-500 text-sm mt-1'>{errors.userName.message}</p>}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor='phone'>Phone</FieldLabel>
                    <Input id='phone' {...register('phone')} errorMessage={errors.phone?.message} type='text' />
                    {errors.phone?.message && <p className='text-red-500 text-sm mt-1'>{errors.phone.message}</p>}
                  </Field>
                </Field>
              </Field>
              <Field>
                <FieldLabel htmlFor='date_of_birth'>Date Of Birth</FieldLabel>
                <Input
                  id='date_of_birth'
                  {...register('date_of_birth')}
                  errorMessage={errors.date_of_birth?.message}
                  type='date'
                />
              </Field>
              <Field>
                <Button type='submit' className='cursor-pointer'>
                  Create Account
                </Button>
              </Field>

              <FieldDescription className='text-center'>
                Already have an account? <Link to={'/signin'}>Sign in</Link>
              </FieldDescription>
            </FieldGroup>
          </form>
          <div className='bg-muted relative hidden md:block'>
            <img src={backgroundRegisterImage} alt='Image' className='absolute inset-0 h-full w-full object-cover' />
          </div>
        </CardContent>
      </Card>
      <FieldDescription className='px-6 text-center'>
        By clicking continue, you agree to our <a href='#'>Terms of Service</a> and <a href='#'>Privacy Policy</a>.
      </FieldDescription>
    </div>
  )
}
