import httpStatus from '~/constants/httpStatus'

type ErrorsType = Record<
  string,
  {
    msg: string
    [key: string]: any
  }
> //{ [key: string]:string }

export class ErrorWithStatus {
  message: string
  status: number

  constructor({ message, status }: { message: string; status: number }) {
    this.message = message
    this.status = status
  }
}

export class EntityError extends ErrorWithStatus {
  errors: ErrorsType
  constructor({ message = 'Validation errors', errors }: { message?: string; errors: ErrorsType }) {
    super({ message, status: httpStatus.UNPROCESSABLE_ENTITY })
    this.errors = errors
  }
}
