export class MockCloudTasksClient {
  private tasks: any[] = [];
  private counter = 0;

  async createTask(request: { parent: string; task: any }) {
    this.counter += 1;
    const taskId = `task_${this.counter}`;
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

  reset() {
    this.tasks = [];
    this.counter = 0;
  }
}

export const mockCloudTasks = new MockCloudTasksClient();
