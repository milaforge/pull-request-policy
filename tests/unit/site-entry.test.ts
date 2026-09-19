// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('site entrypoint', () => {
  beforeEach(() => {
    vi.resetModules();
    globalThis.document.body.innerHTML = '<main id="app"></main>';
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('boots the focused generator', async () => {
    await import('../../src/site/main');
    expect(globalThis.document.body.textContent).toContain(
      'What do you want to protect?',
    );
    expect(globalThis.document.querySelectorAll('.output-card').length).toBe(2);
  });
});
