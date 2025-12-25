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
  VendorManagementService,
  VendorType,
  VendorTier,
  VendorStatus,
  PaymentTerms,
  VendorAddress,
  VendorContact,
  VendorBankAccount,
  VendorDocument,
  VendorNote,
} from './vendor-management.service';

@ApiTags('Vendor Management')
@Controller('vendors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class VendorManagementController {
  constructor(private readonly vendorService: VendorManagementService) {}

  // =================== VENDOR CRUD ===================

  @Post()
  @ApiOperation({ summary: 'Create a new vendor' })
  @ApiResponse({ status: 201, description: 'Vendor created' })
  async createVendor(
    @Request() req: any,
    @Body() body: {
      code?: string;
      name: string;
      legalName?: string;
      type: VendorType;
      tier?: VendorTier;
      taxId?: string;
      vatNumber?: string;
      registrationNumber?: string;
      industry?: string;
      category?: string;
      subcategory?: string;
      website?: string;
      email?: string;
      phone?: string;
      addresses?: Omit<VendorAddress, 'id'>[];
      contacts?: Omit<VendorContact, 'id'>[];
      bankAccounts?: Omit<VendorBankAccount, 'id'>[];
      paymentTerms?: PaymentTerms;
      customPaymentDays?: number;
      creditLimit?: number;
      currency?: string;
      taxExempt?: boolean;
      taxExemptReason?: string;
      notes?: string;
      tags?: string[];
      customFields?: Record<string, any>;
    },
  ) {
    return this.vendorService.createVendor({
      tenantId: req.user.tenantId,
      createdBy: req.user.id,
      createdByName: req.user.name || req.user.email,
      ...body,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Get all vendors' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'tier', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'tags', required: false })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of vendors' })
  async getVendors(
    @Request() req: any,
    @Query('type') type?: VendorType,
    @Query('tier') tier?: VendorTier,
    @Query('status') status?: VendorStatus,
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Query('limit') limit?: string,
  ) {
    return this.vendorService.getVendors(req.user.tenantId, {
      type,
      tier,
      status,
      category,
      search,
      tags: tags ? tags.split(',') : undefined,
      limit: limit ? parseInt(limit) : undefined,
    });
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get vendor statistics' })
  @ApiResponse({ status: 200, description: 'Vendor statistics' })
  async getStatistics(@Request() req: any) {
    return this.vendorService.getVendorStatistics(req.user.tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vendor by ID' })
  @ApiResponse({ status: 200, description: 'Vendor details' })
  async getVendor(@Param('id') id: string) {
    const vendor = await this.vendorService.getVendor(id);
    if (!vendor) {
      return { error: 'Vendor not found' };
    }

    const documents = await this.vendorService.getVendorDocuments(id);
    const notes = await this.vendorService.getVendorNotes(id);
    const activities = await this.vendorService.getVendorActivities(id, 20);

    return { ...vendor, documents, notes, activities };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update vendor' })
  @ApiResponse({ status: 200, description: 'Vendor updated' })
  async updateVendor(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      legalName?: string;
      type?: VendorType;
      tier?: VendorTier;
      taxId?: string;
      vatNumber?: string;
      industry?: string;
      category?: string;
      website?: string;
      email?: string;
      phone?: string;
      paymentTerms?: PaymentTerms;
      creditLimit?: number;
      notes?: string;
      tags?: string[];
    },
  ) {
    const vendor = await this.vendorService.updateVendor(
      id,
      body,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!vendor) {
      return { error: 'Vendor not found' };
    }
    return vendor;
  }

  @Post(':id/approve')
  @ApiOperation({ summary: 'Approve vendor' })
  @ApiResponse({ status: 200, description: 'Vendor approved' })
  async approveVendor(@Request() req: any, @Param('id') id: string) {
    const vendor = await this.vendorService.approveVendor(
      id,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!vendor) {
      return { error: 'Vendor not found or not pending approval' };
    }
    return vendor;
  }

  @Post(':id/suspend')
  @ApiOperation({ summary: 'Suspend vendor' })
  @ApiResponse({ status: 200, description: 'Vendor suspended' })
  async suspendVendor(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const vendor = await this.vendorService.suspendVendor(
      id,
      body.reason,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!vendor) {
      return { error: 'Vendor not found or cannot be suspended' };
    }
    return vendor;
  }

  @Post(':id/reactivate')
  @ApiOperation({ summary: 'Reactivate vendor' })
  @ApiResponse({ status: 200, description: 'Vendor reactivated' })
  async reactivateVendor(@Request() req: any, @Param('id') id: string) {
    const vendor = await this.vendorService.reactivateVendor(
      id,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!vendor) {
      return { error: 'Vendor not found or cannot be reactivated' };
    }
    return vendor;
  }

  @Post(':id/blacklist')
  @ApiOperation({ summary: 'Blacklist vendor' })
  @ApiResponse({ status: 200, description: 'Vendor blacklisted' })
  async blacklistVendor(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { reason: string },
  ) {
    const vendor = await this.vendorService.blacklistVendor(
      id,
      body.reason,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!vendor) {
      return { error: 'Vendor not found' };
    }
    return vendor;
  }

  @Put(':id/tier')
  @ApiOperation({ summary: 'Update vendor tier' })
  @ApiResponse({ status: 200, description: 'Vendor tier updated' })
  async updateTier(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { tier: VendorTier; reason?: string },
  ) {
    const vendor = await this.vendorService.updateVendorTier(
      id,
      body.tier,
      body.reason,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!vendor) {
      return { error: 'Vendor not found' };
    }
    return vendor;
  }

  // =================== CONTACTS ===================

  @Post(':id/contacts')
  @ApiOperation({ summary: 'Add vendor contact' })
  @ApiResponse({ status: 201, description: 'Contact added' })
  async addContact(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Omit<VendorContact, 'id'>,
  ) {
    const vendor = await this.vendorService.addContact(
      id,
      body,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!vendor) {
      return { error: 'Vendor not found' };
    }
    return vendor;
  }

  @Put(':vendorId/contacts/:contactId')
  @ApiOperation({ summary: 'Update vendor contact' })
  @ApiResponse({ status: 200, description: 'Contact updated' })
  async updateContact(
    @Param('vendorId') vendorId: string,
    @Param('contactId') contactId: string,
    @Body() body: Partial<VendorContact>,
  ) {
    const vendor = await this.vendorService.updateContact(vendorId, contactId, body);
    if (!vendor) {
      return { error: 'Vendor or contact not found' };
    }
    return vendor;
  }

  @Delete(':vendorId/contacts/:contactId')
  @ApiOperation({ summary: 'Remove vendor contact' })
  @ApiResponse({ status: 200, description: 'Contact removed' })
  async removeContact(
    @Param('vendorId') vendorId: string,
    @Param('contactId') contactId: string,
  ) {
    const success = await this.vendorService.removeContact(vendorId, contactId);
    if (!success) {
      return { error: 'Vendor or contact not found' };
    }
    return { success };
  }

  // =================== ADDRESSES ===================

  @Post(':id/addresses')
  @ApiOperation({ summary: 'Add vendor address' })
  @ApiResponse({ status: 201, description: 'Address added' })
  async addAddress(
    @Param('id') id: string,
    @Body() body: Omit<VendorAddress, 'id'>,
  ) {
    const vendor = await this.vendorService.addAddress(id, body);
    if (!vendor) {
      return { error: 'Vendor not found' };
    }
    return vendor;
  }

  @Put(':vendorId/addresses/:addressId')
  @ApiOperation({ summary: 'Update vendor address' })
  @ApiResponse({ status: 200, description: 'Address updated' })
  async updateAddress(
    @Param('vendorId') vendorId: string,
    @Param('addressId') addressId: string,
    @Body() body: Partial<VendorAddress>,
  ) {
    const vendor = await this.vendorService.updateAddress(vendorId, addressId, body);
    if (!vendor) {
      return { error: 'Vendor or address not found' };
    }
    return vendor;
  }

  // =================== BANK ACCOUNTS ===================

  @Post(':id/bank-accounts')
  @ApiOperation({ summary: 'Add vendor bank account' })
  @ApiResponse({ status: 201, description: 'Bank account added' })
  async addBankAccount(
    @Param('id') id: string,
    @Body() body: Omit<VendorBankAccount, 'id'>,
  ) {
    const vendor = await this.vendorService.addBankAccount(id, body);
    if (!vendor) {
      return { error: 'Vendor not found' };
    }
    return vendor;
  }

  // =================== CATEGORIES ===================

  @Post('categories')
  @ApiOperation({ summary: 'Create vendor category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(
    @Request() req: any,
    @Body() body: {
      name: string;
      code: string;
      description?: string;
      parentId?: string;
      glAccountCode?: string;
      sortOrder?: number;
    },
  ) {
    return this.vendorService.createCategory({
      tenantId: req.user.tenantId,
      ...body,
    });
  }

  @Get('categories/list')
  @ApiOperation({ summary: 'Get vendor categories' })
  @ApiQuery({ name: 'parentId', required: false })
  @ApiResponse({ status: 200, description: 'Categories list' })
  async getCategories(
    @Request() req: any,
    @Query('parentId') parentId?: string,
  ) {
    const categories = await this.vendorService.getCategories(
      req.user.tenantId,
      parentId,
    );
    return { categories, total: categories.length };
  }

  // =================== DOCUMENTS ===================

  @Post(':id/documents')
  @ApiOperation({ summary: 'Add vendor document' })
  @ApiResponse({ status: 201, description: 'Document added' })
  async addDocument(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      type: VendorDocument['type'];
      name: string;
      description?: string;
      fileUrl: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
      expirationDate?: string;
    },
  ) {
    return this.vendorService.addDocument({
      vendorId: id,
      type: body.type,
      name: body.name,
      description: body.description,
      fileUrl: body.fileUrl,
      fileName: body.fileName,
      fileSize: body.fileSize,
      mimeType: body.mimeType,
      expirationDate: body.expirationDate ? new Date(body.expirationDate) : undefined,
      uploadedBy: req.user.id,
    });
  }

  @Get(':id/documents')
  @ApiOperation({ summary: 'Get vendor documents' })
  @ApiResponse({ status: 200, description: 'Documents list' })
  async getDocuments(@Param('id') id: string) {
    const documents = await this.vendorService.getVendorDocuments(id);
    return { documents, total: documents.length };
  }

  @Post('documents/:docId/verify')
  @ApiOperation({ summary: 'Verify vendor document' })
  @ApiResponse({ status: 200, description: 'Document verified' })
  async verifyDocument(
    @Request() req: any,
    @Param('docId') docId: string,
  ) {
    const document = await this.vendorService.verifyDocument(
      docId,
      req.user.id,
      req.user.name || req.user.email,
    );
    if (!document) {
      return { error: 'Document not found' };
    }
    return document;
  }

  @Get('documents/expiring')
  @ApiOperation({ summary: 'Get expiring documents' })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Expiring documents list' })
  async getExpiringDocuments(
    @Request() req: any,
    @Query('daysAhead') daysAhead?: string,
  ) {
    const documents = await this.vendorService.getExpiringDocuments(
      req.user.tenantId,
      daysAhead ? parseInt(daysAhead) : 30,
    );
    return { documents, total: documents.length };
  }

  // =================== NOTES ===================

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add vendor note' })
  @ApiResponse({ status: 201, description: 'Note added' })
  async addNote(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: {
      type: VendorNote['type'];
      subject: string;
      content: string;
      isPrivate?: boolean;
    },
  ) {
    return this.vendorService.addNote({
      vendorId: id,
      type: body.type,
      subject: body.subject,
      content: body.content,
      isPrivate: body.isPrivate,
      createdBy: req.user.id,
      createdByName: req.user.name || req.user.email,
    });
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Get vendor notes' })
  @ApiQuery({ name: 'includePrivate', required: false })
  @ApiResponse({ status: 200, description: 'Notes list' })
  async getNotes(
    @Param('id') id: string,
    @Query('includePrivate') includePrivate?: string,
  ) {
    const notes = await this.vendorService.getVendorNotes(
      id,
      includePrivate === 'true',
    );
    return { notes, total: notes.length };
  }

  // =================== ACTIVITIES ===================

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get vendor activities' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Activities list' })
  async getActivities(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    const activities = await this.vendorService.getVendorActivities(
      id,
      limit ? parseInt(limit) : undefined,
    );
    return { activities, total: activities.length };
  }
}
