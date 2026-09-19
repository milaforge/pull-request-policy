import type {
  GeneratorOutput,
  QuickStartPolicyPresetId,
  QuickStartState,
} from '../../generator/types';

export type CopyTarget = 'workflow' | 'policy' | null;

export interface AppRenderModel {
  state: QuickStartState;
  output: GeneratorOutput;
  copiedTarget: CopyTarget;
}

export interface ProtectionOption {
  id: QuickStartPolicyPresetId;
  title: string;
  description: string;
}
