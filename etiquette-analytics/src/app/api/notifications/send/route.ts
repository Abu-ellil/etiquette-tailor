// API لإرسال الإشعارات
import { NextResponse } from 'next/server'
import { sendSMS, SMSTemplates } from '@/lib/notifications/sms'
import { sendEmail, EmailTemplates } from '@/lib/notifications/email'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { type, recipient, data } = body

    let result

    switch (type) {
      case 'sms.order_status':
        result = await sendSMS({
          to: recipient,
          message: SMSTemplates.orderStatusChanged(data.orderNumber, data.status),
        })
        break

      case 'sms.order_ready':
        result = await sendSMS({
          to: recipient,
          message: SMSTemplates.orderReady(data.orderNumber, data.customerName),
        })
        break

      case 'sms.payment_reminder':
        result = await sendSMS({
          to: recipient,
          message: SMSTemplates.paymentReminder(data.orderNumber, data.amount),
        })
        break

      case 'email.order_status':
        result = await sendEmail({
          to: recipient,
          ...EmailTemplates.orderStatusChanged(
            data.orderNumber,
            data.status,
            data.customerName
          ),
        })
        break

      case 'email.order_ready':
        result = await sendEmail({
          to: recipient,
          ...EmailTemplates.orderReady(data.orderNumber, data.customerName),
        })
        break

      default:
        return NextResponse.json({ error: 'نوع الإشعار غير مدعوم' }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
