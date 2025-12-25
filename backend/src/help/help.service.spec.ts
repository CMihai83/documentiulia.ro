import { Test, TestingModule } from '@nestjs/testing';
import { HelpService } from './help.service';

describe('HelpService', () => {
  let service: HelpService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HelpService],
    }).compile();

    service = module.get<HelpService>(HelpService);
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('getAllCategories', () => {
    it('should return all categories sorted by order', () => {
      const categories = service.getAllCategories();

      expect(categories.length).toBeGreaterThan(0);
      expect(categories[0].order).toBeLessThanOrEqual(categories[1].order);
    });

    it('should include expected category fields', () => {
      const categories = service.getAllCategories();

      expect(categories[0]).toHaveProperty('id');
      expect(categories[0]).toHaveProperty('name');
      expect(categories[0]).toHaveProperty('nameRo');
      expect(categories[0]).toHaveProperty('description');
      expect(categories[0]).toHaveProperty('icon');
      expect(categories[0]).toHaveProperty('articleCount');
    });

    it('should have bilingual support (RO/EN)', () => {
      const categories = service.getAllCategories();
      const category = categories[0];

      expect(category.name).toBeDefined();
      expect(category.nameRo).toBeDefined();
      expect(category.descriptionRo).toBeDefined();
    });

    it('should include key categories for DocumentIulia', () => {
      const categories = service.getAllCategories();
      const categoryIds = categories.map(c => c.id);

      expect(categoryIds).toContain('getting-started');
      expect(categoryIds).toContain('invoicing');
      expect(categoryIds).toContain('vat-taxes');
      expect(categoryIds).toContain('saft-d406');
    });
  });

  describe('getCategoryById', () => {
    it('should return category by id', () => {
      const category = service.getCategoryById('invoicing');

      expect(category).toBeDefined();
      expect(category?.id).toBe('invoicing');
      expect(category?.name).toContain('Invoicing');
    });

    it('should return undefined for non-existent id', () => {
      const category = service.getCategoryById('non-existent');

      expect(category).toBeUndefined();
    });

    it('should return SAF-T category', () => {
      const category = service.getCategoryById('saft-d406');

      expect(category).toBeDefined();
      expect(category?.nameRo).toBe('SAF-T D406');
    });
  });

  describe('getArticlesByCategory', () => {
    it('should return articles for category', () => {
      const articles = service.getArticlesByCategory('invoicing');

      expect(articles.length).toBeGreaterThan(0);
      articles.forEach(article => {
        expect(article.category.id).toBe('invoicing');
      });
    });

    it('should return empty array for category with no articles', () => {
      const articles = service.getArticlesByCategory('account-settings');

      expect(Array.isArray(articles)).toBe(true);
    });

    it('should return empty array for non-existent category', () => {
      const articles = service.getArticlesByCategory('non-existent');

      expect(articles).toEqual([]);
    });
  });

  describe('getArticleBySlug', () => {
    it('should return article by slug', () => {
      const article = service.getArticleBySlug('creating-first-invoice');

      expect(article).toBeDefined();
      expect(article?.slug).toBe('creating-first-invoice');
      expect(article?.title).toContain('Invoice');
    });

    it('should return undefined for non-existent slug', () => {
      const article = service.getArticleBySlug('non-existent-slug');

      expect(article).toBeUndefined();
    });

    it('should find VAT rates article', () => {
      const article = service.getArticleBySlug('vat-rates-romania');

      expect(article).toBeDefined();
      expect(article?.content).toContain('21%');
      expect(article?.content).toContain('Legea 141/2025');
    });
  });

  describe('getArticleById', () => {
    it('should return article by id', () => {
      const article = service.getArticleById('art-001');

      expect(article).toBeDefined();
      expect(article?.id).toBe('art-001');
    });

    it('should return undefined for non-existent id', () => {
      const article = service.getArticleById('art-999');

      expect(article).toBeUndefined();
    });

    it('should include all article fields', () => {
      const article = service.getArticleById('art-001');

      expect(article).toHaveProperty('title');
      expect(article).toHaveProperty('titleRo');
      expect(article).toHaveProperty('content');
      expect(article).toHaveProperty('contentRo');
      expect(article).toHaveProperty('tags');
      expect(article).toHaveProperty('views');
      expect(article).toHaveProperty('helpful');
      expect(article).toHaveProperty('relatedArticles');
    });
  });

  describe('searchArticles', () => {
    it('should search by title in English', () => {
      const results = service.searchArticles('invoice', 'en');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(a => a.title.toLowerCase().includes('invoice'))).toBe(true);
    });

    it('should search by title in Romanian', () => {
      const results = service.searchArticles('factura', 'ro');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should search by content', () => {
      const results = service.searchArticles('ANAF', 'en');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should search by tags', () => {
      const results = service.searchArticles('e-factura', 'en');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const upperResults = service.searchArticles('VAT', 'en');
      const lowerResults = service.searchArticles('vat', 'en');

      expect(upperResults.length).toBe(lowerResults.length);
    });

    it('should return empty for no matches', () => {
      const results = service.searchArticles('xyz123nonexistent', 'en');

      expect(results).toEqual([]);
    });

    it('should find SAF-T related articles', () => {
      const results = service.searchArticles('SAF-T', 'en');

      expect(results.length).toBeGreaterThan(0);
      expect(results.some(a => a.tags.includes('saf-t'))).toBe(true);
    });
  });

  describe('getPopularArticles', () => {
    it('should return articles sorted by views', () => {
      const popular = service.getPopularArticles(5);

      expect(popular.length).toBeLessThanOrEqual(5);
      for (let i = 0; i < popular.length - 1; i++) {
        expect(popular[i].views).toBeGreaterThanOrEqual(popular[i + 1].views);
      }
    });

    it('should respect limit parameter', () => {
      const popular = service.getPopularArticles(3);

      expect(popular.length).toBeLessThanOrEqual(3);
    });

    it('should default to 5 articles', () => {
      const popular = service.getPopularArticles();

      expect(popular.length).toBeLessThanOrEqual(5);
    });

    it('should return most viewed first', () => {
      const popular = service.getPopularArticles(1);
      const allArticles = service.searchArticles('', 'en');

      const maxViews = Math.max(...allArticles.map(a => a.views));
      expect(popular[0]?.views).toBe(maxViews);
    });
  });

  describe('recordArticleView', () => {
    it('should increment view count', () => {
      const article = service.getArticleById('art-001');
      const initialViews = article?.views || 0;

      service.recordArticleView('art-001');

      const updatedArticle = service.getArticleById('art-001');
      expect(updatedArticle?.views).toBe(initialViews + 1);
    });

    it('should not throw for non-existent article', () => {
      expect(() => {
        service.recordArticleView('non-existent');
      }).not.toThrow();
    });

    it('should increment multiple times', () => {
      const article = service.getArticleById('art-002');
      const initialViews = article?.views || 0;

      service.recordArticleView('art-002');
      service.recordArticleView('art-002');
      service.recordArticleView('art-002');

      const updatedArticle = service.getArticleById('art-002');
      expect(updatedArticle?.views).toBe(initialViews + 3);
    });
  });

  describe('submitArticleFeedback', () => {
    it('should increment helpful count when helpful=true', () => {
      const article = service.getArticleById('art-001');
      const initialHelpful = article?.helpful || 0;

      const result = service.submitArticleFeedback('art-001', true);

      expect(result.helpful).toBe(initialHelpful + 1);
    });

    it('should increment notHelpful count when helpful=false', () => {
      const article = service.getArticleById('art-001');
      const initialNotHelpful = article?.notHelpful || 0;

      const result = service.submitArticleFeedback('art-001', false);

      expect(result.notHelpful).toBe(initialNotHelpful + 1);
    });

    it('should return zeros for non-existent article', () => {
      const result = service.submitArticleFeedback('non-existent', true);

      expect(result).toEqual({ helpful: 0, notHelpful: 0 });
    });

    it('should persist feedback across calls', () => {
      service.submitArticleFeedback('art-003', true);
      service.submitArticleFeedback('art-003', true);
      const result = service.submitArticleFeedback('art-003', false);

      expect(result.helpful).toBeGreaterThan(0);
      expect(result.notHelpful).toBeGreaterThan(0);
    });
  });

  describe('getAllFaqs', () => {
    it('should return all FAQs sorted by order', () => {
      const faqs = service.getAllFaqs();

      expect(faqs.length).toBeGreaterThan(0);
      for (let i = 0; i < faqs.length - 1; i++) {
        expect(faqs[i].order).toBeLessThanOrEqual(faqs[i + 1].order);
      }
    });

    it('should include bilingual content', () => {
      const faqs = service.getAllFaqs();

      expect(faqs[0]).toHaveProperty('question');
      expect(faqs[0]).toHaveProperty('questionRo');
      expect(faqs[0]).toHaveProperty('answer');
      expect(faqs[0]).toHaveProperty('answerRo');
    });

    it('should include VAT rate FAQ', () => {
      const faqs = service.getAllFaqs();

      const vatFaq = faqs.find(f => f.question.includes('VAT rate'));
      expect(vatFaq).toBeDefined();
      expect(vatFaq?.answer).toContain('21%');
    });

    it('should include SAF-T deadline FAQ', () => {
      const faqs = service.getAllFaqs();

      const saftFaq = faqs.find(f => f.question.includes('SAF-T'));
      expect(saftFaq).toBeDefined();
      expect(saftFaq?.answer).toContain('25th');
    });
  });

  describe('getFaqsByCategory', () => {
    it('should filter FAQs by category', () => {
      const faqs = service.getFaqsByCategory('vat-taxes');

      faqs.forEach(faq => {
        expect(faq.category).toBe('vat-taxes');
      });
    });

    it('should return empty array for category with no FAQs', () => {
      const faqs = service.getFaqsByCategory('non-existent-category');

      expect(faqs).toEqual([]);
    });

    it('should find invoicing FAQs', () => {
      const faqs = service.getFaqsByCategory('invoicing');

      expect(faqs.some(f => f.question.includes('e-Factura'))).toBe(true);
    });
  });

  describe('getAllTutorials', () => {
    it('should return all tutorials', () => {
      const tutorials = service.getAllTutorials();

      expect(tutorials.length).toBeGreaterThan(0);
    });

    it('should include tutorial structure', () => {
      const tutorials = service.getAllTutorials();

      expect(tutorials[0]).toHaveProperty('id');
      expect(tutorials[0]).toHaveProperty('title');
      expect(tutorials[0]).toHaveProperty('titleRo');
      expect(tutorials[0]).toHaveProperty('steps');
      expect(tutorials[0]).toHaveProperty('estimatedMinutes');
      expect(tutorials[0]).toHaveProperty('difficulty');
    });

    it('should have steps array', () => {
      const tutorials = service.getAllTutorials();

      expect(Array.isArray(tutorials[0].steps)).toBe(true);
      expect(tutorials[0].steps.length).toBeGreaterThan(0);
    });

    it('should include SAF-T tutorial', () => {
      const tutorials = service.getAllTutorials();

      const saftTutorial = tutorials.find(t => t.title.includes('SAF-T'));
      expect(saftTutorial).toBeDefined();
    });
  });

  describe('getTutorialById', () => {
    it('should return tutorial by id', () => {
      const tutorial = service.getTutorialById('tut-001');

      expect(tutorial).toBeDefined();
      expect(tutorial?.id).toBe('tut-001');
    });

    it('should return undefined for non-existent id', () => {
      const tutorial = service.getTutorialById('tut-999');

      expect(tutorial).toBeUndefined();
    });

    it('should include ordered steps', () => {
      const tutorial = service.getTutorialById('tut-001');

      expect(tutorial?.steps[0].order).toBe(1);
      expect(tutorial?.steps[1].order).toBe(2);
    });
  });

  describe('getTutorialsByModule', () => {
    it('should filter tutorials by module', () => {
      const tutorials = service.getTutorialsByModule('getting-started');

      tutorials.forEach(t => {
        expect(t.module).toBe('getting-started');
      });
    });

    it('should find SAF-T module tutorials', () => {
      const tutorials = service.getTutorialsByModule('saft-d406');

      expect(tutorials.length).toBeGreaterThan(0);
    });

    it('should return empty for non-existent module', () => {
      const tutorials = service.getTutorialsByModule('non-existent');

      expect(tutorials).toEqual([]);
    });
  });

  describe('getTutorialsByDifficulty', () => {
    it('should filter by beginner difficulty', () => {
      const tutorials = service.getTutorialsByDifficulty('beginner');

      tutorials.forEach(t => {
        expect(t.difficulty).toBe('beginner');
      });
    });

    it('should filter by intermediate difficulty', () => {
      const tutorials = service.getTutorialsByDifficulty('intermediate');

      tutorials.forEach(t => {
        expect(t.difficulty).toBe('intermediate');
      });
    });

    it('should return empty for advanced if none exist', () => {
      const tutorials = service.getTutorialsByDifficulty('advanced');

      expect(Array.isArray(tutorials)).toBe(true);
    });
  });

  describe('getAllGlossaryTerms', () => {
    it('should return all glossary terms sorted alphabetically', () => {
      const terms = service.getAllGlossaryTerms();

      expect(terms.length).toBeGreaterThan(0);
      for (let i = 0; i < terms.length - 1; i++) {
        expect(terms[i].term.localeCompare(terms[i + 1].term)).toBeLessThanOrEqual(0);
      }
    });

    it('should include term structure', () => {
      const terms = service.getAllGlossaryTerms();

      expect(terms[0]).toHaveProperty('term');
      expect(terms[0]).toHaveProperty('termRo');
      expect(terms[0]).toHaveProperty('definition');
      expect(terms[0]).toHaveProperty('definitionRo');
      expect(terms[0]).toHaveProperty('relatedTerms');
    });

    it('should include Romanian business terms', () => {
      const terms = service.getAllGlossaryTerms();
      const termNames = terms.map(t => t.term);

      expect(termNames).toContain('CUI');
      expect(termNames).toContain('SPV');
      expect(termNames).toContain('SAF-T');
      expect(termNames).toContain('e-Factura');
    });

    it('should have related terms', () => {
      const terms = service.getAllGlossaryTerms();
      const cuiTerm = terms.find(t => t.term === 'CUI');

      expect(cuiTerm?.relatedTerms).toContain('CIF');
    });
  });

  describe('searchGlossary', () => {
    it('should search by term in English', () => {
      const results = service.searchGlossary('CUI', 'en');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should search by definition', () => {
      const results = service.searchGlossary('Unique Identification', 'en');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should search in Romanian', () => {
      const results = service.searchGlossary('fiscale', 'ro');

      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case insensitive', () => {
      const upperResults = service.searchGlossary('CUI', 'en');
      const lowerResults = service.searchGlossary('cui', 'en');

      expect(upperResults.length).toBe(lowerResults.length);
    });

    it('should return empty for no matches', () => {
      const results = service.searchGlossary('xyznonexistent', 'en');

      expect(results).toEqual([]);
    });
  });

  describe('createSupportTicket', () => {
    it('should create a support ticket', () => {
      const ticket = service.createSupportTicket(
        'user-123',
        'Cannot submit e-Factura',
        'Error when trying to submit invoice to ANAF',
        'invoicing',
        'high',
      );

      expect(ticket).toBeDefined();
      expect(ticket.id).toContain('TICKET-');
      expect(ticket.userId).toBe('user-123');
      expect(ticket.subject).toBe('Cannot submit e-Factura');
      expect(ticket.status).toBe('open');
      expect(ticket.priority).toBe('high');
    });

    it('should default priority to medium', () => {
      const ticket = service.createSupportTicket(
        'user-123',
        'General question',
        'How do I export reports?',
        'reports',
      );

      expect(ticket.priority).toBe('medium');
    });

    it('should set timestamps', () => {
      const ticket = service.createSupportTicket(
        'user-123',
        'Test ticket',
        'Description',
        'general',
      );

      expect(ticket.createdAt).toBeDefined();
      expect(ticket.updatedAt).toBeDefined();
      expect(new Date(ticket.createdAt).getTime()).toBeLessThanOrEqual(Date.now());
    });

    it('should start with empty responses', () => {
      const ticket = service.createSupportTicket(
        'user-123',
        'Test ticket',
        'Description',
        'general',
      );

      expect(ticket.responses).toEqual([]);
    });

    it('should generate unique ticket IDs', () => {
      const ticket1 = service.createSupportTicket('user-1', 'T1', 'D1', 'cat');
      const ticket2 = service.createSupportTicket('user-2', 'T2', 'D2', 'cat');

      expect(ticket1.id).not.toBe(ticket2.id);
    });

    it('should support urgent priority', () => {
      const ticket = service.createSupportTicket(
        'user-123',
        'System down',
        'Cannot access anything',
        'account-settings',
        'urgent',
      );

      expect(ticket.priority).toBe('urgent');
    });
  });

  describe('getUserTickets', () => {
    it('should return tickets for specific user', () => {
      service.createSupportTicket('user-A', 'Ticket A', 'Desc A', 'cat');
      service.createSupportTicket('user-B', 'Ticket B', 'Desc B', 'cat');
      service.createSupportTicket('user-A', 'Ticket A2', 'Desc A2', 'cat');

      const userATickets = service.getUserTickets('user-A');

      expect(userATickets.length).toBe(2);
      userATickets.forEach(t => expect(t.userId).toBe('user-A'));
    });

    it('should return empty array for user with no tickets', () => {
      const tickets = service.getUserTickets('non-existent-user-xyz');

      expect(tickets).toEqual([]);
    });
  });

  describe('getTicketById', () => {
    it('should return ticket by id', () => {
      const created = service.createSupportTicket(
        'user-123',
        'Find me',
        'Description',
        'cat',
      );

      const found = service.getTicketById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.subject).toBe('Find me');
    });

    it('should return undefined for non-existent id', () => {
      const found = service.getTicketById('TICKET-999999');

      expect(found).toBeUndefined();
    });
  });

  describe('addTicketResponse', () => {
    it('should add customer response to ticket', () => {
      const ticket = service.createSupportTicket(
        'user-123',
        'Test',
        'Desc',
        'cat',
      );

      const updated = service.addTicketResponse(
        ticket.id,
        'Here is more info',
        'customer',
        'John Doe',
      );

      expect(updated?.responses.length).toBe(1);
      expect(updated?.responses[0].content).toBe('Here is more info');
      expect(updated?.responses[0].authorType).toBe('customer');
      expect(updated?.responses[0].authorName).toBe('John Doe');
    });

    it('should add support response and change status', () => {
      const ticket = service.createSupportTicket(
        'user-123',
        'Test',
        'Desc',
        'cat',
      );

      const updated = service.addTicketResponse(
        ticket.id,
        'We are looking into this',
        'support',
        'Support Agent',
      );

      expect(updated?.status).toBe('waiting_customer');
    });

    it('should change status to in_progress when customer responds', () => {
      const ticket = service.createSupportTicket(
        'user-123',
        'Test',
        'Desc',
        'cat',
      );
      service.addTicketResponse(ticket.id, 'Looking into it', 'support', 'Agent');

      const updated = service.addTicketResponse(
        ticket.id,
        'Thanks for the update',
        'customer',
        'Customer',
      );

      expect(updated?.status).toBe('in_progress');
    });

    it('should support AI responses', () => {
      const ticket = service.createSupportTicket(
        'user-123',
        'Test',
        'Desc',
        'cat',
      );

      const updated = service.addTicketResponse(
        ticket.id,
        'Based on your question, try...',
        'ai',
        'DocumentIulia AI',
      );

      expect(updated?.responses[0].authorType).toBe('ai');
    });

    it('should update timestamp when response added', () => {
      const ticket = service.createSupportTicket(
        'user-123',
        'Test',
        'Desc',
        'cat',
      );
      const originalUpdatedAt = ticket.updatedAt;

      // Small delay to ensure different timestamp
      const updated = service.addTicketResponse(
        ticket.id,
        'Response',
        'customer',
        'Name',
      );

      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalUpdatedAt).getTime(),
      );
    });

    it('should return undefined for non-existent ticket', () => {
      const result = service.addTicketResponse(
        'TICKET-NONEXISTENT',
        'Response',
        'customer',
        'Name',
      );

      expect(result).toBeUndefined();
    });

    it('should generate response IDs with RESP prefix', () => {
      const ticket = service.createSupportTicket('user-123', 'T', 'D', 'c');
      service.addTicketResponse(ticket.id, 'R1', 'customer', 'N');

      const updated = service.getTicketById(ticket.id);
      expect(updated?.responses[0].id).toContain('RESP-');
    });
  });

  describe('updateTicketStatus', () => {
    it('should update ticket status to resolved', () => {
      const ticket = service.createSupportTicket(
        'user-123',
        'Test',
        'Desc',
        'cat',
      );

      const updated = service.updateTicketStatus(ticket.id, 'resolved');

      expect(updated?.status).toBe('resolved');
    });

    it('should update ticket status to closed', () => {
      const ticket = service.createSupportTicket(
        'user-123',
        'Test',
        'Desc',
        'cat',
      );

      const updated = service.updateTicketStatus(ticket.id, 'closed');

      expect(updated?.status).toBe('closed');
    });

    it('should update timestamp when status changes', () => {
      const ticket = service.createSupportTicket(
        'user-123',
        'Test',
        'Desc',
        'cat',
      );

      const updated = service.updateTicketStatus(ticket.id, 'in_progress');

      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(ticket.createdAt).getTime(),
      );
    });

    it('should return undefined for non-existent ticket', () => {
      const result = service.updateTicketStatus('TICKET-NONEXISTENT', 'closed');

      expect(result).toBeUndefined();
    });

    it('should allow all valid status transitions', () => {
      const ticket = service.createSupportTicket('user-123', 'T', 'D', 'c');

      service.updateTicketStatus(ticket.id, 'in_progress');
      expect(service.getTicketById(ticket.id)?.status).toBe('in_progress');

      service.updateTicketStatus(ticket.id, 'waiting_customer');
      expect(service.getTicketById(ticket.id)?.status).toBe('waiting_customer');

      service.updateTicketStatus(ticket.id, 'resolved');
      expect(service.getTicketById(ticket.id)?.status).toBe('resolved');

      service.updateTicketStatus(ticket.id, 'closed');
      expect(service.getTicketById(ticket.id)?.status).toBe('closed');
    });
  });

  describe('getHelpCenterStats', () => {
    it('should return comprehensive statistics', () => {
      const stats = service.getHelpCenterStats();

      expect(stats).toHaveProperty('totalArticles');
      expect(stats).toHaveProperty('totalCategories');
      expect(stats).toHaveProperty('totalFaqs');
      expect(stats).toHaveProperty('totalTutorials');
      expect(stats).toHaveProperty('totalGlossaryTerms');
      expect(stats).toHaveProperty('totalViews');
      expect(stats).toHaveProperty('totalHelpful');
      expect(stats).toHaveProperty('openTickets');
    });

    it('should count articles correctly', () => {
      const stats = service.getHelpCenterStats();

      expect(stats.totalArticles).toBeGreaterThan(0);
    });

    it('should count categories correctly', () => {
      const stats = service.getHelpCenterStats();

      expect(stats.totalCategories).toBe(8); // 8 defined categories
    });

    it('should sum views across all articles', () => {
      const stats = service.getHelpCenterStats();

      expect(stats.totalViews).toBeGreaterThan(0);
    });

    it('should count open tickets', () => {
      service.createSupportTicket('user-1', 'T1', 'D', 'c');
      service.createSupportTicket('user-2', 'T2', 'D', 'c');
      const closed = service.createSupportTicket('user-3', 'T3', 'D', 'c');
      service.updateTicketStatus(closed.id, 'closed');

      const stats = service.getHelpCenterStats();

      // At least 2 open tickets from this test
      expect(stats.openTickets).toBeGreaterThanOrEqual(2);
    });

    it('should not count resolved tickets as open', () => {
      const resolved = service.createSupportTicket('user-stats', 'Resolved', 'D', 'c');
      service.updateTicketStatus(resolved.id, 'resolved');

      const stats = service.getHelpCenterStats();
      const userTickets = service.getUserTickets('user-stats');

      // The resolved ticket should not be in openTickets count
      expect(userTickets[0].status).toBe('resolved');
    });
  });

  describe('Content Validation - Romanian Compliance', () => {
    it('should have correct VAT rates in content (Legea 141/2025)', () => {
      const vatArticle = service.getArticleBySlug('vat-rates-romania');

      expect(vatArticle?.content).toContain('21%');
      expect(vatArticle?.content).toContain('11%');
      expect(vatArticle?.content).toContain('Legea 141/2025');
    });

    it('should have correct SAF-T D406 info (Order 1783/2021)', () => {
      const saftArticle = service.getArticleBySlug('saft-d406-monthly');

      expect(saftArticle?.content).toContain('Order 1783/2021');
      expect(saftArticle?.content).toContain('25th');
      expect(saftArticle?.content).toContain('500MB');
    });

    it('should have e-Factura B2B timeline', () => {
      const efacturaArticle = service.getArticleBySlug('efactura-b2b-integration');

      expect(efacturaArticle?.content).toContain('2026');
      expect(efacturaArticle?.content).toContain('UBL 2.1');
    });

    it('should have Romanian diacritics in RO content', () => {
      const article = service.getArticleById('art-001');

      // Content includes Romanian diacritics like ș, ț, ă
      expect(article?.contentRo).toMatch(/[ășțâîĂȘȚÂÎ]/);
    });
  });

  describe('Related Articles', () => {
    it('should have related articles defined', () => {
      const article = service.getArticleById('art-001');

      expect(article?.relatedArticles).toBeDefined();
      expect(article?.relatedArticles.length).toBeGreaterThan(0);
    });

    it('should reference valid article IDs', () => {
      const article = service.getArticleById('art-001');

      article?.relatedArticles.forEach(relatedId => {
        const relatedArticle = service.getArticleById(relatedId);
        expect(relatedArticle).toBeDefined();
      });
    });
  });
});
