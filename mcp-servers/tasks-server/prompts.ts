/**
 * Task prompts for MCP server
 * Provides context-aware templates for AI interactions
 */

import { getSupabase } from '../shared/supabase-client.js';
import { createLogger } from '../shared/logger.js';

const logger = createLogger('TaskPrompts');

export const prompts = [
  {
    name: 'task_summary',
    description: 'Generate a comprehensive summary of current tasks with statistics and insights',
    arguments: [
      {
        name: 'include_overdue',
        description: 'Whether to include overdue tasks in the summary',
        required: false,
      },
      {
        name: 'include_high_priority',
        description: 'Whether to include high-priority tasks in the summary',
        required: false,
      },
    ],
  },
  {
    name: 'task_creation_guide',
    description: 'Best practices and guidelines for creating well-structured tasks',
    arguments: [],
  },
  {
    name: 'task_prioritization',
    description: 'Recommendations for prioritizing and organizing tasks',
    arguments: [
      {
        name: 'user_context',
        description: 'Information about the user or team to personalize recommendations',
        required: false,
      },
    ],
  },
  {
    name: 'overdue_alert',
    description: 'Generate an alert message for overdue tasks that need attention',
    arguments: [],
  },
  {
    name: 'get_task_by_id',
    description: 'Instructions for retrieving a specific task by its task_id (e.g., TASK-10031)',
    arguments: [
      {
        name: 'task_id',
        description: 'The task ID to retrieve (e.g., TASK-10031)',
        required: true,
      },
    ],
  },
];

