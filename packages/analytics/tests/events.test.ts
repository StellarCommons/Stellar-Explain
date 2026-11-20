import { describe, it, expect } from 'vitest';
import { createClickEvent } from '../src/events/click';
import { createCopyEvent } from '../src/events/copy';
import { createFocusEvent, createBlurEvent } from '../src/events/focus';
import { createFormSubmissionEvent } from '../src/events/form';
import { createPageViewEvent } from '../src/events/page-view';
import { createScrollDepthEvent } from '../src/events/scroll-depth';
import { createSearchEvent } from '../src/events/search';
import { createVisibilityChangeEvent } from '../src/events/visibility';
import { createErrorEvent } from '../src/events/error';
import { createNetworkErrorEvent } from '../src/events/network-error';
import { createRetryEvent } from '../src/events/retry';
import { createFunnelStepEvent } from '../src/events/funnel';
import { createQRShareEvent } from '../src/events/qr-share';
import { createGroupEvent } from '../src/group';

describe('createClickEvent', () => {
  it('builds a click event from tagName/id/textContent', () => {
    const event = createClickEvent({ tagName: 'BUTTON', id: 'submit', textContent: 'Send' });
    expect(event.name).toBe('click');
    expect(event.properties.tagName).toBe('button');
    expect(event.properties.id).toBe('submit');
    expect(event.properties.textContent).toBe('Send');
  });

  it('accepts the tag/text aliases', () => {
    const event = createClickEvent({ tag: 'A', text: 'Link' });
    expect(event.properties.tagName).toBe('a');
    expect(event.properties.textContent).toBe('Link');
  });

  // Privacy-sensitive redaction (#56): never emit unbounded free text from the DOM.
  it('truncates long text content to 100 characters', () => {
    const longText = 'x'.repeat(500);
    const event = createClickEvent({ tagName: 'div', textContent: longText });
    expect((event.properties.textContent as string).length).toBe(100);
  });

  it('defaults tagName to "unknown" when not provided', () => {
    const event = createClickEvent({});
    expect(event.properties.tagName).toBe('unknown');
  });
});

describe('createCopyEvent', () => {
  it('records only the copied text length, never the text itself', () => {
    const event = createCopyEvent(42);
    expect(event.name).toBe('copy');
    expect(event.properties.copiedTextLength).toBe(42);
    expect(event.properties.length).toBe(42);
    expect(Object.keys(event.properties)).toEqual(['copiedTextLength', 'length']);
  });
});

describe('createFocusEvent / createBlurEvent', () => {
  it('builds a focus event with the field name', () => {
    const event = createFocusEvent('email');
    expect(event.name).toBe('focus');
    expect(event.properties.fieldName).toBe('email');
  });

  it('builds a blur event with the field name', () => {
    const event = createBlurEvent('email');
    expect(event.name).toBe('blur');
    expect(event.properties.fieldName).toBe('email');
  });
});

describe('createFormSubmissionEvent', () => {
  // Privacy-sensitive redaction (#59): only structural metadata is captured,
  // never field values.
  it('captures only structural metadata, never field values', () => {
    const event = createFormSubmissionEvent({ formId: 'login', fieldCount: 3 });
    expect(event.name).toBe('form_submission');
    expect(event.properties).toEqual({
      formId: 'login',
      formName: undefined,
      fieldCount: 3,
    });
  });
});

describe('createPageViewEvent', () => {
  it('accepts explicit url/title/referrer overrides', () => {
    const event = createPageViewEvent({
      url: 'https://example.com/a',
      title: 'A',
      referrer: 'https://example.com',
    });
    expect(event.name).toBe('page_view');
    expect(event.properties.url).toBe('https://example.com/a');
    expect(event.properties.title).toBe('A');
    expect(event.properties.referrer).toBe('https://example.com');
  });
});

describe('createScrollDepthEvent', () => {
  it('builds a scroll depth event for a known threshold', () => {
    const event = createScrollDepthEvent(50);
    expect(event.name).toBe('scroll_depth');
    expect(event.properties.depth).toBe(50);
    expect(event.properties.threshold).toBe(50);
  });
});

describe('createSearchEvent', () => {
  it('supports positional arguments', () => {
    const event = createSearchEvent('stellar', 5);
    expect(event.name).toBe('search');
    expect(event.properties.queryLength).toBe('stellar'.length);
    expect(event.properties.resultCount).toBe(5);
  });

  it('supports an options object', () => {
    const event = createSearchEvent({ query: 'xlm', resultCount: 2 });
    expect(event.properties.queryLength).toBe('xlm'.length);
    expect(event.properties.resultCount).toBe(2);
  });

  // Privacy-sensitive redaction: only the query length is recorded, never
  // the raw search query text.
  it('never records the raw query text', () => {
    const event = createSearchEvent('super secret query', 0);
    expect(event.properties.query).toBeUndefined();
  });
});

describe('createVisibilityChangeEvent', () => {
  it('builds an event from an explicit state', () => {
    const event = createVisibilityChangeEvent('hidden');
    expect(event.name).toBe('visibility_change');
    expect(event.properties.state).toBe('hidden');
    expect(event.properties.isVisible).toBe(false);
  });
});

describe('createErrorEvent', () => {
  it('truncates stacks to 500 characters', () => {
    const event = createErrorEvent('boom', 'x'.repeat(900));
    expect(event.name).toBe('error');
    expect(event.properties.message).toBe('boom');
    expect((event.properties.stack as string).length).toBe(500);
  });

  it('omits stack when not provided', () => {
    expect('stack' in createErrorEvent('boom').properties).toBe(false);
  });
});

describe('createNetworkErrorEvent', () => {
  it('includes only the provided optional fields', () => {
    const event = createNetworkErrorEvent('/api', 500);
    expect(event.name).toBe('network_error');
    expect(event.properties).toEqual({ url: '/api', status: 500 });
  });
});

describe('createRetryEvent', () => {
  it('supports positional and options forms', () => {
    expect(createRetryEvent('fetch', 2).properties).toEqual({ action: 'fetch', attempt: 2 });
    expect(createRetryEvent({ action: 'fetch', attempt: 3 }).name).toBe('retry');
  });
});

describe('createFunnelStepEvent', () => {
  it('builds a funnel_step event with optional stepName', () => {
    const event = createFunnelStepEvent({ funnel: 'onboarding', step: 1, stepName: 'email' });
    expect(event.name).toBe('funnel_step');
    expect(event.properties).toEqual({ funnel: 'onboarding', step: 1, stepName: 'email' });
    expect('stepName' in createFunnelStepEvent('onboarding', 0).properties).toBe(false);
  });
});

describe('createQRShareEvent', () => {
  it('builds a qr_share event', () => {
    const event = createQRShareEvent('generated', 'account');
    expect(event.name).toBe('qr_share');
    expect(event.properties).toEqual({ action: 'generated', context: 'account' });
  });
});

describe('createGroupEvent', () => {
  it('defaults traits to an empty object', () => {
    const event = createGroupEvent('g1');
    expect(event.name).toBe('group');
    expect(event.properties).toEqual({ groupId: 'g1', traits: {} });
  });
});
