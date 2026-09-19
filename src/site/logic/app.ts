import { createDefaultGeneratorState } from '../../generator/presets';
import { generateOutput } from '../../generator/policies';
import { isProtectionId, renderApp } from './render';
import type { AppRenderModel, CopyTarget } from './ui-types';

export class PolicyGeneratorApp {
  private readonly container: HTMLElement;
  private state = (() => {
    return createDefaultGeneratorState().quickStart;
  })();
  private copiedTarget: CopyTarget = null;

  public constructor(container: HTMLElement, _modal?: HTMLElement) {
    this.container = container;
  }

  public initialize(): void {
    this.render();
    this.container.addEventListener('change', (event) =>
      this.handleChange(event),
    );
    this.container.addEventListener('click', (event) =>
      this.handleClick(event),
    );
  }

  private output() {
    const defaults = createDefaultGeneratorState();
    return generateOutput({
      mode: 'quick-start',
      workflow: defaults.workflow,
      quickStart: this.state,
      advanced: { policies: [], nextPolicyNumber: 1 },
    });
  }

  private render(): void {
    const model: AppRenderModel = {
      state: this.state,
      output: this.output(),
      copiedTarget: this.copiedTarget,
    };
    this.container.innerHTML = renderApp(model);
  }

  private handleChange(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement && target.dataset.presetField) {
      if (target.dataset.presetField === 'sensitive-paths') {
        const values = target.value
          .split(/[\n,]/)
          .map((value) => value.trim())
          .filter(Boolean);
        this.state = {
          presets: {
            ...this.state.presets,
            'sensitive-paths': {
              ...this.state.presets['sensitive-paths'],
              globs: values,
              approvals: Number(
                this.container.querySelector<HTMLInputElement>(
                  '[data-preset-field="sensitive-approvals"]',
                )?.value || 0,
              ),
            },
          },
        };
        this.copiedTarget = null;
        this.render();
        return;
      }
      if (target.dataset.presetField === 'sensitive-approvals') {
        this.state = {
          presets: {
            ...this.state.presets,
            'sensitive-paths': {
              ...this.state.presets['sensitive-paths'],
              approvals: Number(target.value),
            },
          },
        };
        this.copiedTarget = null;
        this.render();
        return;
      }
    }
    const id =
      target instanceof HTMLInputElement ? target.dataset.presetId : undefined;
    if (!id || !isProtectionId(id)) return;
    this.state = {
      presets: {
        ...this.state.presets,
        [id]: {
          ...this.state.presets[id],
          enabled: (target as HTMLInputElement).checked,
        },
      },
    };
    this.copiedTarget = null;
    this.render();
  }

  private handleClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const output = this.output();
    if (action === 'copy-output') {
      const copyTarget = target.dataset.target as 'workflow' | 'policy';
      void globalThis.navigator.clipboard?.writeText(
        copyTarget === 'workflow' ? output.workflowYaml : output.policyYaml,
      );
      this.copiedTarget = copyTarget;
      this.render();
    } else if (action === 'download-output') {
      const downloadTarget = target.dataset.target as 'workflow' | 'policy';
      const value =
        downloadTarget === 'workflow' ? output.workflowYaml : output.policyYaml;
      const url = globalThis.URL.createObjectURL(
        new Blob([value], { type: 'text/yaml' }),
      );
      const link = globalThis.document.createElement('a');
      link.href = url;
      link.download =
        downloadTarget === 'workflow'
          ? 'pull-request-policy-workflow.yml'
          : 'pull-request-policy.yml';
      link.click();
      globalThis.URL.revokeObjectURL(url);
    }
  }
}
