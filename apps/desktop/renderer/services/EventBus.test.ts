import { describe, it, expect, beforeEach } from 'vitest';
import { EventBus } from './EventBus';
import type { AppEvent } from '@vspdf/types';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  it('should subscribe and publish events', () => {
    const events: AppEvent[] = [];
    const unsubscribe = eventBus.subscribe('viewer.ready', (event) => {
      events.push(event);
    });

    eventBus.publish({ type: 'viewer.ready', uri: 'test.pdf' });

    expect(events).toHaveLength(1);
    expect(events[0]).toEqual({ type: 'viewer.ready', uri: 'test.pdf' });

    unsubscribe();
  });

  it('should support wildcard subscriptions', () => {
    const events: AppEvent[] = [];
    eventBus.subscribe('*', (event) => {
      events.push(event);
    });

    eventBus.publish({ type: 'viewer.ready', uri: 'test.pdf' });
    eventBus.publish({ type: 'thread.updated', uri: 'test.pdf', threadId: 'thread-1' });

    expect(events).toHaveLength(2);
  });

  it('should unsubscribe correctly', () => {
    const events: AppEvent[] = [];
    const unsubscribe = eventBus.subscribe('viewer.ready', (event) => {
      events.push(event);
    });

    eventBus.publish({ type: 'viewer.ready', uri: 'test1.pdf' });
    unsubscribe();
    eventBus.publish({ type: 'viewer.ready', uri: 'test2.pdf' });

    expect(events).toHaveLength(1);
  });

  it('should clear all listeners', () => {
    const events: AppEvent[] = [];
    eventBus.subscribe('viewer.ready', (event) => {
      events.push(event);
    });

    eventBus.clear();
    eventBus.publish({ type: 'viewer.ready', uri: 'test.pdf' });

    expect(events).toHaveLength(0);
  });
});
