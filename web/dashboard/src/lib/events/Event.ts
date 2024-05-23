export interface Event {
    type: EventType;
    userId: any;
    timestamp: Date;
    details: Record<string, unknown>;
}

export type EventType = 'component_deactivated' | 'component_activated' | 'component_update' | 'custom';
//# sourceMappingURL=events.d.ts.map
