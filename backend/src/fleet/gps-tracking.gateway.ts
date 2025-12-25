import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GpsTrackingService, GpsPositionDto } from './gps-tracking.service';
import { Logger } from '@nestjs/common';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  subscribedVehicles?: Set<string>;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/gps',
})
export class GpsTrackingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GpsTrackingGateway.name);
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();

  constructor(private readonly gpsTrackingService: GpsTrackingService) {}

  afterInit() {
    this.logger.log('GPS Tracking WebSocket Gateway initialized');
  }

  handleConnection(client: AuthenticatedSocket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.subscribedVehicles = new Set();
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  // Client authentication
  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @MessageBody() data: { userId: string; token?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    // In production, validate the token here
    client.userId = data.userId;
    this.connectedClients.set(client.id, client);

    this.logger.log(`Client ${client.id} authenticated as user ${data.userId}`);

    return { event: 'authenticated', data: { success: true } };
  }

  // Subscribe to vehicle updates
  @SubscribeMessage('subscribeVehicle')
  async handleSubscribeVehicle(
    @MessageBody() data: { vehicleId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    client.subscribedVehicles?.add(data.vehicleId);
    client.join(`vehicle:${data.vehicleId}`);

    // Send current position immediately
    const position = await this.gpsTrackingService.getLatestPosition(data.vehicleId);
    if (position) {
      client.emit('position', position);
    }

    this.logger.log(`Client ${client.id} subscribed to vehicle ${data.vehicleId}`);

    return { event: 'subscribed', data: { vehicleId: data.vehicleId } };
  }

  // Unsubscribe from vehicle updates
  @SubscribeMessage('unsubscribeVehicle')
  handleUnsubscribeVehicle(
    @MessageBody() data: { vehicleId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    client.subscribedVehicles?.delete(data.vehicleId);
    client.leave(`vehicle:${data.vehicleId}`);

    this.logger.log(`Client ${client.id} unsubscribed from vehicle ${data.vehicleId}`);

    return { event: 'unsubscribed', data: { vehicleId: data.vehicleId } };
  }

  // Subscribe to all fleet updates
  @SubscribeMessage('subscribeFleet')
  async handleSubscribeFleet(
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      return { event: 'error', data: { message: 'Not authenticated' } };
    }

    client.join(`fleet:${client.userId}`);

    // Send all current positions
    const vehicles = await this.gpsTrackingService.getAllVehiclePositions(client.userId);
    client.emit('fleetPositions', { vehicles });

    this.logger.log(`Client ${client.id} subscribed to fleet updates`);

    return { event: 'subscribed', data: { type: 'fleet' } };
  }

  // Receive GPS position from driver app
  @SubscribeMessage('updatePosition')
  async handleUpdatePosition(
    @MessageBody() data: GpsPositionDto,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      await this.gpsTrackingService.updatePosition(data);

      // Broadcast to all subscribers of this vehicle
      this.server.to(`vehicle:${data.vehicleId}`).emit('position', {
        ...data,
        timestamp: new Date(),
      });

      // Also broadcast to fleet subscribers
      // We need to find which user owns this vehicle
      // For now, broadcast to all fleet rooms
      this.server.emit('vehiclePositionUpdate', {
        vehicleId: data.vehicleId,
        latitude: data.latitude,
        longitude: data.longitude,
        speed: data.speed,
        heading: data.heading,
        timestamp: new Date(),
      });

      return { event: 'positionUpdated', data: { success: true } };
    } catch (error) {
      this.logger.error(`Failed to update position: ${error.message}`);
      return { event: 'error', data: { message: error.message } };
    }
  }

  // Batch position updates (for offline sync)
  @SubscribeMessage('batchUpdatePositions')
  async handleBatchUpdate(
    @MessageBody() data: { positions: GpsPositionDto[] },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const result = await this.gpsTrackingService.batchUpdatePositions(data.positions);

      // Broadcast latest position for each vehicle
      const vehicleIds = [...new Set(data.positions.map(p => p.vehicleId))];
      for (const vehicleId of vehicleIds) {
        const latest = data.positions
          .filter(p => p.vehicleId === vehicleId)
          .sort((a, b) => {
            const timeA = a.recordedAt ? new Date(a.recordedAt).getTime() : 0;
            const timeB = b.recordedAt ? new Date(b.recordedAt).getTime() : 0;
            return timeB - timeA;
          })[0];

        if (latest) {
          this.server.to(`vehicle:${vehicleId}`).emit('position', {
            ...latest,
            timestamp: new Date(),
          });
        }
      }

      return { event: 'batchUpdated', data: result };
    } catch (error) {
      this.logger.error(`Failed to batch update positions: ${error.message}`);
      return { event: 'error', data: { message: error.message } };
    }
  }

  // Get vehicle position history
  @SubscribeMessage('getPositionHistory')
  async handleGetHistory(
    @MessageBody() data: { vehicleId: string; from?: string; to?: string; limit?: number },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const history = await this.gpsTrackingService.getPositionHistory(data.vehicleId, {
        from: data.from ? new Date(data.from) : undefined,
        to: data.to ? new Date(data.to) : undefined,
        limit: data.limit,
      });

      return { event: 'positionHistory', data: { vehicleId: data.vehicleId, positions: history } };
    } catch (error) {
      return { event: 'error', data: { message: error.message } };
    }
  }

  // Get route track
  @SubscribeMessage('getRouteTrack')
  async handleGetRouteTrack(
    @MessageBody() data: { routeId: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    try {
      const track = await this.gpsTrackingService.getRouteTrack(data.routeId);
      return { event: 'routeTrack', data: { routeId: data.routeId, ...track } };
    } catch (error) {
      return { event: 'error', data: { message: error.message } };
    }
  }

  // Public method to broadcast position updates
  broadcastPosition(vehicleId: string, position: GpsPositionDto) {
    this.server.to(`vehicle:${vehicleId}`).emit('position', {
      ...position,
      timestamp: new Date(),
    });
  }

  // Broadcast geofence alert
  broadcastGeofenceAlert(
    userId: string,
    alert: {
      geofenceId: string;
      geofenceName: string;
      vehicleId: string;
      licensePlate: string;
      eventType: 'ENTER' | 'EXIT';
      position: { lat: number; lng: number };
    },
  ) {
    this.server.to(`fleet:${userId}`).emit('geofenceAlert', {
      ...alert,
      timestamp: new Date(),
    });
  }
}
