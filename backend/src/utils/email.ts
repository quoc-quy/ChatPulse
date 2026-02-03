const { SendEmailCommand, SESClient } = require('@aws-sdk/client-ses')
import fs from 'fs'
import path from 'path'
const { config } = require('dotenv')

config()
// Create SES service object.
const sesClient = new SESClient({
  region: process.env.AWS_REGION,
  credentials: {
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string
  }
})

const templatesEmail = fs.readFileSync(path.resolve('src/templates/verify-email.html'), 'utf8')

const createSendEmailCommand = ({
  fromAddress,
  toAddresses,
  ccAddresses = [],
  body,
  subject,
  replyToAddresses = []
}: {
  fromAddress: string
  toAddresses: string | string[]
  ccAddresses?: string | string[]
  body: string
  subject: string
  replyToAddresses?: string | string[]
}) => {
  return new SendEmailCommand({
    Destination: {
      /* required */
      CcAddresses: ccAddresses instanceof Array ? ccAddresses : [ccAddresses],
      ToAddresses: toAddresses instanceof Array ? toAddresses : [toAddresses]
    },
    Message: {
      /* required */
      Body: {
        /* required */
        Html: {
          Charset: 'UTF-8',
          Data: body
        }
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject
      }
    },
    Source: fromAddress,
    ReplyToAddresses: replyToAddresses instanceof Array ? replyToAddresses : [replyToAddresses]
  })
}

const sendVerifyEmail = async (toAddress: string, subject: string, body: string) => {
  const sendEmailCommand = createSendEmailCommand({
    fromAddress: process.env.SES_FROM_ADDRESS as string,
    toAddresses: toAddress,
    body,
    subject
  })

  try {
    return await sesClient.send(sendEmailCommand)
  } catch (e) {
    console.error('Failed to send email.')
    return e
  }
}

export const sendEmailNotification = (toAddress: string, template: string = templatesEmail) => {
  return sendVerifyEmail(
    toAddress,
    'Đăng ký thành công – Chào mừng bạn đến với ChatPulse',
    template
      .replace('{{title}}', 'Chào mừng bạn đến với ChatPulse 🎉')
      .replace(
        '{{content}}',
        `
        Tài khoản của bạn đã được tạo thành công<br/>
        email: <b>${toAddress}</b><br/><br/>
        Bạn có thể đăng nhập và bắt đầu sử dụng hệ thống ngay.<br/><br/>
        (Đây là email tự động, bạn không cần phản hồi email này)
        `
      )
      .replace('{{titleLink}}', 'Đăng nhập ngay')
  )
}
