import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  IntegrationsHubService,
  Integration,
  IntegrationConnection,
  IntegrationCategory,
} from './integrations-hub.service';

describe('IntegrationsHubService', () => {
  let service: IntegrationsHubService;
  let eventEmitter: EventEmitter2;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationsHubService,
        { provide: EventEmitter2, useValue: mockEventEmitter },
      ],
    }).compile();

    service = module.get<IntegrationsHubService>(IntegrationsHubService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with integrations catalog', async () => {
      const integrations = await service.getIntegrations();
      expect(integrations.length).toBeGreaterThan(0);
    });

    it('should include Romanian integrations (SAGA, ANAF)', async () => {
      const saga = await service.getIntegration('saga-accounting');
      const anaf = await service.getIntegration('anaf-efactura');

      expect(saga).toBeDefined();
      expect(saga?.name).toBe('SAGA Accounting');
      expect(anaf).toBeDefined();
      expect(anaf?.name).toBe('ANAF e-Factura');
    });
  });

  describe('getIntegrations', () => {
    it('should return all integrations sorted by name', async () => {
      const integrations = await service.getIntegrations();

      expect(integrations.length).toBeGreaterThan(10);
      for (let i = 1; i < integrations.length; i++) {
        expect(integrations[i - 1].name.localeCompare(integrations[i].name)).toBeLessThanOrEqual(0);
      }
    });

    it('should filter by category', async () => {
      const accounting = await service.getIntegrations({ category: 'accounting' });

      expect(accounting.length).toBeGreaterThan(0);
      expect(accounting.every(i => i.category === 'accounting')).toBe(true);
    });

    it('should filter by status', async () => {
      const available = await service.getIntegrations({ status: 'available' });

      expect(available.length).toBeGreaterThan(0);
      expect(available.every(i => i.status === 'available')).toBe(true);
    });

    it('should filter by search term in name', async () => {
      const result = await service.getIntegrations({ search: 'stripe' });

      expect(result.length).toBe(1);
      expect(result[0].slug).toBe('stripe');
    });

    it('should filter by search term in description', async () => {
      const result = await service.getIntegrations({ search: 'Romanian' });

      expect(result.length).toBeGreaterThan(0);
    });

    it('should filter by search term in features', async () => {
      const result = await service.getIntegrations({ search: 'SAF-T' });

      expect(result.length).toBeGreaterThan(0);
      expect(result.some(i => i.features.some(f => f.includes('SAF-T')))).toBe(true);
    });

    it('should combine multiple filters', async () => {
      const result = await service.getIntegrations({
        category: 'accounting',
        status: 'available',
      });

      expect(result.every(i => i.category === 'accounting' && i.status === 'available')).toBe(true);
    });

    it('should return empty array for non-matching search', async () => {
      const result = await service.getIntegrations({ search: 'nonexistent12345' });

      expect(result).toEqual([]);
    });
  });

  describe('getIntegration', () => {
    it('should return integration by ID', async () => {
      const integration = await service.getIntegration('stripe');

      expect(integration).toBeDefined();
      expect(integration?.id).toBe('stripe');
      expect(integration?.category).toBe('payments');
    });

    it('should return null for non-existent ID', async () => {
      const integration = await service.getIntegration('non-existent');

      expect(integration).toBeNull();
    });
  });

  describe('getIntegrationBySlug', () => {
    it('should return integration by slug', async () => {
      const integration = await service.getIntegrationBySlug('quickbooks');

      expect(integration).toBeDefined();
      expect(integration?.slug).toBe('quickbooks');
    });

    it('should return null for non-existent slug', async () => {
      const integration = await service.getIntegrationBySlug('invalid-slug');

      expect(integration).toBeNull();
    });
  });

  describe('getCategories', () => {
    it('should return all categories with counts', async () => {
      const categories = await service.getCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories.every(c => typeof c.count === 'number' && c.count > 0)).toBe(true);
    });

    it('should include expected categories', async () => {
      const categories = await service.getCategories();
      const categoryNames = categories.map(c => c.category);

      expect(categoryNames).toContain('accounting');
      expect(categoryNames).toContain('payments');
      expect(categoryNames).toContain('crm');
      expect(categoryNames).toContain('tax');
    });

    it('should sort categories alphabetically', async () => {
      const categories = await service.getCategories();

      for (let i = 1; i < categories.length; i++) {
        expect(categories[i - 1].category.localeCompare(categories[i].category)).toBeLessThanOrEqual(0);
      }
    });
  });

  describe('createConnection', () => {
    const validConnectionParams = {
      tenantId: 'tenant-1',
      integrationId: 'stripe',
      credentials: { apiKey: 'sk_test_123' },
      settings: { currency: 'RON' },
      connectedBy: 'user-1',
    };

    it('should create a new connection', async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const connection = await service.createConnection(validConnectionParams);

      expect(connection.id).toBeDefined();
      expect(connection.tenantId).toBe('tenant-1');
      expect(connection.integrationId).toBe('stripe');
      expect(connection.integrationName).toBe('Stripe');
      expect(connection.status).toBe('active');
      expect(connection.credentials).toEqual({ apiKey: 'sk_test_123' });
      expect(connection.settings).toEqual({ currency: 'RON' });
      expect(connection.connectedBy).toBe('user-1');
    });

    it('should initialize sync stats', async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const connection = await service.createConnection(validConnectionParams);

      expect(connection.syncStats).toEqual({
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
      });
    });

    it('should enable all actions and triggers by default', async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const connection = await service.createConnection(validConnectionParams);

      expect(connection.enabledActions.length).toBeGreaterThan(0);
      expect(connection.enabledTriggers.length).toBeGreaterThan(0);
    });

    it('should set status to error when test fails', async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(false);

      const connection = await service.createConnection(validConnectionParams);

      expect(connection.status).toBe('error');
    });

    it('should emit integration.connected event', async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const connection = await service.createConnection(validConnectionParams);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('integration.connected', { connection });
    });

    it('should throw NotFoundException for invalid integration', async () => {
      await expect(
        service.createConnection({
          ...validConnectionParams,
          integrationId: 'invalid',
        }),
      ).rejects.toThrow('Integration not found');
    });

    it('should use default settings when not provided', async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const connection = await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'stripe',
        credentials: { apiKey: 'sk_test_123' },
        connectedBy: 'user-1',
      });

      expect(connection.settings).toEqual({});
    });
  });

  describe('updateConnection', () => {
    let connectionId: string;

    beforeEach(async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const connection = await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'stripe',
        credentials: { apiKey: 'sk_test_123' },
        connectedBy: 'user-1',
      });
      connectionId = connection.id;
    });

    it('should update credentials', async () => {
      const updated = await service.updateConnection(connectionId, {
        credentials: { apiKey: 'sk_test_456' },
      });

      expect(updated.credentials).toEqual({ apiKey: 'sk_test_456' });
    });

    it('should update settings', async () => {
      const updated = await service.updateConnection(connectionId, {
        settings: { webhookUrl: 'https://example.com/webhook' },
      });

      expect(updated.settings).toEqual({ webhookUrl: 'https://example.com/webhook' });
    });

    it('should update enabled actions', async () => {
      const updated = await service.updateConnection(connectionId, {
        enabledActions: ['create-payment'],
      });

      expect(updated.enabledActions).toEqual(['create-payment']);
    });

    it('should update enabled triggers', async () => {
      const updated = await service.updateConnection(connectionId, {
        enabledTriggers: ['payment-succeeded'],
      });

      expect(updated.enabledTriggers).toEqual(['payment-succeeded']);
    });

    it('should update updatedAt timestamp', async () => {
      const original = await service.getConnection(connectionId);
      await new Promise(resolve => setTimeout(resolve, 5));

      const updated = await service.updateConnection(connectionId, {
        settings: { test: true },
      });

      expect(updated.updatedAt.getTime()).toBeGreaterThan(original!.createdAt.getTime());
    });

    it('should throw NotFoundException for invalid connection', async () => {
      await expect(
        service.updateConnection('invalid-id', { settings: {} }),
      ).rejects.toThrow('Connection not found');
    });
  });

  describe('disconnectIntegration', () => {
    let connectionId: string;

    beforeEach(async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const connection = await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'stripe',
        credentials: { apiKey: 'sk_test_123' },
        connectedBy: 'user-1',
      });
      connectionId = connection.id;
    });

    it('should set status to inactive', async () => {
      await service.disconnectIntegration(connectionId);

      const connection = await service.getConnection(connectionId);
      expect(connection?.status).toBe('inactive');
    });

    it('should emit integration.disconnected event', async () => {
      await service.disconnectIntegration(connectionId);

      expect(mockEventEmitter.emit).toHaveBeenCalledWith('integration.disconnected', {
        connectionId,
      });
    });

    it('should throw NotFoundException for invalid connection', async () => {
      await expect(service.disconnectIntegration('invalid-id')).rejects.toThrow(
        'Connection not found',
      );
    });
  });

  describe('deleteConnection', () => {
    let connectionId: string;

    beforeEach(async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const connection = await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'stripe',
        credentials: { apiKey: 'sk_test_123' },
        connectedBy: 'user-1',
      });
      connectionId = connection.id;
    });

    it('should delete the connection', async () => {
      await service.deleteConnection(connectionId);

      const connection = await service.getConnection(connectionId);
      expect(connection).toBeNull();
    });
  });

  describe('testConnection', () => {
    it('should throw NotFoundException for invalid connection', async () => {
      await expect(service.testConnection('invalid-id')).rejects.toThrow(
        'Connection not found',
      );
    });

    it('should return boolean result', async () => {
      // Create connection without mocking testConnection
      const originalTestConnection = service.testConnection.bind(service);

      jest.spyOn(service, 'testConnection').mockResolvedValueOnce(true);
      const connection = await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'stripe',
        credentials: { apiKey: 'sk_test_123' },
        connectedBy: 'user-1',
      });

      // Restore and test
      jest.spyOn(service, 'testConnection').mockImplementation(originalTestConnection);
      const result = await service.testConnection(connection.id);

      expect(typeof result).toBe('boolean');
    });
  });

  describe('getConnections', () => {
    beforeEach(async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'stripe',
        credentials: { apiKey: 'sk_test_1' },
        connectedBy: 'user-1',
      });

      await new Promise(resolve => setTimeout(resolve, 5));

      await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'hubspot',
        credentials: { apiKey: 'hs_test_1' },
        connectedBy: 'user-1',
      });

      await service.createConnection({
        tenantId: 'tenant-2',
        integrationId: 'salesforce',
        credentials: { apiKey: 'sf_test_1' },
        connectedBy: 'user-2',
      });
    });

    it('should return connections for tenant', async () => {
      const connections = await service.getConnections('tenant-1');

      expect(connections.length).toBe(2);
      expect(connections.every(c => c.tenantId === 'tenant-1')).toBe(true);
    });

    it('should sort by createdAt descending', async () => {
      const connections = await service.getConnections('tenant-1');

      for (let i = 1; i < connections.length; i++) {
        expect(connections[i - 1].createdAt.getTime()).toBeGreaterThanOrEqual(
          connections[i].createdAt.getTime(),
        );
      }
    });

    it('should return empty array for tenant without connections', async () => {
      const connections = await service.getConnections('tenant-99');

      expect(connections).toEqual([]);
    });
  });

  describe('getConnection', () => {
    it('should return connection by ID', async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const created = await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'stripe',
        credentials: { apiKey: 'sk_test_123' },
        connectedBy: 'user-1',
      });

      const connection = await service.getConnection(created.id);

      expect(connection).toBeDefined();
      expect(connection?.id).toBe(created.id);
    });

    it('should return null for non-existent ID', async () => {
      const connection = await service.getConnection('invalid-id');

      expect(connection).toBeNull();
    });
  });

  describe('triggerSync', () => {
    let connectionId: string;

    beforeEach(async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const connection = await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'stripe',
        credentials: { apiKey: 'sk_test_123' },
        connectedBy: 'user-1',
      });
      connectionId = connection.id;
    });

    it('should create sync log', async () => {
      const syncLog = await service.triggerSync({
        connectionId,
        type: 'manual',
      });

      expect(syncLog.id).toBeDefined();
      expect(syncLog.connectionId).toBe(connectionId);
      expect(syncLog.type).toBe('manual');
      expect(syncLog.status).toBe('running');
      expect(syncLog.startedAt).toBeDefined();
    });

    it('should use default direction', async () => {
      const syncLog = await service.triggerSync({
        connectionId,
        type: 'manual',
      });

      expect(syncLog.direction).toBe('bidirectional');
    });

    it('should accept custom direction', async () => {
      const syncLog = await service.triggerSync({
        connectionId,
        type: 'manual',
        direction: 'inbound',
      });

      expect(syncLog.direction).toBe('inbound');
    });

    it('should initialize record counters', async () => {
      const syncLog = await service.triggerSync({
        connectionId,
        type: 'manual',
      });

      expect(syncLog.recordsProcessed).toBe(0);
      expect(syncLog.recordsSucceeded).toBe(0);
      expect(syncLog.recordsFailed).toBe(0);
    });

    it('should throw NotFoundException for invalid connection', async () => {
      await expect(
        service.triggerSync({
          connectionId: 'invalid-id',
          type: 'manual',
        }),
      ).rejects.toThrow('Connection not found');
    });

    it('should throw BadRequestException for inactive connection', async () => {
      await service.disconnectIntegration(connectionId);

      await expect(
        service.triggerSync({
          connectionId,
          type: 'manual',
        }),
      ).rejects.toThrow('Connection is not active');
    });
  });

  describe('getSyncLogs', () => {
    let connectionId: string;

    beforeEach(async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const connection = await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'stripe',
        credentials: { apiKey: 'sk_test_123' },
        connectedBy: 'user-1',
      });
      connectionId = connection.id;

      await service.triggerSync({ connectionId, type: 'manual' });
      await new Promise(resolve => setTimeout(resolve, 10));
      await service.triggerSync({ connectionId, type: 'scheduled' });
    });

    it('should return all logs', async () => {
      const logs = await service.getSyncLogs();

      expect(logs.length).toBeGreaterThanOrEqual(2);
    });

    it('should filter by connectionId', async () => {
      const logs = await service.getSyncLogs({ connectionId });

      expect(logs.length).toBe(2);
      expect(logs.every(l => l.connectionId === connectionId)).toBe(true);
    });

    it('should filter by tenantId', async () => {
      const logs = await service.getSyncLogs({ tenantId: 'tenant-1' });

      expect(logs.length).toBe(2);
      expect(logs.every(l => l.tenantId === 'tenant-1')).toBe(true);
    });

    it('should filter by status', async () => {
      const logs = await service.getSyncLogs({ status: 'running' });

      expect(logs.every(l => l.status === 'running')).toBe(true);
    });

    it('should limit results', async () => {
      const logs = await service.getSyncLogs({ limit: 1 });

      expect(logs.length).toBe(1);
    });

    it('should sort by startedAt descending', async () => {
      const logs = await service.getSyncLogs({ connectionId });

      for (let i = 1; i < logs.length; i++) {
        expect(logs[i - 1].startedAt.getTime()).toBeGreaterThanOrEqual(
          logs[i].startedAt.getTime(),
        );
      }
    });
  });

  describe('createDataFlow', () => {
    let connectionId: string;

    beforeEach(async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const connection = await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'stripe',
        credentials: { apiKey: 'sk_test_123' },
        connectedBy: 'user-1',
      });
      connectionId = connection.id;
    });

    const validFlowParams = {
      connectionId: '',
      tenantId: 'tenant-1',
      name: 'Invoice Sync',
      description: 'Sync invoices from Stripe',
      sourceEntity: 'stripe_invoice',
      targetEntity: 'invoice',
      mappings: [
        { sourceField: 'id', targetField: 'externalId', required: true },
        { sourceField: 'amount', targetField: 'total', required: true },
        { sourceField: 'currency', targetField: 'currency', required: true, defaultValue: 'RON' },
      ],
      transformations: [
        { field: 'amount', type: 'convert' as const, config: { from: 'cents', to: 'units' } },
      ],
      schedule: '0 0 * * *',
    };

    it('should create a data flow', async () => {
      const flow = await service.createDataFlow({
        ...validFlowParams,
        connectionId,
      });

      expect(flow.id).toBeDefined();
      expect(flow.name).toBe('Invoice Sync');
      expect(flow.sourceEntity).toBe('stripe_invoice');
      expect(flow.targetEntity).toBe('invoice');
      expect(flow.isActive).toBe(true);
    });

    it('should store field mappings', async () => {
      const flow = await service.createDataFlow({
        ...validFlowParams,
        connectionId,
      });

      expect(flow.mappings.length).toBe(3);
      expect(flow.mappings[0]).toEqual({
        sourceField: 'id',
        targetField: 'externalId',
        required: true,
      });
    });

    it('should store transformations', async () => {
      const flow = await service.createDataFlow({
        ...validFlowParams,
        connectionId,
      });

      expect(flow.transformations?.length).toBe(1);
      expect(flow.transformations?.[0].type).toBe('convert');
    });

    it('should store schedule', async () => {
      const flow = await service.createDataFlow({
        ...validFlowParams,
        connectionId,
      });

      expect(flow.schedule).toBe('0 0 * * *');
    });

    it('should throw NotFoundException for invalid connection', async () => {
      await expect(
        service.createDataFlow({
          ...validFlowParams,
          connectionId: 'invalid-id',
        }),
      ).rejects.toThrow('Connection not found');
    });
  });

  describe('getDataFlows', () => {
    let connectionId: string;

    beforeEach(async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const connection = await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'stripe',
        credentials: { apiKey: 'sk_test_123' },
        connectedBy: 'user-1',
      });
      connectionId = connection.id;

      await service.createDataFlow({
        connectionId,
        tenantId: 'tenant-1',
        name: 'Flow 1',
        sourceEntity: 'source1',
        targetEntity: 'target1',
        mappings: [],
      });

      await new Promise(resolve => setTimeout(resolve, 5));

      await service.createDataFlow({
        connectionId,
        tenantId: 'tenant-1',
        name: 'Flow 2',
        sourceEntity: 'source2',
        targetEntity: 'target2',
        mappings: [],
      });
    });

    it('should return flows for connection', async () => {
      const flows = await service.getDataFlows(connectionId);

      expect(flows.length).toBe(2);
      expect(flows.every(f => f.connectionId === connectionId)).toBe(true);
    });

    it('should sort by createdAt descending', async () => {
      const flows = await service.getDataFlows(connectionId);

      expect(flows[0].name).toBe('Flow 2');
      expect(flows[1].name).toBe('Flow 1');
    });

    it('should return empty array for connection without flows', async () => {
      const flows = await service.getDataFlows('no-flows-connection');

      expect(flows).toEqual([]);
    });
  });

  describe('updateDataFlow', () => {
    let flowId: string;
    let connectionId: string;

    beforeEach(async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const connection = await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'stripe',
        credentials: { apiKey: 'sk_test_123' },
        connectedBy: 'user-1',
      });
      connectionId = connection.id;

      const flow = await service.createDataFlow({
        connectionId,
        tenantId: 'tenant-1',
        name: 'Original Flow',
        sourceEntity: 'source',
        targetEntity: 'target',
        mappings: [],
      });
      flowId = flow.id;
    });

    it('should update name', async () => {
      const updated = await service.updateDataFlow(flowId, { name: 'Updated Flow' });

      expect(updated?.name).toBe('Updated Flow');
    });

    it('should update mappings', async () => {
      const newMappings = [{ sourceField: 'a', targetField: 'b', required: true }];

      const updated = await service.updateDataFlow(flowId, { mappings: newMappings });

      expect(updated?.mappings).toEqual(newMappings);
    });

    it('should update schedule', async () => {
      const updated = await service.updateDataFlow(flowId, { schedule: '0 12 * * *' });

      expect(updated?.schedule).toBe('0 12 * * *');
    });

    it('should update isActive', async () => {
      const updated = await service.updateDataFlow(flowId, { isActive: false });

      expect(updated?.isActive).toBe(false);
    });

    it('should return null for non-existent flow', async () => {
      const updated = await service.updateDataFlow('invalid-id', { name: 'Test' });

      expect(updated).toBeNull();
    });
  });

  describe('deleteDataFlow', () => {
    let flowId: string;
    let connectionId: string;

    beforeEach(async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      const connection = await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'stripe',
        credentials: { apiKey: 'sk_test_123' },
        connectedBy: 'user-1',
      });
      connectionId = connection.id;

      const flow = await service.createDataFlow({
        connectionId,
        tenantId: 'tenant-1',
        name: 'Flow to Delete',
        sourceEntity: 'source',
        targetEntity: 'target',
        mappings: [],
      });
      flowId = flow.id;
    });

    it('should delete the flow', async () => {
      await service.deleteDataFlow(flowId);

      const flows = await service.getDataFlows(connectionId);
      expect(flows.find(f => f.id === flowId)).toBeUndefined();
    });
  });

  describe('getStats', () => {
    beforeEach(async () => {
      jest.spyOn(service, 'testConnection').mockResolvedValue(true);

      await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'stripe',
        credentials: { apiKey: 'sk_test_1' },
        connectedBy: 'user-1',
      });

      await service.createConnection({
        tenantId: 'tenant-1',
        integrationId: 'hubspot',
        credentials: { apiKey: 'hs_test_1' },
        connectedBy: 'user-1',
      });

      await service.createConnection({
        tenantId: 'tenant-2',
        integrationId: 'salesforce',
        credentials: { apiKey: 'sf_test_1' },
        connectedBy: 'user-2',
      });
    });

    it('should return total integrations count', async () => {
      const stats = await service.getStats();

      expect(stats.totalIntegrations).toBeGreaterThan(0);
    });

    it('should return available integrations count', async () => {
      const stats = await service.getStats();

      expect(stats.availableIntegrations).toBeGreaterThan(0);
      expect(stats.availableIntegrations).toBeLessThanOrEqual(stats.totalIntegrations);
    });

    it('should return connected integrations count', async () => {
      const stats = await service.getStats();

      expect(stats.connectedIntegrations).toBe(3);
    });

    it('should return active connections count', async () => {
      const stats = await service.getStats();

      expect(stats.activeConnections).toBe(3);
    });

    it('should return integrations by category', async () => {
      const stats = await service.getStats();

      expect(stats.integrationsByCategory).toBeDefined();
      expect(stats.integrationsByCategory.accounting).toBeGreaterThan(0);
      expect(stats.integrationsByCategory.payments).toBeGreaterThan(0);
    });

    it('should filter stats by tenant', async () => {
      const stats = await service.getStats('tenant-1');

      expect(stats.connectedIntegrations).toBe(2);
      expect(stats.activeConnections).toBe(2);
    });

    it('should return zero syncs for new connections', async () => {
      const stats = await service.getStats('tenant-1');

      expect(stats.totalSyncs).toBe(0);
      expect(stats.successfulSyncs).toBe(0);
    });
  });

  describe('Romanian integration specifics', () => {
    describe('SAGA Accounting', () => {
      it('should have correct SAGA integration details', async () => {
        const saga = await service.getIntegration('saga-accounting');

        expect(saga).toBeDefined();
        expect(saga?.authType).toBe('api_key');
        expect(saga?.status).toBe('available');
        expect(saga?.features).toContain('SAF-T export');
        expect(saga?.features).toContain('Invoice sync');
      });

      it('should have SAF-T export action', async () => {
        const saga = await service.getIntegration('saga-accounting');

        const saftAction = saga?.supportedActions.find(a => a.id === 'export-saft');
        expect(saftAction).toBeDefined();
        expect(saftAction?.name).toBe('Export SAF-T');
      });
    });

    describe('ANAF e-Factura', () => {
      it('should have correct ANAF integration details', async () => {
        const anaf = await service.getIntegration('anaf-efactura');

        expect(anaf).toBeDefined();
        expect(anaf?.category).toBe('tax');
        expect(anaf?.authType).toBe('custom');
        expect(anaf?.pricing).toBe('free');
      });

      it('should have invoice submission action', async () => {
        const anaf = await service.getIntegration('anaf-efactura');

        const submitAction = anaf?.supportedActions.find(a => a.id === 'submit-invoice');
        expect(submitAction).toBeDefined();
        expect(submitAction?.name).toBe('Submit Invoice');
      });

      it('should have invoice accepted trigger', async () => {
        const anaf = await service.getIntegration('anaf-efactura');

        const trigger = anaf?.supportedTriggers.find(t => t.id === 'invoice-accepted');
        expect(trigger).toBeDefined();
      });
    });

    describe('Romanian Banks PSD2', () => {
      it('should have Romanian banks integration', async () => {
        const banks = await service.getIntegration('romanian-banks');

        expect(banks).toBeDefined();
        expect(banks?.category).toBe('banking');
        expect(banks?.authType).toBe('oauth2');
        expect(banks?.pricing).toBe('free');
      });

      it('should support transaction history', async () => {
        const banks = await service.getIntegration('romanian-banks');

        const getTransactions = banks?.supportedActions.find(a => a.id === 'get-transactions');
        expect(getTransactions).toBeDefined();
      });
    });
  });

  describe('Integration categories', () => {
    it('should have accounting integrations', async () => {
      const accounting = await service.getIntegrations({ category: 'accounting' });

      expect(accounting.length).toBeGreaterThanOrEqual(3);
      expect(accounting.map(i => i.slug)).toContain('saga');
      expect(accounting.map(i => i.slug)).toContain('quickbooks');
      expect(accounting.map(i => i.slug)).toContain('xero');
    });

    it('should have CRM integrations', async () => {
      const crm = await service.getIntegrations({ category: 'crm' });

      expect(crm.length).toBeGreaterThanOrEqual(2);
      expect(crm.map(i => i.slug)).toContain('salesforce');
      expect(crm.map(i => i.slug)).toContain('hubspot');
    });

    it('should have ecommerce integrations', async () => {
      const ecommerce = await service.getIntegrations({ category: 'ecommerce' });

      expect(ecommerce.length).toBeGreaterThanOrEqual(2);
      expect(ecommerce.map(i => i.slug)).toContain('shopify');
      expect(ecommerce.map(i => i.slug)).toContain('woocommerce');
    });

    it('should have communication integrations', async () => {
      const communication = await service.getIntegrations({ category: 'communication' });

      expect(communication.length).toBeGreaterThanOrEqual(2);
      expect(communication.map(i => i.slug)).toContain('slack');
      expect(communication.map(i => i.slug)).toContain('ms-teams');
    });
  });

  describe('OAuth2 integrations', () => {
    it('should identify OAuth2 integrations', async () => {
      const integrations = await service.getIntegrations();
      const oauth2 = integrations.filter(i => i.authType === 'oauth2');

      expect(oauth2.length).toBeGreaterThan(5);
    });

    it('should have required scopes for OAuth2 integrations', async () => {
      const quickbooks = await service.getIntegration('quickbooks');

      expect(quickbooks?.authType).toBe('oauth2');
      expect(quickbooks?.requiredScopes).toBeDefined();
      expect(quickbooks?.requiredScopes?.length).toBeGreaterThan(0);
    });
  });
});
