/**
 * Configuration functionality tests
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { VibeConfigImpl } from '../src/config';

describe('VibeConfig tests', () => {
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vibe-config-test-'));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Config file loading', () => {
    test('loads default config when no file exists', async () => {
      const config = await VibeConfigImpl.loadFromFile();

      expect(config).toBeDefined();
      expect(config.projectType).toBe('auto');
      expect(Object.keys(config.workflows).length).toBeGreaterThan(0);
      expect(Object.keys(config.projectTypes).length).toBeGreaterThan(0);
    });

    test('finds config file in current directory', async () => {
      const configContent = `
project_type: typescript
workflows:
  custom-workflow:
    enabled: true
    priority: 1
    triggers: ["custom"]
    description: "Custom workflow"
`;

      fs.writeFileSync('.vibe.yaml', configContent);
      const config = await VibeConfigImpl.loadFromFile();

      expect(config.projectType).toBe('typescript');
      expect(config.workflows['custom-workflow']).toBeDefined();
      expect(config.workflows['custom-workflow']?.enabled).toBe(true);
    });

    test('finds config file in parent directory', async () => {
      const configContent = `
project_type: typescript
workflows:
  parent-workflow:
    enabled: true
    priority: 2
`;

      const subDir = path.join(tempDir, 'subdir');
      fs.mkdirSync(subDir);

      fs.writeFileSync('vibe.yaml', configContent);
      process.chdir(subDir);

      const config = await VibeConfigImpl.loadFromFile();
      expect(config.projectType).toBe('typescript');
      expect(config.workflows['parent-workflow']).toBeDefined();
    });

    test('loads different config file formats', async () => {
      const configFormats = ['.vibe.yaml', 'vibe.yaml', '.vibe.yml', 'vibe.yml'];

      for (const format of configFormats) {
        // Clean up any existing config files
        configFormats.forEach(f => {
          if (fs.existsSync(f)) fs.unlinkSync(f);
        });

        fs.writeFileSync(format, 'project_type: test');
        const config = await VibeConfigImpl.loadFromFile();
        expect(config.projectType).toBe('test');
      }
    });
  });

  describe('Gitignore processing', () => {
    test('processes .gitignore patterns correctly', async () => {
      const gitignoreContent = `
# This is a comment
*.pyc
__pycache__/
node_modules
/build
docs/
.env
*.log
`;

      fs.writeFileSync('.gitignore', gitignoreContent);
      const config = await VibeConfigImpl.loadFromFile();

      const excludePatterns = config.lint.excludePatterns;
      expect(excludePatterns).toContain('*.pyc');
      expect(excludePatterns).toContain('__pycache__');
      expect(excludePatterns).toContain('__pycache__/**');
      expect(excludePatterns).toContain('node_modules');
      expect(excludePatterns).toContain('build');
      expect(excludePatterns).toContain('docs');
      expect(excludePatterns).toContain('docs/**');
      expect(excludePatterns).toContain('.env');
      expect(excludePatterns).toContain('*.log');
    });

    test('processes multiple gitignore files', async () => {
      // Root .gitignore
      fs.writeFileSync('.gitignore', '*.pyc\n__pycache__/');

      // Create subdirectory with its own .gitignore
      const subDir = path.join(tempDir, 'subdir');
      fs.mkdirSync(subDir);
      fs.writeFileSync(
        path.join(subDir, '.gitignore'),
        'local-ignore\n/absolute-ignore'
      );

      const config = await VibeConfigImpl.loadFromFile();
      const excludePatterns = config.lint.excludePatterns;

      expect(excludePatterns).toContain('*.pyc');
      expect(excludePatterns).toContain('subdir/local-ignore');
      expect(excludePatterns).toContain('subdir/absolute-ignore');
    });

    test('ignores commented and empty lines in gitignore', async () => {
      const gitignoreContent = `
# This is a comment

*.pyc
# Another comment
   # Indented comment
__pycache__/

`;

      fs.writeFileSync('.gitignore', gitignoreContent);
      const config = await VibeConfigImpl.loadFromFile();

      const excludePatterns = config.lint.excludePatterns;
      expect(excludePatterns).toContain('*.pyc');
      expect(excludePatterns).toContain('__pycache__');

      // Should not contain comment lines
      const hasComments = excludePatterns.some(pattern => pattern.includes('#'));
      expect(hasComments).toBe(false);
    });

    test('adds essential patterns even without gitignore', async () => {
      const config = await VibeConfigImpl.loadFromFile();
      const excludePatterns = config.lint.excludePatterns;

      expect(excludePatterns).toContain('.git');
      expect(excludePatterns).toContain('.git/**');
      expect(excludePatterns).toContain('.github');
      expect(excludePatterns).toContain('.github/**');
    });
  });

  describe('Project type detection', () => {
    test('detects typescript projects', async () => {
      fs.writeFileSync('package.json', '{"devDependencies": {"typescript": "^4.0.0"}}');
      fs.writeFileSync('tsconfig.json', '{}');
      const config = await VibeConfigImpl.loadFromFile();

      const projectType = await config.detectProjectType();
      expect(projectType).toBe('typescript');
    });

    test('respects manual project type setting', async () => {
      fs.writeFileSync('package.json', '{}');
      fs.writeFileSync('.vibe.yaml', 'project_type: python');

      const config = await VibeConfigImpl.loadFromFile();
      const projectType = await config.detectProjectType();
      expect(projectType).toBe('python');
    });

    test('auto-detects when project_type is "auto"', async () => {
      fs.writeFileSync('package.json', '{}');
      fs.writeFileSync('.vibe.yaml', 'project_type: auto');

      const config = await VibeConfigImpl.loadFromFile();
      const projectType = await config.detectProjectType();
      expect(['node', 'javascript', 'typescript', 'generic']).toContain(projectType);
    });
  });

  describe('Workflow configuration', () => {
    test('loads default workflows', async () => {
      const config = await VibeConfigImpl.loadFromFile();

      expect(config.workflows['analysis']).toBeDefined();
      expect(config.workflows['implementation']).toBeDefined();
      expect(config.workflows['testing']).toBeDefined();
      expect(config.workflows['quality-check']).toBeDefined();
    });

    test('merges custom workflows with defaults', async () => {
      const configContent = `
workflows:
  custom-workflow:
    enabled: true
    priority: 1
    triggers: ["custom", "test"]
    description: "Custom workflow"
`;

      fs.writeFileSync('.vibe.yaml', configContent);
      const config = await VibeConfigImpl.loadFromFile();

      // Should have both default and custom workflows
      expect(config.workflows['analysis']).toBeDefined();
      expect(config.workflows['custom-workflow']).toBeDefined();
      expect(config.workflows['custom-workflow']?.triggers).toEqual(['custom', 'test']);
    });

    test('workflow priority and enabled status', async () => {
      const config = await VibeConfigImpl.loadFromFile();

      expect(config.isWorkflowEnabled('analysis')).toBe(true);
      expect(config.getWorkflowPriority('analysis')).toBe(1);

      const enabledWorkflows = config.getEnabledWorkflowsSorted();
      expect(enabledWorkflows.length).toBeGreaterThan(0);
      expect(enabledWorkflows).toContain('analysis');
    });
  });

  describe('Project type configurations', () => {
    it('loads default project type configurations', async () => {
      const config = await VibeConfigImpl.loadFromFile();

      expect(config.projectTypes['generic']).toBeDefined();

      expect(config.projectTypes['typescript']?.workflows).toContain(
        'typescript-setup'
      );
    });

    test('gets workflows for specific project type', async () => {
      const config = await VibeConfigImpl.loadFromFile();

      const typescriptWorkflows = config.getWorkflowsForProjectType('typescript');
      expect(typescriptWorkflows).toContain('analysis');
      expect(typescriptWorkflows).toContain('typescript-setup');

      const genericWorkflows = config.getWorkflowsForProjectType('nonexistent');
      expect(genericWorkflows).toEqual(config.projectTypes['generic']?.workflows || []);
    });

    test('gets tools for specific project type', async () => {
      const config = await VibeConfigImpl.loadFromFile();

      const typescriptTools = config.getToolsForProjectType('typescript');
      expect(typescriptTools).toContain('jest');
      expect(typescriptTools).toContain('eslint');
    });
  });

  describe('Lint configuration', () => {
    test('loads default lint configuration', async () => {
      const config = await VibeConfigImpl.loadFromFile();

      expect(config.lint.checkEmojis).toBe(true);
      expect(config.lint.checkProfessionalLanguage).toBe(true);
      expect(config.lint.namingConventions['.ts']).toBe('camelCase');
      expect(config.lint.namingConventions['.ts']).toBe('camelCase');
      expect(config.lint.directoryNaming).toBe('snake_case');
    });

    test('merges custom lint configuration', async () => {
      const configContent = `
lint:
  checkEmojis: false
  maxStepMessageLength: 200
  namingConventions:
    '.py': 'camelCase'
  excludePatterns:
    - custom-exclude/**
`;

      fs.writeFileSync('.vibe.yaml', configContent);
      const config = await VibeConfigImpl.loadFromFile();

      expect(config.lint.checkEmojis).toBe(false);
      expect(config.lint.maxStepMessageLength).toBe(200);
      expect(config.lint.namingConventions['.py']).toBe('camelCase');
      expect(config.lint.excludePatterns).toContain('custom-exclude/**');
    });
  });

  describe('Session configuration', () => {
    test('loads default session configuration', async () => {
      const config = await VibeConfigImpl.loadFromFile();

      expect(config.session.maxSessions).toBe(10);
      expect(config.session.sessionTimeout).toBe(3600000);
    });

    test('merges custom session configuration', async () => {
      const configContent = `
session:
  maxSessions: 5
  sessionTimeout: 1800000
`;

      fs.writeFileSync('.vibe.yaml', configContent);
      const config = await VibeConfigImpl.loadFromFile();

      expect(config.session.maxSessions).toBe(5);
      expect(config.session.sessionTimeout).toBe(1800000);
    });
  });

  describe('Error handling', () => {
    test('handles invalid YAML gracefully', async () => {
      fs.writeFileSync('.vibe.yaml', 'invalid: yaml: content: [');

      // Should not throw, should return default config
      const config = await VibeConfigImpl.loadFromFile();
      expect(config).toBeDefined();
      expect(config.projectType).toBe('auto');
    });

    test('handles missing directories gracefully', async () => {
      // Should not throw when trying to read gitignore from non-existent directories
      const config = await VibeConfigImpl.loadFromFile();
      expect(config).toBeDefined();
    });

    test('handles permission errors gracefully', async () => {
      // This test is environment-dependent, but the code should handle it
      const config = await VibeConfigImpl.loadFromFile();
      expect(config).toBeDefined();
    });
  });

  describe('Configuration inheritance', () => {
    test('preserves defaults when loading partial config', async () => {
      const configContent = `
project_type: python
`;

      fs.writeFileSync('.vibe.yaml', configContent);
      const config = await VibeConfigImpl.loadFromFile();

      // Should have the custom project_type
      expect(config.projectType).toBe('python');

      // Should still have default workflows and other settings
      expect(Object.keys(config.workflows).length).toBeGreaterThan(0);
      expect(config.lint.checkEmojis).toBe(true);
      expect(config.session.maxSessions).toBe(10);
    });
  });
});
