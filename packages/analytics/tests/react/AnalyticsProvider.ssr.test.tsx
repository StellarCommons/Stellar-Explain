// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { AnalyticsProvider } from '../../src/react/provider';

describe('AnalyticsProvider (SSR)', () => {
  it('renders children without throwing when window is undefined (#75)', () => {
    expect(typeof window).toBe('undefined');

    expect(() =>
      renderToStaticMarkup(
        <AnalyticsProvider>
          <div data-testid="child">hello</div>
        </AnalyticsProvider>,
      ),
    ).not.toThrow();
  });

  it('renders the provider children content', () => {
    const html = renderToStaticMarkup(
      <AnalyticsProvider>
        <span>server-rendered</span>
      </AnalyticsProvider>,
    );
    expect(html).toContain('server-rendered');
  });
});
