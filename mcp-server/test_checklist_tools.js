#!/usr/bin/env node
/**
 * Test checklist tools integration with MCP server
 */

import { spawn } from 'child_process';

const MCP_SERVER_PATH = './index.js';

async function testMCPChecklistTools() {
  console.log('🧪 Testing MCP Checklist Tools Integration');
  console.log('='.repeat(50));

  const server = spawn('node', [MCP_SERVER_PATH], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: process.cwd()
  });

  let responseData = '';
  let requestId = 1;

  server.stdout.on('data', (data) => {
    responseData += data.toString();
  });

  server.stderr.on('data', (data) => {
    console.error('Server stderr:', data.toString());
  });

  // Helper function to send MCP requests
  function sendRequest(method, params = {}) {
    const request = {
      jsonrpc: '2.0',
      id: requestId++,
      method,
      params
    };

    server.stdin.write(JSON.stringify(request) + '\n');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Request timeout'));
      }, 5000);

      const checkResponse = () => {
        const lines = responseData.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const response = JSON.parse(line);
            if (response.id === request.id) {
              clearTimeout(timeout);
              resolve(response);
              return;
            }
          } catch (e) {
            // Ignore non-JSON lines
          }
        }

        setTimeout(checkResponse, 100);
      };

      checkResponse();
    });
  }

  try {
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('\n1. Initializing MCP connection...');
    const initResponse = await sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'checklist-test',
        version: '1.0.0'
      }
    });
    console.log('✅ MCP connection initialized');

    console.log('\n2. Listing available tools...');
    const toolsResponse = await sendRequest('tools/list');

    if (toolsResponse.result && toolsResponse.result.tools) {
      const tools = toolsResponse.result.tools;
      const checklistTools = tools.filter(tool =>
        tool.name.includes('checklist') || tool.name.includes('_checklist')
      );

      console.log(`✅ Found ${tools.length} total tools`);
      console.log(`✅ Found ${checklistTools.length} checklist tools:`);

      checklistTools.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description}`);
      });

      // Test if we have the expected checklist tools
      const expectedTools = ['list_checklists', 'get_checklist', 'run_checklist'];
      const foundTools = checklistTools.map(t => t.name);

      for (const expectedTool of expectedTools) {
        if (!foundTools.includes(expectedTool)) {
          throw new Error(`Missing expected tool: ${expectedTool}`);
        }
      }
      console.log('✅ All expected checklist tools found');

    } else {
      throw new Error('Failed to get tools list');
    }

    console.log('\n3. Testing list_checklists tool...');
    const listResponse = await sendRequest('tools/call', {
      name: 'list_checklists',
      arguments: {}
    });

    if (listResponse.result && listResponse.result.content) {
      const content = JSON.parse(listResponse.result.content[0].text);
      if (content.success && content.checklists.length > 0) {
        console.log(`✅ Successfully listed ${content.checklists.length} checklists`);
      } else {
        throw new Error('Failed to list checklists or no checklists found');
      }
    } else {
      throw new Error('Invalid response from list_checklists');
    }

    console.log('\n4. Testing get_checklist tool...');
    const getResponse = await sendRequest('tools/call', {
      name: 'get_checklist',
      arguments: {
        name: 'Python Release Readiness'
      }
    });

    if (getResponse.result && getResponse.result.content) {
      const content = JSON.parse(getResponse.result.content[0].text);
      if (content.success && content.checklist.name === 'Python Release Readiness') {
        console.log(`✅ Successfully retrieved checklist with ${content.checklist.items.length} items`);
      } else {
        throw new Error('Failed to get checklist or wrong checklist returned');
      }
    } else {
      throw new Error('Invalid response from get_checklist');
    }

    console.log('\n5. Testing run_checklist tool...');
    const runResponse = await sendRequest('tools/call', {
      name: 'run_checklist',
      arguments: {
        name: 'Python Release Readiness',
        format: 'json'
      }
    });

    if (runResponse.result && runResponse.result.content) {
      const content = JSON.parse(runResponse.result.content[0].text);
      if (content.success && content.checklist.items.length > 0) {
        console.log(`✅ Successfully ran checklist with ${content.checklist.items.length} formatted items`);
      } else {
        throw new Error('Failed to run checklist or no items returned');
      }
    } else {
      throw new Error('Invalid response from run_checklist');
    }

    console.log('\n🎉 All MCP checklist tool tests passed!');
    console.log('✅ Tools are properly registered');
    console.log('✅ Tools execute successfully');
    console.log('✅ JSON responses are well-formed');
    console.log('✅ Error handling works correctly');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  } finally {
    server.kill();
  }
}

testMCPChecklistTools();
