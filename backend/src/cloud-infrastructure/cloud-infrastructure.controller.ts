import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  CloudInfrastructureService,
  TrafficManagerProfile,
  TrafficManagerEndpoint,
  PostgreSQLConfig,
  PostgreSQLReadReplica,
  RedisCacheConfig,
  BlobStorageConfig,
  BlobContainer,
  LifecycleRule,
  DisasterRecoveryPlan,
} from './cloud-infrastructure.service';

@Controller('cloud-infrastructure')
export class CloudInfrastructureController {
  private readonly logger = new Logger(CloudInfrastructureController.name);

  constructor(private readonly cloudService: CloudInfrastructureService) {}

  // ============================================
  // REGION ENDPOINTS
  // ============================================

  @Get('regions')
  getAllRegions() {
    return this.cloudService.getAllRegions();
  }

  @Get('regions/gdpr-compliant')
  getGDPRCompliantRegions() {
    return this.cloudService.getGDPRCompliantRegions();
  }

  @Get('regions/optimal-for-romania')
  getOptimalRegionForRomania() {
    return this.cloudService.getOptimalRegionForRomania();
  }

  @Get('regions/by-latency')
  getRegionsByLatency(@Query('maxLatency') maxLatency: string) {
    return this.cloudService.getRegionsByLatency(parseInt(maxLatency, 10) || 50);
  }

  @Get('regions/:regionId')
  getRegion(@Param('regionId') regionId: string) {
    return this.cloudService.getRegion(regionId);
  }

  // ============================================
  // TRAFFIC MANAGER ENDPOINTS
  // ============================================

  @Post('traffic-manager')
  createTrafficManagerProfile(@Body() profile: Omit<TrafficManagerProfile, 'id'>) {
    return this.cloudService.createTrafficManagerProfile(profile);
  }

  @Get('traffic-manager')
  getAllTrafficManagerProfiles() {
    return this.cloudService.getAllTrafficManagerProfiles();
  }

  @Get('traffic-manager/:id')
  getTrafficManagerProfile(@Param('id') id: string) {
    return this.cloudService.getTrafficManagerProfile(id);
  }

  @Post('traffic-manager/:profileId/endpoints')
  addTrafficManagerEndpoint(
    @Param('profileId') profileId: string,
    @Body() endpoint: Omit<TrafficManagerEndpoint, 'id'>,
  ) {
    return this.cloudService.addTrafficManagerEndpoint(profileId, endpoint);
  }

  @Delete('traffic-manager/:profileId/endpoints/:endpointId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTrafficManagerEndpoint(
    @Param('profileId') profileId: string,
    @Param('endpointId') endpointId: string,
  ) {
    this.cloudService.removeTrafficManagerEndpoint(profileId, endpointId);
  }

  @Put('traffic-manager/:profileId/endpoints/:endpointId/health')
  updateEndpointHealth(
    @Param('profileId') profileId: string,
    @Param('endpointId') endpointId: string,
    @Body('status') status: TrafficManagerEndpoint['healthStatus'],
  ) {
    return { success: this.cloudService.updateEndpointHealth(profileId, endpointId, status) };
  }

  @Post('traffic-manager/:profileId/failover')
  simulateFailover(@Param('profileId') profileId: string) {
    return this.cloudService.simulateFailover(profileId);
  }

  // ============================================
  // POSTGRESQL ENDPOINTS
  // ============================================

  @Post('postgresql')
  createPostgreSQLServer(@Body() config: Omit<PostgreSQLConfig, 'serverId' | 'connectionString'>) {
    return this.cloudService.createPostgreSQLServer(config);
  }

  @Get('postgresql')
  getAllPostgreSQLServers() {
    return this.cloudService.getAllPostgreSQLServers();
  }

  @Get('postgresql/:serverId')
  getPostgreSQLServer(@Param('serverId') serverId: string) {
    return this.cloudService.getPostgreSQLServer(serverId);
  }

  @Post('postgresql/:serverId/replicas')
  addReadReplica(
    @Param('serverId') serverId: string,
    @Body() replica: Omit<PostgreSQLReadReplica, 'id'>,
  ) {
    return this.cloudService.addReadReplica(serverId, replica);
  }

  @Get('postgresql/:serverId/replication-status')
  getReplicationStatus(@Param('serverId') serverId: string) {
    return this.cloudService.getReplicationStatus(serverId);
  }

  @Put('postgresql/:serverId/high-availability')
  configureHighAvailability(
    @Param('serverId') serverId: string,
    @Body('mode') mode: PostgreSQLConfig['highAvailability']['mode'],
  ) {
    return { success: this.cloudService.configureHighAvailability(serverId, mode) };
  }

  // ============================================
  // REDIS CACHE ENDPOINTS
  // ============================================

  @Post('redis')
  createRedisCache(@Body() config: Omit<RedisCacheConfig, 'id' | 'connectionString' | 'primaryKey' | 'secondaryKey'>) {
    return this.cloudService.createRedisCache(config);
  }

  @Get('redis')
  getAllRedisCaches() {
    return this.cloudService.getAllRedisCaches();
  }

