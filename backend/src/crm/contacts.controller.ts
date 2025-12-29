import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ContactsService,
  Contact,
  ContactSource,
  LifecycleStage,
  Address,
  ContactNote,
  SegmentRule,
} from './contacts.service';

@ApiTags('CRM - Contacts')
@Controller('crm/contacts')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  // =================== CONTACTS ===================

  @Post()
  @ApiOperation({ summary: 'Create contact' })
  @ApiResponse({ status: 201, description: 'Contact created' })
  async createContact(
    @Request() req: any,
    @Body() body: {
      // Support both 'type' and 'contact_type' for backward compatibility
      type?: Contact['type'];
      contact_type?: Contact['type'];
      // Support 'name' as alias for display name (firstName + lastName or companyName)
      name?: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
      // Support 'display_name' as alias
      display_name?: string;
      jobTitle?: string;
      department?: string;
      email: string;
      phone?: string;
      mobile?: string;
      website?: string;
      address?: Address;
      source: ContactSource;
      tags?: string[];
      customFields?: Record<string, any>;
      ownerId?: string;
      companyId?: string;
    },
  ) {
    // Normalize field names for backward compatibility
    const normalizedData: any = { ...body };

    // Handle type/contact_type alias
    if (!normalizedData.type && normalizedData.contact_type) {
      normalizedData.type = normalizedData.contact_type;
    }

    // Handle name/display_name aliases
    if (normalizedData.name && !normalizedData.firstName && !normalizedData.companyName) {
      // Split name into firstName and lastName if it contains a space
      const nameParts = normalizedData.name.split(' ');
      if (nameParts.length > 1) {
        normalizedData.firstName = nameParts[0];
        normalizedData.lastName = nameParts.slice(1).join(' ');
      } else {
        normalizedData.firstName = normalizedData.name;
      }
    }

    if (normalizedData.display_name && !normalizedData.firstName && !normalizedData.companyName) {
      const nameParts = normalizedData.display_name.split(' ');
      if (nameParts.length > 1) {
        normalizedData.firstName = nameParts[0];
        normalizedData.lastName = nameParts.slice(1).join(' ');
      } else {
        normalizedData.firstName = normalizedData.display_name;
      }
    }

    // Remove aliases before passing to service
    delete normalizedData.contact_type;
    delete normalizedData.name;
    delete normalizedData.display_name;

    return this.contactsService.createContact({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      ...normalizedData,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get contacts' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'source', required: false })
  @ApiQuery({ name: 'lifecycleStage', required: false })
  @ApiQuery({ name: 'ownerId', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Contacts list' })
  async getContacts(
    @Request() req: any,
    @Query('search') search?: string,
    @Query('type') type?: Contact['type'],
    @Query('status') status?: Contact['status'],
    @Query('source') source?: ContactSource,
    @Query('lifecycleStage') lifecycleStage?: LifecycleStage,
    @Query('ownerId') ownerId?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.contactsService.getContacts(req.user.tenantId, {
      search,
      type,
      status,
      source,
      lifecycleStage,
      ownerId,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get contact details' })
  @ApiResponse({ status: 200, description: 'Contact details' })
  async getContact(@Param('id') id: string) {
    const contact = await this.contactsService.getContact(id);
    if (!contact) {
      return { error: 'Contact not found' };
    }
    return contact;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update contact' })
  @ApiResponse({ status: 200, description: 'Contact updated' })
  async updateContact(
    @Param('id') id: string,
    @Body() body: Partial<Pick<Contact,
      'firstName' | 'lastName' | 'companyName' | 'jobTitle' | 'department' |
      'email' | 'phone' | 'mobile' | 'website' | 'address' |
      'status' | 'lifecycleStage' | 'tags' | 'customFields' | 'ownerId'
    >>,
  ) {
    const contact = await this.contactsService.updateContact(id, body);
    if (!contact) {
      return { error: 'Contact not found' };
    }
    return contact;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete contact' })
  @ApiResponse({ status: 200, description: 'Contact deleted' })
  async deleteContact(@Param('id') id: string) {
    await this.contactsService.deleteContact(id);
    return { success: true };
  }

  @Post(':primaryId/merge/:secondaryId')
  @ApiOperation({ summary: 'Merge two contacts' })
  @ApiResponse({ status: 200, description: 'Contacts merged' })
  async mergeContacts(
    @Param('primaryId') primaryId: string,
    @Param('secondaryId') secondaryId: string,
  ) {
    const contact = await this.contactsService.mergeContacts(primaryId, secondaryId);
    if (!contact) {
      return { error: 'Contacts not found' };
    }
    return contact;
  }

  // =================== LEAD SCORING ===================

  @Put(':id/lead-score')
  @ApiOperation({ summary: 'Update lead score' })
  @ApiResponse({ status: 200, description: 'Lead score updated' })
  async updateLeadScore(
    @Param('id') id: string,
    @Body() body: { score: number },
  ) {
    const contact = await this.contactsService.updateLeadScore(id, body.score);
    if (!contact) {
      return { error: 'Contact not found' };
    }
    return contact;
  }

  @Post(':id/lead-score/increment')
  @ApiOperation({ summary: 'Increment lead score' })
  @ApiResponse({ status: 200, description: 'Lead score incremented' })
  async incrementLeadScore(
    @Param('id') id: string,
    @Body() body: { points: number },
  ) {
    const contact = await this.contactsService.incrementLeadScore(id, body.points);
    if (!contact) {
      return { error: 'Contact not found' };
    }
    return contact;
  }

  // =================== NOTES ===================

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add note to contact' })
  @ApiResponse({ status: 201, description: 'Note added' })
  async addNote(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      content: string;
      type: ContactNote['type'];
    },
  ) {
    return this.contactsService.addNote({
      contactId: id,
      content: body.content,
      type: body.type,
      createdBy: req.user.id,
    });
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Get contact notes' })
  @ApiResponse({ status: 200, description: 'Contact notes' })
  async getNotes(@Param('id') id: string) {
    const notes = await this.contactsService.getNotes(id);
    return { notes, total: notes.length };
  }

  @Delete('notes/:noteId')
  @ApiOperation({ summary: 'Delete note' })
  @ApiResponse({ status: 200, description: 'Note deleted' })
  async deleteNote(@Param('noteId') noteId: string) {
    await this.contactsService.deleteNote(noteId);
    return { success: true };
  }

  // =================== ACTIVITIES ===================

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get contact activities' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Contact activities' })
  async getActivities(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const activities = await this.contactsService.getActivities(
      id,
      limit ? parseInt(limit) : 50,
    );
    return { activities, total: activities.length };
  }

  // =================== SEGMENTS ===================

  @Post('segments')
  @ApiOperation({ summary: 'Create segment' })
  @ApiResponse({ status: 201, description: 'Segment created' })
  async createSegment(
    @Request() req: any,
    @Body() body: {
      name: string;
      description?: string;
      type: 'static' | 'dynamic';
      rules?: SegmentRule[];
      staticContactIds?: string[];
    },
  ) {
    return this.contactsService.createSegment({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('segments')
  @ApiOperation({ summary: 'Get segments' })
  @ApiResponse({ status: 200, description: 'Segments list' })
  async getSegments(@Request() req: any) {
    const segments = await this.contactsService.getSegments(req.user.tenantId);
    return { segments, total: segments.length };
  }

  @Get('segments/:id/contacts')
  @ApiOperation({ summary: 'Get segment contacts' })
  @ApiResponse({ status: 200, description: 'Segment contacts' })
  async getSegmentContacts(@Param('id') id: string) {
    const contacts = await this.contactsService.getSegmentContacts(id);
    return { contacts, total: contacts.length };
  }

  @Put('segments/:id')
  @ApiOperation({ summary: 'Update segment' })
  @ApiResponse({ status: 200, description: 'Segment updated' })
  async updateSegment(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      rules: SegmentRule[];
      staticContactIds: string[];
    }>,
  ) {
    const segment = await this.contactsService.updateSegment(id, body);
    if (!segment) {
      return { error: 'Segment not found' };
    }
    return segment;
  }

  @Delete('segments/:id')
  @ApiOperation({ summary: 'Delete segment' })
  @ApiResponse({ status: 200, description: 'Segment deleted' })
  async deleteSegment(@Param('id') id: string) {
    await this.contactsService.deleteSegment(id);
    return { success: true };
  }

  @Post('segments/:id/add-contacts')
  @ApiOperation({ summary: 'Add contacts to segment' })
  @ApiResponse({ status: 200, description: 'Contacts added' })
  async addContactsToSegment(
    @Param('id') id: string,
    @Body() body: { contactIds: string[] },
  ) {
    const segment = await this.contactsService.bulkAddToSegment(id, body.contactIds);
    if (!segment) {
      return { error: 'Segment not found or not static' };
    }
    return segment;
  }

  // =================== BULK OPERATIONS ===================

  @Post('bulk/update')
  @ApiOperation({ summary: 'Bulk update contacts' })
  @ApiResponse({ status: 200, description: 'Contacts updated' })
  async bulkUpdate(
    @Body() body: {
      contactIds: string[];
      updates: Partial<Pick<Contact, 'status' | 'lifecycleStage' | 'tags' | 'ownerId'>>;
    },
  ) {
    return this.contactsService.bulkUpdateContacts(body.contactIds, body.updates);
  }

  @Post('bulk/delete')
  @ApiOperation({ summary: 'Bulk delete contacts' })
  @ApiResponse({ status: 200, description: 'Contacts deleted' })
  async bulkDelete(@Body() body: { contactIds: string[] }) {
    return this.contactsService.bulkDeleteContacts(body.contactIds);
  }

  // =================== IMPORT/EXPORT ===================

  @Post('import')
  @ApiOperation({ summary: 'Import contacts' })
  @ApiResponse({ status: 200, description: 'Import result' })
  async importContacts(
    @Request() req: any,
    @Body() body: {
      contacts: Array<{
        type: Contact['type'];
        firstName?: string;
        lastName?: string;
        companyName?: string;
        email: string;
        phone?: string;
        source: ContactSource;
        tags?: string[];
      }>;
      options?: { updateExisting?: boolean; skipDuplicates?: boolean };
    },
  ) {
    const contactsWithCreatedBy = body.contacts.map(c => ({
      ...c,
      createdBy: req.user.id,
    }));
    return this.contactsService.importContacts(
      req.user.tenantId,
      contactsWithCreatedBy,
      body.options,
    );
  }

  @Get('export')
  @ApiOperation({ summary: 'Export contacts' })
  @ApiResponse({ status: 200, description: 'Exported contacts' })
  async exportContacts(
    @Request() req: any,
    @Query('type') type?: Contact['type'],
    @Query('status') status?: Contact['status'],
  ) {
    const contacts = await this.contactsService.exportContacts(
      req.user.tenantId,
      { type, status },
    );
    return { contacts, total: contacts.length };
  }

  // =================== STATS ===================

  @Get('stats/overview')
  @ApiOperation({ summary: 'Get contacts stats' })
  @ApiResponse({ status: 200, description: 'Contacts stats' })
  async getStats(@Request() req: any) {
    return this.contactsService.getStats(req.user.tenantId);
  }
}