export async function getPrompt(name: string, args: any = {}): Promise<{ messages: Array<{ role: string; content: { type: string; text: string } }> }> {
  logger.info('Getting prompt', { name, args });

  const supabase = getSupabase();

  try {
    if (name === 'task_summary') {
      const { data: allTasks } = await supabase.from('tasks').select('*');

      const today = new Date().toISOString().split('T')[0];
      const pending = allTasks?.filter((t: any) => t.status === 'To Do' || t.status === 'In Progress') || [];
      const overdue = allTasks?.filter((t: any) => t.due_date < today && (t.status === 'To Do' || t.status === 'In Progress')) || [];
      const highPriority = allTasks?.filter((t: any) => (t.priority === 'High' || t.priority === 'Urgent') && (t.status === 'To Do' || t.status === 'In Progress')) || [];

      let summary = `# Task Management Summary\n\n`;
      summary += `## Overview\n`;
      summary += `- **Total Tasks**: ${allTasks?.length || 0}\n`;
      summary += `- **Pending Tasks**: ${pending.length}\n`;
      summary += `- **Completed Tasks**: ${allTasks?.filter((t: any) => t.status === 'Completed').length || 0}\n\n`;

      if (args.include_overdue !== false && overdue.length > 0) {
        summary += `## ⚠️ Overdue Tasks (${overdue.length})\n\n`;
        overdue.forEach((task: any) => {
          summary += `- **${task.title}** (Due: ${task.due_date}, Priority: ${task.priority})\n`;
        });
        summary += `\n`;
      }

      if (args.include_high_priority !== false && highPriority.length > 0) {
        summary += `## 🔥 High Priority Tasks (${highPriority.length})\n\n`;
        highPriority.slice(0, 5).forEach((task: any) => {
          summary += `- **${task.title}** (Priority: ${task.priority}, Due: ${task.due_date || 'Not set'})\n`;
        });
        if (highPriority.length > 5) {
          summary += `\n...and ${highPriority.length - 5} more\n`;
        }
        summary += `\n`;
      }

      summary += `## Status Breakdown\n`;
      const statusCounts = {
        'To Do': allTasks?.filter((t: any) => t.status === 'To Do').length || 0,
        'In Progress': allTasks?.filter((t: any) => t.status === 'In Progress').length || 0,
        'Completed': allTasks?.filter((t: any) => t.status === 'Completed').length || 0,
        'Cancelled': allTasks?.filter((t: any) => t.status === 'Cancelled').length || 0,
      };
      Object.entries(statusCounts).forEach(([status, count]) => {
        summary += `- ${status}: ${count}\n`;
      });

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: summary,
            },
          },
        ],
      };
    }

    if (name === 'task_creation_guide') {
      const guide = `# Task Creation Best Practices

## Essential Components of a Well-Structured Task

### 1. Clear and Actionable Title
- Start with an action verb (e.g., "Review", "Update", "Create", "Contact")
- Be specific and concise
- Avoid vague language

**Good Examples:**
- "Review Q4 financial report and provide feedback"
- "Update customer database with new contacts"
- "Contact John Smith regarding project timeline"

**Bad Examples:**
- "Finance stuff"
- "Customer thing"
- "Follow up"

### 2. Detailed Description
- Explain the context and purpose
- List specific requirements or deliverables
- Include relevant links or references
- Note any dependencies or prerequisites

### 3. Appropriate Priority
- **Urgent**: Requires immediate attention, blocks other work
- **High**: Important and time-sensitive
- **Medium**: Standard priority, normal workflow
- **Low**: Can be done when time permits

### 4. Realistic Due Date
- Consider task complexity
- Account for dependencies
- Allow buffer time for review
- Coordinate with assignee's availability

### 5. Clear Assignment
- Assign to the most appropriate team member
- Ensure assignee has necessary skills and resources
- Consider current workload

### 6. Supporting Documentation
- Attach relevant files or documents
- Link to related tasks or projects
- Include screenshots or examples if helpful

## Task Management Tips

1. **Break down large tasks**: If a task takes more than 4-8 hours, consider breaking it into smaller subtasks
2. **Regular updates**: Update task status as work progresses
3. **Communication**: Use task comments for questions and updates
4. **Review cycle**: Regularly review and reprioritize tasks
5. **Complete promptly**: Mark tasks as complete when done to maintain accurate metrics

## Common Mistakes to Avoid

- Creating tasks that are too vague
- Setting unrealistic deadlines
- Forgetting to assign tasks
- Not updating task status
- Creating duplicate tasks
- Missing priority indicators
`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: guide,
            },
          },
        ],
      };
    }

    if (name === 'task_prioritization') {
      const context = args.user_context ? `\n\nUser Context: ${args.user_context}\n` : '';

      const recommendations = `# Task Prioritization Framework${context}

## The RICE Method

Prioritize tasks based on:
- **Reach**: How many people are impacted?
- **Impact**: What's the magnitude of the effect?
- **Confidence**: How certain are you about the estimates?
- **Effort**: How much time/resources required?

## Priority Matrix

### Urgent + Important (Do First)
- Critical bugs or issues
- Deadline-driven deliverables
- Emergency requests
- Compliance requirements

### Important but Not Urgent (Schedule)
- Strategic planning
- Relationship building
- Process improvements
- Professional development

### Urgent but Not Important (Delegate)
- Some meetings
- Minor requests
- Routine tasks
- Low-impact interruptions

### Neither Urgent nor Important (Eliminate)
- Busy work
- Time wasters
- Outdated tasks
- Nice-to-haves with no clear value

## Daily Prioritization Tips

1. **Start with the MITs**: Identify 3 Most Important Tasks each morning
2. **Time-block high-priority work**: Protect focus time for critical tasks
3. **Batch similar tasks**: Group related activities for efficiency
4. **Limit WIP**: Work on 3-5 tasks at a time maximum
5. **Review and adjust**: Reprioritize as new information emerges

## Red Flags for Reprioritization

- Overdue tasks accumulating
- High-priority tasks sitting idle
- Team members overloaded
- Shifting business priorities
- External dependencies resolved
- New urgent requests

## Recommended Actions

1. Review all "To Do" tasks weekly
2. Adjust priorities based on current goals
3. Break down large tasks that are stuck
4. Archive or delete tasks no longer relevant
5. Ensure balanced workload across team
`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: recommendations,
            },
          },
        ],
      };
    }

    if (name === 'overdue_alert') {
      const today = new Date().toISOString().split('T')[0];
      const { data: overdueTasks } = await supabase
        .from('tasks')
        .select('*')
        .lt('due_date', today)
        .in('status', ['To Do', 'In Progress'])
        .order('due_date', { ascending: true });

      if (!overdueTasks || overdueTasks.length === 0) {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: '# Task Status: All Clear!\n\n✅ Great news! You have no overdue tasks at the moment.\n\nKeep up the excellent work on staying on top of your deadlines!',
              },
            },
          ],
        };
      }

      let alert = `# ⚠️ Overdue Tasks Alert\n\n`;
      alert += `You have **${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}** that need immediate attention:\n\n`;

      overdueTasks.forEach((task: any, index: number) => {
        const daysOverdue = Math.floor((new Date().getTime() - new Date(task.due_date).getTime()) / (1000 * 60 * 60 * 24));
        alert += `${index + 1}. **${task.title}**\n`;
        alert += `   - Priority: ${task.priority}\n`;
        alert += `   - Due Date: ${task.due_date} (${daysOverdue} day${daysOverdue > 1 ? 's' : ''} overdue)\n`;
        alert += `   - Status: ${task.status}\n`;
        if (task.assigned_to_name) {
          alert += `   - Assigned to: ${task.assigned_to_name}\n`;
        }
        alert += `\n`;
      });

      alert += `## Recommended Actions\n\n`;
      alert += `1. Review each overdue task and update status if completed\n`;
      alert += `2. For active tasks, assess if deadlines need adjustment\n`;
      alert += `3. Prioritize overdue high-priority items immediately\n`;
      alert += `4. Consider reassigning tasks if assignees are overloaded\n`;
      alert += `5. Break down large overdue tasks into smaller, manageable pieces\n`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: alert,
            },
          },
        ],
      };
    }

    if (name === 'get_task_by_id') {
      const taskId = args.task_id;
      if (!taskId) {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: '# How to Retrieve a Task by ID\n\nTo get details of a specific task, use the `get_tasks` tool with the `task_id` parameter:\n\n```json\n{\n  "task_id": "TASK-10031"\n}\n```\n\nThis will return the complete task details including:\n- Task title and description\n- Status and priority\n- Assigned user and contact information\n- Due dates and progress\n- Supporting documents',
              },
            },
          ],
        };
      }

      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('task_id', taskId);

      if (!tasks || tasks.length === 0) {
        return {
          messages: [
            {
              role: 'user',
              content: {
                type: 'text',
                text: `# Task Not Found\n\nTask **${taskId}** was not found in the system.\n\nPlease verify the task ID and try again.`,
              },
            },
          ],
        };
      }

      const task = tasks[0];
      let details = `# Task Details: ${task.task_id}\n\n`;
      details += `## ${task.title}\n\n`;

      if (task.description) {
        details += `**Description:** ${task.description}\n\n`;
      }

      details += `### Status & Priority\n`;
      details += `- **Status:** ${task.status}\n`;
      details += `- **Priority:** ${task.priority}\n`;
      details += `- **Progress:** ${task.progress_percentage}%\n\n`;

      details += `### Assignment\n`;
      details += `- **Assigned to:** ${task.assigned_to_name || 'Unassigned'}\n`;
      details += `- **Assigned by:** ${task.assigned_by_name || 'N/A'}\n\n`;

      if (task.contact_name) {
        details += `### Contact Information\n`;
        details += `- **Contact:** ${task.contact_name}\n`;
        if (task.contact_phone) {
          details += `- **Phone:** ${task.contact_phone}\n`;
        }
        details += `\n`;
      }

      details += `### Dates\n`;
      if (task.start_date) {
        details += `- **Start Date:** ${task.start_date}\n`;
      }
      if (task.due_date) {
        details += `- **Due Date:** ${task.due_date}\n`;
      }
      if (task.completion_date) {
        details += `- **Completed:** ${task.completion_date}\n`;
      }
      details += `- **Created:** ${task.created_at}\n`;
      details += `- **Last Updated:** ${task.updated_at}\n\n`;

      if (task.supporting_documents && task.supporting_documents.length > 0) {
        details += `### Supporting Documents\n`;
        task.supporting_documents.forEach((doc: string, index: number) => {
          details += `${index + 1}. ${doc}\n`;
        });
        details += `\n`;
      }

      if (task.category) {
        details += `**Category:** ${task.category}\n`;
      }

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: details,
            },
          },
        ],
      };
    }

    throw new Error(`Unknown prompt: ${name}`);
  } catch (error: any) {
    logger.error('Error generating prompt', { name, error: error.message });
    throw error;
  }
}
