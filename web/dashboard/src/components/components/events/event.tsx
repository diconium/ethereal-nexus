import React from 'react';
import {
  FolderCheck,
  History,
  PackageIcon,
  PackageMinus,
  PackagePlus,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { EventWithDiscriminatedUnions } from '@/data/events/dto';
import EventCard from '@/components/components/events/EventCard';


interface EventProps {
  event: EventWithDiscriminatedUnions;
}


const Event: React.FC<EventProps> = ({ event }) => {

  switch (event.type) {
    case 'project_component_deactivated':
      return (
        <EventCard
          icon={(<ToggleLeft className="w-8 h-8 text-muted" />)}
          title={'Project Component deactivated'}
          subtitle={(
            <>
              <span className="font-medium mr-1">
                {event.user.name}
              </span>
              deactivated
              <Link className="font-medium ml-1" href={`/projects/${event.data?.project?.id}`}>
                {event.data?.project?.name}
              </Link>
              on
              <Link className="font-medium ml-1" href={`/projects/${event.data?.project?.id}`}>
                {event.data?.project?.name}
              </Link>
            </>
          )} timestamp={event.timestamp}
        />);
    case 'component_deactivated':
      return (
        <EventCard
          icon={(<ToggleLeft className="w-8 h-8 text-muted" />)}
          title={'Component deactivated'}
          subtitle={(
            <>
              <span className="font-medium mr-1">
                {event.user.name}
              </span>
              deactivated on
              <Link className="font-medium ml-1" href={`/projects/${event.data?.project?.id}`}>
                {event.data?.project?.name}
              </Link>
            </>
          )} timestamp={event.timestamp}
        />);
    case 'component_activated':
      return (
        <EventCard
          icon={(<ToggleRight className="w-8 h-8 text-primary" />)}
          title={'Component activated'}
          subtitle={(
            <>
              <span className="font-medium mr-1">
                {event.user.name}
              </span>
              deactivated on
              <Link className="font-medium ml-1" href={`/projects/${event.data?.project?.id}`}>
                {event.data?.project?.name}
              </Link>
            </>
          )} timestamp={event.timestamp}
        />);
    case 'project_component_activated':
      return (
        <EventCard
          icon={(<ToggleRight className="w-8 h-8 text-primary" />)}
          title={'Project Component activated'}
          subtitle={(
            <>
              <span className="font-medium mr-1">
                {event.user.name}
              </span>
              activated
              <Link className="font-medium ml-1 mr-1" href={`/components/${event.data?.component?.id}`}>
                {event.data?.component?.name}
              </Link>
              on
              <Link className="font-medium ml-1 mr-1" href={`/projects/${event.data?.project?.id}`}>
                {event.data?.project?.name}
              </Link>
              to
              <span className="font-medium ml-1">
                {event.data?.version?.version ?? 'latest'}
              </span>
            </>
          )} timestamp={event.timestamp}
        />);
    case 'project_component_added':
      return (
        <EventCard
          icon={(<PackagePlus className="w-8 h-8 text-primary" />)}
          title={'Project Component Added'}
          subtitle={(
            <>
              <span className="font-medium mr-1">
                {event.user.name}
              </span>
              added
              <Link className="font-medium ml-1 mr-1" href={`/components/${event.data?.component?.id}`}>
                {event.data?.component?.name}
              </Link>
              to
              <Link className="font-medium ml-1 mr-1" href={`/projects/${event.data?.project?.id}`}>
                {event.data?.project?.name}
              </Link>
            </>
          )} timestamp={event.timestamp}
        />);
    case 'project_component_removed':
      return (
        <EventCard
          icon={(<PackageMinus className="w-8 h-8 text-primary" />)}
          title={'Project Component Removed'}
          subtitle={(
            <>
              <span className="font-medium mr-1">
                {event.user.name}
              </span>
              removed
              <Link className="font-medium ml-1 mr-1" href={`/components/${event.data?.component?.id}`}>
                {event.data?.component?.name}
              </Link>
              from
              <Link className="font-medium ml-1 mr-1" href={`/projects/${event.data?.project?.id}`}>
                {event.data?.project?.name}
              </Link>
            </>
          )} timestamp={event.timestamp}
        />);
    case 'project_component_version_updated':
      return (
        <EventCard
          icon={(<History className="w-8 h-8 text-primary" />)}
          title={'Project Component version changed'}
          subtitle={(
            <>
              <span className="font-medium mr-1">
                {event.user.name}
              </span>
              changed active on
              <Link className="font-medium ml-1 mr-1" href={`/components/${event.data?.component?.id}`}>
                {event.data?.component?.name}
              </Link>
              to
              <span className="font-medium ml-1 mr-1">
                {event.data?.version?.version ?? 'latest'}
              </span>
            </>
          )} timestamp={event.timestamp}
        />);
    case 'project_updated':
      return (
        <EventCard
          icon={(<FolderCheck className="w-8 h-8 text-primary" />)}
          title={'Project Updated'}
          subtitle={(
            <>
              <span className="font-medium mr-1">
                {event.user.name}
              </span>
              updated
              <Link className="font-medium mr-1" href={`/components/${event.data?.component?.id}`}>
                {event.data?.component?.name}
              </Link>
              the Project
            </>
          )} timestamp={event.timestamp}
        />);
    case 'project_created':
      return (
        <EventCard
          icon={(<ToggleRight className="w-8 h-8 text-primary" />)}
          title={'Project Created'}
          subtitle={(
            <>
              <span className="font-medium mr-1">
                {event.user.name}
              </span>
              created
              <Link className="font-medium mr-1" href={`/components/${event.data?.component?.id}`}>
                {event.data?.component?.name}
              </Link>
              the Project
            </>
          )} timestamp={event.timestamp}
        />);
    case 'project_member_permissions_updated':
      return (
        <EventCard
          icon={(<UserCheck className="w-8 h-8 text-primary" />)}
          title={'Project Member Permissions updated'}
          subtitle={(
            <>
              <span className="font-medium mr-1">
                {event.user.name}
              </span>
              changed
              <span className="font-medium ml-1 mr-1">
                {event.data?.member?.name}
              </span>
              permission to {event.data.permissions}
            </>
          )} timestamp={event.timestamp}
        />);
    case 'project_member_added':
      return (
        <EventCard
          icon={(<UserPlus className="w-8 h-8 text-primary" />)}
          title={'Project Member Added'}
          subtitle={(
            <>
              <span className="font-medium mr-1">
                {event.user.name}
              </span>
              added
              <span className="font-medium ml-1 mr-1">
                {event.data?.member?.name}
              </span>
              to the Project
            </>
          )} timestamp={event.timestamp}
        />);
    case 'component_update':
      return (<EventCard
        icon={(<PackageIcon className="w-8 h-8 text-primary" />)}
        title={'Component updated'}
        subtitle={(
          <>
              <span className="font-medium mr-1">
                {event.user.name}
              </span>
            updated version
            <span className="font-medium ml-1 mr-1">
                {event.data?.version?.version}
              </span>
          </>
        )}
        timestamp={event.timestamp}
      />);

  }
};

export default Event;
