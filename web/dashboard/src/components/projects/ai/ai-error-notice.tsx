import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AiErrorNotice({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  );
}
