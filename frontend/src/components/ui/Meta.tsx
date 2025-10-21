import { Helmet } from 'react-helmet-async';

interface MetaProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
}

const DEFAULT_TITLE = 'Clipper - Discover Gaming Highlights';
const DEFAULT_DESCRIPTION =
  'Clipper is the best place to discover and share gaming highlights from Twitch. Browse clips by game, creator, or trending topics.';
const DEFAULT_IMAGE = '/og-image.png';

export function Meta({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_IMAGE,
  url,
  type = 'website',
}: MetaProps) {
  const fullTitle = title === DEFAULT_TITLE ? title : `${title} | Clipper`;
  const fullUrl = url || window.location.href;

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={description} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={image} />

      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={fullUrl} />
      <meta property="twitter:title" content={fullTitle} />
      <meta property="twitter:description" content={description} />
      <meta property="twitter:image" content={image} />
    </Helmet>
  );
}
