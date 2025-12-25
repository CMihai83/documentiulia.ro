import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  CloudInfrastructureService,
  TrafficManagerProfile,
  PostgreSQLConfig,
  RedisCacheConfig,
  BlobStorageConfig,
  DisasterRecoveryPlan,
} from './cloud-infrastructure.service';

describe('CloudInfrastructureService', () => {
  let service: CloudInfrastructureService;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-value'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CloudInfrastructureService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<CloudInfrastructureService>(CloudInfrastructureService);
    await service.onModuleInit();
  });

  describe('Region Management', () => {
    it('should return all regions', () => {
      const regions = service.getAllRegions();
      expect(regions.length).toBeGreaterThan(0);
    });

    it('should return GDPR compliant regions only', () => {
      const regions = service.getGDPRCompliantRegions();
      expect(regions.every(r => r.isGDPRCompliant)).toBe(true);
    });

    it('should return optimal region for Romania', () => {
      const region = service.getOptimalRegionForRomania();
      expect(region).toBeDefined();
      expect(region.isGDPRCompliant).toBe(true);
    });

    it('should filter regions by latency', () => {
      const regions = service.getRegionsByLatency(30);
      expect(regions.every(r => r.latencyFromBucharest <= 30)).toBe(true);
    });

    it('should get region by id', () => {
      const region = service.getRegion('westeurope');
      expect(region).toBeDefined();
      expect(region?.displayName).toContain('Netherlands');
    });

    it('should return undefined for non-existent region', () => {
      const region = service.getRegion('non-existent');
      expect(region).toBeUndefined();
    });
  });

  describe('Traffic Manager', () => {
    it('should create traffic manager profile', () => {
      const profile = service.createTrafficManagerProfile({
        name: 'test-tm',
        routingMethod: 'Priority',
        dnsConfig: {
          relativeName: 'test',
          fqdn: 'test.trafficmanager.net',
          ttl: 60,
        },
        monitorConfig: {
          protocol: 'HTTPS',
          port: 443,
          path: '/health',
          intervalInSeconds: 30,
          timeoutInSeconds: 10,
          toleratedNumberOfFailures: 3,
        },
        endpoints: [],
        status: 'Enabled',
      });

      expect(profile.id).toBeDefined();
      expect(profile.name).toBe('test-tm');
    });

    it('should get traffic manager profile by id', () => {
      const created = service.createTrafficManagerProfile({
        name: 'test-tm-get',
        routingMethod: 'Performance',
        dnsConfig: { relativeName: 'test', fqdn: 'test.trafficmanager.net', ttl: 60 },
        monitorConfig: { protocol: 'HTTPS', port: 443, path: '/health', intervalInSeconds: 30, timeoutInSeconds: 10, toleratedNumberOfFailures: 3 },
        endpoints: [],
        status: 'Enabled',
      });

      const retrieved = service.getTrafficManagerProfile(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-tm-get');
    });

    it('should get all traffic manager profiles', () => {
      const profiles = service.getAllTrafficManagerProfiles();
      expect(Array.isArray(profiles)).toBe(true);
      expect(profiles.length).toBeGreaterThan(0);
    });

    it('should add endpoint to traffic manager', () => {
      const profile = service.createTrafficManagerProfile({
        name: 'test-tm-endpoint',
        routingMethod: 'Priority',
        dnsConfig: { relativeName: 'test', fqdn: 'test.trafficmanager.net', ttl: 60 },
        monitorConfig: { protocol: 'HTTPS', port: 443, path: '/health', intervalInSeconds: 30, timeoutInSeconds: 10, toleratedNumberOfFailures: 3 },
        endpoints: [],
        status: 'Enabled',
      });

      const endpoint = service.addTrafficManagerEndpoint(profile.id, {
        name: 'test-endpoint',
        type: 'Azure',
        target: 'test.azurewebsites.net',
        weight: 1,
        priority: 1,
        endpointStatus: 'Enabled',
        healthStatus: 'Online',
      });

      expect(endpoint).toBeDefined();
      expect(endpoint?.name).toBe('test-endpoint');
    });

    it('should return undefined when adding endpoint to non-existent profile', () => {
      const endpoint = service.addTrafficManagerEndpoint('non-existent', {
        name: 'test',
        type: 'Azure',
        target: 'test.azurewebsites.net',
        weight: 1,
        priority: 1,
        endpointStatus: 'Enabled',
        healthStatus: 'Online',
      });
      expect(endpoint).toBeUndefined();
    });

    it('should remove endpoint from traffic manager', () => {
      const profile = service.createTrafficManagerProfile({
        name: 'test-tm-remove',
        routingMethod: 'Priority',
        dnsConfig: { relativeName: 'test', fqdn: 'test.trafficmanager.net', ttl: 60 },
        monitorConfig: { protocol: 'HTTPS', port: 443, path: '/health', intervalInSeconds: 30, timeoutInSeconds: 10, toleratedNumberOfFailures: 3 },
        endpoints: [],
        status: 'Enabled',
      });

      const endpoint = service.addTrafficManagerEndpoint(profile.id, {
        name: 'to-remove',
        type: 'Azure',
        target: 'test.azurewebsites.net',
        weight: 1,
        priority: 1,
        endpointStatus: 'Enabled',
        healthStatus: 'Online',
      });

      const result = service.removeTrafficManagerEndpoint(profile.id, endpoint!.id);
      expect(result).toBe(true);
    });

    it('should return false when removing from non-existent profile', () => {
      const result = service.removeTrafficManagerEndpoint('non-existent', 'endpoint-id');
      expect(result).toBe(false);
    });

    it('should update endpoint health status', () => {
      const profile = service.createTrafficManagerProfile({
        name: 'test-tm-health',
        routingMethod: 'Priority',
        dnsConfig: { relativeName: 'test', fqdn: 'test.trafficmanager.net', ttl: 60 },
        monitorConfig: { protocol: 'HTTPS', port: 443, path: '/health', intervalInSeconds: 30, timeoutInSeconds: 10, toleratedNumberOfFailures: 3 },
        endpoints: [],
        status: 'Enabled',
      });

      const endpoint = service.addTrafficManagerEndpoint(profile.id, {
        name: 'test-health',
        type: 'Azure',
        target: 'test.azurewebsites.net',
        weight: 1,
        priority: 1,
        endpointStatus: 'Enabled',
        healthStatus: 'Online',
      });

      const result = service.updateEndpointHealth(profile.id, endpoint!.id, 'Degraded');
      expect(result).toBe(true);
    });

    it('should simulate failover', () => {
      const profile = service.createTrafficManagerProfile({
        name: 'test-tm-failover',
        routingMethod: 'Priority',
        dnsConfig: { relativeName: 'test', fqdn: 'test.trafficmanager.net', ttl: 60 },
        monitorConfig: { protocol: 'HTTPS', port: 443, path: '/health', intervalInSeconds: 30, timeoutInSeconds: 10, toleratedNumberOfFailures: 3 },
        endpoints: [],
        status: 'Enabled',
      });

      service.addTrafficManagerEndpoint(profile.id, {
        name: 'primary',
        type: 'Azure',
        target: 'primary.azurewebsites.net',
        weight: 1,
        priority: 1,
        endpointStatus: 'Enabled',
        healthStatus: 'Online',
      });

      service.addTrafficManagerEndpoint(profile.id, {
        name: 'secondary',
        type: 'Azure',
        target: 'secondary.azurewebsites.net',
        weight: 1,
        priority: 2,
        endpointStatus: 'Enabled',
        healthStatus: 'Online',
      });

      const result = service.simulateFailover(profile.id);
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.failedOver).toBe('primary');
      expect(result?.activatedEndpoint).toBe('secondary');
    });

    it('should return undefined when simulating failover with insufficient endpoints', () => {
      const profile = service.createTrafficManagerProfile({
        name: 'test-tm-single',
        routingMethod: 'Priority',
        dnsConfig: { relativeName: 'test', fqdn: 'test.trafficmanager.net', ttl: 60 },
        monitorConfig: { protocol: 'HTTPS', port: 443, path: '/health', intervalInSeconds: 30, timeoutInSeconds: 10, toleratedNumberOfFailures: 3 },
        endpoints: [],
        status: 'Enabled',
      });

      const result = service.simulateFailover(profile.id);
      expect(result).toBeUndefined();
    });
  });

  describe('PostgreSQL Database', () => {
    it('should create PostgreSQL server', () => {
      const server = service.createPostgreSQLServer({
        serverName: 'test-db',
        location: 'germanywestcentral',
        tier: 'GeneralPurpose',
        version: '16',
        vCores: 4,
        storageGB: 128,
        backupRetentionDays: 7,
        geoRedundantBackup: false,
        highAvailability: { mode: 'Disabled' },
        readReplicas: [],
        sslEnforcement: true,
        firewallRules: [],
        maintenanceWindow: { dayOfWeek: 0, startHour: 2, startMinute: 0 },
      });

      expect(server.serverId).toBeDefined();
      expect(server.connectionString).toContain('test-db');
    });

    it('should get PostgreSQL server by id', () => {
      const created = service.createPostgreSQLServer({
        serverName: 'test-db-get',
        location: 'germanywestcentral',
        tier: 'GeneralPurpose',
        version: '16',
        vCores: 4,
        storageGB: 128,
        backupRetentionDays: 7,
        geoRedundantBackup: false,
        highAvailability: { mode: 'Disabled' },
        readReplicas: [],
        sslEnforcement: true,
        firewallRules: [],
        maintenanceWindow: { dayOfWeek: 0, startHour: 2, startMinute: 0 },
      });

      const retrieved = service.getPostgreSQLServer(created.serverId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.serverName).toBe('test-db-get');
    });

    it('should get all PostgreSQL servers', () => {
      const servers = service.getAllPostgreSQLServers();
      expect(Array.isArray(servers)).toBe(true);
      expect(servers.length).toBeGreaterThan(0);
    });

    it('should add read replica', () => {
      const server = service.createPostgreSQLServer({
        serverName: 'test-db-replica',
        location: 'germanywestcentral',
        tier: 'GeneralPurpose',
        version: '16',
        vCores: 4,
        storageGB: 128,
        backupRetentionDays: 7,
        geoRedundantBackup: false,
        highAvailability: { mode: 'Disabled' },
        readReplicas: [],
        sslEnforcement: true,
        firewallRules: [],
        maintenanceWindow: { dayOfWeek: 0, startHour: 2, startMinute: 0 },
      });

      const replica = service.addReadReplica(server.serverId, {
        name: 'test-replica',
        location: 'westeurope',
        replicationState: 'Active',
        replicationLag: 5,
      });

      expect(replica).toBeDefined();
      expect(replica?.name).toBe('test-replica');
    });

    it('should return undefined when adding replica to non-existent server', () => {
      const replica = service.addReadReplica('non-existent', {
        name: 'test',
        location: 'westeurope',
        replicationState: 'Active',
        replicationLag: 5,
      });
      expect(replica).toBeUndefined();
    });

    it('should get replication status', () => {
      const server = service.createPostgreSQLServer({
        serverName: 'test-db-repl-status',
        location: 'germanywestcentral',
        tier: 'GeneralPurpose',
        version: '16',
        vCores: 4,
        storageGB: 128,
        backupRetentionDays: 7,
        geoRedundantBackup: false,
        highAvailability: { mode: 'Disabled' },
        readReplicas: [],
        sslEnforcement: true,
        firewallRules: [],
        maintenanceWindow: { dayOfWeek: 0, startHour: 2, startMinute: 0 },
      });

      service.addReadReplica(server.serverId, {
        name: 'replica',
        location: 'westeurope',
        replicationState: 'Active',
        replicationLag: 2,
      });

      const status = service.getReplicationStatus(server.serverId);
      expect(status).toBeDefined();
      expect(status?.healthy).toBe(true);
      expect(status?.replicas.length).toBe(1);
    });

    it('should return undefined for replication status of non-existent server', () => {
      const status = service.getReplicationStatus('non-existent');
      expect(status).toBeUndefined();
    });

    it('should configure high availability', () => {
      const server = service.createPostgreSQLServer({
        serverName: 'test-db-ha',
        location: 'germanywestcentral',
        tier: 'GeneralPurpose',
        version: '16',
        vCores: 4,
        storageGB: 128,
        backupRetentionDays: 7,
        geoRedundantBackup: false,
        highAvailability: { mode: 'Disabled' },
        readReplicas: [],
        sslEnforcement: true,
        firewallRules: [],
        maintenanceWindow: { dayOfWeek: 0, startHour: 2, startMinute: 0 },
      });

      const result = service.configureHighAvailability(server.serverId, 'ZoneRedundant');
      expect(result).toBe(true);
    });

    it('should return false when configuring HA for non-existent server', () => {
      const result = service.configureHighAvailability('non-existent', 'ZoneRedundant');
      expect(result).toBe(false);
    });
  });

  describe('Redis Cache', () => {
    it('should create Redis cache', () => {
      const cache = service.createRedisCache({
        name: 'test-redis',
        location: 'germanywestcentral',
        sku: 'Standard',
        capacity: 1,
        enableNonSslPort: false,
        minimumTlsVersion: '1.2',
        redisVersion: '6',
        maxMemoryPolicy: 'volatile-lru',
        firewallRules: [],
      });

      expect(cache.id).toBeDefined();
      expect(cache.connectionString).toContain('test-redis');
      expect(cache.primaryKey).toBeDefined();
      expect(cache.secondaryKey).toBeDefined();
    });

    it('should get Redis cache by id', () => {
      const created = service.createRedisCache({
        name: 'test-redis-get',
        location: 'germanywestcentral',
        sku: 'Standard',
        capacity: 1,
        enableNonSslPort: false,
        minimumTlsVersion: '1.2',
        redisVersion: '6',
        maxMemoryPolicy: 'volatile-lru',
        firewallRules: [],
      });

      const retrieved = service.getRedisCache(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-redis-get');
    });

    it('should get all Redis caches', () => {
      const caches = service.getAllRedisCaches();
      expect(Array.isArray(caches)).toBe(true);
      expect(caches.length).toBeGreaterThan(0);
    });

    it('should configure geo-replication for Premium cache', () => {
      const cache = service.createRedisCache({
        name: 'test-redis-geo',
        location: 'germanywestcentral',
        sku: 'Premium',
        capacity: 1,
        enableNonSslPort: false,
        minimumTlsVersion: '1.2',
        redisVersion: '6',
        maxMemoryPolicy: 'volatile-lru',
        firewallRules: [],
      });

      const result = service.configureGeoReplication(cache.id, 'westeurope');
      expect(result).toBe(true);

      const updated = service.getRedisCache(cache.id);
      expect(updated?.geoReplication).toBeDefined();
      expect(updated?.geoReplication?.linkedCacheLocation).toBe('westeurope');
    });

    it('should return false when configuring geo-replication for non-Premium cache', () => {
      const cache = service.createRedisCache({
        name: 'test-redis-standard',
        location: 'germanywestcentral',
        sku: 'Standard',
        capacity: 1,
        enableNonSslPort: false,
        minimumTlsVersion: '1.2',
        redisVersion: '6',
        maxMemoryPolicy: 'volatile-lru',
        firewallRules: [],
      });

      const result = service.configureGeoReplication(cache.id, 'westeurope');
      expect(result).toBe(false);
    });

    it('should regenerate Redis key', () => {
      const cache = service.createRedisCache({
        name: 'test-redis-regen',
        location: 'germanywestcentral',
        sku: 'Standard',
        capacity: 1,
        enableNonSslPort: false,
        minimumTlsVersion: '1.2',
        redisVersion: '6',
        maxMemoryPolicy: 'volatile-lru',
        firewallRules: [],
      });

      const originalKey = cache.primaryKey;
      const newKey = service.regenerateRedisKey(cache.id, 'primary');

      expect(newKey).toBeDefined();
      expect(newKey).not.toBe(originalKey);
    });

    it('should return undefined when regenerating key for non-existent cache', () => {
      const newKey = service.regenerateRedisKey('non-existent', 'primary');
      expect(newKey).toBeUndefined();
    });
  });

  describe('Blob Storage', () => {
    it('should create blob storage', () => {
      const storage = service.createBlobStorage({
        accountName: 'teststorage',
        location: 'germanywestcentral',
        accountKind: 'StorageV2',
        sku: 'Standard_LRS',
        accessTier: 'Hot',
        containers: [],
        lifecycleRules: [],
        corsRules: [],
        encryption: { enabled: true, keySource: 'Microsoft.Storage' },
        networkRules: { defaultAction: 'Allow', ipRules: [], virtualNetworkRules: [] },
        softDelete: { enabled: false, retentionDays: 0 },
        versioning: false,
      });

      expect(storage.accountId).toBeDefined();
      expect(storage.connectionString).toContain('teststorage');
      expect(storage.primaryEndpoint).toContain('teststorage.blob.core.windows.net');
    });

    it('should create storage with geo-redundant SKU and secondary endpoint', () => {
      const storage = service.createBlobStorage({
        accountName: 'teststoragegrs',
        location: 'germanywestcentral',
        accountKind: 'StorageV2',
        sku: 'Standard_RAGRS',
        accessTier: 'Hot',
        containers: [],
        lifecycleRules: [],
        corsRules: [],
        encryption: { enabled: true, keySource: 'Microsoft.Storage' },
        networkRules: { defaultAction: 'Allow', ipRules: [], virtualNetworkRules: [] },
        softDelete: { enabled: false, retentionDays: 0 },
        versioning: false,
      });

      expect(storage.secondaryEndpoint).toBeDefined();
      expect(storage.secondaryEndpoint).toContain('-secondary');
    });

    it('should get blob storage by id', () => {
      const created = service.createBlobStorage({
        accountName: 'teststorageget',
        location: 'germanywestcentral',
        accountKind: 'StorageV2',
        sku: 'Standard_LRS',
        accessTier: 'Hot',
        containers: [],
        lifecycleRules: [],
        corsRules: [],
        encryption: { enabled: true, keySource: 'Microsoft.Storage' },
        networkRules: { defaultAction: 'Allow', ipRules: [], virtualNetworkRules: [] },
        softDelete: { enabled: false, retentionDays: 0 },
        versioning: false,
      });

      const retrieved = service.getBlobStorage(created.accountId);
      expect(retrieved).toBeDefined();
      expect(retrieved?.accountName).toBe('teststorageget');
    });

    it('should get all blob storages', () => {
      const storages = service.getAllBlobStorages();
      expect(Array.isArray(storages)).toBe(true);
      expect(storages.length).toBeGreaterThan(0);
    });

    it('should create container', () => {
      const storage = service.createBlobStorage({
        accountName: 'teststoragecontainer',
        location: 'germanywestcentral',
        accountKind: 'StorageV2',
        sku: 'Standard_LRS',
        accessTier: 'Hot',
        containers: [],
        lifecycleRules: [],
        corsRules: [],
        encryption: { enabled: true, keySource: 'Microsoft.Storage' },
        networkRules: { defaultAction: 'Allow', ipRules: [], virtualNetworkRules: [] },
        softDelete: { enabled: false, retentionDays: 0 },
        versioning: false,
      });

      const result = service.createContainer(storage.accountId, {
        name: 'test-container',
        publicAccess: 'None',
        metadata: { purpose: 'testing' },
      });

      expect(result).toBe(true);
    });

    it('should return false when creating container in non-existent storage', () => {
      const result = service.createContainer('non-existent', {
        name: 'test',
        publicAccess: 'None',
        metadata: {},
      });
      expect(result).toBe(false);
    });

    it('should add lifecycle rule', () => {
      const storage = service.createBlobStorage({
        accountName: 'teststoragelifecycle',
        location: 'germanywestcentral',
        accountKind: 'StorageV2',
        sku: 'Standard_LRS',
        accessTier: 'Hot',
        containers: [],
        lifecycleRules: [],
        corsRules: [],
        encryption: { enabled: true, keySource: 'Microsoft.Storage' },
        networkRules: { defaultAction: 'Allow', ipRules: [], virtualNetworkRules: [] },
        softDelete: { enabled: false, retentionDays: 0 },
        versioning: false,
      });

      const result = service.addLifecycleRule(storage.accountId, {
        name: 'archive-old',
        enabled: true,
        type: 'Lifecycle',
        definition: {
          filters: { blobTypes: ['blockBlob'] },
          actions: {
            baseBlob: { tierToArchive: { daysAfterModificationGreaterThan: 90 } },
          },
        },
      });

      expect(result).toBe(true);
    });

    it('should configure soft delete', () => {
      const storage = service.createBlobStorage({
        accountName: 'teststoragesoftdelete',
        location: 'germanywestcentral',
        accountKind: 'StorageV2',
        sku: 'Standard_LRS',
        accessTier: 'Hot',
        containers: [],
        lifecycleRules: [],
        corsRules: [],
        encryption: { enabled: true, keySource: 'Microsoft.Storage' },
        networkRules: { defaultAction: 'Allow', ipRules: [], virtualNetworkRules: [] },
        softDelete: { enabled: false, retentionDays: 0 },
        versioning: false,
      });

      const result = service.configureSoftDelete(storage.accountId, true, 30);
      expect(result).toBe(true);

      const updated = service.getBlobStorage(storage.accountId);
      expect(updated?.softDelete.enabled).toBe(true);
      expect(updated?.softDelete.retentionDays).toBe(30);
    });
  });

  describe('Disaster Recovery', () => {
    it('should create disaster recovery plan', () => {
      const plan = service.createDisasterRecoveryPlan({
        name: 'test-dr-plan',
        primaryRegion: 'germanywestcentral',
        secondaryRegion: 'westeurope',
        rpo: 15,
        rto: 60,
        failoverType: 'Manual',
        components: [],
        testSchedule: {
          frequency: 'Quarterly',
          nextTest: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        },
        runbooks: [],
        status: 'Active',
      });

      expect(plan.id).toBeDefined();
      expect(plan.name).toBe('test-dr-plan');
    });

    it('should get disaster recovery plan by id', () => {
      const created = service.createDisasterRecoveryPlan({
        name: 'test-dr-get',
        primaryRegion: 'germanywestcentral',
        secondaryRegion: 'westeurope',
        rpo: 15,
        rto: 60,
        failoverType: 'Manual',
        components: [],
        testSchedule: { frequency: 'Quarterly', nextTest: new Date() },
        runbooks: [],
        status: 'Active',
      });

      const retrieved = service.getDisasterRecoveryPlan(created.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('test-dr-get');
    });

    it('should get all disaster recovery plans', () => {
      const plans = service.getAllDisasterRecoveryPlans();
      expect(Array.isArray(plans)).toBe(true);
      expect(plans.length).toBeGreaterThan(0);
    });

    it('should initiate failover', () => {
      const plan = service.createDisasterRecoveryPlan({
        name: 'test-dr-failover',
        primaryRegion: 'germanywestcentral',
        secondaryRegion: 'westeurope',
        rpo: 15,
        rto: 60,
        failoverType: 'Manual',
        components: [
          {
            name: 'Database',
            type: 'Database',
            primaryResource: 'primary-db',
            secondaryResource: 'secondary-db',
            replicationType: 'Asynchronous',
            failoverPriority: 1,
          },
        ],
        testSchedule: { frequency: 'Quarterly', nextTest: new Date() },
        runbooks: [],
        status: 'Active',
      });

      const result = service.initiateFailover(plan.id);
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.steps.length).toBeGreaterThan(0);
    });

    it('should return undefined when initiating failover for non-existent plan', () => {
      const result = service.initiateFailover('non-existent');
      expect(result).toBeUndefined();
    });

    it('should initiate failback', () => {
      const plan = service.createDisasterRecoveryPlan({
        name: 'test-dr-failback',
        primaryRegion: 'germanywestcentral',
        secondaryRegion: 'westeurope',
        rpo: 15,
        rto: 60,
        failoverType: 'Manual',
        components: [
          {
            name: 'Database',
            type: 'Database',
            primaryResource: 'primary-db',
            secondaryResource: 'secondary-db',
            replicationType: 'Asynchronous',
            failoverPriority: 1,
          },
        ],
        testSchedule: { frequency: 'Quarterly', nextTest: new Date() },
        runbooks: [],
        status: 'Active',
      });

      service.initiateFailover(plan.id);
      const result = service.initiateFailback(plan.id);

      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
    });

    it('should return undefined when initiating failback without prior failover', () => {
      const plan = service.createDisasterRecoveryPlan({
        name: 'test-dr-failback-no-failover',
        primaryRegion: 'germanywestcentral',
        secondaryRegion: 'westeurope',
        rpo: 15,
        rto: 60,
        failoverType: 'Manual',
        components: [],
        testSchedule: { frequency: 'Quarterly', nextTest: new Date() },
        runbooks: [],
        status: 'Active',
      });

      const result = service.initiateFailback(plan.id);
      expect(result).toBeUndefined();
    });

    it('should test disaster recovery', () => {
      const plan = service.createDisasterRecoveryPlan({
        name: 'test-dr-test',
        primaryRegion: 'germanywestcentral',
        secondaryRegion: 'westeurope',
        rpo: 15,
        rto: 60,
        failoverType: 'Manual',
        components: [
          {
            name: 'Database',
            type: 'Database',
            primaryResource: 'primary-db',
            secondaryResource: 'secondary-db',
            replicationType: 'Asynchronous',
            failoverPriority: 1,
          },
        ],
        testSchedule: { frequency: 'Quarterly', nextTest: new Date() },
        runbooks: [],
        status: 'Active',
      });

      const result = service.testDisasterRecovery(plan.id);
      expect(result).toBeDefined();
      expect(result?.success).toBe(true);
      expect(result?.report.length).toBeGreaterThan(0);
    });

    it('should return undefined when testing non-existent plan', () => {
      const result = service.testDisasterRecovery('non-existent');
      expect(result).toBeUndefined();
    });
  });

  describe('Cost Analysis', () => {
    it('should analyze costs for period', () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const analysis = service.analyzeCosts(startDate, endDate);

      expect(analysis.period.start).toEqual(startDate);
      expect(analysis.period.end).toEqual(endDate);
      expect(analysis.totalCost).toBeGreaterThan(0);
      expect(analysis.currency).toBe('EUR');
      expect(analysis.breakdown.length).toBeGreaterThan(0);
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });

    it('should get optimization recommendations', () => {
      const recommendations = service.getOptimizationRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].projectedSavings).toBeGreaterThan(0);
    });

    it('should include budget status in analysis', () => {
      const analysis = service.analyzeCosts(
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date(),
      );

      expect(analysis.budgetStatus).toBeDefined();
      expect(analysis.budgetStatus.budgetAmount).toBeGreaterThan(0);
      expect(analysis.budgetStatus.percentUsed).toBeGreaterThan(0);
    });

    it('should include forecast in analysis', () => {
      const analysis = service.analyzeCosts(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date(),
      );

      expect(analysis.forecast).toBeDefined();
      expect(analysis.forecast.projectedCost).toBeGreaterThan(0);
      expect(analysis.forecast.confidenceLevel).toBeGreaterThan(0);
    });
  });

  describe('Deployment Scripts', () => {
    it('should generate Terraform script', () => {
      const script = service.generateTerraformScript(['postgresql', 'redis', 'storage']);

      expect(script.id).toBeDefined();
      expect(script.type).toBe('Terraform');
      expect(script.resources).toContain('postgresql');
      expect(script.parameters).toBeDefined();
      expect(script.outputs).toBeDefined();
    });

    it('should generate Bicep script', () => {
      const script = service.generateBicepScript(['postgresql', 'redis']);

      expect(script.id).toBeDefined();
      expect(script.type).toBe('Bicep');
      expect(script.resources.length).toBe(2);
    });

    it('should generate Docker Compose for Azure', () => {
      const compose = service.generateDockerComposeForAzure();

      expect(compose).toBeDefined();
      const parsed = JSON.parse(compose);
      expect(parsed.version).toBe('3.8');
      expect(parsed.services.api).toBeDefined();
    });

    it('should get deployment script by id', () => {
      const created = service.generateTerraformScript(['postgresql']);
      const retrieved = service.getDeploymentScript(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.type).toBe('Terraform');
    });

    it('should get all deployment scripts', () => {
      service.generateTerraformScript(['test']);
      const scripts = service.getAllDeploymentScripts();

      expect(Array.isArray(scripts)).toBe(true);
      expect(scripts.length).toBeGreaterThan(0);
    });
  });

  describe('Health Monitoring', () => {
    it('should perform health check', async () => {
      const results = await service.performHealthCheck();

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].status).toBeDefined();
      expect(results[0].latency).toBeGreaterThan(0);
    });

    it('should get health history', async () => {
      await service.performHealthCheck();
      const history = service.getHealthHistory();

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should filter health history by service', async () => {
      await service.performHealthCheck();
      const history = service.getHealthHistory('PostgreSQL');

      expect(history.every(h => h.service === 'PostgreSQL')).toBe(true);
    });

    it('should limit health history results', async () => {
      await service.performHealthCheck();
      await service.performHealthCheck();
      const history = service.getHealthHistory(undefined, 5);

      expect(history.length).toBeLessThanOrEqual(5);
    });

    it('should get infrastructure status', () => {
      const status = service.getInfrastructureStatus();

      expect(status.regions).toBeGreaterThan(0);
      expect(status.trafficManagers).toBeGreaterThan(0);
      expect(status.databases).toBeGreaterThan(0);
      expect(status.redisCaches).toBeGreaterThan(0);
      expect(status.storageAccounts).toBeGreaterThan(0);
      expect(status.overallHealth).toBeDefined();
    });
  });

  describe('Default Infrastructure Initialization', () => {
    it('should initialize default traffic manager', () => {
      const profiles = service.getAllTrafficManagerProfiles();
      const defaultProfile = profiles.find(p => p.name === 'documentiulia-tm');

      expect(defaultProfile).toBeDefined();
      expect(defaultProfile?.endpoints.length).toBe(2);
    });

    it('should initialize default PostgreSQL server', () => {
      const servers = service.getAllPostgreSQLServers();
      const defaultServer = servers.find(s => s.serverName === 'documentiulia-db');

      expect(defaultServer).toBeDefined();
      expect(defaultServer?.tier).toBe('GeneralPurpose');
      expect(defaultServer?.highAvailability.mode).toBe('ZoneRedundant');
    });

    it('should initialize default Redis cache', () => {
      const caches = service.getAllRedisCaches();
      const defaultCache = caches.find(c => c.name === 'documentiulia-cache');

      expect(defaultCache).toBeDefined();
      expect(defaultCache?.sku).toBe('Premium');
    });

    it('should initialize default blob storage', () => {
      const storages = service.getAllBlobStorages();
      const defaultStorage = storages.find(s => s.accountName === 'documentiuliadocs');

      expect(defaultStorage).toBeDefined();
      expect(defaultStorage?.containers.length).toBe(4);
      expect(defaultStorage?.lifecycleRules.length).toBeGreaterThan(0);
    });

    it('should initialize default disaster recovery plan', () => {
      const plans = service.getAllDisasterRecoveryPlans();
      const defaultPlan = plans.find(p => p.name === 'DocumentIulia DR Plan');

      expect(defaultPlan).toBeDefined();
      expect(defaultPlan?.components.length).toBe(3);
      expect(defaultPlan?.runbooks.length).toBeGreaterThan(0);
    });
  });
});
