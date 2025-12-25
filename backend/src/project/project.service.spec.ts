import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ProjectService } from './project.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProjectService', () => {
  let service: ProjectService;

  const mockEpic = {
    id: 'epic_123',
    code: 'FINANCE',
    name: 'Finance Module',
    description: 'VAT Calculator, e-Factura, SAF-T',
    module: 'FINANCE',
    color: '#10B981',
    icon: 'Calculator',
    priority: 1,
    progress: 50,
    status: 'IN_PROGRESS',
    startedAt: new Date(),
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    sprints: [],
    tasks: [
      { id: 'task_1', status: 'DONE' },
      { id: 'task_2', status: 'IN_PROGRESS' },
    ],
  };

  const mockSprint = {
    id: 'sprint_123',
    name: 'Sprint 34',
    goal: 'Complete finance module',
    epicId: 'epic_123',
    status: 'ACTIVE',
    startDate: new Date('2025-01-01'),
    endDate: new Date('2025-01-14'),
    completedPoints: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    epic: mockEpic,
    tasks: [
      { id: 'task_1', status: 'DONE', storyPoints: 5 },
      { id: 'task_2', status: 'IN_PROGRESS', storyPoints: 3 },
    ],
  };

  const mockTask = {
    id: 'task_123',
    code: 'FINANCE-001',
    title: 'VAT Calculator',
    description: 'Implement VAT 21%/11% calculation',
    epicId: 'epic_123',
    sprintId: 'sprint_123',
    type: 'STORY',
    status: 'TODO',
    priority: 'HIGH',
    storyPoints: 5,
    labels: ['vat', 'compliance'],
    complianceRef: 'LEGEA-141-2025',
    dueDate: new Date('2025-01-14'),
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    epic: mockEpic,
    sprint: mockSprint,
    blockedBy: [],
    blocks: [],
    comments: [],
  };

  const mockPrismaService = {
    epic: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    sprint: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    task: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
    taskComment: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Epics', () => {
    describe('findAllEpics', () => {
      it('should return all epics', async () => {
        mockPrismaService.epic.findMany.mockResolvedValue([mockEpic]);

        const result = await service.findAllEpics();

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
      });

      it('should include sprints and tasks', async () => {
        mockPrismaService.epic.findMany.mockResolvedValue([mockEpic]);

        await service.findAllEpics();

        expect(mockPrismaService.epic.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.objectContaining({
              sprints: true,
              tasks: expect.any(Object),
            }),
          })
        );
      });

      it('should order by priority', async () => {
        mockPrismaService.epic.findMany.mockResolvedValue([mockEpic]);

        await service.findAllEpics();

        expect(mockPrismaService.epic.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { priority: 'asc' },
          })
        );
      });
    });

    describe('findEpicByCode', () => {
      it('should return epic by code', async () => {
        mockPrismaService.epic.findUnique.mockResolvedValue(mockEpic);

        const result = await service.findEpicByCode('FINANCE');

        expect(result).toBeDefined();
        expect(result.code).toBe('FINANCE');
      });

      it('should throw NotFoundException for non-existent code', async () => {
        mockPrismaService.epic.findUnique.mockResolvedValue(null);

        await expect(service.findEpicByCode('INVALID'))
          .rejects.toThrow(NotFoundException);
      });

      it('should include sprints with tasks', async () => {
        mockPrismaService.epic.findUnique.mockResolvedValue(mockEpic);

        await service.findEpicByCode('FINANCE');

        expect(mockPrismaService.epic.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.objectContaining({
              sprints: expect.objectContaining({
                include: { tasks: true },
              }),
            }),
          })
        );
      });
    });

    describe('createEpic', () => {
      it('should create an epic', async () => {
        mockPrismaService.epic.create.mockResolvedValue(mockEpic);

        const result = await service.createEpic({
          code: 'FINANCE',
          name: 'Finance Module',
          module: 'FINANCE' as any,
        });

        expect(result).toBeDefined();
        expect(result.code).toBe('FINANCE');
      });

      it('should accept optional fields', async () => {
        mockPrismaService.epic.create.mockResolvedValue(mockEpic);

        await service.createEpic({
          code: 'TEST',
          name: 'Test Epic',
          description: 'Description',
          module: 'FINANCE' as any,
          color: '#FF0000',
          icon: 'Test',
          priority: 1,
        });

        expect(mockPrismaService.epic.create).toHaveBeenCalled();
      });
    });

    describe('updateEpicProgress', () => {
      it('should calculate progress from tasks', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([
          { status: 'DONE' },
          { status: 'DONE' },
          { status: 'IN_PROGRESS' },
          { status: 'TODO' },
        ]);
        mockPrismaService.epic.update.mockResolvedValue({
          ...mockEpic,
          progress: 50,
        });

        const result = await service.updateEpicProgress('epic_123');

        expect(result.progress).toBe(50);
      });

      it('should set status to COMPLETED at 100%', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([
          { status: 'DONE' },
          { status: 'DONE' },
        ]);
        mockPrismaService.epic.update.mockImplementation(({ data }) =>
          Promise.resolve({ ...mockEpic, ...data })
        );

        await service.updateEpicProgress('epic_123');

        expect(mockPrismaService.epic.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'COMPLETED',
              completedAt: expect.any(Date),
            }),
          })
        );
      });

      it('should set status to IN_PROGRESS when partially done', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([
          { status: 'DONE' },
          { status: 'TODO' },
        ]);
        mockPrismaService.epic.update.mockImplementation(({ data }) =>
          Promise.resolve({ ...mockEpic, ...data })
        );

        await service.updateEpicProgress('epic_123');

        expect(mockPrismaService.epic.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'IN_PROGRESS',
            }),
          })
        );
      });

      it('should set status to PLANNED when no tasks done', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([
          { status: 'TODO' },
          { status: 'BACKLOG' },
        ]);
        mockPrismaService.epic.update.mockImplementation(({ data }) =>
          Promise.resolve({ ...mockEpic, ...data })
        );

        await service.updateEpicProgress('epic_123');

        expect(mockPrismaService.epic.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'PLANNED',
            }),
          })
        );
      });

      it('should handle empty task list', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([]);
        mockPrismaService.epic.update.mockImplementation(({ data }) =>
          Promise.resolve({ ...mockEpic, ...data, progress: 0 })
        );

        const result = await service.updateEpicProgress('epic_123');

        expect(result.progress).toBe(0);
      });
    });
  });

  describe('Sprints', () => {
    describe('findAllSprints', () => {
      it('should return all sprints', async () => {
        mockPrismaService.sprint.findMany.mockResolvedValue([mockSprint]);

        const result = await service.findAllSprints();

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
      });

      it('should include epic and tasks', async () => {
        mockPrismaService.sprint.findMany.mockResolvedValue([mockSprint]);

        await service.findAllSprints();

        expect(mockPrismaService.sprint.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            include: {
              epic: true,
              tasks: true,
            },
          })
        );
      });

      it('should order by startDate descending', async () => {
        mockPrismaService.sprint.findMany.mockResolvedValue([mockSprint]);

        await service.findAllSprints();

        expect(mockPrismaService.sprint.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { startDate: 'desc' },
          })
        );
      });
    });

    describe('findActiveSprint', () => {
      it('should return active sprint', async () => {
        mockPrismaService.sprint.findFirst.mockResolvedValue(mockSprint);

        const result = await service.findActiveSprint();

        expect(result).toBeDefined();
        expect(result?.status).toBe('ACTIVE');
      });

      it('should return null if no active sprint', async () => {
        mockPrismaService.sprint.findFirst.mockResolvedValue(null);

        const result = await service.findActiveSprint();

        expect(result).toBeNull();
      });

      it('should filter by ACTIVE status', async () => {
        mockPrismaService.sprint.findFirst.mockResolvedValue(mockSprint);

        await service.findActiveSprint();

        expect(mockPrismaService.sprint.findFirst).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { status: 'ACTIVE' },
          })
        );
      });
    });

    describe('createSprint', () => {
      it('should create a sprint', async () => {
        mockPrismaService.sprint.create.mockResolvedValue(mockSprint);

        const result = await service.createSprint({
          name: 'Sprint 35',
          goal: 'Complete more features',
          epicId: 'epic_123',
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-01-28'),
        });

        expect(result).toBeDefined();
      });
    });

    describe('startSprint', () => {
      it('should start a sprint', async () => {
        mockPrismaService.sprint.updateMany.mockResolvedValue({ count: 0 });
        mockPrismaService.sprint.update.mockResolvedValue({
          ...mockSprint,
          status: 'ACTIVE',
        });

        const result = await service.startSprint('sprint_123');

        expect(result.status).toBe('ACTIVE');
      });

      it('should complete any previously active sprints', async () => {
        mockPrismaService.sprint.updateMany.mockResolvedValue({ count: 1 });
        mockPrismaService.sprint.update.mockResolvedValue(mockSprint);

        await service.startSprint('sprint_123');

        expect(mockPrismaService.sprint.updateMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { status: 'ACTIVE' },
            data: { status: 'COMPLETED' },
          })
        );
      });
    });

    describe('completeSprint', () => {
      it('should complete a sprint', async () => {
        mockPrismaService.sprint.findUnique.mockResolvedValue(mockSprint);
        mockPrismaService.sprint.update.mockResolvedValue({
          ...mockSprint,
          status: 'COMPLETED',
        });

        const result = await service.completeSprint('sprint_123');

        expect(result.status).toBe('COMPLETED');
      });

      it('should calculate completed points', async () => {
        const sprintWithTasks = {
          ...mockSprint,
          tasks: [
            { status: 'DONE', storyPoints: 5 },
            { status: 'DONE', storyPoints: 8 },
            { status: 'IN_PROGRESS', storyPoints: 3 },
          ],
        };
        mockPrismaService.sprint.findUnique.mockResolvedValue(sprintWithTasks);
        mockPrismaService.sprint.update.mockImplementation(({ data }) =>
          Promise.resolve({ ...mockSprint, ...data })
        );

        await service.completeSprint('sprint_123');

        expect(mockPrismaService.sprint.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              completedPoints: 13, // 5 + 8 from DONE tasks
            }),
          })
        );
      });

      it('should throw NotFoundException for non-existent sprint', async () => {
        mockPrismaService.sprint.findUnique.mockResolvedValue(null);

        await expect(service.completeSprint('non-existent'))
          .rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Tasks', () => {
    describe('findAllTasks', () => {
      it('should return all tasks', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([mockTask]);

        const result = await service.findAllTasks();

        expect(result).toBeDefined();
        expect(result.length).toBe(1);
      });

      it('should filter by epicId', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([mockTask]);

        await service.findAllTasks({ epicId: 'epic_123' });

        expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { epicId: 'epic_123' },
          })
        );
      });

      it('should filter by sprintId', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([mockTask]);

        await service.findAllTasks({ sprintId: 'sprint_123' });

        expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { sprintId: 'sprint_123' },
          })
        );
      });

      it('should filter by status', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([mockTask]);

        await service.findAllTasks({ status: 'TODO' as any });

        expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { status: 'TODO' },
          })
        );
      });

      it('should filter by priority', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([mockTask]);

        await service.findAllTasks({ priority: 'HIGH' as any });

        expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { priority: 'HIGH' },
          })
        );
      });

      it('should include epic, sprint, and blocking relations', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([mockTask]);

        await service.findAllTasks();

        expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.objectContaining({
              epic: true,
              sprint: true,
              blockedBy: true,
              blocks: true,
            }),
          })
        );
      });
    });

    describe('findBacklog', () => {
      it('should return backlog tasks', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([
          { ...mockTask, status: 'BACKLOG', sprintId: null },
        ]);

        const result = await service.findBacklog();

        expect(result).toBeDefined();
      });

      it('should filter by BACKLOG status and no sprint', async () => {
        mockPrismaService.task.findMany.mockResolvedValue([]);

        await service.findBacklog();

        expect(mockPrismaService.task.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: { status: 'BACKLOG', sprintId: null },
          })
        );
      });
    });

    describe('findTaskByCode', () => {
      it('should return task by code', async () => {
        mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

        const result = await service.findTaskByCode('FINANCE-001');

        expect(result).toBeDefined();
        expect(result.code).toBe('FINANCE-001');
      });

      it('should throw NotFoundException for non-existent code', async () => {
        mockPrismaService.task.findUnique.mockResolvedValue(null);

        await expect(service.findTaskByCode('INVALID'))
          .rejects.toThrow(NotFoundException);
      });

      it('should include comments', async () => {
        mockPrismaService.task.findUnique.mockResolvedValue(mockTask);

        await service.findTaskByCode('FINANCE-001');

        expect(mockPrismaService.task.findUnique).toHaveBeenCalledWith(
          expect.objectContaining({
            include: expect.objectContaining({
              comments: true,
            }),
          })
        );
      });
    });

    describe('createTask', () => {
      it('should create a task', async () => {
        mockPrismaService.epic.findUnique.mockResolvedValue(mockEpic);
        mockPrismaService.task.count.mockResolvedValue(0);
        mockPrismaService.task.create.mockResolvedValue(mockTask);

        const result = await service.createTask({
          title: 'New Task',
          epicId: 'epic_123',
        });

        expect(result).toBeDefined();
      });

      it('should generate task code', async () => {
        mockPrismaService.epic.findUnique.mockResolvedValue(mockEpic);
        mockPrismaService.task.count.mockResolvedValue(5);
        mockPrismaService.task.create.mockImplementation(({ data }) =>
          Promise.resolve({ ...mockTask, code: data.code })
        );

        const result = await service.createTask({
          title: 'New Task',
          epicId: 'epic_123',
        });

        expect(result.code).toBe('FINANCE-006');
      });

      it('should throw NotFoundException for non-existent epic', async () => {
        mockPrismaService.epic.findUnique.mockResolvedValue(null);

        await expect(
          service.createTask({
            title: 'New Task',
            epicId: 'non-existent',
          })
        ).rejects.toThrow(NotFoundException);
      });

      it('should accept optional fields', async () => {
        mockPrismaService.epic.findUnique.mockResolvedValue(mockEpic);
        mockPrismaService.task.count.mockResolvedValue(0);
        mockPrismaService.task.create.mockResolvedValue(mockTask);

        await service.createTask({
          title: 'New Task',
          description: 'Description',
          epicId: 'epic_123',
          sprintId: 'sprint_123',
          type: 'STORY' as any,
          priority: 'HIGH' as any,
          storyPoints: 5,
          labels: ['test'],
          complianceRef: 'REF-123',
          dueDate: new Date(),
        });

        expect(mockPrismaService.task.create).toHaveBeenCalled();
      });
    });

    describe('updateTaskStatus', () => {
      it('should update task status', async () => {
        mockPrismaService.task.update.mockResolvedValue({
          ...mockTask,
          status: 'IN_PROGRESS',
        });
        mockPrismaService.task.findMany.mockResolvedValue([]);
        mockPrismaService.epic.update.mockResolvedValue(mockEpic);

        const result = await service.updateTaskStatus('task_123', 'IN_PROGRESS' as any);

        expect(result.status).toBe('IN_PROGRESS');
      });

      it('should set startedAt when moving to IN_PROGRESS', async () => {
        mockPrismaService.task.update.mockImplementation(({ data }) =>
          Promise.resolve({ ...mockTask, ...data })
        );
        mockPrismaService.task.findMany.mockResolvedValue([]);
        mockPrismaService.epic.update.mockResolvedValue(mockEpic);

        await service.updateTaskStatus('task_123', 'IN_PROGRESS' as any);

        expect(mockPrismaService.task.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              startedAt: expect.any(Date),
            }),
          })
        );
      });

      it('should set completedAt when moving to DONE', async () => {
        mockPrismaService.task.update.mockImplementation(({ data }) =>
          Promise.resolve({ ...mockTask, ...data })
        );
        mockPrismaService.task.findMany.mockResolvedValue([]);
        mockPrismaService.epic.update.mockResolvedValue(mockEpic);

        await service.updateTaskStatus('task_123', 'DONE' as any);

        expect(mockPrismaService.task.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              completedAt: expect.any(Date),
            }),
          })
        );
      });

      it('should update epic progress', async () => {
        mockPrismaService.task.update.mockResolvedValue(mockTask);
        mockPrismaService.task.findMany.mockResolvedValue([{ status: 'DONE' }]);
        mockPrismaService.epic.update.mockResolvedValue(mockEpic);

        await service.updateTaskStatus('task_123', 'DONE' as any);

        expect(mockPrismaService.epic.update).toHaveBeenCalled();
      });
    });

    describe('moveTaskToSprint', () => {
      it('should move task to sprint', async () => {
        mockPrismaService.task.update.mockResolvedValue({
          ...mockTask,
          sprintId: 'sprint_456',
        });

        const result = await service.moveTaskToSprint('task_123', 'sprint_456');

        expect(result.sprintId).toBe('sprint_456');
      });

      it('should set status to TODO', async () => {
        mockPrismaService.task.update.mockImplementation(({ data }) =>
          Promise.resolve({ ...mockTask, ...data })
        );

        await service.moveTaskToSprint('task_123', 'sprint_456');

        expect(mockPrismaService.task.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              status: 'TODO',
            }),
          })
        );
      });
    });

    describe('addTaskComment', () => {
      it('should add comment to task', async () => {
        mockPrismaService.taskComment.create.mockResolvedValue({
          id: 'comment_123',
          taskId: 'task_123',
          content: 'Test comment',
          authorId: 'user_123',
        });
        const taskWithComments = {
          ...mockTask,
          comments: [{ id: 'comment_123', content: 'Test comment' }],
        };
        mockPrismaService.task.findUnique.mockResolvedValue(taskWithComments);

        const result = await service.addTaskComment(
          'task_123',
          'Test comment',
          'user_123'
        );

        expect(result).toBeDefined();
        expect((result as any).comments).toBeDefined();
        expect((result as any).comments.length).toBe(1);
      });

      it('should throw NotFoundException for non-existent task', async () => {
        mockPrismaService.taskComment.create.mockResolvedValue({});
        mockPrismaService.task.findUnique.mockResolvedValue(null);

        await expect(
          service.addTaskComment('non-existent', 'Comment')
        ).rejects.toThrow(NotFoundException);
      });
    });
  });

  describe('Roadmap Summary', () => {
    it('should return roadmap summary', async () => {
      mockPrismaService.epic.findMany.mockResolvedValue([mockEpic]);
      mockPrismaService.sprint.findFirst.mockResolvedValue(mockSprint);
      mockPrismaService.task.count.mockResolvedValue(5);
      mockPrismaService.sprint.findMany.mockResolvedValue([
        { completedPoints: 20 },
        { completedPoints: 25 },
        { completedPoints: 30 },
      ]);

      const result = await service.getRoadmapSummary();

      expect(result).toBeDefined();
      expect(result.epics).toBeDefined();
      expect(result.activeSprint).toBeDefined();
      expect(result.backlogCount).toBeDefined();
      expect(result.velocity).toBeDefined();
    });

    it('should calculate velocity from last 3 sprints', async () => {
      mockPrismaService.epic.findMany.mockResolvedValue([]);
      mockPrismaService.sprint.findFirst.mockResolvedValue(null);
      mockPrismaService.task.count.mockResolvedValue(0);
      mockPrismaService.sprint.findMany.mockResolvedValue([
        { completedPoints: 20 },
        { completedPoints: 25 },
        { completedPoints: 30 },
      ]);

      const result = await service.getRoadmapSummary();

      expect(result.velocity).toBe(25); // (20 + 25 + 30) / 3 = 25
    });

    it('should return 0 velocity if no completed sprints', async () => {
      mockPrismaService.epic.findMany.mockResolvedValue([]);
      mockPrismaService.sprint.findFirst.mockResolvedValue(null);
      mockPrismaService.task.count.mockResolvedValue(0);
      mockPrismaService.sprint.findMany.mockResolvedValue([]);

      const result = await service.getRoadmapSummary();

      expect(result.velocity).toBe(0);
    });

    it('should include task stats per epic', async () => {
      mockPrismaService.epic.findMany.mockResolvedValue([mockEpic]);
      mockPrismaService.sprint.findFirst.mockResolvedValue(null);
      mockPrismaService.task.count.mockResolvedValue(0);
      mockPrismaService.sprint.findMany.mockResolvedValue([]);

      const result = await service.getRoadmapSummary();

      expect(result.epics[0].taskStats).toBeDefined();
      expect(result.epics[0].taskStats.total).toBe(2);
      expect(result.epics[0].taskStats.done).toBe(1);
      expect(result.epics[0].taskStats.inProgress).toBe(1);
    });
  });

  describe('Seed Data', () => {
    it('should seed epics without errors', async () => {
      mockPrismaService.epic.upsert.mockResolvedValue(mockEpic);
      mockPrismaService.epic.findUnique.mockResolvedValue(mockEpic);
      mockPrismaService.task.upsert.mockResolvedValue(mockTask);
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.epic.update.mockResolvedValue(mockEpic);

      await expect(service.seedEpics()).resolves.not.toThrow();
    });

    it('should create all module epics', async () => {
      mockPrismaService.epic.upsert.mockResolvedValue(mockEpic);
      mockPrismaService.epic.findUnique.mockResolvedValue(mockEpic);
      mockPrismaService.task.upsert.mockResolvedValue(mockTask);
      mockPrismaService.task.findMany.mockResolvedValue([]);
      mockPrismaService.epic.update.mockResolvedValue(mockEpic);

      await service.seedEpics();

      // Should create 10 epics
      expect(mockPrismaService.epic.upsert).toHaveBeenCalledTimes(10);
    });
  });

  describe('Task Priorities', () => {
    const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

    priorities.forEach(priority => {
      it(`should support ${priority} priority`, async () => {
        mockPrismaService.task.findMany.mockResolvedValue([
          { ...mockTask, priority },
        ]);

        const result = await service.findAllTasks({ priority: priority as any });

        expect(result[0].priority).toBe(priority);
      });
    });
  });

  describe('Task Types', () => {
    const types = ['STORY', 'BUG', 'TASK', 'SPIKE', 'EPIC'];

    types.forEach(type => {
      it(`should support ${type} type`, async () => {
        mockPrismaService.task.findMany.mockResolvedValue([
          { ...mockTask, type },
        ]);

        const result = await service.findAllTasks({ type: type as any });

        expect(result[0].type).toBe(type);
      });
    });
  });

  describe('Task Statuses', () => {
    const statuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'BLOCKED'];

    statuses.forEach(status => {
      it(`should support ${status} status`, async () => {
        mockPrismaService.task.findMany.mockResolvedValue([
          { ...mockTask, status },
        ]);

        const result = await service.findAllTasks({ status: status as any });

        expect(result[0].status).toBe(status);
      });
    });
  });

  describe('Sprint Statuses', () => {
    it('should support PLANNED status', async () => {
      mockPrismaService.sprint.findMany.mockResolvedValue([
        { ...mockSprint, status: 'PLANNED' },
      ]);

      const result = await service.findAllSprints();

      expect(result[0].status).toBe('PLANNED');
    });

    it('should support ACTIVE status', async () => {
      mockPrismaService.sprint.findMany.mockResolvedValue([
        { ...mockSprint, status: 'ACTIVE' },
      ]);

      const result = await service.findAllSprints();

      expect(result[0].status).toBe('ACTIVE');
    });

    it('should support COMPLETED status', async () => {
      mockPrismaService.sprint.findMany.mockResolvedValue([
        { ...mockSprint, status: 'COMPLETED' },
      ]);

      const result = await service.findAllSprints();

      expect(result[0].status).toBe('COMPLETED');
    });
  });

  describe('Module Types', () => {
    const modules = [
      'FINANCE', 'OPERATIONS', 'HR', 'FUNDS', 'AI_ML',
      'COMPLIANCE', 'OPERATIONS_CONTROL', 'ECOSYSTEM',
      'ONBOARDING', 'PRICING_SUPPORT'
    ];

    modules.forEach(module => {
      it(`should support ${module} module`, async () => {
        mockPrismaService.epic.findMany.mockResolvedValue([
          { ...mockEpic, module },
        ]);

        const result = await service.findAllEpics();

        expect(result[0].module).toBe(module);
      });
    });
  });

  describe('Compliance References', () => {
    it('should support complianceRef field', async () => {
      mockPrismaService.epic.findUnique.mockResolvedValue(mockEpic);
      mockPrismaService.task.count.mockResolvedValue(0);
      mockPrismaService.task.create.mockResolvedValue({
        ...mockTask,
        complianceRef: 'ANAF-D406',
      });

      const result = await service.createTask({
        title: 'Test',
        epicId: 'epic_123',
        complianceRef: 'ANAF-D406',
      });

      expect(result.complianceRef).toBe('ANAF-D406');
    });
  });

  describe('Romanian Module Names', () => {
    it('should have FINANCE module for VAT/e-Factura', async () => {
      mockPrismaService.epic.findMany.mockResolvedValue([
        { ...mockEpic, code: 'FINANCE', description: 'VAT, e-Factura, SAF-T' },
      ]);

      const result = await service.findAllEpics();
      const finance = result.find(e => e.code === 'FINANCE');

      expect(finance).toBeDefined();
    });

    it('should have COMPLIANCE module for ANAF integration', async () => {
      mockPrismaService.epic.findMany.mockResolvedValue([
        { ...mockEpic, code: 'COMPLIANCE', description: 'ANAF API, SAGA' },
      ]);

      const result = await service.findAllEpics();
      const compliance = result.find(e => e.code === 'COMPLIANCE');

      expect(compliance).toBeDefined();
    });
  });
});