  @Get('redis/:id')
  getRedisCache(@Param('id') id: string) {
    return this.cloudService.getRedisCache(id);
  }

  @Post('redis/:id/geo-replication')
  configureGeoReplication(
    @Param('id') id: string,
    @Body('secondaryRegion') secondaryRegion: string,
  ) {
    return { success: this.cloudService.configureGeoReplication(id, secondaryRegion) };
  }

  @Post('redis/:id/regenerate-key')
  regenerateRedisKey(
    @Param('id') id: string,
    @Body('keyType') keyType: 'primary' | 'secondary',
  ) {
    const newKey = this.cloudService.regenerateRedisKey(id, keyType);
    return { success: !!newKey, keyType };
  }

  // ============================================
  // BLOB STORAGE ENDPOINTS
  // ============================================

  @Post('storage')
  createBlobStorage(@Body() config: Omit<BlobStorageConfig, 'accountId' | 'connectionString' | 'primaryEndpoint' | 'secondaryEndpoint'>) {
    return this.cloudService.createBlobStorage(config);
  }

  @Get('storage')
  getAllBlobStorages() {
    return this.cloudService.getAllBlobStorages();
  }

  @Get('storage/:accountId')
  getBlobStorage(@Param('accountId') accountId: string) {
    return this.cloudService.getBlobStorage(accountId);
  }

  @Post('storage/:accountId/containers')
  createContainer(
    @Param('accountId') accountId: string,
    @Body() container: BlobContainer,
  ) {
    return { success: this.cloudService.createContainer(accountId, container) };
  }

  @Post('storage/:accountId/lifecycle-rules')
  addLifecycleRule(
    @Param('accountId') accountId: string,
    @Body() rule: LifecycleRule,
  ) {
    return { success: this.cloudService.addLifecycleRule(accountId, rule) };
  }

  @Put('storage/:accountId/soft-delete')
  configureSoftDelete(
    @Param('accountId') accountId: string,
    @Body('enabled') enabled: boolean,
    @Body('retentionDays') retentionDays: number,
  ) {
    return { success: this.cloudService.configureSoftDelete(accountId, enabled, retentionDays) };
  }

  // ============================================
  // DISASTER RECOVERY ENDPOINTS
  // ============================================

  @Post('disaster-recovery')
  createDisasterRecoveryPlan(@Body() plan: Omit<DisasterRecoveryPlan, 'id'>) {
    return this.cloudService.createDisasterRecoveryPlan(plan);
  }

  @Get('disaster-recovery')
  getAllDisasterRecoveryPlans() {
    return this.cloudService.getAllDisasterRecoveryPlans();
  }

  @Get('disaster-recovery/:id')
  getDisasterRecoveryPlan(@Param('id') id: string) {
    return this.cloudService.getDisasterRecoveryPlan(id);
  }

  @Post('disaster-recovery/:id/failover')
  initiateFailover(@Param('id') id: string) {
    return this.cloudService.initiateFailover(id);
  }

  @Post('disaster-recovery/:id/failback')
  initiateFailback(@Param('id') id: string) {
    return this.cloudService.initiateFailback(id);
  }

  @Post('disaster-recovery/:id/test')
  testDisasterRecovery(@Param('id') id: string) {
    return this.cloudService.testDisasterRecovery(id);
  }

  // ============================================
  // COST ANALYSIS ENDPOINTS
  // ============================================

  @Get('costs/analysis')
  analyzeCosts(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = new Date(endDate || Date.now());
    return this.cloudService.analyzeCosts(start, end);
  }

  @Get('costs/recommendations')
  getOptimizationRecommendations() {
    return this.cloudService.getOptimizationRecommendations();
  }

  // ============================================
  // DEPLOYMENT SCRIPTS ENDPOINTS
  // ============================================

  @Post('deployment/terraform')
  generateTerraformScript(@Body('resources') resources: string[]) {
    return this.cloudService.generateTerraformScript(resources);
  }

  @Post('deployment/bicep')
  generateBicepScript(@Body('resources') resources: string[]) {
    return this.cloudService.generateBicepScript(resources);
  }

  @Get('deployment/docker-compose')
  generateDockerCompose() {
    return { compose: this.cloudService.generateDockerComposeForAzure() };
  }

  @Get('deployment/scripts')
  getAllDeploymentScripts() {
    return this.cloudService.getAllDeploymentScripts();
  }

  @Get('deployment/scripts/:id')
  getDeploymentScript(@Param('id') id: string) {
    return this.cloudService.getDeploymentScript(id);
  }

  // ============================================
  // HEALTH & STATUS ENDPOINTS
  // ============================================

  @Get('health')
  async performHealthCheck() {
    return this.cloudService.performHealthCheck();
  }

  @Get('health/history')
  getHealthHistory(
    @Query('service') service?: string,
    @Query('limit') limit?: string,
  ) {
    return this.cloudService.getHealthHistory(service, limit ? parseInt(limit, 10) : 100);
  }

  @Get('status')
  getInfrastructureStatus() {
    return this.cloudService.getInfrastructureStatus();
  }
}
