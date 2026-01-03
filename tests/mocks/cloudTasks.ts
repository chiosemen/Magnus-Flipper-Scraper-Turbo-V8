import { vi } from 'vitest';

export class MockCloudTasksClient {
  private tasks: any[] = [];

  async createTask(request: { parent: string; task: any }) {
    const taskId = `task_${Math.random().toString(36).substr(2, 9)}`;
    const newTask = {
      name: `${request.parent}/tasks/${taskId}`,
      ...request.task,
    };
    this.tasks.push(newTask);
    return [newTask];
  }

  async deleteTask(request: { name: string }) {
    this.tasks = this.tasks.filter(t => t.name !== request.name);
  }

  // Helper for tests to inspect queue
  getPendingTasks() {
    return this.tasks;
  }
}

export const mockCloudTasks = new MockCloudTasksClient();
