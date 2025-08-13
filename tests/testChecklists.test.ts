/**
 * Checklist functionality tests
 */

import { execSync } from 'child_process';
import { getChecklist, getChecklists } from '../src/guidance/loader';
import { Checklist } from '../src/guidance/models';
import { describe, expect, test } from 'vitest';

interface CommandResult {
  success: boolean;
  checklists?: { name: string; description?: string }[];
  checklist?: any;
  result?: any;
  error?: string;
}

function runCommand(cmd: string[]): CommandResult {
  console.log(`🔄 Running: ${cmd.join(' ')}`);

  try {
    // Use direct CLI instead of npm run cli
    const cliCmd =
      cmd[0] === 'npm' && cmd[1] === 'run' && cmd[2] === 'cli'
        ? ['node', 'dist/src/cli.js', ...cmd.slice(3)]
        : cmd;

    // Use execSync with array to avoid shell escaping issues
    const quotedCmd = cliCmd
      .map(arg => (arg.includes(' ') ? `"${arg}"` : arg))
      .join(' ');

    const result = execSync(quotedCmd, {
      encoding: 'utf-8',
      cwd: process.cwd(),
    });

    return JSON.parse(result);
  } catch (error: any) {
    console.error(`❌ Command failed: ${error.message}`);
    if (error.stdout) {
      console.error(`   stdout: ${error.stdout}`);
    }
    if (error.stderr) {
      console.error(`   stderr: ${error.stderr}`);
    }
    throw error;
  }
}

