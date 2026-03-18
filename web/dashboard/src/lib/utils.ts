import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Human-readable event type labels
export const EVENT_LABELS: Record<string, string> = {
  component_deactivated: 'Component deactivated',
  component_activated: 'Component activated',
  component_update: 'Component updated',
  project_component_deactivated: 'Component deactivated in project',
  project_component_activated: 'Component activated in project',
  project_component_version_updated: 'Component version updated',
  project_component_added: 'Component added to project',
  project_component_removed: 'Component removed from project',
  project_created: 'Project created',
  project_updated: 'Project updated',
  project_member_permissions_updated: 'Member permissions updated',
  project_member_added: 'Member added',
  customEvent: 'Custom event',
};
