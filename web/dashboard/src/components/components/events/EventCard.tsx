import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface EventCardProps {
  title: string;
  subtitle: React.ReactNode;
  icon: React.ReactNode;
  timestamp: Date;
}

const EventCard: React.FC<EventCardProps> = ({ title, subtitle,icon, timestamp }) => {
  return (
    <Card className="rounded-lg shadow-md">
      <CardContent className="grid grid-cols-[40px_1fr_auto] items-center gap-4 p-4">
        { icon }
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{timestamp.toLocaleString('en-US', {
          weekday: 'short',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })}</p>
      </CardContent>
    </Card>
  );
};

export default EventCard;