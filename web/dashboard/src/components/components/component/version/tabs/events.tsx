import React from 'react';
import EventComponent from "@/components/components/events/event";
import { EventWithDiscriminatedUnions, EventWithUsername } from '@/data/events/dto';
import Empty from '@/components/components/table/empty';

interface EventProps {
    events: EventWithDiscriminatedUnions[];
}

const Events: React.FC<EventProps> = ({events=[]}) => {

    return (
        <div className="w-full">
          <ul className="space-y-4">
            {events.length === 0 && (<Empty itemsName={'events'}></Empty>)}
            {events.map((event, index) => (
              <li key={index}>
                <EventComponent event={event}/>
              </li>
            ))}
          </ul>
        </div>
    );
};

export default Events;
