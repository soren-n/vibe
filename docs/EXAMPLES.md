# Vibe MCP Usage Examples

This document provides practical examples of how to use Vibe MCP effectively in different scenarios.

## Table of Contents

- [Getting Started](#getting-started)
- [Basic Plan Management](#basic-plan-management)
- [Workflow-Guided Development](#workflow-guided-development)
- [Feature Implementation](#feature-implementation)
- [Bug Fixing Workflow](#bug-fixing-workflow)
- [Code Quality Improvement](#code-quality-improvement)
- [Project Setup](#project-setup)
- [Advanced Patterns](#advanced-patterns)

## Getting Started

### Initial Setup

First, configure Vibe as an MCP server in VS Code:

**.vscode/mcp.json:**

```json
{
  "servers": {
    "vibe-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["vibe-mcp@latest", "mcp-server"],
      "cwd": "${workspaceFolder}",
      "env": {}
    }
  }
}
```

After creating this file, restart VS Code to enable the integration.

### First Plan

Let's start with a simple task management example:

```
Agent: I need to organize my work for today. Can you help me create a plan?

Vibe: I'll help you create a plan for today's work. Let me start with a clean slate and add some tasks.

*Uses get_plan_status() to check current state*
*Uses clear_plan() to start fresh*
*Uses add_plan_item() to create tasks*

Here's your plan for today:
- Morning: Review and respond to emails
- Code review for PR #123
- Implement user dashboard feature
- Team standup at 2 PM
- Write documentation for new API endpoints

Would you like me to break down any of these tasks into more detail?
```

This shows the natural flow of agent-Vibe interaction where the agent creates structured plans.

## Basic Plan Management

### Creating and Managing Tasks

```typescript
// Example: Planning a feature implementation
async function planFeatureWork() {
  // 1. Check current plan status
  const status = await get_plan_status();
  console.log(`Current plan has ${status.plan.stats.totalItems} items`);

  // 2. Add main feature task
  const mainTask = await add_plan_item('Implement user authentication system');

  // 3. Break down into subtasks
  const subtasks = [
    'Set up authentication database schema',
    'Create user registration endpoint',
    'Implement JWT token generation',
    'Add password hashing and validation',
    'Create login/logout endpoints',
    'Add authentication middleware',
    'Write comprehensive tests',
    'Update API documentation',
  ];

  const expansion = await expand_plan_item(mainTask.item.id, subtasks);
  console.log(`Added ${expansion.addedItems.length} subtasks`);

  // 4. Check updated plan
  const updatedStatus = await get_plan_status();
  console.log(`Plan now has ${updatedStatus.plan.stats.totalItems} total tasks`);
}
```

### Tracking Progress

```typescript
async function trackAndCompleteWork() {
  // Get current plan to see what needs to be done
  const status = await get_plan_status();

  console.log('Current Progress:');
  console.log(`- Total tasks: ${status.plan.stats.totalItems}`);
  console.log(`- Completed: ${status.plan.stats.completedItems}`);
  console.log(`- Remaining: ${status.plan.stats.pendingItems}`);
  console.log(`- Progress: ${(status.plan.stats.completionRate * 100).toFixed(1)}%`);

  // Find pending tasks
  const pendingTasks = status.plan.items.filter(item => item.status === 'pending');

  if (pendingTasks.length > 0) {
    console.log('\nNext tasks to work on:');
    pendingTasks.slice(0, 3).forEach((task, index) => {
      console.log(`${index + 1}. ${task.text}`);
    });

    // Complete the first task (simulating work completion)
    const firstTask = pendingTasks[0];
    const result = await complete_plan_item(firstTask.id);
    if (result.success) {
      console.log(`✅ Completed: ${firstTask.text}`);
    }
  }
}
```

## Workflow-Guided Development

### Using Workflows for Guidance

```typescript
async function getImplementationGuidance(feature: string) {
  // 1. Search for relevant workflows
  console.log(`Getting guidance for: ${feature}`);

  const workflows = await query_workflows('implementation', 'development');

  if (workflows.success && workflows.workflows.length > 0) {
    const workflow = workflows.workflows[0];
    console.log(`Found workflow: ${workflow.name}`);
    console.log(`Description: ${workflow.description}`);

    // 2. Create main task
    const mainTask = await add_plan_item(`Implement ${feature}`);

    // 3. Use workflow steps as subtasks
    const result = await expand_plan_item(mainTask.item.id, workflow.steps);

    console.log(`\n📋 Created plan with ${result.addedItems.length} steps:`);
    result.addedItems.forEach((item, index) => {
      console.log(`${index + 1}. ${item.text}`);
    });

    return { mainTask: mainTask.item, subtasks: result.addedItems };
  } else {
    console.log('No relevant workflows found');
    return null;
  }
}

// Usage
await getImplementationGuidance('shopping cart functionality');
```

### Finding Specific Workflow Types

```typescript
async function exploreWorkflowLibrary() {
  // Get all available workflows
  const allWorkflows = await query_workflows();
  console.log(`Total workflows available: ${allWorkflows.workflows.length}`);

  // Search by category
  const categories = ['development', 'testing', 'documentation', 'core'];

  for (const category of categories) {
    const categoryWorkflows = await query_workflows(null, category);
    console.log(
      `\n📂 ${category.toUpperCase()} (${categoryWorkflows.workflows.length} workflows):`
    );

    categoryWorkflows.workflows.forEach(workflow => {
      console.log(`  • ${workflow.name}: ${workflow.description}`);
    });
  }

  // Search for specific patterns
  const testingWorkflows = await query_workflows('test');
  console.log(`\n🧪 Testing-related workflows: ${testingWorkflows.workflows.length}`);

  const bugWorkflows = await query_workflows('bug');
  console.log(`🐛 Bug-related workflows: ${bugWorkflows.workflows.length}`);
}
```

## Feature Implementation

### Complete Feature Development Cycle

```typescript
async function implementFeatureWithWorkflow(featureName: string) {
  console.log(`🚀 Starting implementation of: ${featureName}`);

  // 1. Clear previous plan and start fresh
  await clear_plan();

  // 2. Search for implementation guidance
  const workflows = await query_workflows('implementation', 'development');

  // 3. Create main feature task
  const mainTask = await add_plan_item(`Implement ${featureName}`);

  // 4. Add standard implementation steps
  const implementationSteps = [
    'Analyze requirements and create technical specification',
    'Design system architecture and components',
    'Set up development environment and dependencies',
    'Implement core functionality',
    'Add comprehensive test coverage',
    'Perform code review and refactoring',
    'Update documentation and examples',
    'Deploy to staging for testing',
    'Conduct final review and deploy to production',
  ];

  await expand_plan_item(mainTask.item.id, implementationSteps);

  // 5. Get testing guidance for the testing step
  const testWorkflows = await query_workflows('testing', 'testing');
  if (testWorkflows.workflows.length > 0) {
    // Find the testing task and expand it
    const status = await get_plan_status();
    const testingTask = status.plan.items
      .flatMap(item => [item, ...item.children])
      .find(item => item.text.includes('test coverage'));

    if (testingTask) {
      await expand_plan_item(testingTask.id, testWorkflows.workflows[0].steps);
    }
  }

  // 6. Show final plan
  const finalStatus = await get_plan_status();
  console.log(`\n📋 Implementation Plan Created:`);
  console.log(`- Total tasks: ${finalStatus.plan.stats.totalItems}`);
  console.log(`- Ready to begin development`);

  return finalStatus;
}

// Usage
await implementFeatureWithWorkflow('Real-time notifications');
```

### Progressive Task Completion

```typescript
async function simulateFeatureDevelopment() {
  console.log('🔄 Simulating feature development workflow...\n');

  // Create a simple feature plan
  const mainTask = await add_plan_item('Add user profile editing');
  await expand_plan_item(mainTask.item.id, [
    'Design profile edit form UI',
    'Create backend API endpoints',
    'Implement form validation',
    'Add unit tests',
    'Test integration',
  ]);

  // Simulate completing tasks one by one
  let status = await get_plan_status();

  while (status.plan.stats.pendingItems > 0) {
    // Find next pending task
    const pendingTask = status.plan.items
      .flatMap(item => [item, ...item.children])
      .find(item => item.status === 'pending');

    if (pendingTask) {
      console.log(`🔨 Working on: ${pendingTask.text}`);

      // Simulate work time
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Complete the task
      await complete_plan_item(pendingTask.id);
      console.log(`✅ Completed: ${pendingTask.text}`);

      // Show progress
      status = await get_plan_status();
      const progress = (status.plan.stats.completionRate * 100).toFixed(1);
      console.log(
        `📊 Progress: ${progress}% (${status.plan.stats.completedItems}/${status.plan.stats.totalItems})\n`
      );
    }
  }

  console.log('🎉 Feature development completed!');
}
```

## Bug Fixing Workflow

### Systematic Bug Resolution

```typescript
async function createBugFixPlan(bugDescription: string) {
  console.log(`🐛 Creating bug fix plan for: ${bugDescription}`);

  // 1. Search for debugging workflows
  const workflows = await query_workflows('debug', 'development');

  // 2. Create main bug fix task
  const bugTask = await add_plan_item(`Fix: ${bugDescription}`);

  // 3. Use systematic debugging approach
  const debuggingSteps = [
    'Reproduce the bug consistently',
    'Identify the root cause through investigation',
    'Create minimal test case that demonstrates the bug',
    'Implement the fix',
    'Verify the fix resolves the issue',
    'Add regression tests to prevent reoccurrence',
    'Update documentation if needed',
    'Code review and testing',
  ];

  const expansion = await expand_plan_item(bugTask.item.id, debuggingSteps);

  // 4. Add investigation substeps to the first task
  const reproduceTask = expansion.addedItems[0];
  await expand_plan_item(reproduceTask.id, [
    'Gather detailed bug report information',
    'Set up test environment to match reported conditions',
    'Attempt to reproduce with different inputs/scenarios',
    'Document exact steps that trigger the bug',
  ]);

  const status = await get_plan_status();
  console.log(
    `Created systematic bug fix plan with ${status.plan.stats.totalItems} total tasks`
  );

  return status;
}

// Usage example
await createBugFixPlan('User login fails with special characters in password');
```

### Integration with Workflows

```typescript
async function bugFixWithWorkflowGuidance(bugId: string, description: string) {
  // 1. Create bug fix plan
  await clear_plan();
  const mainTask = await add_plan_item(`Bug #${bugId}: ${description}`);

  // 2. Search for debugging workflows
  const debugWorkflows = await query_workflows('debug');
  const testWorkflows = await query_workflows('test');

  console.log(`Found ${debugWorkflows.workflows.length} debugging workflows`);
  console.log(`Found ${testWorkflows.workflows.length} testing workflows`);

  // 3. Create comprehensive plan
  if (debugWorkflows.workflows.length > 0) {
    await expand_plan_item(mainTask.item.id, debugWorkflows.workflows[0].steps);

    // 4. Add testing subtasks to the testing step
    if (testWorkflows.workflows.length > 0) {
      const status = await get_plan_status();
      const testTask = status.plan.items
        .flatMap(item => [item, ...item.children])
        .find(item => item.text.toLowerCase().includes('test'));

      if (testTask) {
        await expand_plan_item(testTask.id, testWorkflows.workflows[0].steps);
      }
    }
  }

  // 5. Show final plan structure
  const finalPlan = await get_plan_status();
  console.log('\n🔍 Bug Fix Plan Structure:');

  function printTasks(items: any[], indent = '') {
    items.forEach(item => {
      const status = item.status === 'complete' ? '✅' : '⏳';
      console.log(`${indent}${status} ${item.text}`);
      if (item.children.length > 0) {
        printTasks(item.children, indent + '  ');
      }
    });
  }

  printTasks(finalPlan.plan.items);

  return finalPlan;
}
```

## Code Quality Improvement

### Quality Assessment and Planning

```typescript
async function createQualityImprovementPlan() {
  console.log('🔍 Assessing code quality and creating improvement plan...');

  // 1. Check Vibe environment
  const envCheck = await check_vibe_environment();
  if (!envCheck.success) {
    console.log('❌ Environment check failed');
    return;
  }

  // 2. Run project linting
  console.log('Running lint analysis...');
  const lintResult = await lint_project(false); // Don't auto-fix yet

  if (lintResult.success) {
    console.log(`\n📊 Lint Results:`);
    console.log(`- Files checked: ${lintResult.result.filesChecked}`);
    console.log(`- Issues found: ${lintResult.result.issuesFound}`);
    console.log(`- Warnings: ${lintResult.result.warnings}`);
    console.log(`- Errors: ${lintResult.result.errors}`);

    // 3. Create improvement plan
    await clear_plan();
    const mainTask = await add_plan_item('Improve code quality');

    const qualityTasks = [];

    if (lintResult.result.issuesFound > 0) {
      qualityTasks.push(`Fix ${lintResult.result.issuesFound} linting issues`);
    }

    // Add general quality improvement tasks
    qualityTasks.push(
      'Review and refactor complex functions',
      'Add missing type annotations',
      'Improve error handling',
      'Add comprehensive documentation',
      'Increase test coverage',
      'Optimize performance bottlenecks'
    );

    if (qualityTasks.length > 0) {
      await expand_plan_item(mainTask.item.id, qualityTasks);
    }

    // 4. Get quality workflows for guidance
    const qualityWorkflows = await query_workflows('quality', 'development');
    console.log(
      `\n📚 Found ${qualityWorkflows.workflows.length} quality workflows for guidance`
    );

    // 5. Show plan
    const status = await get_plan_status();
    console.log(
      `\n📋 Created quality improvement plan with ${status.plan.stats.totalItems} tasks`
    );

    return { lintResult, status };
  }
}
```

### Automated Quality Fixes

```typescript
async function runQualityImprovementCycle() {
  console.log('🔄 Starting automated quality improvement cycle...');

  // 1. Assess current state
  const assessment = await createQualityImprovementPlan();
  if (!assessment) return;

  // 2. Run auto-fixes
  console.log('🔧 Running automatic fixes...');
  const fixResult = await lint_project(true); // Auto-fix enabled

  if (fixResult.success && fixResult.result.issuesFixed > 0) {
    console.log(`✅ Automatically fixed ${fixResult.result.issuesFixed} issues`);

    // Mark the linting task as complete
    const status = await get_plan_status();
    const lintTask = status.plan.items
      .flatMap(item => [item, ...item.children])
      .find(item => item.text.includes('linting issues'));

    if (lintTask) {
      await complete_plan_item(lintTask.id);
      console.log('✅ Marked linting task as complete');
    }
  }

  // 3. Show remaining work
  const updatedStatus = await get_plan_status();
  console.log(`\n📊 Quality Improvement Progress:`);
  console.log(`- Completed: ${updatedStatus.plan.stats.completedItems}`);
  console.log(`- Remaining: ${updatedStatus.plan.stats.pendingItems}`);
  console.log(
    `- Progress: ${(updatedStatus.plan.stats.completionRate * 100).toFixed(1)}%`
  );

  return updatedStatus;
}
```

## Project Setup

### New Project Initialization

```typescript
async function setupNewProject(projectName: string, projectType: string) {
  console.log(`🚀 Setting up new project: ${projectName} (${projectType})`);

  // 1. Initialize Vibe for the project
  const initResult = await init_vibe_project(projectType);
  if (!initResult.success) {
    console.error('Failed to initialize Vibe project');
    return;
  }

  // 2. Clear any existing plan and create setup plan
  await clear_plan();
  const mainTask = await add_plan_item(`Set up ${projectName} (${projectType})`);

  // 3. Search for project setup workflows
  const setupWorkflows = await query_workflows('setup', 'configuration');
  const devWorkflows = await query_workflows('project', 'development');

  console.log(`Found ${setupWorkflows.workflows.length} setup workflows`);
  console.log(`Found ${devWorkflows.workflows.length} development workflows`);

  // 4. Create comprehensive setup plan
  const setupTasks = [
    'Initialize version control (Git)',
    'Set up project structure and directories',
    'Configure development environment',
    'Install and configure dependencies',
    'Set up testing framework',
    'Configure CI/CD pipeline',
    'Add code quality tools (linting, formatting)',
    'Create README and documentation',
    'Set up deployment configuration',
    'Perform initial testing and validation',
  ];

  await expand_plan_item(mainTask.item.id, setupTasks);

  // 5. Add project-type specific tasks
  let specificTasks = [];

  switch (projectType.toLowerCase()) {
    case 'typescript':
      specificTasks = [
        'Configure TypeScript compiler options',
        'Set up type definitions',
        'Configure build tools (webpack/rollup/etc)',
      ];
      break;
    case 'python':
      specificTasks = [
        'Set up virtual environment',
        'Configure pip requirements',
        'Set up pytest configuration',
      ];
      break;
    case 'javascript':
      specificTasks = [
        'Configure package.json scripts',
        'Set up bundler configuration',
        'Configure Jest for testing',
      ];
      break;
  }

  if (specificTasks.length > 0) {
    const configTask = await add_plan_item(
      `Configure ${projectType}-specific settings`,
      mainTask.item.id
    );
    await expand_plan_item(configTask.item.id, specificTasks);
  }

  // 6. Show final setup plan
  const status = await get_plan_status();
  console.log(`\n📋 Project Setup Plan Created:`);
  console.log(`- Total tasks: ${status.plan.stats.totalItems}`);
  console.log(`- Project type: ${initResult.projectType}`);
  console.log(`- Config created: ${initResult.configCreated}`);

  return status;
}

// Usage
await setupNewProject('my-awesome-app', 'typescript');
```

## Advanced Patterns

### Parallel Task Management

```typescript
async function manageParallelFeatures() {
  console.log('🔀 Managing multiple parallel features...');

  // 1. Start fresh
  await clear_plan();

  // 2. Create multiple main features
  const feature1 = await add_plan_item('Feature A: User Dashboard');
  const feature2 = await add_plan_item('Feature B: Payment Integration');
  const feature3 = await add_plan_item('Feature C: Notification System');

  // 3. Add tasks to each feature
  await expand_plan_item(feature1.item.id, [
    'Design dashboard wireframes',
    'Implement dashboard components',
    'Add data visualization',
    'Test dashboard functionality',
  ]);

  await expand_plan_item(feature2.item.id, [
    'Research payment providers',
    'Implement payment API integration',
    'Add payment form UI',
    'Test payment flows',
  ]);

  await expand_plan_item(feature3.item.id, [
    'Design notification system architecture',
    'Implement real-time notifications',
    'Add notification preferences',
    'Test notification delivery',
  ]);

  // 4. Show organized plan
  const status = await get_plan_status();
  console.log('\n🗂️ Parallel Features Plan:');

  status.plan.items.forEach((feature, index) => {
    console.log(`\n${index + 1}. ${feature.text}`);
    feature.children.forEach((task, taskIndex) => {
      const statusIcon = task.status === 'complete' ? '✅' : '⏳';
      console.log(`   ${taskIndex + 1}.${taskIndex + 1} ${statusIcon} ${task.text}`);
    });
  });

  return status;
}
```

### Workflow-Driven Planning

```typescript
async function createWorkflowDrivenPlan(projectGoal: string) {
  console.log(`🎯 Creating workflow-driven plan for: ${projectGoal}`);

  // 1. Search for relevant workflows across categories
  const categories = ['development', 'testing', 'documentation', 'core'];
  const allRelevantWorkflows = [];

  for (const category of categories) {
    const workflows = await query_workflows(projectGoal, category);
    allRelevantWorkflows.push(...workflows.workflows);
  }

  console.log(`Found ${allRelevantWorkflows.length} relevant workflows`);

  // 2. Create main project task
  await clear_plan();
  const mainTask = await add_plan_item(`Project: ${projectGoal}`);

  // 3. Create phases based on workflow categories
  const phases = [
    {
      name: 'Planning & Design',
      workflows: allRelevantWorkflows.filter(w => w.category === 'core'),
    },
    {
      name: 'Development',
      workflows: allRelevantWorkflows.filter(w => w.category === 'development'),
    },
    {
      name: 'Testing',
      workflows: allRelevantWorkflows.filter(w => w.category === 'testing'),
    },
    {
      name: 'Documentation',
      workflows: allRelevantWorkflows.filter(w => w.category === 'documentation'),
    },
  ];

  // 4. Build plan from workflows
  for (const phase of phases) {
    if (phase.workflows.length > 0) {
      const phaseTask = await add_plan_item(phase.name, mainTask.item.id);

      // Use the most relevant workflow for this phase
      const workflow = phase.workflows[0];
      await expand_plan_item(phaseTask.item.id, workflow.steps);

      console.log(`Added ${phase.name} phase with ${workflow.steps.length} steps`);
    }
  }

  // 5. Show structured plan
  const finalStatus = await get_plan_status();
  console.log(`\n📊 Workflow-driven plan created:`);
  console.log(`- Total phases: ${phases.filter(p => p.workflows.length > 0).length}`);
  console.log(`- Total tasks: ${finalStatus.plan.stats.totalItems}`);
  console.log(`- Workflows utilized: ${allRelevantWorkflows.length}`);

  return {
    plan: finalStatus,
    workflowsUsed: allRelevantWorkflows,
    phases: phases.filter(p => p.workflows.length > 0),
  };
}

// Usage
await createWorkflowDrivenPlan('e-commerce platform');
```

### Dynamic Plan Adaptation

```typescript
async function adaptPlanBasedOnProgress() {
  console.log('🔄 Adapting plan based on current progress...');

  // 1. Analyze current plan state
  const status = await get_plan_status();
  const completionRate = status.plan.stats.completionRate;

  console.log(`Current completion rate: ${(completionRate * 100).toFixed(1)}%`);

  // 2. Adapt based on progress
  if (completionRate < 0.3) {
    // Early stage - focus on breaking down tasks further
    console.log('Early stage detected - breaking down complex tasks...');

    const pendingTasks = status.plan.items
      .flatMap(item => [item, ...item.children])
      .filter(item => item.status === 'pending' && item.children.length === 0);

    // Find tasks that might need breakdown
    const complexTasks = pendingTasks.filter(
      task =>
        task.text.length > 50 ||
        task.text.includes('implement') ||
        task.text.includes('create') ||
        task.text.includes('build')
    );

    for (const task of complexTasks.slice(0, 2)) {
      // Limit to avoid overwhelming
      console.log(`Breaking down: ${task.text}`);

      // Get implementation guidance
      const workflows = await query_workflows('implementation');
      if (workflows.workflows.length > 0) {
        const steps = workflows.workflows[0].steps.slice(0, 4); // Take first 4 steps
        await expand_plan_item(task.id, steps);
      }
    }
  } else if (completionRate > 0.7) {
    // Late stage - focus on completion and quality
    console.log('Late stage detected - adding quality and completion tasks...');

    const qualityTasks = [
      'Perform final code review',
      'Run comprehensive testing',
      'Update documentation',
      'Prepare for deployment',
    ];

    const qualityPhase = await add_plan_item('Final Quality & Completion Phase');
    await expand_plan_item(qualityPhase.item.id, qualityTasks);
  } else {
    // Middle stage - maintain momentum
    console.log('Middle stage - maintaining development momentum...');

    // Add progress check task
    await add_plan_item('Mid-project progress review and adjustment');
  }

  // 3. Show updated plan
  const updatedStatus = await get_plan_status();
  console.log(`\n📊 Plan adapted:`);
  console.log(`- Total tasks: ${updatedStatus.plan.stats.totalItems}`);
  console.log(`- Pending tasks: ${updatedStatus.plan.stats.pendingItems}`);

  return updatedStatus;
}
```

---

## Tips for Effective Usage

### Best Practices

1. **Start with Workflows**: Always search for relevant workflows before creating plans
2. **Break Down Complex Tasks**: Use `expand_plan_item()` to break large tasks into manageable pieces
3. **Track Progress Regularly**: Use `get_plan_status()` to monitor completion rates
4. **Complete Tasks Promptly**: Mark tasks complete as soon as they're finished for accurate tracking
5. **Use Descriptive Names**: Make task descriptions clear and actionable

### Common Patterns

- **Search → Plan → Execute → Track** - The core Vibe workflow
- **Workflow-Guided Planning** - Use workflow steps as plan templates
- **Progressive Refinement** - Start broad, then break down into detail
- **Parallel Feature Management** - Organize multiple simultaneous efforts
- **Quality Integration** - Include code quality checks in every plan

### Integration with Development

Vibe works best when integrated into your natural development workflow:

- Create plans at project start
- Update progress during development
- Use workflows for guidance and inspiration
- Maintain plans across multiple work sessions
- Adapt plans as requirements evolve

The persistent nature of Vibe plans means you never lose context, even when switching between projects or taking breaks.
