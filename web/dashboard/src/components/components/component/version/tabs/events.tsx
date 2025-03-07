import React from 'react';
import EventComponent from "@/components/components/events/event";
import { EventWithDiscriminatedUnions } from '@/data/events/dto';
import Empty from '@/components/components/table/empty';
import EventFilter from '@/components/components/events/event-filter';
import { ProjectComponent } from '@/data/projects/dto';
import { MemberWithPublicUser } from '@/data/member/dto';

interface EventProps {
    events: EventWithDiscriminatedUnions[];
    isComponentView: boolean;
    components: ProjectComponent[] ;
    members: MemberWithPublicUser[] ;
}

const Events: React.FC<EventProps> = ({events=[], isComponentView, components, members}) => {

  return (
      <div className="w-full">
        {!isComponentView && <EventFilter isComponentView={isComponentView} components={components} members={members}/>}
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
