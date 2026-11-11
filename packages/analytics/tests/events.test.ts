import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createClickEvent } from '../src/events/click';
import { createCopyEvent } from '../src/events/copy';
import { createFocusEvent, createBlurEvent } from '../src/events/focus';
import { createFormSubmissionEvent } from '../src/events/form';
import { createPageViewEvent } from '../src/events/page-view';
import { createScrollDepthEvent } from '../src/events/scroll-depth';
import { createSearchEvent } from '../src/events/search';
import { createVisibilityChangeEvent } from '../src/events/visibility';
import { createAddressBookEvent } from '../src/events/address-book';
import { createErrorEvent } from '../src/events/error';
import { createExperimentAssignmentEvent } from '../src/events/experiment';
import { createFunnelStepEvent } from '../src/events/funnel';
import { createHeartbeatEvent, shouldFireHeartbeat } from '../src/events/heartbeat';
import { createHeatmapEvent } from '../src/events/heatmap';
import { createNetworkErrorEvent } from '../src/events/network-error';
import { createPersonalModeEvent } from '../src/events/personal-mode';
import { createQRShareEvent } from '../src/events/qr-share';
import { createResultViewEvent } from '../src/events/result-view';
import { createRetryEvent } from '../src/events/retry';
import { createGroupEvent } from '../src/group';
import { getAnonymousUserId } from '../src/user';
import { getLocaleInfo } from '../src/locale';
import { getPageContext } from '../src/context/page';

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

describe('createAddressBookEvent', () => {
  it('builds an address_book event with only the action and entry count', () => {
    const event = createAddressBookEvent('add', 3);
    expect(event.name).toBe('address_book');
    // Privacy: the address itself is never recorded, only action + count.
    expect(event.properties).toEqual({ action: 'add', entryCount: 3 });
  });
});

describe('createErrorEvent', () => {
  it('builds an error event with the message and no stack when omitted', () => {
    const event = createErrorEvent('boom');
    expect(event.name).toBe('error');
    expect(event.properties).toEqual({ message: 'boom' });
  });

  it('keeps a short stack trace as-is', () => {
    const event = createErrorEvent('boom', 'at foo (a.js:1:1)');
    expect(event.properties.stack).toBe('at foo (a.js:1:1)');
  });

  it('truncates a stack trace longer than 500 characters', () => {
    const event = createErrorEvent('boom', 'x'.repeat(900));
    expect((event.properties.stack as string).length).toBe(500);
  });
});

describe('createExperimentAssignmentEvent', () => {
  it('supports positional arguments', () => {
    const event = createExperimentAssignmentEvent('new_search_ranking', 'treatment_a');
    expect(event.name).toBe('experiment_assignment');
    expect(event.properties).toEqual({
      experiment: 'new_search_ranking',
      variant: 'treatment_a',
    });
  });

  it('supports an options object', () => {
    const event = createExperimentAssignmentEvent({
      experiment: 'new_search_ranking',
      variant: 'control',
    });
    expect(event.properties).toEqual({ experiment: 'new_search_ranking', variant: 'control' });
  });

  it('defaults the variant to "unknown" when only the experiment is given', () => {
    const event = createExperimentAssignmentEvent('new_search_ranking');
    expect(event.properties.variant).toBe('unknown');
  });
});

describe('createFunnelStepEvent', () => {
  it('supports positional arguments with a step name', () => {
    const event = createFunnelStepEvent('onboarding', 2, 'Verify email');
    expect(event.name).toBe('funnel_step');
    expect(event.properties).toEqual({ funnel: 'onboarding', step: 2, stepName: 'Verify email' });
  });

  it('omits stepName when not provided', () => {
    const event = createFunnelStepEvent('onboarding', 0);
    expect(event.properties).toEqual({ funnel: 'onboarding', step: 0 });
  });

  it('supports an options object', () => {
    const event = createFunnelStepEvent({ funnel: 'checkout', step: 1, stepName: 'Payment' });
    expect(event.properties).toEqual({ funnel: 'checkout', step: 1, stepName: 'Payment' });
  });

  it('defaults the step to 0 for the positional form without one', () => {
    const event = createFunnelStepEvent('onboarding');
    expect(event.properties.step).toBe(0);
  });
});

