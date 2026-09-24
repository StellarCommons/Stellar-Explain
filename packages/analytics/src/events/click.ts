import { AnalyticsEvent } from '../types.js';

export interface ClickEventElement {
  tagName?: string;
  tag?: string;
  id?: string;
  textContent?: string;
  text?: string;
}

export function createClickEvent(element: ClickEventElement): AnalyticsEvent {
  const tagName = element.tagName || element.tag || 'unknown';
  const id = element.id;
  const rawText = element.textContent || element.text || '';
  const textContent = rawText.length > 100 ? rawText.substring(0, 100) : rawText;

  return {
    name: 'click',
    timestamp: Date.now(),
    properties: {
      tagName: tagName.toLowerCase(),
      id,
      textContent,
    },
  };
}
