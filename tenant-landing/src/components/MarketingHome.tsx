import Link from 'next/link';
import { dirOf, t, type Locale } from '@/lib/locale';

type Props = {
  locale: Locale;
};

export function MarketingHome({ locale }: Props) {
  const dir = dirOf(locale);
  const isAr = locale === 'ar';
  const home = isAr ? '/ar/' : '/';
  const altHome = isAr ? '/' : '/ar/';
  const privacyHref = isAr ? '/ar/privacy/' : '/en/privacy/';
  const termsHref = isAr ? '/ar/terms/' : '/en/terms/';
  const demoUrl = isAr ? 'https://demo.ma3ady.com/?lang=ar' : 'https://demo.ma3ady.com/';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'ma3ady',
    operatingSystem: 'iOS, Android',
    applicationCategory: 'BusinessApplication',
    url: 'https://ma3ady.com/',
    description: t(locale, 'marketing.tagline'),
    inLanguage: ['en', 'ar'],
    publisher: { '@type': 'Organization', name: 'ma3ady' },
  };

  return (
    <div lang={locale} dir={dir} className="marketing">
      <header className="hero">
        <nav className="hero-lang" aria-label={isAr ? 'اللغة' : 'Language'}>
          <Link href="/" className={!isAr ? 'active' : ''}>
            EN
          </Link>
          <span>·</span>
          <Link href="/ar/" className={isAr ? 'active' : ''}>
            العربيّة
          </Link>
        </nav>
        <div className="container">
          <div className="hero-logo" aria-hidden="true" />
          <h1>ma3ady</h1>
          <p className="tagline">{t(locale, 'marketing.tagline')}</p>
          <p className="sub">{t(locale, 'marketing.sub')}</p>

          <div className="cta cta-store">
            <span className="btn btn-disabled" aria-disabled="true">
              App Store · {t(locale, 'marketing.comingSoon')}
            </span>
            <span className="btn btn-disabled" aria-disabled="true">
              Google Play · {t(locale, 'marketing.comingSoon')}
            </span>
          </div>

          <div className="cta">
            <a className="btn btn-primary" href={demoUrl}>
              {t(locale, 'marketing.tryDemo')}
            </a>
          </div>
        </div>
      </header>

      <section className="alt-bg">
        <div className="container">
          <h2>{t(locale, 'marketing.audienceTitle')}</h2>
          <p className="lede">{t(locale, 'marketing.audienceLede')}</p>
          <div className="tile-grid">
            {(['clinics', 'salons', 'tutors', 'service'] as const).map((key) => (
              <article key={key} className="tile">
                <span className="icon" aria-hidden="true">
                  {ICONS[key]}
                </span>
                <h3>{t(locale, `marketing.audience.${key}.title`)}</h3>
                <p>{t(locale, `marketing.audience.${key}.body`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <h2>{t(locale, 'marketing.featuresTitle')}</h2>
          <p className="lede">{t(locale, 'marketing.featuresLede')}</p>
          <div className="feature-grid">
            {(['twoTaps', 'bilingual', 'pricing'] as const).map((key) => (
              <article key={key} className="feature">
                <h3>{t(locale, `marketing.features.${key}.title`)}</h3>
                <p>{t(locale, `marketing.features.${key}.body`)}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="alt-bg">
        <div className="container">
          <h2>{t(locale, 'marketing.screensTitle')}</h2>
          <p className="lede">{t(locale, 'marketing.screensLede')}</p>
          <div className="screenshot-row">
            {(['today', 'booking', 'reminders'] as const).map((key) => (
              <figure key={key}>
                <div className="placeholder" aria-hidden="true" />
                <figcaption>{t(locale, `marketing.screens.${key}`)}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <h2>{t(locale, 'marketing.faqTitle')}</h2>
          {(['accounts', 'arabic', 'pricing', 'payments', 'data'] as const).map(
            (key) => (
              <details key={key} className="faq-item">
                <summary>{t(locale, `marketing.faq.${key}.q`)}</summary>
                <p>{t(locale, `marketing.faq.${key}.a`)}</p>
              </details>
            ),
          )}
        </div>
      </section>

      <section className="cta-band alt-bg">
        <div className="container">
          <h2>{t(locale, 'marketing.demoCtaTitle')}</h2>
          <p>{t(locale, 'marketing.demoCtaBody')}</p>
          <div className="cta">
            <a className="btn btn-primary" href={demoUrl}>
              {t(locale, 'marketing.openDemo')}
            </a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div className="links">
            <Link href={privacyHref}>{t(locale, 'marketing.privacy')}</Link>
            <Link href={termsHref}>{t(locale, 'marketing.terms')}</Link>
            <a href="mailto:hello@ma3ady.com">hello@ma3ady.com</a>
          </div>
          <p className="meta">
            © ma3ady · {t(locale, 'marketing.madeWithCare')}
          </p>
        </div>
      </footer>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}

const ICONS = {
  clinics: '🩺',
  salons: '💇',
  tutors: '📚',
  service: '🛠️',
};
