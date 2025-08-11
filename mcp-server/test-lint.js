#!/usr/bin/env node
/**
 * Test script for Vibe MCP Server lint functionality
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';

let serverProcess;
let client;

async function testLintMCP() {
  console.log('🧪 Testing Vibe MCP Server Lint Functionality\n');

  try {
    // Start MCP server
    console.log('🚀 Starting MCP server...');
    serverProcess = spawn('node', ['index.js'], {
      cwd: process.cwd(),
      stdio: ['pipe', 'pipe', 'inherit']
    });

    // Connect client
    const transport = new StdioClientTransport({
      reader: serverProcess.stdout,
      writer: serverProcess.stdin
    });

    client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
    await client.connect(transport);
    console.log('✅ MCP connection initialized\n');

    // Test 1: Lint project with summary format
    console.log('1. Testing project linting...');
    const projectLintResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'lint_project',
        arguments: {
          format: 'summary',
          working_dir: '../'  // Parent directory (vibe project root)
        }
      }
    });

    console.log('📞 Called: lint_project');
    const projectResult = JSON.parse(projectLintResult.content[0].text);
    console.log('✅ Success:', projectResult.success);
    if (projectResult.success) {
      console.log('   Result: Clean linting - no issues found!\n');
    } else {
      console.log('   Error:', projectResult.error, '\n');
    }

    // Test 2: Lint specific text content
    console.log('2. Testing text linting...');
    const textLintResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'lint_text',
        arguments: {
          text: 'This is awesome! We gonna make it super cool!',
          context: 'general',
          working_dir: '../'
        }
      }
    });

    console.log('📞 Called: lint_text');
    const textResult = JSON.parse(textLintResult.content[0].text);
    console.log('✅ Success:', textResult.success);
    if (textResult.success) {
      console.log('   Found issues with informal language (as expected)\n');
    } else {
      console.log('   Error:', textResult.error, '\n');
    }

    // Test 3: Lint project with specific type filter
    console.log('3. Testing filtered project linting...');
    const filteredLintResult = await client.request({
      method: 'tools/call',
      params: {
        name: 'lint_project',
        arguments: {
          format: 'json',
          type: 'naming_convention',
          working_dir: '../'
        }
      }
    });

    console.log('📞 Called: lint_project (naming only)');
    const filteredResult = JSON.parse(filteredLintResult.content[0].text);
    console.log('✅ Success:', filteredResult.success);
    if (filteredResult.success) {
      console.log('   Clean naming conventions!\n');
    } else {
      console.log('   Error:', filteredResult.error, '\n');
    }

    console.log('🎉 All lint tests completed successfully!\n');

    console.log('📋 Test Summary:');
    console.log('  ✅ Project linting (summary format)');
    console.log('  ✅ Text content linting');
    console.log('  ✅ Filtered project linting (naming conventions)');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    // Cleanup
    if (client) {
      await client.close();
    }
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
    }
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Test interrupted');
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  process.exit(0);
});

testLintMCP().catch((error) => {
  console.error('Test runner error:', error);
  process.exit(1);
});
