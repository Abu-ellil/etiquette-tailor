// خدمة إرسال SMS
import { supabase } from '@/lib/supabase'

interface SMSParams {
  to: string
  message: string
}

export async function sendSMS({ to, message }: SMSParams): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: دمج مع خدمة SMS مثل Twilio أو KSA SMS
    // حالياً محاكاة فقط

    // تسجيل المحاولة
    await supabase.from('notification_logs').insert({
      type: 'sms',
      recipient: to,
      message,
      status: 'pending',
    })

    console.log(`[SMS Mock] To: ${to}, Message: ${message}`)

    // محاكاة نجاح الإرسال
    return { success: true }
  } catch (error: any) {
    console.error('SMS Error:', error)
    return { success: false, error: error.message }
  }
}

// قوالب الرسائل
export const SMSTemplates = {
  orderStatusChanged: (orderNumber: string, status: string) =>
    `عزيزي العميل، تم تحديث حالة طلبك #${orderNumber} إلى: ${status}`,

  orderReady: (orderNumber: string, customerName: string) =>
    `عزيزي ${customerName}، نود إعلامك بأن طلبك #${orderNumber} جاهز للاستلام. نشكرك على تعاملكم معنا.`,

  paymentReminder: (orderNumber: string, amount: number) =>
    `تذكير: لديك رصيد متبقي ${amount} ريال على الطلب #${orderNumber}. يرجى تسوية المبلغ عند الاستلام.`,

  deliveryReminder: (orderNumber: string, date: string) =>
    `تذكير: موعد استلام طلبك #${orderNumber} هو ${date}. ننتظرك في ورشتنا.`,
}

export async function sendOrderStatusNotification(
  orderNumber: string,
  customerPhone: string,
  status: string
) {
  const message = SMSTemplates.orderStatusChanged(orderNumber, status)
  return sendSMS({ to: customerPhone, message })
}

export async function sendOrderReadyNotification(
  orderNumber: string,
  customerName: string,
  customerPhone: string
) {
  const message = SMSTemplates.orderReady(orderNumber, customerName)
  return sendSMS({ to: customerPhone, message })
}

export async function sendPaymentReminder(
  orderNumber: string,
  customerPhone: string,
  amount: number
) {
  const message = SMSTemplates.paymentReminder(orderNumber, amount)
  return sendSMS({ to: customerPhone, message })
}

export async function sendDeliveryReminder(
  orderNumber: string,
  customerPhone: string,
  date: string
) {
  const message = SMSTemplates.deliveryReminder(orderNumber, date)
  return sendSMS({ to: customerPhone, message })
}
