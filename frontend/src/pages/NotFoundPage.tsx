import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Container, Button } from '../components';

export function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <Container className="py-16">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-error-500 mb-4">{t('error.notFoundCode')}</h1>
        <h2 className="text-2xl font-semibold mb-2">{t('error.notFound')}</h2>
        <p className="text-muted-foreground mb-8">
          {t('error.notFoundDescription')}
        </p>
        <Link to="/">
          <Button variant="primary">{t('common.goHome')}</Button>
        </Link>
      </div>
    </Container>
  );
}
