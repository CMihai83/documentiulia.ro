import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import { CustomerTrackingService, DeliveryRating, DeliveryPreference } from './customer-tracking.service';

/**
 * Customer Tracking Controller
 * Public API for customers to track their deliveries.
 * No authentication required for most endpoints.
 */
@ApiTags('Customer Tracking')
@Controller('tracking')
export class CustomerTrackingController {
  constructor(private readonly customerTrackingService: CustomerTrackingService) {}

  @Get(':trackingNumber')
  @ApiOperation({ summary: 'Track a delivery by tracking number (public, no auth)' })
  @ApiParam({ name: 'trackingNumber', description: 'Tracking number (e.g., DPD123456789)' })
  @ApiHeader({ name: 'Accept-Language', required: false, description: 'Language: de or en (default: de)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tracking information' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Tracking number not found' })
  async trackDelivery(
    @Param('trackingNumber') trackingNumber: string,
    @Headers('Accept-Language') language?: string,
  ) {
    const lang = language?.startsWith('en') ? 'en' : 'de';
    return this.customerTrackingService.trackDelivery(trackingNumber, lang);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Track multiple deliveries at once (public)' })
  @ApiHeader({ name: 'Accept-Language', required: false, description: 'Language: de or en' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Tracking results for all numbers' })
  async trackMultiple(
    @Body() body: { trackingNumbers: string[] },
    @Headers('Accept-Language') language?: string,
  ) {
    const lang = language?.startsWith('en') ? 'en' : 'de';
    const results = await this.customerTrackingService.trackMultiple(
      body.trackingNumbers,
      lang,
    );
    return Object.fromEntries(results);
  }

  @Get(':trackingNumber/eta')
  @ApiOperation({ summary: 'Get estimated delivery time (public)' })
  @ApiParam({ name: 'trackingNumber', description: 'Tracking number' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Estimated delivery time and position' })
  async getEstimatedTime(@Param('trackingNumber') trackingNumber: string) {
    return this.customerTrackingService.getEstimatedDeliveryTime(trackingNumber);
  }

  @Get(':trackingNumber/location')
  @ApiOperation({ summary: 'Get live driver location (public, only for active deliveries)' })
  @ApiParam({ name: 'trackingNumber', description: 'Tracking number' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Driver location if available' })
  async getLiveLocation(@Param('trackingNumber') trackingNumber: string) {
    return this.customerTrackingService.getLiveDriverLocation(trackingNumber);
  }

  @Get(':trackingNumber/preferences')
  @ApiOperation({ summary: 'Get delivery preferences for a tracking number' })
  @ApiParam({ name: 'trackingNumber', description: 'Tracking number' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Delivery preferences' })
  async getPreferences(@Param('trackingNumber') trackingNumber: string) {
    const prefs = await this.customerTrackingService.getDeliveryPreferences(trackingNumber);
    return prefs || {
      leaveAtDoor: false,
      leaveWithNeighbor: false,
      preferredTimeWindow: null,
      specialInstructions: null,
      alternativeRecipient: null,
    };
  }

  @Put(':trackingNumber/preferences')
  @ApiOperation({ summary: 'Set delivery preferences (leave at door, neighbor, etc.)' })
  @ApiParam({ name: 'trackingNumber', description: 'Tracking number' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Preferences updated' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot modify completed delivery' })
  async setPreferences(
    @Param('trackingNumber') trackingNumber: string,
    @Body() preferences: Partial<DeliveryPreference>,
  ) {
    return this.customerTrackingService.setDeliveryPreferences(trackingNumber, preferences);
  }

  @Post(':trackingNumber/reschedule')
  @ApiOperation({ summary: 'Request delivery reschedule' })
  @ApiParam({ name: 'trackingNumber', description: 'Tracking number' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reschedule request submitted' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Cannot reschedule delivered shipment' })
  async requestReschedule(
    @Param('trackingNumber') trackingNumber: string,
    @Body() body: {
      preferredDate: string;
      preferredTimeWindow?: string;
      reason?: string;
    },
  ) {
    return this.customerTrackingService.requestReschedule(
      trackingNumber,
      new Date(body.preferredDate),
      body.preferredTimeWindow,
      body.reason,
    );
  }

  @Post(':trackingNumber/rating')
  @ApiOperation({ summary: 'Submit delivery rating (after delivery)' })
  @ApiParam({ name: 'trackingNumber', description: 'Tracking number' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Rating submitted' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Can only rate delivered shipments' })
  async submitRating(
    @Param('trackingNumber') trackingNumber: string,
    @Body() rating: DeliveryRating,
  ) {
    return this.customerTrackingService.submitRating(trackingNumber, rating);
  }

  @Get('history/email')
  @ApiOperation({ summary: 'Get delivery history by email (requires verification)' })
  @ApiQuery({ name: 'email', required: true, description: 'Recipient email address' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max results (default: 20)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Delivery history' })
  async getDeliveryHistory(
    @Query('email') email: string,
    @Query('limit') limit?: string,
  ) {
    // In production, this should require email verification
    return this.customerTrackingService.getDeliveryHistory(
      email,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get('stats/ratings')
  @ApiOperation({ summary: 'Get aggregate rating statistics (public)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Rating statistics' })
  async getRatingStats() {
    return this.customerTrackingService.getRatingStatistics();
  }
}
