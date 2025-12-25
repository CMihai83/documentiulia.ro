import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConsultingService, ConsultingBooking, ConsultingPackage } from './consulting.service';
import { Tier } from '@prisma/client';

describe('ConsultingService', () => {
  let service: ConsultingService;
  let prisma: PrismaService;

  const mockPrismaService = {
    organization: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsultingService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ConsultingService>(ConsultingService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('Package Management', () => {
    describe('getAllPackages', () => {
      it('should return all consulting packages', () => {
        const packages = service.getAllPackages();

        expect(packages.length).toBeGreaterThan(5);
      });

      it('should include Romanian localization', () => {
        const packages = service.getAllPackages();

        packages.forEach(pkg => {
          expect(pkg.nameRo).toBeDefined();
          expect(pkg.descriptionRo).toBeDefined();
          expect(pkg.featuresRo).toBeDefined();
          expect(pkg.deliverablesRo).toBeDefined();
        });
      });

      it('should include pricing in RON and EUR', () => {
        const packages = service.getAllPackages();

        packages.forEach(pkg => {
          expect(pkg.priceRon).toBeGreaterThan(0);
          expect(pkg.priceEur).toBeGreaterThan(0);
        });
      });
    });

    describe('getPackagesByCategory', () => {
      it('should filter packages by accounting category', () => {
        const accounting = service.getPackagesByCategory('accounting');

        expect(accounting.length).toBeGreaterThan(0);
        expect(accounting.every(p => p.category === 'accounting')).toBe(true);
      });

      it('should filter packages by tax category', () => {
        const tax = service.getPackagesByCategory('tax');

        expect(tax.length).toBeGreaterThan(0);
        expect(tax.every(p => p.category === 'tax')).toBe(true);
      });

      it('should filter packages by compliance category', () => {
        const compliance = service.getPackagesByCategory('compliance');

        expect(compliance.length).toBeGreaterThan(0);
        expect(compliance.every(p => p.category === 'compliance')).toBe(true);
      });

      it('should filter packages by training category', () => {
        const training = service.getPackagesByCategory('training');

        expect(training.length).toBeGreaterThan(0);
        expect(training.every(p => p.category === 'training')).toBe(true);
      });

      it('should return empty array for unknown category', () => {
        const unknown = service.getPackagesByCategory('unknown');

        expect(unknown).toEqual([]);
      });
    });

    describe('getPackage', () => {
      it('should return package by ID', () => {
        const pkg = service.getPackage('pkg_accounting_setup');

        expect(pkg).toBeDefined();
        expect(pkg.id).toBe('pkg_accounting_setup');
        expect(pkg.type).toBe('accounting_setup');
      });

      it('should throw NotFoundException for invalid package', () => {
        expect(() => service.getPackage('invalid-id')).toThrow(NotFoundException);
      });
    });

    describe('getPackagesForTier', () => {
      it('should return all FREE tier packages for FREE users', () => {
        const packages = service.getPackagesForTier(Tier.FREE);

        packages.forEach(pkg => {
          expect(pkg.requiredTier).toBe(Tier.FREE);
        });
      });

      it('should return FREE and PRO packages for PRO users', () => {
        const packages = service.getPackagesForTier(Tier.PRO);

        const tiers = packages.map(p => p.requiredTier);
        expect(tiers).toContain(Tier.FREE);
        expect(tiers).toContain(Tier.PRO);
        expect(tiers).not.toContain(Tier.BUSINESS);
      });

      it('should return all packages for BUSINESS users', () => {
        const businessPackages = service.getPackagesForTier(Tier.BUSINESS);
        const allPackages = service.getAllPackages();

        expect(businessPackages.length).toBe(allPackages.length);
      });
    });

    describe('getPopularPackages', () => {
      it('should return packages marked as popular', () => {
        const popular = service.getPopularPackages();

        expect(popular.length).toBeGreaterThan(0);
        expect(popular.every(p => p.isPopular)).toBe(true);
      });
    });

    describe('getNewPackages', () => {
      it('should return packages marked as new', () => {
        const newPkgs = service.getNewPackages();

        expect(newPkgs.length).toBeGreaterThan(0);
        expect(newPkgs.every(p => p.isNew)).toBe(true);
      });
    });

    describe('getCategories', () => {
      it('should return category summary', () => {
        const categories = service.getCategories();

        expect(categories.length).toBeGreaterThan(0);
        categories.forEach(cat => {
          expect(cat.category).toBeDefined();
          expect(cat.count).toBeGreaterThan(0);
          expect(cat.packages.length).toBe(cat.count);
        });
      });

      it('should include all expected categories', () => {
        const categories = service.getCategories();
        const categoryNames = categories.map(c => c.category);

        expect(categoryNames).toContain('accounting');
        expect(categoryNames).toContain('tax');
        expect(categoryNames).toContain('compliance');
        expect(categoryNames).toContain('training');
      });
    });
  });

  describe('Tier Access Control', () => {
    describe('canBookPackage', () => {
      it('should allow booking FREE tier package with FREE account', async () => {
        mockPrismaService.organization.findUnique.mockResolvedValue({ tier: Tier.FREE });

        const result = await service.canBookPackage('org-1', 'pkg_accounting_setup');

        expect(result.canBook).toBe(true);
      });

      it('should deny booking PRO tier package with FREE account', async () => {
        mockPrismaService.organization.findUnique.mockResolvedValue({ tier: Tier.FREE });

        const result = await service.canBookPackage('org-1', 'pkg_tax_planning');

        expect(result.canBook).toBe(false);
        expect(result.reason).toContain('PRO tier');
      });

      it('should allow booking PRO tier package with PRO account', async () => {
        mockPrismaService.organization.findUnique.mockResolvedValue({ tier: Tier.PRO });

        const result = await service.canBookPackage('org-1', 'pkg_tax_planning');

        expect(result.canBook).toBe(true);
      });

      it('should allow booking BUSINESS tier package with BUSINESS account', async () => {
        mockPrismaService.organization.findUnique.mockResolvedValue({ tier: Tier.BUSINESS });

        const result = await service.canBookPackage('org-1', 'pkg_saga_migration');

        expect(result.canBook).toBe(true);
      });

      it('should return error for non-existent package', async () => {
        const result = await service.canBookPackage('org-1', 'invalid-package');

        expect(result.canBook).toBe(false);
        expect(result.reason).toBe('Package not found');
      });

      it('should return error for non-existent organization', async () => {
        mockPrismaService.organization.findUnique.mockResolvedValue(null);

        const result = await service.canBookPackage('invalid-org', 'pkg_accounting_setup');

        expect(result.canBook).toBe(false);
        expect(result.reason).toBe('Organization not found');
      });
    });
  });

  describe('Availability Slots', () => {
    describe('getAvailableSlots', () => {
      it('should return slots for weekday', () => {
        // Find a Monday
        const monday = new Date();
        monday.setDate(monday.getDate() + (1 + 7 - monday.getDay()) % 7);
        const dateStr = monday.toISOString().split('T')[0];

        const slots = service.getAvailableSlots(dateStr, 'pkg_training_basic');

        expect(slots.length).toBeGreaterThan(0);
        slots.forEach(slot => {
          expect(slot.date).toBe(dateStr);
          expect(slot.startTime).toBeDefined();
          expect(slot.endTime).toBeDefined();
          expect(typeof slot.available).toBe('boolean');
        });
      });

      it('should return empty array for weekend', () => {
        // Find a Saturday
        const saturday = new Date();
        saturday.setDate(saturday.getDate() + (6 - saturday.getDay() + 7) % 7);
        const dateStr = saturday.toISOString().split('T')[0];

        const slots = service.getAvailableSlots(dateStr, 'pkg_training_basic');

        expect(slots).toEqual([]);
      });

      it('should throw NotFoundException for invalid package', () => {
        expect(() => service.getAvailableSlots('2025-01-15', 'invalid-package')).toThrow(NotFoundException);
      });

      it('should include consultant information', () => {
        // Find a Monday
        const monday = new Date();
        monday.setDate(monday.getDate() + (1 + 7 - monday.getDay()) % 7);
        const dateStr = monday.toISOString().split('T')[0];

        const slots = service.getAvailableSlots(dateStr, 'pkg_training_basic');

        slots.forEach(slot => {
          expect(slot.consultantId).toBeDefined();
          expect(slot.consultantName).toBeDefined();
        });
      });
    });
  });

  describe('Booking Management', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);

    beforeEach(() => {
      mockPrismaService.organization.findUnique.mockResolvedValue({ tier: Tier.BUSINESS });
    });

    describe('createBooking', () => {
      it('should create a booking', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
          'Please help with setup',
          'RON',
        );

        expect(booking.id).toBeDefined();
        expect(booking.organizationId).toBe('org-1');
        expect(booking.userId).toBe('user-1');
        expect(booking.packageId).toBe('pkg_accounting_setup');
        expect(booking.status).toBe('pending');
        expect(booking.paymentStatus).toBe('pending');
      });

      it('should set correct amount for RON', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
          undefined,
          'RON',
        );

        expect(booking.currency).toBe('RON');
        expect(booking.amount).toBe(599);
      });

      it('should set correct amount for EUR', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
          undefined,
          'EUR',
        );

        expect(booking.currency).toBe('EUR');
        expect(booking.amount).toBe(120);
      });

      it('should calculate end time based on package duration', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );

        const expectedEnd = new Date(futureDate);
        expectedEnd.setMinutes(expectedEnd.getMinutes() + 120);

        expect(booking.endTime.getTime()).toBe(expectedEnd.getTime());
      });

      it('should include package details', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );

        expect(booking.package).toBeDefined();
        expect(booking.package.name).toBe('Accounting System Setup');
      });

      it('should assign consultant', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );

        expect(booking.consultantId).toBeDefined();
        expect(booking.consultantName).toBeDefined();
      });

      it('should throw ForbiddenException for insufficient tier', async () => {
        mockPrismaService.organization.findUnique.mockResolvedValue({ tier: Tier.FREE });

        await expect(
          service.createBooking('org-1', 'user-1', 'pkg_saga_migration', futureDate),
        ).rejects.toThrow(ForbiddenException);
      });
    });

    describe('getBooking', () => {
      it('should return booking by ID', async () => {
        const created = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );

        const booking = service.getBooking(created.id);

        expect(booking.id).toBe(created.id);
      });

      it('should throw NotFoundException for invalid booking', () => {
        expect(() => service.getBooking('invalid-id')).toThrow(NotFoundException);
      });
    });

    describe('getOrganizationBookings', () => {
      beforeEach(async () => {
        await service.createBooking('org-1', 'user-1', 'pkg_accounting_setup', futureDate);
        await service.createBooking('org-1', 'user-1', 'pkg_tax_planning', new Date(futureDate.getTime() + 86400000));
        await service.createBooking('org-2', 'user-2', 'pkg_accounting_setup', futureDate);
      });

      it('should return bookings for organization', () => {
        const bookings = service.getOrganizationBookings('org-1');

        expect(bookings.length).toBe(2);
        expect(bookings.every(b => b.organizationId === 'org-1')).toBe(true);
      });

      it('should sort by scheduledAt descending', () => {
        const bookings = service.getOrganizationBookings('org-1');

        for (let i = 1; i < bookings.length; i++) {
          expect(bookings[i - 1].scheduledAt.getTime()).toBeGreaterThanOrEqual(
            bookings[i].scheduledAt.getTime()
          );
        }
      });

      it('should return empty array for org without bookings', () => {
        const bookings = service.getOrganizationBookings('org-99');

        expect(bookings).toEqual([]);
      });
    });

    describe('getUpcomingBookings', () => {
      it('should return only future non-cancelled bookings', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 7);

        await service.createBooking('org-1', 'user-1', 'pkg_accounting_setup', futureDate);
        const cancelled = await service.createBooking('org-1', 'user-1', 'pkg_tax_planning', new Date(futureDate.getTime() + 86400000));
        service.cancelBooking(cancelled.id);

        const upcoming = service.getUpcomingBookings('org-1');

        expect(upcoming.length).toBe(1);
        expect(upcoming.every(b => b.scheduledAt > new Date())).toBe(true);
        expect(upcoming.every(b => b.status !== 'cancelled')).toBe(true);
      });
    });

    describe('confirmBooking', () => {
      it('should confirm pending booking', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );

        const confirmed = service.confirmBooking(booking.id);

        expect(confirmed.status).toBe('confirmed');
        expect(confirmed.paymentStatus).toBe('paid');
        expect(confirmed.meetingLink).toBeDefined();
      });

      it('should throw BadRequestException for non-pending booking', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );
        service.confirmBooking(booking.id);

        expect(() => service.confirmBooking(booking.id)).toThrow(BadRequestException);
      });
    });

    describe('cancelBooking', () => {
      it('should cancel booking', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );

        const cancelled = service.cancelBooking(booking.id, 'Schedule conflict');

        expect(cancelled.status).toBe('cancelled');
        expect(cancelled.notes).toContain('Schedule conflict');
      });

      it('should refund if cancelled > 24 hours before', async () => {
        const farFuture = new Date();
        farFuture.setDate(farFuture.getDate() + 14);

        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          farFuture,
        );
        service.confirmBooking(booking.id);

        const cancelled = service.cancelBooking(booking.id);

        expect(cancelled.paymentStatus).toBe('refunded');
      });

      it('should throw BadRequestException for completed booking', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );
        service.confirmBooking(booking.id);
        service.completeBooking(booking.id);

        expect(() => service.cancelBooking(booking.id)).toThrow(BadRequestException);
      });
    });

    describe('rescheduleBooking', () => {
      it('should reschedule booking', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );

        const newDate = new Date(futureDate.getTime() + 7 * 86400000);
        const rescheduled = service.rescheduleBooking(booking.id, newDate);

        expect(rescheduled.status).toBe('rescheduled');
        expect(rescheduled.scheduledAt.getTime()).toBe(newDate.getTime());
      });

      it('should update end time', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );

        const newDate = new Date(futureDate.getTime() + 7 * 86400000);
        const rescheduled = service.rescheduleBooking(booking.id, newDate);

        const expectedEnd = new Date(newDate);
        expectedEnd.setMinutes(expectedEnd.getMinutes() + 120);

        expect(rescheduled.endTime.getTime()).toBe(expectedEnd.getTime());
      });

      it('should throw BadRequestException for completed booking', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );
        service.confirmBooking(booking.id);
        service.completeBooking(booking.id);

        expect(() => service.rescheduleBooking(booking.id, new Date())).toThrow(BadRequestException);
      });
    });

    describe('completeBooking', () => {
      it('should complete confirmed booking', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );
        service.confirmBooking(booking.id);

        const completed = service.completeBooking(booking.id);

        expect(completed.status).toBe('completed');
      });

      it('should attach deliverables', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );
        service.confirmBooking(booking.id);

        const completed = service.completeBooking(booking.id, [
          'chart_of_accounts.pdf',
          'setup_guide.pdf',
        ]);

        expect(completed.attachments).toEqual(['chart_of_accounts.pdf', 'setup_guide.pdf']);
      });

      it('should throw BadRequestException for pending booking', async () => {
        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );

        expect(() => service.completeBooking(booking.id)).toThrow(BadRequestException);
      });
    });
  });

  describe('Feedback', () => {
    let completedBooking: ConsultingBooking;

    beforeEach(async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({ tier: Tier.BUSINESS });

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      completedBooking = await service.createBooking(
        'org-1',
        'user-1',
        'pkg_accounting_setup',
        futureDate,
      );
      service.confirmBooking(completedBooking.id);
      service.completeBooking(completedBooking.id);
    });

    describe('submitFeedback', () => {
      it('should submit feedback', () => {
        const updated = service.submitFeedback(
          completedBooking.id,
          5,
          'Excellent service!',
          true,
        );

        expect(updated.feedback).toBeDefined();
        expect(updated.feedback?.rating).toBe(5);
        expect(updated.feedback?.comment).toBe('Excellent service!');
        expect(updated.feedback?.wouldRecommend).toBe(true);
        expect(updated.feedback?.submittedAt).toBeDefined();
      });

      it('should accept rating without comment', () => {
        const updated = service.submitFeedback(completedBooking.id, 4);

        expect(updated.feedback?.rating).toBe(4);
        expect(updated.feedback?.comment).toBeUndefined();
      });

      it('should throw BadRequestException for non-completed booking', async () => {
        const pending = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          new Date(Date.now() + 86400000),
        );

        expect(() => service.submitFeedback(pending.id, 5)).toThrow(BadRequestException);
      });

      it('should throw BadRequestException for invalid rating', () => {
        expect(() => service.submitFeedback(completedBooking.id, 0)).toThrow(BadRequestException);
        expect(() => service.submitFeedback(completedBooking.id, 6)).toThrow(BadRequestException);
      });
    });
  });

  describe('Invoicing', () => {
    describe('generateInvoice', () => {
      it('should generate invoice with VAT calculation', async () => {
        mockPrismaService.organization.findUnique.mockResolvedValue({ tier: Tier.BUSINESS });

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );

        const invoice = service.generateInvoice(booking.id);

        expect(invoice.id).toBeDefined();
        expect(invoice.bookingId).toBe(booking.id);
        expect(invoice.invoiceNumber).toContain('CONS-');
        expect(invoice.totalAmount).toBe(599);
        // 19% VAT
        expect(invoice.vatAmount).toBeCloseTo(599 - 599 / 1.19, 1);
      });

      it('should set status based on payment', async () => {
        mockPrismaService.organization.findUnique.mockResolvedValue({ tier: Tier.BUSINESS });

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );

        // Unpaid
        let invoice = service.generateInvoice(booking.id);
        expect(invoice.status).toBe('draft');

        // Paid
        service.confirmBooking(booking.id);
        invoice = service.generateInvoice(booking.id);
        expect(invoice.status).toBe('paid');
      });

      it('should set 30-day due date', async () => {
        mockPrismaService.organization.findUnique.mockResolvedValue({ tier: Tier.BUSINESS });

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const booking = await service.createBooking(
          'org-1',
          'user-1',
          'pkg_accounting_setup',
          futureDate,
        );

        const invoice = service.generateInvoice(booking.id);
        const daysDiff = (invoice.dueDate.getTime() - invoice.issuedAt.getTime()) / (1000 * 60 * 60 * 24);

        expect(Math.round(daysDiff)).toBe(30);
      });
    });
  });

  describe('Statistics', () => {
    beforeEach(async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({ tier: Tier.BUSINESS });

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      // Create and complete some bookings (with past dates - already happened)
      const booking1 = await service.createBooking('org-1', 'user-1', 'pkg_accounting_setup', pastDate);
      service.confirmBooking(booking1.id);
      service.completeBooking(booking1.id);
      service.submitFeedback(booking1.id, 5, 'Great!');

      const booking2 = await service.createBooking('org-1', 'user-1', 'pkg_tax_planning', new Date(pastDate.getTime() + 86400000));
      service.confirmBooking(booking2.id);
      service.completeBooking(booking2.id);
      service.submitFeedback(booking2.id, 4);

      // Create upcoming booking (future date)
      await service.createBooking('org-1', 'user-1', 'pkg_efactura_setup', futureDate);
    });

    describe('getStats', () => {
      it('should return total bookings', () => {
        const stats = service.getStats('org-1');

        expect(stats.totalBookings).toBe(3);
      });

      it('should return completed bookings', () => {
        const stats = service.getStats('org-1');

        expect(stats.completedBookings).toBe(2);
      });

      it('should return upcoming bookings', () => {
        const stats = service.getStats('org-1');

        expect(stats.upcomingBookings).toBe(1);
      });

      it('should calculate total revenue', () => {
        const stats = service.getStats('org-1');

        expect(stats.totalRevenue).toBe(599 + 799); // accounting + tax planning
      });

      it('should calculate average rating', () => {
        const stats = service.getStats('org-1');

        expect(stats.averageRating).toBe(4.5); // (5 + 4) / 2
      });

      it('should return popular services', () => {
        const stats = service.getStats('org-1');

        expect(stats.popularServices.length).toBeGreaterThan(0);
        expect(stats.popularServices[0]).toHaveProperty('type');
        expect(stats.popularServices[0]).toHaveProperty('count');
      });

      it('should return zero stats for org without bookings', () => {
        const stats = service.getStats('org-99');

        expect(stats.totalBookings).toBe(0);
        expect(stats.totalRevenue).toBe(0);
        expect(stats.averageRating).toBe(0);
      });
    });
  });

  describe('Romanian Compliance Packages', () => {
    describe('e-Factura Setup Package', () => {
      it('should exist', () => {
        const pkg = service.getPackage('pkg_efactura_setup');

        expect(pkg).toBeDefined();
        expect(pkg.type).toBe('efactura_setup');
        expect(pkg.category).toBe('compliance');
      });

      it('should include SPV integration feature', () => {
        const pkg = service.getPackage('pkg_efactura_setup');

        expect(pkg.features.some(f => f.includes('SPV'))).toBe(true);
        expect(pkg.featuresRo.some(f => f.includes('SPV'))).toBe(true);
      });

      it('should include UBL template feature', () => {
        const pkg = service.getPackage('pkg_efactura_setup');

        expect(pkg.features.some(f => f.includes('UBL'))).toBe(true);
      });
    });

    describe('SAF-T D406 Package', () => {
      it('should exist', () => {
        const pkg = service.getPackage('pkg_saft_optimization');

        expect(pkg).toBeDefined();
        expect(pkg.type).toBe('saft_optimization');
      });

      it('should reference Order 1783/2021', () => {
        const pkg = service.getPackage('pkg_saft_optimization');

        expect(pkg.descriptionRo).toContain('1783/2021');
      });

      it('should include monthly reporting optimization', () => {
        const pkg = service.getPackage('pkg_saft_optimization');

        expect(pkg.features.some(f => f.includes('Monthly'))).toBe(true);
      });
    });

    describe('HR & Revisal Compliance Package', () => {
      it('should exist', () => {
        const pkg = service.getPackage('pkg_hr_compliance');

        expect(pkg).toBeDefined();
        expect(pkg.type).toBe('hr_compliance');
      });

      it('should include Revisal integration check', () => {
        const pkg = service.getPackage('pkg_hr_compliance');

        expect(pkg.features.some(f => f.includes('Revisal'))).toBe(true);
        expect(pkg.featuresRo.some(f => f.includes('Revisal'))).toBe(true);
      });
    });

    describe('VAT Analysis Package', () => {
      it('should exist', () => {
        const pkg = service.getPackage('pkg_vat_analysis');

        expect(pkg).toBeDefined();
        expect(pkg.type).toBe('vat_analysis');
      });

      it('should reference Legea 141/2025', () => {
        const pkg = service.getPackage('pkg_vat_analysis');

        expect(pkg.description).toContain('Legea 141/2025');
      });

      it('should include 21%/11% VAT rates', () => {
        const pkg = service.getPackage('pkg_vat_analysis');

        expect(pkg.features.some(f => f.includes('21%/11%'))).toBe(true);
      });
    });

    describe('SAGA Migration Package', () => {
      it('should exist', () => {
        const pkg = service.getPackage('pkg_saga_migration');

        expect(pkg).toBeDefined();
        expect(pkg.type).toBe('saga_migration');
      });

      it('should reference SAGA v3.2', () => {
        const pkg = service.getPackage('pkg_saga_migration');

        expect(pkg.description).toContain('SAGA v3.2');
      });

      it('should include parallel running support', () => {
        const pkg = service.getPackage('pkg_saga_migration');

        expect(pkg.features.some(f => f.includes('Parallel'))).toBe(true);
      });
    });
  });

  describe('Pricing', () => {
    it('should have reasonable RON/EUR conversion ratio', () => {
      const packages = service.getAllPackages();

      packages.forEach(pkg => {
        const ratio = pkg.priceRon / pkg.priceEur;
        // RON to EUR ratio should be approximately 4.5-5.5
        expect(ratio).toBeGreaterThan(4);
        expect(ratio).toBeLessThan(6);
      });
    });

    it('should have prices that cover 19% VAT', () => {
      const packages = service.getAllPackages();

      packages.forEach(pkg => {
        // Prices should be reasonable (at least 100 RON net)
        const netPrice = pkg.priceRon / 1.19;
        expect(netPrice).toBeGreaterThan(80);
      });
    });
  });
});
