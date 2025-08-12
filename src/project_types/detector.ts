/**
 * Enhanced project type detection with comprehensive framework support
 * TypeScript translation of vibe/project_types/detector.py
 */

import * as fs from 'fs';
import * as path from 'path';

export class ProjectDetector {
  private projectPath: string;

  constructor(projectPath = '.') {
    this.projectPath = path.resolve(projectPath);
  }

  detectProjectType(): string {
    const detections = this.detectAllProjectTypes();

    // Return the most specific/confident detection
    // Priority order: specific frameworks > language > generic
    const priorityOrder = [
      'react',
      'next',
      'nuxt',
      'svelte',
      'angular',
      'rails',
      'typescript',
      'javascript',
      'rust',
      'go',
      'web',
      'node',
      'generic',
    ];

    for (const projectType of priorityOrder) {
      if (detections.includes(projectType)) {
        return projectType;
      }
    }

    return 'generic';
  }

  detectAllProjectTypes(): string[] {
    const types: string[] = [];

    // Detect JavaScript/TypeScript frameworks and add their tech stack
    types.push(...this.detectFrontendFrameworks());

    // Detect other language projects
    types.push(...this.detectOtherLanguages());

    // Detect general project characteristics
    types.push(...this.detectGeneralTypes());

    // Remove duplicates while preserving order
    return [...new Set(types)];
  }

  private detectFrontendFrameworks(): string[] {
    const types: string[] = [];

    if (this.isReactProject()) {
      types.push('react', 'javascript', 'web', 'node');
    }

    if (this.isNextProject()) {
      types.push('next', 'react', 'javascript', 'web', 'node');
    }

    if (this.isNuxtProject()) {
      types.push('nuxt', 'javascript', 'web', 'node');
    }

    if (this.isSvelteProject()) {
      types.push('svelte', 'javascript', 'web', 'node');
    }

    if (this.isAngularProject()) {
      types.push('angular', 'typescript', 'web', 'node');
    }

    if (this.isTypescriptProject()) {
      types.push('typescript', 'javascript', 'node');
    }

    if (this.isJavascriptProject()) {
      types.push('javascript', 'node');
    }

    return types;
  }

  private detectOtherLanguages(): string[] {
    const types: string[] = [];

    if (this.isRustProject()) {
      types.push('rust');
    }

    if (this.isGoProject()) {
      types.push('go');
    }

    return types;
  }

  private detectGeneralTypes(): string[] {
    const types: string[] = [];

    if (this.isWebProject()) {
      types.push('web');
    }

    if (this.isNodeProject()) {
      types.push('node');
    }

    return types;
  }

  // Framework detection methods
  private isReactProject(): boolean {
    return (
      this.hasDependency('react') ||
      this.hasDevDependency('create-react-app') ||
      this.hasFile('react.config.js')
    );
  }

  private isNextProject(): boolean {
    return (
      this.hasDependency('next') ||
      this.hasFile('next.config.js') ||
      this.hasFile('next.config.mjs')
    );
  }

  private isNuxtProject(): boolean {
    return (
      this.hasDependency('nuxt') ||
      this.hasFile('nuxt.config.js') ||
      this.hasFile('nuxt.config.ts')
    );
  }

  private isSvelteProject(): boolean {
    return (
      this.hasDependency('svelte') ||
      this.hasFile('svelte.config.js') ||
      this.hasDevDependency('@sveltejs/kit')
    );
  }

  private isAngularProject(): boolean {
    return (
      this.hasDependency('@angular/core') ||
      this.hasFile('angular.json') ||
      this.hasDevDependency('@angular/cli')
    );
  }

  private isTypescriptProject(): boolean {
    return (
      this.hasFile('tsconfig.json') ||
      this.hasDevDependency('typescript') ||
      this.hasFiles('*.ts')
    );
  }

  private isJavascriptProject(): boolean {
    return (
      this.hasFile('package.json') ||
      this.hasFiles('*.js') ||
      this.hasFile('yarn.lock') ||
      this.hasFile('package-lock.json')
    );
  }

  private isRustProject(): boolean {
    return this.hasFile('Cargo.toml');
  }

  private isGoProject(): boolean {
    return this.hasFile('go.mod') || this.hasFiles('*.go');
  }

  private isWebProject(): boolean {
    return (
      this.hasFiles('*.html') ||
      this.hasFiles('*.css') ||
      this.hasFile('index.html') ||
      this.hasDirectory('public') ||
      this.hasDirectory('static')
    );
  }

  private isNodeProject(): boolean {
    return (
      this.hasFile('package.json') ||
      this.hasFile('node_modules') ||
      this.hasFile('yarn.lock') ||
      this.hasFile('pnpm-lock.yaml')
    );
  }

  // Utility methods
  private hasFile(filename: string): boolean {
    return fs.existsSync(path.join(this.projectPath, filename));
  }

  private hasDirectory(dirname: string): boolean {
    const dirPath = path.join(this.projectPath, dirname);
    return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
  }

  private hasFiles(pattern: string): boolean {
    try {
      const files = fs.readdirSync(this.projectPath);
      const regex = new RegExp(pattern.replace('*', '.*'));
      return files.some(file => regex.test(file));
    } catch {
      return false;
    }
  }

  private hasDependency(depName: string): boolean {
    return this.hasPackageJsonDependency(depName, 'dependencies');
  }

  private hasDevDependency(depName: string): boolean {
    return this.hasPackageJsonDependency(depName, 'devDependencies');
  }

  private hasPackageJsonDependency(depName: string, section: string): boolean {
    try {
      const packageJsonPath = path.join(this.projectPath, 'package.json');
      if (!fs.existsSync(packageJsonPath)) return false;

      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return packageJson[section] && depName in packageJson[section];
    } catch {
      return false;
    }
  }
}
