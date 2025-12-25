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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Real-Time GPS Tracking Gateway
 * WebSocket server for live vehicle tracking in Munich delivery fleet
 * Supports: GPS updates, route progress, alerts, geofencing
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/fleet',
})
export class FleetGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FleetGateway.name);
  private connectedClients: Map<string, { socket: Socket; userId: string; role: string }> = new Map();
  private vehicleSubscriptions: Map<string, Set<string>> = new Map(); // vehicleId -> Set<socketId>

  constructor(private readonly jwtService: JwtService) {}

  afterInit() {
    this.logger.log('Fleet WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Client ${client.id} connected without auth token`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const userId = payload.sub || payload.userId;
      const role = payload.role || 'USER';

      this.connectedClients.set(client.id, { socket: client, userId, role });
      this.logger.log(`Client ${client.id} connected (user: ${userId}, role: ${role})`);

      // Send connection confirmation
      client.emit('connected', {
        message: 'Connected to Fleet tracking',
        clientId: client.id,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Connection auth failed: ${error.message}`);
      client.emit('error', { message: 'Invalid authentication' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    // Remove from all vehicle subscriptions
    for (const [vehicleId, subscribers] of this.vehicleSubscriptions) {
      subscribers.delete(client.id);
      if (subscribers.size === 0) {
        this.vehicleSubscriptions.delete(vehicleId);
      }
    }

    this.connectedClients.delete(client.id);
    this.logger.log(`Client ${client.id} disconnected`);
  }

  // =================== GPS TRACKING ===================

  /**
   * Subscribe to real-time GPS updates for specific vehicles
   */
  @SubscribeMessage('subscribe:vehicles')
  handleSubscribeVehicles(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { vehicleIds: string[] },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    for (const vehicleId of data.vehicleIds) {
      if (!this.vehicleSubscriptions.has(vehicleId)) {
        this.vehicleSubscriptions.set(vehicleId, new Set());
      }
      this.vehicleSubscriptions.get(vehicleId)!.add(client.id);
      client.join(`vehicle:${vehicleId}`);
    }

    this.logger.log(`Client ${client.id} subscribed to vehicles: ${data.vehicleIds.join(', ')}`);
    client.emit('subscribed', { vehicleIds: data.vehicleIds });
  }

  /**
   * Receive GPS update from driver app
   */
  @SubscribeMessage('gps:update')
  handleGpsUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      vehicleId: string;
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
      timestamp?: string;
    },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    const update = {
      vehicleId: data.vehicleId,
      location: {
        lat: data.latitude,
        lng: data.longitude,
        speed: data.speed || 0,
        heading: data.heading || 0,
        accuracy: data.accuracy || 10,
      },
      timestamp: data.timestamp || new Date().toISOString(),
      driverId: clientInfo.userId,
    };

    // Broadcast to all subscribers of this vehicle
    this.server.to(`vehicle:${data.vehicleId}`).emit('gps:position', update);

    // Check geofencing alerts
    this.checkGeofence(data.vehicleId, data.latitude, data.longitude);

    this.logger.debug(`GPS update for vehicle ${data.vehicleId}: ${data.latitude}, ${data.longitude}`);
  }

  /**
   * Broadcast vehicle location to all fleet dashboard clients
   */
  broadcastVehicleLocation(vehicleId: string, location: {
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
  }) {
    this.server.to(`vehicle:${vehicleId}`).emit('gps:position', {
      vehicleId,
      location,
      timestamp: new Date().toISOString(),
    });
  }

  // =================== ROUTE PROGRESS ===================

  /**
   * Subscribe to route progress updates
   */
  @SubscribeMessage('subscribe:route')
  handleSubscribeRoute(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { routeId: string },
  ) {
    client.join(`route:${data.routeId}`);
    this.logger.log(`Client ${client.id} subscribed to route: ${data.routeId}`);
    client.emit('subscribed:route', { routeId: data.routeId });
  }

  /**
   * Receive delivery stop update from driver
   */
  @SubscribeMessage('stop:update')
  handleStopUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      routeId: string;
      stopId: string;
      status: 'IN_PROGRESS' | 'DELIVERED' | 'FAILED' | 'ATTEMPTED';
      notes?: string;
      signature?: string; // Base64 signature image
      photo?: string; // Base64 proof of delivery photo
    },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    const update = {
      routeId: data.routeId,
      stopId: data.stopId,
      status: data.status,
      notes: data.notes,
      hasSignature: !!data.signature,
      hasPhoto: !!data.photo,
      timestamp: new Date().toISOString(),
      driverId: clientInfo.userId,
    };

    // Broadcast to route subscribers
    this.server.to(`route:${data.routeId}`).emit('stop:updated', update);

    // Also broadcast to fleet dashboard
    this.server.emit('fleet:stopUpdate', update);

    this.logger.log(`Stop ${data.stopId} updated to ${data.status}`);
  }

  /**
   * Broadcast route progress to all subscribers
   */
  broadcastRouteProgress(routeId: string, progress: {
    completedStops: number;
    totalStops: number;
    currentStopId?: string;
    eta?: string;
  }) {
    this.server.to(`route:${routeId}`).emit('route:progress', {
      routeId,
      ...progress,
      timestamp: new Date().toISOString(),
    });
  }

  // =================== ALERTS & NOTIFICATIONS ===================

  /**
   * Send alert to all connected dashboard clients
   */
  broadcastAlert(alert: {
    type: string;
    severity: string;
    alertId?: string;
    vehicleId?: string;
    routeId?: string;
    driverId?: string;
    message: string;
    data?: any;
  }) {
    const alertData = {
      id: `alert-${Date.now()}`,
      ...alert,
      timestamp: new Date().toISOString(),
    };

    // Send to all connected clients
    this.server.emit('fleet:alert', alertData);

    this.logger.warn(`Alert broadcast: ${alert.type} - ${alert.message}`);
  }

  /**
   * Send notification to specific user
   */
  sendNotificationToUser(userId: string, notification: {
    title: string;
    message: string;
    type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
    action?: { label: string; url: string };
  }) {
    for (const [socketId, clientInfo] of this.connectedClients) {
      if (clientInfo.userId === userId) {
        clientInfo.socket.emit('notification', {
          ...notification,
          id: `notif-${Date.now()}`,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  // =================== GEOFENCING ===================

  // Munich delivery zones (example coordinates)
  private readonly MUNICH_GEOFENCES = [
    {
      id: 'munich-city-center',
      name: 'Munich City Center',
      center: { lat: 48.1351, lng: 11.5820 },
      radiusKm: 5,
    },
    {
      id: 'munich-airport',
      name: 'Munich Airport',
      center: { lat: 48.3538, lng: 11.7861 },
      radiusKm: 3,
    },
    {
      id: 'munich-warehouse',
      name: 'Warehouse District',
      center: { lat: 48.1082, lng: 11.5553 },
      radiusKm: 2,
    },
  ];

  private checkGeofence(vehicleId: string, lat: number, lng: number) {
    for (const fence of this.MUNICH_GEOFENCES) {
      const distance = this.calculateDistance(lat, lng, fence.center.lat, fence.center.lng);

      // Check if vehicle just entered/exited a geofence
      if (distance <= fence.radiusKm) {
        this.server.to(`vehicle:${vehicleId}`).emit('geofence:entered', {
          vehicleId,
          geofence: fence,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLng = this.deg2rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // =================== DRIVER SOS ===================

  /**
   * Handle emergency SOS from driver
   */
  @SubscribeMessage('driver:sos')
  handleDriverSOS(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      vehicleId: string;
      latitude: number;
      longitude: number;
      type: 'ACCIDENT' | 'BREAKDOWN' | 'MEDICAL' | 'SECURITY' | 'OTHER';
      message?: string;
    },
  ) {
    const clientInfo = this.connectedClients.get(client.id);
    if (!clientInfo) return;

    this.broadcastAlert({
      type: 'SOS',
      severity: 'CRITICAL',
      vehicleId: data.vehicleId,
      driverId: clientInfo.userId,
      message: `EMERGENCY: ${data.type} reported at ${data.latitude.toFixed(4)}, ${data.longitude.toFixed(4)}`,
      data: {
        location: { lat: data.latitude, lng: data.longitude },
        sosType: data.type,
        driverMessage: data.message,
      },
    });

    // Acknowledge to driver
    client.emit('sos:acknowledged', {
      message: 'SOS received. Help is on the way.',
      timestamp: new Date().toISOString(),
    });
  }

  // =================== STATS ===================

  /**
   * Get current connection stats
   */
  getConnectionStats() {
    return {
      totalConnections: this.connectedClients.size,
      vehiclesBeingTracked: this.vehicleSubscriptions.size,
      timestamp: new Date().toISOString(),
    };
  }
}
