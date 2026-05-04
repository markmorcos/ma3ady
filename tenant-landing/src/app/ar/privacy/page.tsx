import type { Metadata } from 'next';
import { LegalPage } from '@/components/LegalPage';
import { env } from '@/lib/env';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'الخصوصية — ma3ady',
  description: 'كيف يجمع ma3ady البيانات ويستخدمها. لا نبيع أي شيء لأي طرف.',
  alternates: {
    canonical: `https://${env.APEX_HOST}/ar/privacy/`,
    languages: {
      en: `https://${env.APEX_HOST}/en/privacy/`,
      ar: `https://${env.APEX_HOST}/ar/privacy/`,
    },
  },
};

export default function PrivacyAr() {
  return (
    <LegalPage locale="ar" kind="privacy" title="الخصوصية" updated="٢٠٢٦-٠٥-٠٤">
      <p>
        ma3ady تطبيق حجز. نجمع الحد الأدنى من المعلومات اللازمة لإجراء الحجوزات وإدارتها. لا نبيع
        أو نشارك البيانات مع المعلنين. تشرح هذه الصفحة ما يُجمَع ولماذا.
      </p>
      <h2>البيانات التي نجمعها</h2>
      <ul>
        <li>
          <strong>تفاصيل الحجز</strong>: اسم العميل والبريد الإلكتروني، ورقم الهاتف اختيارياً،
          والخدمة المحجوزة، والوقت. تُحفظ مرتبطة بالمتجر صاحب الحجز.
        </li>
        <li>
          <strong>بيانات الحساب</strong> (للمسجَّلين فقط): الاسم والبريد، وصورة الملف من جوجل،
          وتفضيل اللغة.
        </li>
        <li>
          <strong>قياسات تشغيل</strong>: تقارير الأعطال وسجلات Edge Functions، تُحفظ ٩٠ يوماً.
          لا تتضمن الحمولات بيانات شخصية — فقط آثار الاستثناءات ومعرّفات الطلبات.
        </li>
      </ul>
      <h2>أين تُخزَّن</h2>
      <p>
        كل البيانات على Supabase، في منطقة أوروبا (فرانكفورت) افتراضياً. مشفّرة أثناء النقل
        (TLS 1.2+) وفي التخزين (AES-256). تُحفظ النسخ الاحتياطية ٣٠ يوماً.
      </p>
      <h2>المعالجون من الباطن</h2>
      <ul>
        <li><strong>Supabase</strong> — استضافة قاعدة البيانات والمصادقة والوظائف.</li>
        <li><strong>Resend</strong> — إرسال البريد الإلكتروني التعاملي.</li>
        <li><strong>Meta WhatsApp</strong> — إشعارات الحجز عبر WhatsApp Business.</li>
        <li><strong>Cloudflare</strong> — DNS وشبكة توصيل المحتوى والحماية.</li>
        <li><strong>Google</strong> — تسجيل الدخول (OAuth). لا نتلقى كلمة مرور حسابك في جوجل.</li>
      </ul>
      <h2>حقوقك</h2>
      <p>
        يمكنك طلب تصدير بياناتك أو حذفها في أي وقت — راسلنا على{' '}
        <a href="mailto:hello@ma3ady.com">hello@ma3ady.com</a> من البريد المسجَّل في حسابك.
        الحذف يزيل ملفك الشخصي ويُجهِّل حجوزاتك السابقة خلال ٣٠ يوماً.
      </p>
      <h2>الكوكيز والتتبّع</h2>
      <p>
        لا يستخدم ma3ady أي متعقّبات خارجية. يستخدم تطبيق الجوّال التخزين المحلي الآمن فقط لرموز
        تسجيل الدخول والتفضيلات. ولا يستخدم موقع <code>ma3ady.com</code> أي كوكيز.
      </p>
      <h2>التغييرات</h2>
      <p>
        إذا غيّرنا هذه السياسة بصورة تؤثر عليك، سنرسل بريداً للمسجَّلين ونعرض شريطاً على{' '}
        <code>ma3ady.com</code> قبل ١٤ يوماً على الأقل من دخول التغيير حيّز التنفيذ.
      </p>
      <h2>للتواصل</h2>
      <p>
        أسئلة؟ <a href="mailto:hello@ma3ady.com">hello@ma3ady.com</a>.
      </p>
    </LegalPage>
  );
}
