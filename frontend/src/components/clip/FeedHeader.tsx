interface FeedHeaderProps {
  title: string;
  description?: string;
}

export function FeedHeader({ title, description }: FeedHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold mb-2">{title}</h1>
      {description && (
        <p className="text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
