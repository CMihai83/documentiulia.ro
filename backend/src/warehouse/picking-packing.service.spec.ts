import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  PickingPackingService,
  PickWaveStatus,
  PickTaskStatus,
  PickStrategy,
  PackingStatus,
  ContainerType,
  CreatePickWaveDto,
  CreatePickTaskDto,
  CreatePackingSessionDto,
} from './picking-packing.service';

describe('PickingPackingService', () => {
  let service: PickingPackingService;
  let eventEmitter: EventEmitter2;
  let tenantId: string;

  beforeEach(async () => {
    tenantId = `tenant_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PickingPackingService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PickingPackingService>(PickingPackingService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Pick Wave Operations', () => {
    const createWaveDto: CreatePickWaveDto = {
      warehouseId: 'warehouse_1',
      warehouseName: 'Main Warehouse',
      strategy: PickStrategy.FIFO,
      priority: 5,
      orderIds: ['order_1', 'order_2'],
      createdBy: 'user_1',
      createdByName: 'John Doe',
    };

    const createTaskDto: CreatePickTaskDto = {
      orderId: 'order_1',
      orderNumber: 'ORD-001',
      orderLineId: 'line_1',
      warehouseId: 'warehouse_1',
      locationId: 'loc_1',
      locationCode: 'A-01-01',
      zoneId: 'zone_1',
      zoneName: 'Zone A',
      itemId: 'item_1',
      itemCode: 'SKU001',
      itemName: 'Test Product',
      requestedQuantity: 10,
      unitOfMeasure: 'EA',
      pickSequence: 1,
    };

    it('should create a pick wave', async () => {
      const wave = await service.createPickWave(tenantId, createWaveDto);

      expect(wave).toBeDefined();
      expect(wave.id).toBeDefined();
      expect(wave.waveNumber).toMatch(/^WAVE-\d{4}-\d{6}$/);
      expect(wave.status).toBe(PickWaveStatus.DRAFT);
      expect(wave.totalOrders).toBe(2);
      expect(wave.strategy).toBe(PickStrategy.FIFO);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pick_wave.created',
        expect.any(Object),
      );
    });

    it('should not create wave without orders', async () => {
      const dto = { ...createWaveDto, orderIds: [] };

      await expect(service.createPickWave(tenantId, dto)).rejects.toThrow(
        'At least one order is required',
      );
    });

    it('should add tasks to wave', async () => {
      const wave = await service.createPickWave(tenantId, createWaveDto);
      const updated = await service.addTasksToWave(tenantId, wave.id, [
        createTaskDto,
      ]);

      expect(updated.tasks).toHaveLength(1);
      expect(updated.totalLines).toBe(1);
      expect(updated.totalQuantity).toBe(10);
    });

    it('should not add tasks to non-draft wave', async () => {
      const wave = await service.createPickWave(tenantId, createWaveDto);
      await service.addTasksToWave(tenantId, wave.id, [createTaskDto]);
      await service.releasePickWave(tenantId, wave.id);

      await expect(
        service.addTasksToWave(tenantId, wave.id, [createTaskDto]),
      ).rejects.toThrow('Can only add tasks to draft wave');
    });

    it('should release pick wave', async () => {
      const wave = await service.createPickWave(tenantId, createWaveDto);
      await service.addTasksToWave(tenantId, wave.id, [createTaskDto]);
      const released = await service.releasePickWave(tenantId, wave.id);

      expect(released.status).toBe(PickWaveStatus.RELEASED);
      expect(released.releaseDate).toBeDefined();
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pick_wave.released',
        expect.any(Object),
      );
    });

    it('should not release wave without tasks', async () => {
      const wave = await service.createPickWave(tenantId, createWaveDto);

      await expect(service.releasePickWave(tenantId, wave.id)).rejects.toThrow(
        'Wave must have at least one task',
      );
    });

    it('should cancel pick wave', async () => {
      const wave = await service.createPickWave(tenantId, createWaveDto);
      const cancelled = await service.cancelPickWave(
        tenantId,
        wave.id,
        'Test cancellation',
      );

      expect(cancelled.status).toBe(PickWaveStatus.CANCELLED);
      expect(cancelled.metadata?.cancellationReason).toBe('Test cancellation');
    });

    it('should list pick waves', async () => {
      await service.createPickWave(tenantId, createWaveDto);
      await service.createPickWave(tenantId, {
        ...createWaveDto,
        warehouseId: 'warehouse_2',
      });

      const waves = await service.listPickWaves(tenantId, 'warehouse_1');

      expect(waves).toHaveLength(1);
      expect(waves[0].warehouseId).toBe('warehouse_1');
    });

    it('should get wave by id', async () => {
      const created = await service.createPickWave(tenantId, createWaveDto);
      const wave = await service.getPickWave(tenantId, created.id);

      expect(wave.id).toBe(created.id);
    });

    it('should throw when wave not found', async () => {
      await expect(
        service.getPickWave(tenantId, 'non_existent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Pick Task Operations', () => {
    const createTaskDto: CreatePickTaskDto = {
      orderId: 'order_1',
      orderNumber: 'ORD-001',
      orderLineId: 'line_1',
      warehouseId: 'warehouse_1',
      locationId: 'loc_1',
      locationCode: 'A-01-01',
      itemId: 'item_1',
      itemCode: 'SKU001',
      itemName: 'Test Product',
      requestedQuantity: 10,
      unitOfMeasure: 'EA',
    };

    it('should create a pick task', async () => {
      const task = await service.createPickTask(tenantId, createTaskDto);

      expect(task).toBeDefined();
      expect(task.id).toBeDefined();
      expect(task.taskNumber).toMatch(/^PICK-\d{4}-\d{8}$/);
      expect(task.status).toBe(PickTaskStatus.PENDING);
      expect(task.requestedQuantity).toBe(10);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'pick_task.created',
        expect.any(Object),
      );
    });

    it('should assign pick task', async () => {
      const task = await service.createPickTask(tenantId, createTaskDto);
      const assigned = await service.assignPickTask(tenantId, task.id, {
        assignedTo: 'picker_1',
        assignedToName: 'Jane Smith',
      });

      expect(assigned.status).toBe(PickTaskStatus.ASSIGNED);
      expect(assigned.assignedTo).toBe('picker_1');
      expect(assigned.assignedAt).toBeDefined();
    });

    it('should not assign non-pending task', async () => {
      const task = await service.createPickTask(tenantId, createTaskDto);
      await service.assignPickTask(tenantId, task.id, {
        assignedTo: 'picker_1',
        assignedToName: 'Jane',
      });

      await expect(
        service.assignPickTask(tenantId, task.id, {
          assignedTo: 'picker_2',
          assignedToName: 'Bob',
        }),
      ).rejects.toThrow('Can only assign pending tasks');
    });

    it('should start pick task', async () => {
      const task = await service.createPickTask(tenantId, createTaskDto);
      await service.assignPickTask(tenantId, task.id, {
        assignedTo: 'picker_1',
        assignedToName: 'Jane',
      });
      const started = await service.startPickTask(tenantId, task.id);

      expect(started.status).toBe(PickTaskStatus.IN_PROGRESS);
      expect(started.startedAt).toBeDefined();
    });

    it('should not start unassigned task', async () => {
      const task = await service.createPickTask(tenantId, createTaskDto);

      await expect(service.startPickTask(tenantId, task.id)).rejects.toThrow(
        'Task must be assigned before starting',
      );
    });

    it('should complete pick task', async () => {
      const task = await service.createPickTask(tenantId, createTaskDto);
      await service.assignPickTask(tenantId, task.id, {
        assignedTo: 'picker_1',
        assignedToName: 'Jane',
      });
      await service.startPickTask(tenantId, task.id);

      const completed = await service.completePickTask(tenantId, task.id, {
        pickedQuantity: 10,
      });

      expect(completed.status).toBe(PickTaskStatus.COMPLETED);
      expect(completed.pickedQuantity).toBe(10);
      expect(completed.completedAt).toBeDefined();
    });

    it('should handle short pick', async () => {
      const task = await service.createPickTask(tenantId, createTaskDto);
      await service.assignPickTask(tenantId, task.id, {
        assignedTo: 'picker_1',
        assignedToName: 'Jane',
      });
      await service.startPickTask(tenantId, task.id);

      const completed = await service.completePickTask(tenantId, task.id, {
        pickedQuantity: 7,
        shortQuantity: 3,
        shortReason: 'Stock not found',
      });

      expect(completed.status).toBe(PickTaskStatus.SHORT_PICKED);
      expect(completed.pickedQuantity).toBe(7);
      expect(completed.shortQuantity).toBe(3);
      expect(completed.shortReason).toBe('Stock not found');
    });

    it('should not pick more than requested', async () => {
      const task = await service.createPickTask(tenantId, createTaskDto);
      await service.assignPickTask(tenantId, task.id, {
        assignedTo: 'picker_1',
        assignedToName: 'Jane',
      });
      await service.startPickTask(tenantId, task.id);

      await expect(
        service.completePickTask(tenantId, task.id, {
          pickedQuantity: 15,
        }),
      ).rejects.toThrow('Cannot pick more than requested');
    });

    it('should list pick tasks with filters', async () => {
      await service.createPickTask(tenantId, createTaskDto);
      await service.createPickTask(tenantId, {
        ...createTaskDto,
        zoneId: 'zone_2',
      });

      const tasks = await service.listPickTasks(tenantId, { zoneId: 'zone_2' });

      expect(tasks).toHaveLength(1);
    });

    it('should get picker tasks', async () => {
      const task = await service.createPickTask(tenantId, createTaskDto);
      await service.assignPickTask(tenantId, task.id, {
        assignedTo: 'picker_1',
        assignedToName: 'Jane',
      });

      const tasks = await service.getPickerTasks(tenantId, 'picker_1');

      expect(tasks).toHaveLength(1);
      expect(tasks[0].assignedTo).toBe('picker_1');
    });
  });

  describe('Packing Session Operations', () => {
    const createSessionDto: CreatePackingSessionDto = {
      warehouseId: 'warehouse_1',
      warehouseName: 'Main Warehouse',
      packingStationId: 'station_1',
      packingStationName: 'Station 1',
      orderId: 'order_1',
      orderNumber: 'ORD-001',
      packedBy: 'user_1',
      packedByName: 'John Doe',
    };

    it('should create a packing session', async () => {
      const session = await service.createPackingSession(
        tenantId,
        createSessionDto,
      );

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.sessionNumber).toMatch(/^PACK-\d{4}-\d{6}$/);
      expect(session.status).toBe(PackingStatus.PENDING);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        'packing_session.created',
        expect.any(Object),
      );
    });

    it('should start packing session', async () => {
      const session = await service.createPackingSession(
        tenantId,
        createSessionDto,
      );
      const started = await service.startPackingSession(tenantId, session.id);

      expect(started.status).toBe(PackingStatus.IN_PROGRESS);
      expect(started.startedAt).toBeDefined();
    });

    it('should add container to session', async () => {
      const session = await service.createPackingSession(
        tenantId,
        createSessionDto,
      );
      await service.startPackingSession(tenantId, session.id);

      const updated = await service.addContainer(tenantId, session.id, {
        containerType: ContainerType.CARTON,
        length: 30,
        width: 20,
        height: 15,
        dimensionUnit: 'cm',
      });

      expect(updated.containers).toHaveLength(1);
      expect(updated.containers[0].containerType).toBe(ContainerType.CARTON);
    });

    it('should not add container to non-started session', async () => {
      const session = await service.createPackingSession(
        tenantId,
        createSessionDto,
      );

      await expect(
        service.addContainer(tenantId, session.id, {
          containerType: ContainerType.CARTON,
        }),
      ).rejects.toThrow('Session must be in progress');
    });

    it('should pack item into container', async () => {
      const session = await service.createPackingSession(
        tenantId,
        createSessionDto,
      );
      await service.startPackingSession(tenantId, session.id);
      const withContainer = await service.addContainer(tenantId, session.id, {
        containerType: ContainerType.CARTON,
      });

      const updated = await service.packItem(tenantId, session.id, {
        containerId: withContainer.containers[0].id,
        itemId: 'item_1',
        itemCode: 'SKU001',
        itemName: 'Test Product',
        quantity: 5,
        unitOfMeasure: 'EA',
      });

      expect(updated.containers[0].items).toHaveLength(1);
      expect(updated.containers[0].totalQuantity).toBe(5);
      expect(updated.packedItems).toBe(5);
    });

    it('should not pack into sealed container', async () => {
      const session = await service.createPackingSession(
        tenantId,
        createSessionDto,
      );
      await service.startPackingSession(tenantId, session.id);
      const withContainer = await service.addContainer(tenantId, session.id, {
        containerType: ContainerType.CARTON,
      });
      await service.packItem(tenantId, session.id, {
        containerId: withContainer.containers[0].id,
        itemId: 'item_1',
        itemCode: 'SKU001',
        itemName: 'Product',
        quantity: 5,
        unitOfMeasure: 'EA',
      });
      await service.sealContainer(
        tenantId,
        session.id,
        withContainer.containers[0].id,
        { weight: 2, weightUnit: 'kg' },
      );

      await expect(
        service.packItem(tenantId, session.id, {
          containerId: withContainer.containers[0].id,
          itemId: 'item_2',
          itemCode: 'SKU002',
          itemName: 'Another Product',
          quantity: 3,
          unitOfMeasure: 'EA',
        }),
      ).rejects.toThrow('Cannot add items to sealed container');
    });

    it('should seal container', async () => {
      const session = await service.createPackingSession(
        tenantId,
        createSessionDto,
      );
      await service.startPackingSession(tenantId, session.id);
      const withContainer = await service.addContainer(tenantId, session.id, {
        containerType: ContainerType.CARTON,
      });
      await service.packItem(tenantId, session.id, {
        containerId: withContainer.containers[0].id,
        itemId: 'item_1',
        itemCode: 'SKU001',
        itemName: 'Product',
        quantity: 5,
        unitOfMeasure: 'EA',
      });

      const sealed = await service.sealContainer(
        tenantId,
        session.id,
        withContainer.containers[0].id,
        { weight: 2, weightUnit: 'kg', trackingNumber: 'TRACK123' },
      );

      expect(sealed.containers[0].sealed).toBe(true);
      expect(sealed.containers[0].weight).toBe(2);
      expect(sealed.containers[0].trackingNumber).toBe('TRACK123');
    });

    it('should not seal empty container', async () => {
      const session = await service.createPackingSession(
        tenantId,
        createSessionDto,
      );
      await service.startPackingSession(tenantId, session.id);
      const withContainer = await service.addContainer(tenantId, session.id, {
        containerType: ContainerType.CARTON,
      });

      await expect(
        service.sealContainer(
          tenantId,
          session.id,
          withContainer.containers[0].id,
          {},
        ),
      ).rejects.toThrow('Cannot seal empty container');
    });

    it('should complete packing session', async () => {
      const session = await service.createPackingSession(
        tenantId,
        createSessionDto,
      );
      await service.startPackingSession(tenantId, session.id);
      const withContainer = await service.addContainer(tenantId, session.id, {
        containerType: ContainerType.CARTON,
      });
      await service.packItem(tenantId, session.id, {
        containerId: withContainer.containers[0].id,
        itemId: 'item_1',
        itemCode: 'SKU001',
        itemName: 'Product',
        quantity: 5,
        unitOfMeasure: 'EA',
      });
      await service.sealContainer(
        tenantId,
        session.id,
        withContainer.containers[0].id,
        {},
      );

      const completed = await service.completePackingSession(
        tenantId,
        session.id,
      );

      expect(completed.status).toBe(PackingStatus.PACKED);
      expect(completed.completedAt).toBeDefined();
    });

    it('should not complete with unsealed containers', async () => {
      const session = await service.createPackingSession(
        tenantId,
        createSessionDto,
      );
      await service.startPackingSession(tenantId, session.id);
      await service.addContainer(tenantId, session.id, {
        containerType: ContainerType.CARTON,
      });

      await expect(
        service.completePackingSession(tenantId, session.id),
      ).rejects.toThrow('All containers must be sealed');
    });

    it('should verify packing session', async () => {
      const session = await service.createPackingSession(
        tenantId,
        createSessionDto,
      );
      await service.startPackingSession(tenantId, session.id);
      const withContainer = await service.addContainer(tenantId, session.id, {
        containerType: ContainerType.CARTON,
      });
      await service.packItem(tenantId, session.id, {
        containerId: withContainer.containers[0].id,
        itemId: 'item_1',
        itemCode: 'SKU001',
        itemName: 'Product',
        quantity: 5,
        unitOfMeasure: 'EA',
      });
      await service.sealContainer(
        tenantId,
        session.id,
        withContainer.containers[0].id,
        {},
      );
      await service.completePackingSession(tenantId, session.id);

      const verified = await service.verifyPackingSession(
        tenantId,
        session.id,
        'verifier_1',
      );

      expect(verified.status).toBe(PackingStatus.VERIFIED);
      expect(verified.verifiedBy).toBe('verifier_1');
    });

    it('should mark session as shipped', async () => {
      const session = await service.createPackingSession(
        tenantId,
        createSessionDto,
      );
      await service.startPackingSession(tenantId, session.id);
      const withContainer = await service.addContainer(tenantId, session.id, {
        containerType: ContainerType.CARTON,
      });
      await service.packItem(tenantId, session.id, {
        containerId: withContainer.containers[0].id,
        itemId: 'item_1',
        itemCode: 'SKU001',
        itemName: 'Product',
        quantity: 5,
        unitOfMeasure: 'EA',
      });
      await service.sealContainer(
        tenantId,
        session.id,
        withContainer.containers[0].id,
        {},
      );
      await service.completePackingSession(tenantId, session.id);
      await service.verifyPackingSession(tenantId, session.id, 'verifier_1');

      const shipped = await service.markShipped(
        tenantId,
        session.id,
        'shipment_1',
      );

      expect(shipped.status).toBe(PackingStatus.SHIPPED);
      expect(shipped.shipmentId).toBe('shipment_1');
    });

    it('should list packing sessions', async () => {
      await service.createPackingSession(tenantId, createSessionDto);
      await service.createPackingSession(tenantId, {
        ...createSessionDto,
        warehouseId: 'warehouse_2',
      });

      const sessions = await service.listPackingSessions(tenantId, {
        warehouseId: 'warehouse_1',
      });

      expect(sessions).toHaveLength(1);
    });
  });

  describe('Performance Analytics', () => {
    it('should calculate picking performance', async () => {
      const warehouseId = 'warehouse_perf';
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 1);
      const dateTo = new Date();
      dateTo.setDate(dateTo.getDate() + 1);

      const task = await service.createPickTask(tenantId, {
        orderId: 'order_1',
        orderNumber: 'ORD-001',
        orderLineId: 'line_1',
        warehouseId,
        locationId: 'loc_1',
        locationCode: 'A-01',
        itemId: 'item_1',
        itemCode: 'SKU001',
        itemName: 'Product',
        requestedQuantity: 10,
        unitOfMeasure: 'EA',
      });
      await service.assignPickTask(tenantId, task.id, {
        assignedTo: 'picker_1',
        assignedToName: 'Jane',
      });
      await service.startPickTask(tenantId, task.id);
      await service.completePickTask(tenantId, task.id, {
        pickedQuantity: 10,
      });

      const performance = await service.getPickingPerformance(
        tenantId,
        warehouseId,
        dateFrom,
        dateTo,
      );

      expect(performance.totalTasks).toBe(1);
      expect(performance.completedTasks).toBe(1);
      expect(performance.completionRate).toBe(100);
      expect(performance.topPickers).toHaveLength(1);
      expect(performance.topPickers[0].accuracy).toBe(100);
    });

    it('should calculate packing performance', async () => {
      const warehouseId = 'warehouse_pack_perf';
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - 1);
      const dateTo = new Date();
      dateTo.setDate(dateTo.getDate() + 1);

      const session = await service.createPackingSession(tenantId, {
        warehouseId,
        warehouseName: 'Test Warehouse',
        orderId: 'order_1',
        orderNumber: 'ORD-001',
        packedBy: 'packer_1',
        packedByName: 'Bob',
      });
      await service.startPackingSession(tenantId, session.id);
      const withContainer = await service.addContainer(tenantId, session.id, {
        containerType: ContainerType.CARTON,
      });
      await service.packItem(tenantId, session.id, {
        containerId: withContainer.containers[0].id,
        itemId: 'item_1',
        itemCode: 'SKU001',
        itemName: 'Product',
        quantity: 5,
        unitOfMeasure: 'EA',
      });
      await service.sealContainer(
        tenantId,
        session.id,
        withContainer.containers[0].id,
        {},
      );
      await service.completePackingSession(tenantId, session.id);

      const performance = await service.getPackingPerformance(
        tenantId,
        warehouseId,
        dateFrom,
        dateTo,
      );

      expect(performance.totalSessions).toBe(1);
      expect(performance.completedSessions).toBe(1);
      expect(performance.totalContainers).toBe(1);
      expect(performance.totalItemsPacked).toBe(5);
      expect(performance.topPackers).toHaveLength(1);
    });
  });
});
