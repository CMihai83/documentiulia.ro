import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FleetService } from './fleet.service';
import { FleetGateway } from './fleet.gateway';
import { PrismaService } from '../prisma/prisma.service';
import { DriverMobileEnhancedService } from './driver-mobile-enhanced.service';
import { DriverNotificationsService, NotificationType } from './driver-notifications.service';

/**
 * Driver Mobile API Controller
 * Dedicated endpoints for driver mobile app
 * Supports: Route management, GPS tracking, delivery updates, SOS
 */
@ApiTags('Driver Mobile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('driver')
export class DriverMobileController {
  private readonly logger = new Logger(DriverMobileController.name);

  constructor(
    private readonly fleetService: FleetService,
    private readonly fleetGateway: FleetGateway,
    private readonly prisma: PrismaService,
    private readonly enhancedService: DriverMobileEnhancedService,
    private readonly notificationsService: DriverNotificationsService,
  ) {}

  // =================== DRIVER PROFILE ===================

  @Get('profile')
  @ApiOperation({ summary: 'Get driver profile and status' })
  @ApiResponse({ status: 200, description: 'Driver profile retrieved' })
  async getDriverProfile(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
      include: {
        timesheets: {
          where: { date: new Date() },
          take: 1,
        },
      },
    });

    if (!employee) {
      return {
        success: false,
        error: 'Driver profile not found',
      };
    }

    // Get today's route
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayRoute = await this.prisma.deliveryRoute.findFirst({
      where: {
        driverId: employee.id,
        routeDate: today,
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true, make: true, model: true } },
        stops: { orderBy: { stopOrder: 'asc' } },
      },
    });

    return {
      success: true,
      data: {
        employee: {
          id: employee.id,
          firstName: employee.firstName,
          lastName: employee.lastName,
          email: employee.email,
          position: employee.position,
        },
        todayTimesheet: employee.timesheets[0] || null,
        todayRoute: todayRoute ? {
          id: todayRoute.id,
          routeName: todayRoute.routeName,
          status: todayRoute.status,
          vehiclePlate: todayRoute.vehicle?.licensePlate,
          totalStops: todayRoute.stops.length,
          completedStops: todayRoute.stops.filter((s: any) => s.status === 'DELIVERED').length,
          pendingStops: todayRoute.stops.filter((s: any) => s.status === 'PENDING').length,
        } : null,
      },
    };
  }

  // =================== ROUTES ===================

  @Get('routes')
  @ApiOperation({ summary: 'Get assigned routes for driver' })
  @ApiResponse({ status: 200, description: 'Routes retrieved' })
  async getAssignedRoutes(
    @Request() req: any,
    @Query('date') date?: string,
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const routes = await this.prisma.deliveryRoute.findMany({
      where: {
        driverId: employee.id,
        routeDate: targetDate,
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true, make: true, model: true } },
        stops: {
          orderBy: { stopOrder: 'asc' },
        },
      },
      orderBy: { plannedStartTime: 'asc' },
    });

    return {
      success: true,
      data: routes.map(route => ({
        id: route.id,
        routeName: route.routeName,
        status: route.status,
        plannedStartTime: route.plannedStartTime,
        plannedEndTime: route.plannedEndTime,
        actualStartTime: route.actualStartTime,
        actualEndTime: route.actualEndTime,
        vehicle: route.vehicle,
        stops: route.stops.map(s => ({
          id: s.id,
          stopOrder: s.stopOrder,
          address: `${s.streetAddress}, ${s.postalCode} ${s.city}`,
          recipientName: s.recipientName,
          status: s.status,
          latitude: s.latitude,
          longitude: s.longitude,
        })),
        summary: {
          total: route.stops.length,
          pending: route.stops.filter((s: any) => s.status === 'PENDING').length,
          inProgress: route.stops.filter((s: any) => s.status === 'IN_PROGRESS').length,
          delivered: route.stops.filter((s: any) => s.status === 'DELIVERED').length,
          failed: route.stops.filter((s: any) => s.status === 'FAILED').length,
        },
      })),
    };
  }

  @Get('routes/:routeId')
  @ApiOperation({ summary: 'Get route details with all stops' })
  @ApiResponse({ status: 200, description: 'Route details retrieved' })
  async getRouteDetails(@Param('routeId') routeId: string) {
    const route = await this.prisma.deliveryRoute.findUnique({
      where: { id: routeId },
      include: {
        vehicle: true,
        driver: { select: { firstName: true, lastName: true } },
        stops: {
          orderBy: { stopOrder: 'asc' },
        },
      },
    });

    if (!route) {
      return { success: false, error: 'Route not found' };
    }

    return { success: true, data: route };
  }

  @Post('routes/:routeId/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a delivery route' })
  @ApiResponse({ status: 200, description: 'Route started' })
  async startRoute(
    @Request() req: any,
    @Param('routeId') routeId: string,
    @Body() body: { latitude?: number; longitude?: number },
  ) {
    const userId = req.user.sub || req.user.userId;
    const route = await this.fleetService.startRoute(routeId, userId);

    // Broadcast route started via WebSocket
    this.fleetGateway.broadcastRouteProgress(routeId, {
      completedStops: 0,
      totalStops: (route as any).stops?.length || 0,
    });

    return {
      success: true,
      data: route,
      message: 'Route started successfully',
    };
  }

  @Post('routes/:routeId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete a delivery route' })
  @ApiResponse({ status: 200, description: 'Route completed' })
  async completeRoute(
    @Request() req: any,
    @Param('routeId') routeId: string,
    @Body() body: { notes?: string; totalKm?: number },
  ) {
    const userId = req.user.sub || req.user.userId;
    const route = await this.fleetService.completeRoute(routeId, userId);

    // Broadcast route completed
    this.fleetGateway.broadcastAlert({
      type: 'ROUTE_DEVIATION',
      severity: 'INFO',
      routeId,
      message: `Route ${route.routeName || routeId.slice(-6)} completed`,
    });

    return {
      success: true,
      data: route,
      message: 'Route completed successfully',
    };
  }

  // =================== DELIVERY STOPS ===================

  @Get('stops/:stopId')
  @ApiOperation({ summary: 'Get delivery stop details' })
  @ApiResponse({ status: 200, description: 'Stop details retrieved' })
  async getStopDetails(@Param('stopId') stopId: string) {
    const stop = await this.prisma.deliveryStop.findUnique({
      where: { id: stopId },
      include: {
        route: {
          select: { id: true, routeName: true, vehicleId: true },
        },
      },
    });

    if (!stop) {
      return { success: false, error: 'Stop not found' };
    }

    return { success: true, data: stop };
  }

  @Patch('stops/:stopId/arrive')
  @ApiOperation({ summary: 'Mark arrival at delivery stop' })
  @ApiResponse({ status: 200, description: 'Arrival recorded' })
  async arriveAtStop(
    @Param('stopId') stopId: string,
    @Body() body: { latitude: number; longitude: number },
  ) {
    const stop = await this.prisma.deliveryStop.update({
      where: { id: stopId },
      data: {
        status: 'IN_PROGRESS',
        actualArrival: new Date(),
        latitude: body.latitude,
        longitude: body.longitude,
      },
      include: { route: true },
    });

    // Broadcast stop update
    this.fleetGateway.broadcastRouteProgress(stop.routeId, {
      completedStops: 0,
      totalStops: 0,
      currentStopId: stopId,
    });

    return { success: true, data: stop };
  }

  @Patch('stops/:stopId/deliver')
  @ApiOperation({ summary: 'Mark delivery as completed' })
  @ApiResponse({ status: 200, description: 'Delivery completed' })
  async completeDelivery(
    @Param('stopId') stopId: string,
    @Body() body: {
      signature?: string;
      photo?: string;
      recipientNote?: string;
    },
  ) {
    const stop = await this.prisma.deliveryStop.update({
      where: { id: stopId },
      data: {
        status: 'DELIVERED',
        completedAt: new Date(),
        signature: body.signature,
        photoUrl: body.photo,
        recipientNote: body.recipientNote,
      },
      include: {
        route: {
          include: {
            stops: { select: { status: true } },
          },
        },
      },
    });

    // Calculate progress
    const completedStops = stop.route.stops.filter((s: any) => s.status === 'DELIVERED').length;
    const totalStops = stop.route.stops.length;

    // Broadcast progress via WebSocket
    this.fleetGateway.broadcastRouteProgress(stop.routeId, {
      completedStops,
      totalStops,
    });

    return {
      success: true,
      data: stop,
      progress: { completedStops, totalStops },
    };
  }

  @Patch('stops/:stopId/fail')
  @ApiOperation({ summary: 'Mark delivery as failed' })
  @ApiResponse({ status: 200, description: 'Delivery marked as failed' })
  async failDelivery(
    @Param('stopId') stopId: string,
    @Body() body: {
      reason: 'RECIPIENT_ABSENT' | 'WRONG_ADDRESS' | 'REFUSED' | 'DAMAGED' | 'ACCESS_ISSUE' | 'WEATHER' | 'VEHICLE_ISSUE' | 'OTHER';
      note?: string;
      photo?: string;
    },
  ) {
    const stop = await this.prisma.deliveryStop.update({
      where: { id: stopId },
      data: {
        status: 'FAILED',
        failureReason: body.reason,
        failureNote: body.note,
        photoUrl: body.photo,
      },
      include: { route: true },
    });

    // Broadcast alert for failed delivery
    this.fleetGateway.broadcastAlert({
      type: 'DELAY',
      severity: 'WARNING',
      routeId: stop.routeId,
      message: `Delivery failed at ${stop.streetAddress}: ${body.reason}`,
      data: { stopId, reason: body.reason },
    });

    return { success: true, data: stop };
  }

  @Patch('stops/:stopId/skip')
  @ApiOperation({ summary: 'Skip delivery stop temporarily' })
  @ApiResponse({ status: 200, description: 'Stop skipped' })
  async skipStop(
    @Param('stopId') stopId: string,
    @Body() body: { reason: string },
  ) {
    const stop = await this.prisma.deliveryStop.update({
      where: { id: stopId },
      data: {
        status: 'ATTEMPTED',
        attemptCount: { increment: 1 },
        failureNote: `Skipped: ${body.reason}`,
      },
    });

    return { success: true, data: stop };
  }

  // =================== GPS TRACKING ===================

  @Post('location')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send GPS location update' })
  @ApiResponse({ status: 200, description: 'Location updated' })
  async updateLocation(
    @Request() req: any,
    @Body() body: {
      vehicleId: string;
      latitude: number;
      longitude: number;
      speed?: number;
      heading?: number;
      accuracy?: number;
    },
  ) {
    // Broadcast location via WebSocket
    this.fleetGateway.broadcastVehicleLocation(body.vehicleId, {
      lat: body.latitude,
      lng: body.longitude,
      speed: body.speed,
      heading: body.heading,
    });

    // Update vehicle's last known location in database
    await this.prisma.vehicle.update({
      where: { id: body.vehicleId },
      data: {
        currentLat: body.latitude,
        currentLng: body.longitude,
        lastLocationAt: new Date(),
      },
    }).catch(() => {
      // Ignore if update fails
    });

    return {
      success: true,
      message: 'Location updated',
      timestamp: new Date().toISOString(),
    };
  }

  @Post('location/batch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send batch of GPS locations (offline sync)' })
  @ApiResponse({ status: 200, description: 'Locations synced' })
  async syncLocations(
    @Body() body: {
      vehicleId: string;
      locations: Array<{
        latitude: number;
        longitude: number;
        speed?: number;
        heading?: number;
        timestamp: string;
      }>;
    },
  ) {
    // Process batch of offline-collected locations
    for (const loc of body.locations) {
      this.fleetGateway.broadcastVehicleLocation(body.vehicleId, {
        lat: loc.latitude,
        lng: loc.longitude,
        speed: loc.speed,
        heading: loc.heading,
      });
    }

    return {
      success: true,
      synced: body.locations.length,
      message: `${body.locations.length} locations synced`,
    };
  }

  // =================== TIMESHEET ===================

  @Post('timesheet/clock-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clock in for the day' })
  @ApiResponse({ status: 200, description: 'Clocked in successfully' })
  async clockIn(
    @Request() req: any,
    @Body() body: { latitude?: number; longitude?: number },
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Employee not found' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check for existing timesheet
    const existing = await this.prisma.timesheet.findFirst({
      where: {
        employeeId: employee.id,
        date: today,
      },
    });

    if (existing) {
      return { success: false, error: 'Already clocked in today' };
    }

    const now = new Date();
    const timesheet = await this.prisma.timesheet.create({
      data: {
        employeeId: employee.id,
        date: today,
        startTime: now,
        endTime: now, // Will be updated on clock-out
        status: 'PENDING',
      },
    });

    return {
      success: true,
      data: timesheet,
      message: 'Clocked in successfully',
    };
  }

  @Post('timesheet/clock-out')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Clock out for the day' })
  @ApiResponse({ status: 200, description: 'Clocked out successfully' })
  async clockOut(
    @Request() req: any,
    @Body() body: { latitude?: number; longitude?: number },
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Employee not found' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timesheet = await this.prisma.timesheet.findFirst({
      where: {
        employeeId: employee.id,
        date: today,
        status: 'PENDING',
      },
    });

    if (!timesheet) {
      return { success: false, error: 'No active clock-in found' };
    }

    const endTime = new Date();
    const workedMs = endTime.getTime() - timesheet.startTime.getTime();
    const workedHours = Math.round((workedMs / (1000 * 60 * 60)) * 100) / 100;

    const updated = await this.prisma.timesheet.update({
      where: { id: timesheet.id },
      data: {
        endTime,
        workedHours,
      },
    });

    return {
      success: true,
      data: updated,
      message: `Clocked out. Worked ${workedHours} hours.`,
    };
  }

  @Get('timesheet/history')
  @ApiOperation({ summary: 'Get timesheet history' })
  @ApiResponse({ status: 200, description: 'Timesheet history retrieved' })
  async getTimesheetHistory(
    @Request() req: any,
    @Query('days') days: string = '30',
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Employee not found' };
    }

    const since = new Date();
    since.setDate(since.getDate() - parseInt(days));

    const timesheets = await this.prisma.timesheet.findMany({
      where: {
        employeeId: employee.id,
        date: { gte: since },
      },
      orderBy: { date: 'desc' },
    });

    const totalHours = timesheets.reduce((sum, ts) => sum + (ts.workedHours || 0), 0);

    return {
      success: true,
      data: {
        timesheets,
        summary: {
          totalDays: timesheets.length,
          totalHours: Math.round(totalHours * 100) / 100,
          averageHoursPerDay: timesheets.length > 0
            ? Math.round((totalHours / timesheets.length) * 100) / 100
            : 0,
        },
      },
    };
  }

  // =================== SOS EMERGENCY ===================

  @Post('sos')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send emergency SOS alert' })
  @ApiResponse({ status: 200, description: 'SOS sent' })
  async sendSOS(
    @Request() req: any,
    @Body() body: {
      vehicleId: string;
      type: 'ACCIDENT' | 'BREAKDOWN' | 'MEDICAL' | 'SECURITY' | 'OTHER';
      latitude: number;
      longitude: number;
      message?: string;
    },
  ) {
    const userId = req.user.sub || req.user.userId;

    // Broadcast SOS alert to all dashboard clients
    this.fleetGateway.broadcastAlert({
      type: 'SOS',
      severity: 'CRITICAL',
      vehicleId: body.vehicleId,
      driverId: userId,
      message: `EMERGENCY: ${body.type} at ${body.latitude.toFixed(4)}, ${body.longitude.toFixed(4)}`,
      data: {
        sosType: body.type,
        location: { lat: body.latitude, lng: body.longitude },
        driverMessage: body.message,
      },
    });

    // Log SOS - for now just log to console
    // In production, this would send to a notification service
    this.logger.error(`SOS ALERT from user ${userId}: ${body.type} at ${body.latitude}, ${body.longitude}`);

    return {
      success: true,
      message: 'SOS alert sent. Help is on the way.',
      timestamp: new Date().toISOString(),
    };
  }

  // =================== FUEL LOGGING ===================

  @Post('fuel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log fuel refill' })
  @ApiResponse({ status: 200, description: 'Fuel logged' })
  async logFuel(
    @Request() req: any,
    @Body() body: {
      vehicleId: string;
      liters: number;
      costPerLiter: number;
      odometer: number;
      station?: string;
    },
  ) {
    const userId = req.user.sub || req.user.userId;
    const totalCost = body.liters * body.costPerLiter;

    // Get employee ID for this user
    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    const fuelLog = await this.fleetService.addFuelLog(userId, {
      vehicleId: body.vehicleId,
      driverId: employee?.id || '',
      fuelDate: new Date().toISOString(),
      liters: body.liters,
      pricePerLiter: body.costPerLiter,
      totalCost,
      odometerReading: body.odometer,
      stationName: body.station,
    });

    return {
      success: true,
      data: {
        ...fuelLog,
        totalCost,
      },
      message: `Logged ${body.liters}L fuel (${totalCost.toFixed(2)} EUR)`,
    };
  }

  // =================== VEHICLE INFO ===================

  @Get('vehicle/:vehicleId')
  @ApiOperation({ summary: 'Get vehicle details for driver' })
  @ApiResponse({ status: 200, description: 'Vehicle details retrieved' })
  async getVehicleDetails(@Param('vehicleId') vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        licensePlate: true,
        make: true,
        model: true,
        year: true,
        status: true,
        fuelType: true,
        mileage: true,
        nextServiceDate: true,
        insuranceExpiry: true,
      },
    });

    if (!vehicle) {
      return { success: false, error: 'Vehicle not found' };
    }

    // Check if maintenance is due
    const maintenanceDue = vehicle.nextServiceDate && vehicle.nextServiceDate <= new Date();
    const insuranceExpired = vehicle.insuranceExpiry && vehicle.insuranceExpiry <= new Date();

    return {
      success: true,
      data: {
        ...vehicle,
        alerts: {
          maintenanceDue,
          insuranceExpired,
        },
      },
    };
  }

  // =================== NAVIGATION ===================

  @Get('routes/:routeId/navigation')
  @ApiOperation({ summary: 'Get optimized navigation for route' })
  @ApiResponse({ status: 200, description: 'Navigation data retrieved' })
  async getRouteNavigation(@Param('routeId') routeId: string) {
    const route = await this.prisma.deliveryRoute.findUnique({
      where: { id: routeId },
      include: {
        stops: {
          where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          orderBy: { stopOrder: 'asc' },
        },
      },
    });

    if (!route) {
      return { success: false, error: 'Route not found' };
    }

    // Build navigation waypoints
    const waypoints = route.stops.map(stop => ({
      stopId: stop.id,
      sequence: stop.stopOrder,
      address: `${stop.streetAddress}, ${stop.postalCode} ${stop.city}`,
      coordinates: stop.latitude && stop.longitude
        ? { lat: Number(stop.latitude), lng: Number(stop.longitude) }
        : null,
      recipient: {
        name: stop.recipientName,
      },
      eta: stop.estimatedArrival,
    }));

    return {
      success: true,
      data: {
        routeId,
        routeName: route.routeName,
        pendingStops: waypoints.length,
        waypoints,
        // Google Maps navigation URL
        mapsUrl: waypoints.length > 0 && waypoints[0].coordinates
          ? `https://www.google.com/maps/dir/?api=1&destination=${waypoints[0].coordinates.lat},${waypoints[0].coordinates.lng}`
          : null,
      },
    };
  }

  // =================== BREAK MANAGEMENT ===================

  @Post('break/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start a break' })
  @ApiResponse({ status: 200, description: 'Break started' })
  async startBreak(
    @Request() req: any,
    @Body() body: { type: 'LUNCH' | 'REST' | 'OTHER' },
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const breakEntry = await this.enhancedService.startBreak(employee.id, body.type);
    return { success: true, data: breakEntry };
  }

  @Post('break/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'End current break' })
  @ApiResponse({ status: 200, description: 'Break ended' })
  async endBreak(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const breakEntry = await this.enhancedService.endBreak(employee.id);
    return { success: true, data: breakEntry };
  }

  @Get('breaks')
  @ApiOperation({ summary: 'Get today\'s breaks' })
  @ApiResponse({ status: 200, description: 'Breaks retrieved' })
  async getTodayBreaks(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const breaks = await this.enhancedService.getTodayBreaks(employee.id);
    return { success: true, data: breaks };
  }

  // =================== PARCEL SCANNING ===================

  @Post('stops/:stopId/scan')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Scan parcel at a stop' })
  @ApiResponse({ status: 200, description: 'Parcel scanned' })
  async scanParcel(
    @Param('stopId') stopId: string,
    @Body() body: { trackingNumber: string },
  ) {
    const scan = await this.enhancedService.scanParcel(stopId, body.trackingNumber);
    return { success: true, data: scan };
  }

  @Get('stops/:stopId/verify')
  @ApiOperation({ summary: 'Verify all parcels at a stop' })
  @ApiResponse({ status: 200, description: 'Verification result' })
  async verifyStopParcels(@Param('stopId') stopId: string) {
    const result = await this.enhancedService.verifyStopParcels(stopId);
    return { success: true, data: result };
  }

  // =================== VEHICLE INSPECTION ===================

  @Get('inspection/checklist/:type')
  @ApiOperation({ summary: 'Get vehicle inspection checklist' })
  @ApiResponse({ status: 200, description: 'Checklist retrieved' })
  async getInspectionChecklist(@Param('type') type: 'PRE_TRIP' | 'POST_TRIP') {
    const checklist = this.enhancedService.getInspectionChecklist(type);
    return { success: true, data: checklist };
  }

  @Post('inspection')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit vehicle inspection' })
  @ApiResponse({ status: 200, description: 'Inspection submitted' })
  async submitInspection(
    @Request() req: any,
    @Body() body: {
      vehicleId: string;
      type: 'PRE_TRIP' | 'POST_TRIP';
      mileageReading: number;
      items: { id: string; passed: boolean; notes?: string }[];
      generalNotes?: string;
    },
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const inspection = await this.enhancedService.submitInspection(
      employee.id,
      body.vehicleId,
      body.type,
      body.mileageReading,
      body.items,
      body.generalNotes,
    );

    return {
      success: true,
      data: inspection,
      message: inspection.overallPass
        ? 'Fahrzeugkontrolle bestanden'
        : 'Achtung: Einige Punkte nicht bestanden. Bitte Disposition kontaktieren.',
    };
  }

  @Get('vehicle/:vehicleId/inspections')
  @ApiOperation({ summary: 'Get vehicle inspection history' })
  @ApiResponse({ status: 200, description: 'Inspection history retrieved' })
  async getInspectionHistory(
    @Param('vehicleId') vehicleId: string,
    @Query('limit') limit?: string,
  ) {
    const inspections = await this.enhancedService.getInspectionHistory(
      vehicleId,
      limit ? parseInt(limit, 10) : 10,
    );
    return { success: true, data: inspections };
  }

  // =================== OFFLINE QUEUE ===================

  @Post('offline/queue')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Queue offline operation' })
  @ApiResponse({ status: 200, description: 'Operation queued' })
  async queueOfflineOperation(
    @Request() req: any,
    @Body() body: {
      operation: 'LOCATION' | 'DELIVERY' | 'SCAN' | 'SIGNATURE';
      payload: any;
    },
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const item = this.enhancedService.queueOfflineOperation(
      employee.id,
      body.operation,
      body.payload,
    );

    return { success: true, data: item };
  }

  @Post('offline/sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sync offline queue' })
  @ApiResponse({ status: 200, description: 'Queue synced' })
  async syncOfflineQueue(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const result = await this.enhancedService.syncOfflineQueue(employee.id);
    return { success: true, data: result };
  }

  @Get('offline/status')
  @ApiOperation({ summary: 'Get offline queue status' })
  @ApiResponse({ status: 200, description: 'Queue status' })
  async getQueueStatus(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const status = this.enhancedService.getQueueStatus(employee.id);
    return { success: true, data: status };
  }

  // =================== DAILY SUMMARY ===================

  @Get('summary')
  @ApiOperation({ summary: 'Get daily summary' })
  @ApiResponse({ status: 200, description: 'Daily summary' })
  async getDailySummary(
    @Request() req: any,
    @Query('date') date?: string,
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const summary = await this.enhancedService.getDailySummary(
      employee.id,
      date ? new Date(date) : undefined,
    );

    return { success: true, data: summary };
  }

  // =================== MESSAGES & ANNOUNCEMENTS ===================

  @Get('announcements')
  @ApiOperation({ summary: 'Get announcements from dispatch' })
  @ApiResponse({ status: 200, description: 'Announcements retrieved' })
  async getAnnouncements(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const announcements = await this.enhancedService.getAnnouncements(employee.id);
    return { success: true, data: announcements };
  }

  // =================== FEEDBACK LINK ===================

  @Get('stops/:stopId/rating-link')
  @ApiOperation({ summary: 'Generate customer rating link for delivery' })
  @ApiResponse({ status: 200, description: 'Rating link generated' })
  async getRatingLink(
    @Param('stopId') stopId: string,
    @Query('trackingNumber') trackingNumber: string,
  ) {
    if (!trackingNumber) {
      return { success: false, error: 'Tracking number required' };
    }

    const link = this.enhancedService.generateRatingLink(stopId, trackingNumber);
    return { success: true, data: { link } };
  }

  @Get('feedback/status')
  @ApiOperation({ summary: 'Get driver feedback status' })
  @ApiResponse({ status: 200, description: 'Feedback status' })
  async getFeedbackStatus(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const status = await this.enhancedService.getPendingFeedback(employee.id);
    return { success: true, data: status };
  }

  // =================== NOTIFICATIONS ===================

  @Get('notifications')
  @ApiOperation({ summary: 'Get driver notifications' })
  @ApiResponse({ status: 200, description: 'Notifications retrieved' })
  async getNotifications(
    @Request() req: any,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('type') type?: NotificationType,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const notifications = await this.notificationsService.getNotifications(employee.id, {
      unreadOnly: unreadOnly === 'true',
      type,
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return { success: true, data: notifications };
  }

  @Get('notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  async getUnreadCount(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const count = await this.notificationsService.getUnreadCount(employee.id);
    return { success: true, data: { unreadCount: count } };
  }

  @Patch('notifications/:notificationId/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markNotificationAsRead(
    @Request() req: any,
    @Param('notificationId') notificationId: string,
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    await this.notificationsService.markAsRead(employee.id, notificationId);
    return { success: true, message: 'Notification marked as read' };
  }

  @Post('notifications/mark-all-read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllNotificationsAsRead(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const count = await this.notificationsService.markAllAsRead(employee.id);
    return { success: true, data: { markedAsRead: count } };
  }

  // =================== NOTIFICATION PREFERENCES ===================

  @Get('notifications/preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved' })
  async getNotificationPreferences(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const preferences = await this.notificationsService.getPreferences(employee.id);
    return { success: true, data: preferences };
  }

  @Patch('notifications/preferences')
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updateNotificationPreferences(
    @Request() req: any,
    @Body() body: {
      pushEnabled?: boolean;
      routeAssignments?: boolean;
      urgentDeliveries?: boolean;
      breakReminders?: boolean;
      trafficAlerts?: boolean;
      customerFeedback?: boolean;
      quietHours?: {
        enabled: boolean;
        start: string;
        end: string;
      };
    },
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const preferences = await this.notificationsService.updatePreferences(employee.id, body);
    return { success: true, data: preferences };
  }

  @Post('notifications/register-device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register device for push notifications' })
  @ApiResponse({ status: 200, description: 'Device registered' })
  async registerDevice(
    @Request() req: any,
    @Body() body: { platform: 'IOS' | 'ANDROID'; token: string },
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    await this.notificationsService.registerDeviceToken(employee.id, body.platform, body.token);
    return { success: true, message: 'Device registered for push notifications' };
  }

  @Post('notifications/unregister-device')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unregister device from push notifications' })
  @ApiResponse({ status: 200, description: 'Device unregistered' })
  async unregisterDevice(
    @Request() req: any,
    @Body() body: { token: string },
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    await this.notificationsService.unregisterDeviceToken(employee.id, body.token);
    return { success: true, message: 'Device unregistered' };
  }

  // =================== MESSAGING ===================

  @Get('messages/conversations')
  @ApiOperation({ summary: 'Get driver conversations' })
  @ApiResponse({ status: 200, description: 'Conversations retrieved' })
  async getConversations(@Request() req: any) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const conversations = await this.notificationsService.getDriverConversations(employee.id);
    return { success: true, data: conversations };
  }

  @Post('messages/conversations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start new conversation with dispatch' })
  @ApiResponse({ status: 200, description: 'Conversation started' })
  async startConversation(
    @Request() req: any,
    @Body() body: { subject?: string; routeId?: string },
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const conversation = await this.notificationsService.getOrCreateConversation(
      employee.id,
      undefined,
      body.subject,
      body.routeId,
    );

    return { success: true, data: conversation };
  }

  @Get('messages/conversations/:conversationId')
  @ApiOperation({ summary: 'Get conversation messages' })
  @ApiResponse({ status: 200, description: 'Messages retrieved' })
  async getConversationMessages(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
    @Query('limit') limit?: string,
  ) {
    const messages = await this.notificationsService.getMessages(conversationId, {
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    return { success: true, data: messages };
  }

  @Post('messages/conversations/:conversationId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send message in conversation' })
  @ApiResponse({ status: 200, description: 'Message sent' })
  async sendMessage(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
    @Body() body: { content: string },
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const message = await this.notificationsService.sendMessage(
      conversationId,
      employee.id,
      'DRIVER',
      body.content,
    );

    return { success: true, data: message };
  }

  @Post('messages/conversations/:conversationId/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark conversation messages as read' })
  @ApiResponse({ status: 200, description: 'Messages marked as read' })
  async markConversationAsRead(
    @Request() req: any,
    @Param('conversationId') conversationId: string,
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    const count = await this.notificationsService.markMessagesAsRead(conversationId, employee.id);
    return { success: true, data: { markedAsRead: count } };
  }

  // =================== SOS WITH NOTIFICATION ===================

  @Post('sos/notify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send SOS with notification to dispatch' })
  @ApiResponse({ status: 200, description: 'SOS sent and dispatch notified' })
  async sendSOSWithNotification(
    @Request() req: any,
    @Body() body: {
      vehicleId: string;
      type: 'ACCIDENT' | 'BREAKDOWN' | 'MEDICAL' | 'SECURITY' | 'OTHER';
      latitude: number;
      longitude: number;
      message?: string;
    },
  ) {
    const userId = req.user.sub || req.user.userId;

    const employee = await this.prisma.employee.findFirst({
      where: { userId },
    });

    if (!employee) {
      return { success: false, error: 'Driver not found' };
    }

    // Broadcast SOS alert to fleet gateway
    this.fleetGateway.broadcastAlert({
      type: 'SOS',
      severity: 'CRITICAL',
      vehicleId: body.vehicleId,
      driverId: employee.id,
      message: `NOTFALL: ${body.type} bei ${body.latitude.toFixed(4)}, ${body.longitude.toFixed(4)}`,
      data: {
        sosType: body.type,
        location: { lat: body.latitude, lng: body.longitude },
        driverMessage: body.message,
      },
    });

    // Send driver SOS notification
    await this.notificationsService.sendDriverSOS(
      employee.id,
      { lat: body.latitude, lng: body.longitude },
      body.message,
    );

    this.logger.error(`SOS ALERT from driver ${employee.id}: ${body.type} at ${body.latitude}, ${body.longitude}`);

    return {
      success: true,
      message: 'SOS gesendet. Hilfe ist unterwegs.',
      timestamp: new Date().toISOString(),
    };
  }
}
