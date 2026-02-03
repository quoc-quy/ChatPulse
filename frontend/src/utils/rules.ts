import * as yup from 'yup'

export const userRegistrationSchema = yup.object({
  email: yup
    .string()
    .trim()
    .required('Email không được để trống')
    .email('Email không đúng định dạng')
    .min(10, 'Email có độ dài từ 10 đến 100 ký tự')
    .max(100, 'Email có độ dài từ 10 đến 100 ký tự'),

  password: yup.string().required('Mật khẩu không được để trống'),

  confirm_password: yup
    .string()
    .required('Mật khẩu nhập lại không được để trống')
    .oneOf([yup.ref('password')], 'Mật khẩu nhập lại không khớp với mật khẩu'),

  userName: yup
    .string()
    .trim()
    .required('Tên người dùng không được để trống')
    .min(5, 'Tên người dùng phải từ 5 đến 50 ký tự')
    .max(50, 'Tên người dùng phải từ 5 đến 50 ký tự'),

  date_of_birth: yup
    .string()
    .notRequired()
    .nullable()
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Ngày sinh phải đúng định dạng YYYY-MM-DD'),

  phone: yup
    .string()
    .required('Số điện thoại không được để trống')
    .matches(/^\d{10}$/, 'Số điện thoại phải đủ 10 ký tự số')
})

export type UserSchema = yup.InferType<typeof userRegistrationSchema>
