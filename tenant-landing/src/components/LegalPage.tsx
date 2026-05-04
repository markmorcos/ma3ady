import Link from 'next/link';
import { dirOf, type Locale } from '@/lib/locale';

type Props = {
  locale: Locale;
  /** "privacy" or "terms" */
  kind: 'privacy' | 'terms';
  title: string;
  updated: string;
  children: React.ReactNode;
};

export function LegalPage({ locale, kind, title, updated, children }: Props) {
  const dir = dirOf(locale);
  const isAr = locale === 'ar';
  const altKindHref = isAr ? `/en/${kind}/` : `/ar/${kind}/`;
  const homeHref = isAr ? '/ar/' : '/';
  const otherLinkHref = kind === 'privacy'
    ? (isAr ? '/ar/terms/' : '/en/terms/')
    : (isAr ? '/ar/privacy/' : '/en/privacy/');

  return (
    <div lang={locale} dir={dir} className="marketing">
      <header className="hero">
        <nav className="hero-lang" aria-label={isAr ? 'اللغة' : 'Language'}>
          <Link href={`/en/${kind}/`} className={!isAr ? 'active' : ''}>
            EN
          </Link>
          <span>·</span>
          <Link href={`/ar/${kind}/`} className={isAr ? 'active' : ''}>
            العربيّة
          </Link>
        </nav>
        <div className="container">
          <h1>{title}</h1>
          <p className="tagline">
            {isAr ? 'آخر تحديث: ' : 'Last updated: '}
            {updated}
          </p>
        </div>
      </header>

      <section>
        <div className="container">
          <article className="legal">{children}</article>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container">
          <div className="links">
            <Link href={homeHref}>{isAr ? 'الرئيسية' : 'Home'}</Link>
            <Link href={otherLinkHref}>
              {kind === 'privacy'
                ? isAr ? 'الشروط' : 'Terms'
                : isAr ? 'الخصوصية' : 'Privacy'}
            </Link>
          </div>
          <p className="meta">© ma3ady</p>
        </div>
      </footer>
    </div>
  );
}
