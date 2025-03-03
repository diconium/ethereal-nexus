import React from 'react';
import EventComponent from "@/components/components/events/event";
import { EventWithDiscriminatedUnions, EventWithUsername } from '@/data/events/dto';
import Empty from '@/components/components/table/empty';
import EventFilter from '@/components/components/events/event-filter';
import { Component } from '@/data/components/dto';
import { ProjectComponent } from '@/data/projects/dto';

interface EventProps {
    events: EventWithDiscriminatedUnions[];
    isComponentView: boolean;
    components: ProjectComponent[] ;
}

const Events: React.FC<EventProps> = ({events=[], isComponentView, components}) => {
    return (
        <div className="w-full">
          <EventFilter isComponentView={isComponentView} components={components}/>
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
