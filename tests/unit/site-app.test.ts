// @vitest-environment happy-dom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PolicyGeneratorApp } from '../../src/site/logic/app';

describe('PolicyGeneratorApp', () => {
  beforeEach(() => {
    globalThis.document.body.innerHTML = '<main id="app"></main>';
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  it('renders optional protections and exactly two outputs', () => {
    new PolicyGeneratorApp(
      globalThis.document.querySelector('#app') as HTMLElement,
    ).initialize();
    expect(globalThis.document.body.textContent).toContain(
      'What do you want to protect?',
    );
    expect(globalThis.document.body.textContent).not.toContain('Advanced');
    expect(
      globalThis.document.querySelectorAll('[data-preset-id]').length,
    ).toBe(6);
    expect(
      globalThis.document.querySelector('[data-preset-id="pr-body-required"]'),
    ).toHaveProperty('checked', true);
    expect(
      globalThis.document.querySelector('[data-preset-id="title-format"]'),
    ).toHaveProperty('checked', false);
    expect(globalThis.document.querySelectorAll('.output-card').length).toBe(2);
    expect(globalThis.document.body.textContent).toContain(
      '.github/workflows/policy.yml',
    );
    expect(globalThis.document.body.textContent).toContain(
      '.github/pull-request-policy.yml',
    );
    expect(globalThis.document.body.textContent).toContain(
      'Make it a merge gate',
    );
  });

  it('updates policy YAML when a protection is unchecked', () => {
    new PolicyGeneratorApp(
      globalThis.document.querySelector('#app') as HTMLElement,
    ).initialize();
    const checkbox = globalThis.document.querySelector(
      '[data-preset-id="sensitive-paths"]',
    ) as HTMLInputElement;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(globalThis.document.body.textContent).not.toContain(
      'id: sensitive-paths',
    );
  });
});
