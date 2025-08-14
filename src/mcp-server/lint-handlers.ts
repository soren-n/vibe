import type { ProjectLinter } from '../lint.js';

export interface LintResult {
  success: boolean;
  result: unknown;
}

export class LintHandlers {
  constructor(private linter: ProjectLinter) {}

  async lintProject(_fix: boolean = false): Promise<LintResult> {
    const result = this.linter.lintProject('.', undefined, undefined);
    return {
      success: true,
      result,
    };
  }

  async lintText(text: string, type: string): Promise<LintResult> {
    const result = await this.linter.lintText(text, type);
    return {
      success: true,
      result,
    };
  }
}
