import express from 'express'
import { body, validationResult, ContextRunner, ValidationChain } from 'express-validator'
import { RunnableValidationChains } from 'express-validator/lib/middlewares/schema'
import httpStatus from '~/constants/httpStatus'
import { EntityError, ErrorWithStatus } from '~/models/errors'

// can be reused by many routes
export const validate = (validation: RunnableValidationChains<ValidationChain>) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    // sequential processing, stops running validations chain if one fails.
    await validation.run(req)
    const errors = validationResult(req)
    //if don't have any errors
    if (errors.isEmpty()) {
      return next()
    }
    const errorsObject = errors.mapped()
    const entityError = new EntityError({ errors: {} })

    for (const key in errorsObject) {
      const { msg } = errorsObject[key]
      //Lỗi này không phải do validate
      if (msg instanceof ErrorWithStatus && msg.status !== httpStatus.UNPROCESSABLE_ENTITY) {
        return next(msg)
      }
      //Lỗi này do validate nên auto 422
      entityError.errors[key] = errorsObject[key]
    }
    next(entityError)
  }
}
