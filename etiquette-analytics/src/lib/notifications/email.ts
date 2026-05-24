// خدمة إرسال Email
import { supabase } from '@/lib/supabase'

interface EmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    // TODO: دمج مع خدمة Email مثل Resend أو SendGrid
    // حالياً محاكاة فقط

    // تسجيل المحاولة
    await supabase.from('notification_logs').insert({
      type: 'email',
      recipient: to,
      message: subject,
      status: 'pending',
    })

    console.log(`[Email Mock] To: ${to}, Subject: ${subject}`)

    // محاكاة نجاح الإرسال
    return { success: true }
  } catch (error: any) {
    console.error('Email Error:', error)
    return { success: false, error: error.message }
  }
}

// قوالب الإيميل
export const EmailTemplates = {
  orderStatusChanged: (orderNumber: string, status: string, customerName: string) => ({
    subject: `تحديث حالة الطلب #${orderNumber}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>مرحباً ${customerName}</h2>
        <p>نود إعلامك بأن حالة طلبك #${orderNumber} تم تحديثها إلى: <strong>${status}</strong></p>
        <p>يمكنك متابعة حالة طلبك من خلال حسابك في موقعنا.</p>
        <p>شكراً لتعاملكم معنا!</p>
      </div>
    `,
  }),

  orderReady: (orderNumber: string, customerName: string) => ({
    subject: `طلبك #${orderNumber} جاهز للاستلام!`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>مرحباً ${customerName} 👋</h2>
        <p>نحن سعداء بإعلامك بأن طلبك #${orderNumber} <strong>جاهز للاستلام</strong>!</p>
        <p>يمكنك زيارتنا في أي وقت لاستلام طلبك.</p>
        <p>نشكرك على صبرك وتعاملكم معنا!</p>
      </div>
    `,
  }),

  paymentReceipt: (orderNumber: string, amount: number, customerName: string) => ({
    subject: `إيصال دفعة - طلب #${orderNumber}`,
    html: `
      <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>إيصال دفعة</h2>
        <p>مرحباً ${customerName}</p>
        <p>تم استلام دفعة بقيمة <strong>${amount} ريال</strong> للطلب #${orderNumber}</p>
        <p>شكراً لتعاملكم معنا!</p>
      </div>
    `,
  }),
}

export async function sendOrderStatusEmail(
  orderNumber: string,
  customerEmail: string,
  status: string,
  customerName: string
) {
  const { subject, html } = EmailTemplates.orderStatusChanged(orderNumber, status, customerName)
  return sendEmail({ to: customerEmail, subject, html })
}

export async function sendOrderReadyEmail(
  orderNumber: string,
  customerEmail: string,
  customerName: string
) {
  const { subject, html } = EmailTemplates.orderReady(orderNumber, customerName)
  return sendEmail({ to: customerEmail, subject, html })
}

export async function sendPaymentReceiptEmail(
  orderNumber: string,
  customerEmail: string,
  amount: number,
  customerName: string
) {
  const { subject, html } = EmailTemplates.paymentReceipt(orderNumber, amount, customerName)
  return sendEmail({ to: customerEmail, subject, html })
}
