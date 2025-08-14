import { getChecklistsArray } from '../guidance/loader.js';

export interface ChecklistResult {
  success: boolean;
  checklist: unknown;
}

export interface ChecklistsResult {
  success: boolean;
  checklists: unknown;
}

export interface RunChecklistResult {
  success: boolean;
  name: string;
  status: string;
  items: Array<{ item: string; status: string }>;
}

export class ChecklistHandlers {
  async listChecklists(): Promise<ChecklistsResult> {
    const checklists = getChecklistsArray(true);
    return {
      success: true,
      checklists,
    };
  }

  async getChecklist(name: string): Promise<ChecklistResult> {
    const checklists = getChecklistsArray(true);
    const checklist = checklists.find(c => c.name === name);

    if (!checklist) {
      throw new Error(`Checklist '${name}' not found`);
    }

    return {
      success: true,
      checklist,
    };
  }

  async runChecklist(name: string): Promise<RunChecklistResult> {
    const checklists = getChecklistsArray(true);
    const checklist = checklists.find(c => c.name === name);

    if (!checklist) {
      throw new Error(`Checklist '${name}' not found`);
    }

    return {
      success: true,
      name: checklist.name,
      status: 'completed',
      items: checklist.items.map(item => ({
        item,
        status: 'completed',
      })),
    };
  }
}
