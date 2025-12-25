import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { IsString, IsEmail, IsOptional, MinLength, MaxLength } from 'class-validator';
import { PublicContactService } from './public-contact.service';

class ContactFormDto {
  @ApiProperty({ description: 'Contact name', example: 'Ion Popescu' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Email address', example: 'ion@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Phone number', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ description: 'Company name', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  company?: string;

  @ApiProperty({ description: 'Message subject', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  subject?: string;

  @ApiProperty({ description: 'Message content', example: 'I would like to learn more about your platform.' })
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  message: string;
}

@ApiTags('Public')
@Controller(['contact', 'public-contact'])
export class PublicContactController {
  private readonly logger = new Logger(PublicContactController.name);

  constructor(private readonly contactService: PublicContactService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 requests per minute
  @ApiOperation({ summary: 'Submit contact form (public)' })
  @ApiResponse({ status: 200, description: 'Message sent successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  async submitContactForm(@Body() dto: ContactFormDto) {
    this.logger.log(`Contact form submission from: ${dto.email}`);

    const result = await this.contactService.processContactForm({
      name: dto.name.trim(),
      email: dto.email.trim().toLowerCase(),
      phone: dto.phone?.trim(),
      company: dto.company?.trim(),
      subject: dto.subject?.trim() || 'Contact Form Submission',
      message: dto.message.trim(),
    });

    return {
      success: true,
      message: 'Thank you for your message. We will get back to you shortly.',
      messageRo: 'Mulțumim pentru mesaj. Vă vom contacta în curând.',
      referenceId: result.referenceId,
    };
  }
}