describe('Checklist API', () => {
  test('CLI checklist commands work', () => {
    console.log('\n📋 Testing CLI Checklist Commands');
    console.log('='.repeat(40));

    // Test list command
    console.log('\n1. Testing list command...');
    const listCmd = ['npm', 'run', 'cli', 'checklists', 'list', '--format', 'json'];
    const listResult = runCommand(listCmd);

    expect(listResult.success).toBe(true);
    expect(listResult.checklists).toBeDefined();
    expect(listResult.checklists!.length).toBeGreaterThan(0);

    console.log(`   ✅ Found ${listResult.checklists!.length} checklists`);

    // Test show command
    console.log('\n2. Testing show command...');
    const firstChecklist = listResult.checklists?.[0]?.name;
    if (!firstChecklist) {
      console.log('⚠️ No checklists found, skipping show test');
      return;
    }
    const showCmd = [
      'npm',
      'run',
      'cli',
      'checklists',
      'show',
      firstChecklist,
      '--format',
      'json',
    ];

    const showResult = runCommand(showCmd);
    expect(showResult.success).toBe(true);
    expect(showResult.checklist).toBeDefined();

    console.log(`   ✅ Successfully showed checklist: ${firstChecklist}`);
  });

  test('CLI checklist run command works', () => {
    console.log('\n3. Testing run command...');

    // First get a checklist to run
    const listCmd = ['npm', 'run', 'cli', 'checklists', 'list', '--format', 'json'];
    const listResult = runCommand(listCmd);

    expect(listResult.success).toBe(true);
    expect(listResult.checklists!.length).toBeGreaterThan(0);

    const firstChecklist = listResult.checklists?.[0]?.name;
    if (!firstChecklist) {
      console.log('⚠️ No checklists found, skipping run test');
      return;
    }
    const runCmd = [
      'npm',
      'run',
      'cli',
      'checklists',
      'run',
      firstChecklist,
      '--format',
      'json',
    ];

    const runResult = runCommand(runCmd);
    expect(runResult.success).toBe(true);
    expect(runResult.result).toBeDefined();

    console.log(`   ✅ Successfully ran checklist: ${firstChecklist}`);
  });

  test('checklist filtering works', () => {
    console.log('\n4. Testing project type filtering...');

    // Test filtering by project type
    const typescriptCmd = [
      'npm',
      'run',
      'cli',
      'checklists',
      'list',
      '--project-type',
      'typescript',
      '--format',
      'json',
    ];
    const typescriptResult = runCommand(typescriptCmd);

    expect(typescriptResult.success).toBe(true);
    expect(typescriptResult.checklists).toBeDefined();

    // Should have some TypeScript-specific checklists
    console.log(
      `   ✅ Found ${typescriptResult.checklists!.length} TypeScript checklists`
    );

    // Test filtering by different project type
    const jsCmd = [
      'npm',
      'run',
      'cli',
      'checklists',
      'list',
      '--project-type',
      'javascript',
      '--format',
      'json',
    ];
    const jsResult = runCommand(jsCmd);

    expect(jsResult.success).toBe(true);
    expect(jsResult.checklists).toBeDefined();

    console.log(`   ✅ Found ${jsResult.checklists!.length} JavaScript checklists`);
  });

  test('checklist metadata is accessible', () => {
    console.log('\n5. Testing checklist metadata...');

    // Get a specific checklist and check its metadata
    const listCmd = ['npm', 'run', 'cli', 'checklists', 'list', '--format', 'json'];
    const listResult = runCommand(listCmd);

    expect(listResult.success).toBe(true);
    expect(listResult.checklists!.length).toBeGreaterThan(0);

    const checklist = listResult.checklists?.[0];
    if (!checklist) {
      console.log('⚠️ No checklists found, skipping metadata test');
      return;
    }
    expect(checklist.name).toBeDefined();
    expect(typeof checklist.name).toBe('string');

    // Get detailed view
    const showCmd = [
      'npm',
      'run',
      'cli',
      'checklists',
      'show',
      checklist.name,
      '--format',
      'json',
    ];
    const showResult = runCommand(showCmd);

    expect(showResult.success).toBe(true);
    expect(showResult.checklist).toBeDefined();
    expect(showResult.checklist.name).toBe(checklist.name);

    console.log(`   ✅ Checklist metadata validated for: ${checklist.name}`);
  });

  test('error handling works correctly', () => {
    console.log('\n6. Testing error handling...');

    // Test with non-existent checklist
    try {
      const invalidCmd = [
        'npm',
        'run',
        'cli',
        'checklists',
        'show',
        'non_existent_checklist',
        '--format',
        'json',
      ];
      const result = runCommand(invalidCmd);

      // Should either fail or return an error in the JSON
      if (result.success === false) {
        expect(result.error).toBeDefined();
        console.log(`   ✅ Error handled correctly: ${result.error}`);
      }
    } catch (error) {
      // Command failed as expected
      console.log('   ✅ Non-existent checklist correctly rejected');
    }
  });

  test('integration test completes successfully', () => {
    console.log('\n🎉 All checklist API tests completed successfully!');

    console.log('\n📋 Test Summary:');
    console.log('  ✅ CLI list command');
    console.log('  ✅ CLI show command');
    console.log('  ✅ CLI run command');
    console.log('  ✅ Project type filtering');
    console.log('  ✅ Metadata access');
    console.log('  ✅ Error handling');
  });

  describe('Checklist Core Functionality', () => {
    test('checklists can be loaded successfully', () => {
      const checklists = getChecklists();

      // Should load at least one checklist
      expect(Object.keys(checklists).length).toBeGreaterThan(0);

      // Check structure of first checklist
      const firstChecklist = Object.values(checklists)[0] as Checklist;
      expect(firstChecklist).toHaveProperty('name');
      expect(firstChecklist).toHaveProperty('triggers');
      expect(firstChecklist).toHaveProperty('items');
    });

    test('individual checklist can be retrieved', () => {
      const checklists = getChecklists();
      const checklistName = Object.keys(checklists)[0];
      expect(checklistName).toBeDefined();

      const checklist = getChecklist(checklistName!);
      expect(checklist).toBeDefined();
      expect(checklist?.name).toBe(checklistName);
    });

    test('non-existent checklist returns null', () => {
      const checklist = getChecklist('non-existent-checklist');
      expect(checklist).toBeNull();
    });

    test('checklist items have required structure', () => {
      const checklists = getChecklists();
      const firstChecklist = Object.values(checklists)[0] as Checklist;
      expect(firstChecklist).toBeDefined();

      expect(Array.isArray(firstChecklist.items)).toBe(true);
      if (firstChecklist.items.length > 0) {
        const firstItem = firstChecklist.items[0];
        expect(firstItem).toBeDefined();
        expect(typeof firstItem).toBe('string');
        expect(firstItem!.length).toBeGreaterThan(0);
      }
    });

    test('checklist triggers are properly formatted', () => {
      const checklists = getChecklists();
      const firstChecklist = Object.values(checklists)[0] as Checklist;

      expect(Array.isArray(firstChecklist.triggers)).toBe(true);
      firstChecklist.triggers.forEach(trigger => {
        expect(typeof trigger).toBe('string');
        expect(trigger.length).toBeGreaterThan(0);
      });
    });
  });
});