describe('heartbeat (createHeartbeatEvent / shouldFireHeartbeat)', () => {
  const STORAGE_KEY = 'stellar_analytics_last_heartbeat_date';

  function createFakeStorage(initial: Record<string, string> = {}): Storage {
    const store = new Map<string, string>(Object.entries(initial));
    return {
      get length() {
        return store.size;
      },
      clear() {
        store.clear();
      },
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      key(index: number) {
        return [...store.keys()][index] ?? null;
      },
      removeItem(key: string) {
        store.delete(key);
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
    } as Storage;
  }

  function stubStorage(storage: Storage) {
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage });
  }

  beforeEach(() => {
    stubStorage(createFakeStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('builds a daily_active_user event with no properties', () => {
    const event = createHeartbeatEvent();
    expect(event.name).toBe('daily_active_user');
    expect(event.properties).toEqual({});
  });

  it('fires once per day: first call true, subsequent calls false', () => {
    expect(shouldFireHeartbeat()).toBe(true);
    expect(shouldFireHeartbeat()).toBe(false);
    expect(shouldFireHeartbeat()).toBe(false);
  });

  it('records today (UTC) in storage after firing', () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(shouldFireHeartbeat()).toBe(true);
    expect(localStorage.getItem(STORAGE_KEY)).toBe(today);
  });

  it('does not fire again when today is already recorded', () => {
    const today = new Date().toISOString().slice(0, 10);
    stubStorage(createFakeStorage({ [STORAGE_KEY]: today }));
    expect(shouldFireHeartbeat()).toBe(false);
  });

  it('fires again when the stored date is from an earlier day', () => {
    stubStorage(createFakeStorage({ [STORAGE_KEY]: '2000-01-01' }));
    expect(shouldFireHeartbeat()).toBe(true);
  });

  it('fails open (returns true) when storage writes throw', () => {
    const broken = createFakeStorage();
    broken.setItem = () => {
      throw new Error('storage unavailable');
    };
    stubStorage(broken);
    expect(shouldFireHeartbeat()).toBe(true);
  });

  it('fails open (returns true) when storage reads throw', () => {
    const broken = createFakeStorage();
    broken.getItem = () => {
      throw new Error('storage unavailable');
    };
    stubStorage(broken);
    expect(shouldFireHeartbeat()).toBe(true);
  });
});

describe('createHeatmapEvent', () => {
  it('normalizes coordinates against an explicit viewport', () => {
    const event = createHeatmapEvent({ x: 50, y: 25, viewportWidth: 100, viewportHeight: 50 });
    expect(event.name).toBe('heatmap_click');
    expect(event.properties).toEqual({
      x: 50,
      y: 25,
      normalizedX: 0.5,
      normalizedY: 0.5,
      viewportWidth: 100,
      viewportHeight: 50,
    });
  });

  it('clamps normalized coordinates to the 0-1 range', () => {
    const event = createHeatmapEvent({ x: 250, y: -10, viewportWidth: 100, viewportHeight: 100 });
    expect(event.properties.normalizedX).toBe(1);
    expect(event.properties.normalizedY).toBe(0);
  });

  it('falls back to the window viewport when none is provided', () => {
    const event = createHeatmapEvent({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    expect(event.properties.viewportWidth).toBe(window.innerWidth);
    expect(event.properties.viewportHeight).toBe(window.innerHeight);
    expect(event.properties.normalizedX).toBe(0.5);
    expect(event.properties.normalizedY).toBe(0.5);
  });

  it('omits normalized coordinates for a zero-size viewport', () => {
    const event = createHeatmapEvent({ x: 10, y: 10, viewportWidth: 0, viewportHeight: 0 });
    expect(event.properties.normalizedX).toBeUndefined();
    expect(event.properties.normalizedY).toBeUndefined();
    expect(event.properties.viewportWidth).toBe(0);
  });
});

describe('createNetworkErrorEvent', () => {
  it('builds a network_error event with only the url', () => {
    const event = createNetworkErrorEvent('https://api.example.com/data');
    expect(event.name).toBe('network_error');
    expect(event.properties).toEqual({ url: 'https://api.example.com/data' });
  });

  it('includes status and message when provided', () => {
    const event = createNetworkErrorEvent('https://api.example.com/data', 503, 'Service Unavailable');
    expect(event.properties).toEqual({
      url: 'https://api.example.com/data',
      status: 503,
      message: 'Service Unavailable',
    });
  });
});

describe('createPersonalModeEvent', () => {
  it('builds a personal_mode_toggle event with the enabled flag', () => {
    expect(createPersonalModeEvent(true).name).toBe('personal_mode_toggle');
    expect(createPersonalModeEvent(true).properties).toEqual({ enabled: true });
    expect(createPersonalModeEvent(false).properties).toEqual({ enabled: false });
  });
});

describe('createQRShareEvent', () => {
  it('supports positional arguments', () => {
    const event = createQRShareEvent('generated');
    expect(event.name).toBe('qr_share');
    expect(event.properties).toEqual({ action: 'generated' });
  });

  it('includes the context when provided positionally', () => {
    const event = createQRShareEvent('shared', 'payment_request');
    expect(event.properties).toEqual({ action: 'shared', context: 'payment_request' });
  });

  it('supports an options object', () => {
    const event = createQRShareEvent({ action: 'generated', context: 'account' });
    expect(event.properties).toEqual({ action: 'generated', context: 'account' });
  });
});

describe('createResultViewEvent', () => {
  it('supports positional arguments', () => {
    const event = createResultViewEvent(2, 'tx');
    expect(event.name).toBe('result_view');
    expect(event.properties).toEqual({ index: 2, type: 'tx' });
  });

  it('supports an options object', () => {
    const event = createResultViewEvent({ index: 0, type: 'account' });
    expect(event.properties).toEqual({ index: 0, type: 'account' });
  });

  it('defaults the type to "unknown" when not provided', () => {
    expect(createResultViewEvent(1).properties.type).toBe('unknown');
    expect(createResultViewEvent({ index: 1, type: '' }).properties.type).toBe('unknown');
  });
});

describe('createRetryEvent', () => {
  it('supports positional arguments', () => {
    const event = createRetryEvent('fetch_leaderboard', 2);
    expect(event.name).toBe('retry');
    expect(event.properties).toEqual({ action: 'fetch_leaderboard', attempt: 2 });
  });

  it('supports an options object', () => {
    const event = createRetryEvent({ action: 'submit_form', attempt: 3 });
    expect(event.properties).toEqual({ action: 'submit_form', attempt: 3 });
  });

  it('defaults the attempt to 1 for the positional form without one', () => {
    expect(createRetryEvent('fetch_leaderboard').properties.attempt).toBe(1);
  });
});

describe('createGroupEvent', () => {
  it('builds a group event with the given traits', () => {
    const event = createGroupEvent('group-1', { name: 'Acme', plan: 'pro' });
    expect(event.name).toBe('group');
    expect(event.properties).toEqual({
      groupId: 'group-1',
      traits: { name: 'Acme', plan: 'pro' },
    });
  });

  it('defaults traits to an empty object', () => {
    expect(createGroupEvent('group-1').properties.traits).toEqual({});
  });
});

describe('getAnonymousUserId', () => {
  const ANONYMOUS_ID_KEY = 'stellar_analytics_anonymous_id';
  const UUID_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function createFakeStorage(initial: Record<string, string> = {}): Storage {
    const store = new Map<string, string>(Object.entries(initial));
    return {
      get length() {
        return store.size;
      },
      clear() {
        store.clear();
      },
      getItem(key: string) {
        return store.has(key) ? store.get(key)! : null;
      },
      key(index: number) {
        return [...store.keys()][index] ?? null;
      },
      removeItem(key: string) {
        store.delete(key);
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
    } as Storage;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns the stored id when one already exists', () => {
    vi.stubGlobal('localStorage', createFakeStorage({ [ANONYMOUS_ID_KEY]: 'existing-id' }));
    expect(getAnonymousUserId()).toBe('existing-id');
  });

  it('generates a UUID-shaped id, persists it, and reuses it', () => {
    const storage = createFakeStorage();
    vi.stubGlobal('localStorage', storage);
    const first = getAnonymousUserId();
    expect(first).toMatch(UUID_SHAPE);
    expect(storage.getItem(ANONYMOUS_ID_KEY)).toBe(first);
    expect(getAnonymousUserId()).toBe(first);
  });

  it('still returns a fresh id when storage throws', () => {
    const broken = createFakeStorage();
    broken.getItem = () => {
      throw new Error('storage unavailable');
    };
    vi.stubGlobal('localStorage', broken);
    expect(getAnonymousUserId()).toMatch(UUID_SHAPE);
  });
});

describe('getLocaleInfo', () => {
  it('reports the navigator language, languages, and resolved time zone', () => {
    const info = getLocaleInfo();
    expect(info.language).toBe(navigator.language);
    expect(info.languages).toEqual([...navigator.languages]);
    expect(info.timeZone).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });
});

describe('getPageContext', () => {
  it('reads url, path, title, and referrer from the current page', () => {
    const context = getPageContext();
    expect(context.url).toBe(window.location.href);
    expect(context.path).toBe(window.location.pathname);
    expect(context.title).toBe(document.title);
    expect(context.referrer).toBe(document.referrer);
  });
});
