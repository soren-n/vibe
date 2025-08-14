/**
 * Text quality linting for general content assessment
 */

import type { LintConfig } from '../config.js';

export interface TextQualityIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export class TextQualityLinter {
  private config: LintConfig;
  private emojiPattern: RegExp;
  private unprofessionalPatterns: RegExp[];

  constructor(config: LintConfig) {
    this.config = config;

    // Comprehensive emoji pattern
    this.emojiPattern = new RegExp(
      '[\u{1F600}-\u{1F64F}]|' + // emoticons
        '[\u{1F300}-\u{1F5FF}]|' + // symbols & pictographs
        '[\u{1F680}-\u{1F6FF}]|' + // transport & map symbols
        '[\u{1F1E0}-\u{1F1FF}]|' + // flags
        '[\u{2600}-\u{27BF}]|' + // miscellaneous symbols
        '[\u{1F900}-\u{1F9FF}]|' + // supplemental symbols
        '[🔍📁📋👀🌐🔒📈📖✨⚡🤖🔧✅🔗🎯📦🔑🏪🔐🚀📝📚🧪⚙️🔤🧹🛠️🔄⚠️]',
      'gu'
    );

    this.unprofessionalPatterns = (
      config.unprofessionalPatterns || [
        '\\b(awesome|cool|super)\\b',
        '\\b(gonna|wanna|gotta)\\b',
        '!!+',
      ]
    ).map(pattern => new RegExp(pattern, 'gi'));
  }

  lintTextQuality(text: string, context = 'general'): TextQualityIssue[] {
    const issues: TextQualityIssue[] = [];

    // Run all quality checks
    issues.push(...this.checkTextLength(text, context));
    issues.push(...this.checkProfessionalLanguage(text));
    issues.push(...this.checkEmojiUsage(text));
    issues.push(...this.checkTextReadability(text));

    return issues;
  }

  private checkTextLength(text: string, context: string): TextQualityIssue[] {
    const issues: TextQualityIssue[] = [];

    if (context === 'step_message' && text.length > this.config.maxStepMessageLength) {
      issues.push({
        type: 'length',
        severity: 'warning',
        message: `Text length (${text.length}) exceeds recommended maximum (${this.config.maxStepMessageLength})`,
        suggestion: 'Consider breaking into shorter, more focused statements',
      });
    }

    return issues;
  }

  private checkProfessionalLanguage(text: string): TextQualityIssue[] {
    const issues: TextQualityIssue[] = [];

    if (!this.config.checkProfessionalLanguage) {
      return issues;
    }

    for (const pattern of this.unprofessionalPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        issues.push({
          type: 'unprofessional_language',
          severity: 'info',
          message: `Potentially unprofessional language: '${match[0]}'`,
          suggestion: 'Consider using more formal language',
        });
      }
    }

    return issues;
  }

  private checkEmojiUsage(text: string): TextQualityIssue[] {
    const issues: TextQualityIssue[] = [];

    if (!this.config.checkEmojis) {
      return issues;
    }

    const emojiMatches = text.matchAll(this.emojiPattern);
    for (const match of emojiMatches) {
      issues.push({
        type: 'emoji_usage',
        severity: 'warning',
        message: `Emoji '${match[0]}' found in text`,
        suggestion:
          'Consider using descriptive text instead of emojis for professional communication',
      });
    }

    return issues;
  }

  private checkTextReadability(text: string): TextQualityIssue[] {
    const issues: TextQualityIssue[] = [];

    // Basic readability checks without external dependencies
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);

    if (sentences.length > 0 && words.length > 0) {
      const avgWordsPerSentence = words.length / sentences.length;

      // Flag very long sentences
      if (avgWordsPerSentence > 25) {
        issues.push({
          type: 'readability',
          severity: 'info',
          message: `Average sentence length (${avgWordsPerSentence.toFixed(1)} words) could be improved`,
          suggestion:
            'Consider simplifying sentence structure and breaking long sentences',
        });
      }
    }

    return issues;
  }
}
