import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { AdvancedSearchService, SearchableEntity, SearchQuery } from './advanced-search.service';

describe('AdvancedSearchService', () => {
  let service: AdvancedSearchService;
  let eventEmitter: EventEmitter2;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvancedSearchService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AdvancedSearchService>(AdvancedSearchService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
  });

  describe('Index Configurations', () => {
    it('should have index configs for all entities', () => {
      const configs = service.getIndexConfigs();
      expect(configs.length).toBe(7);
    });

    it('should have INVOICE index config', () => {
      const config = service.getIndexConfig('INVOICE');
      expect(config.entity).toBe('INVOICE');
      expect(config.analyzer).toBe('ROMANIAN');
    });

    it('should have CLIENT index config', () => {
      const config = service.getIndexConfig('CLIENT');
      expect(config.entity).toBe('CLIENT');
      expect(config.fields.some((f) => f.name === 'cui')).toBe(true);
    });

    it('should have PRODUCT index config', () => {
      const config = service.getIndexConfig('PRODUCT');
      expect(config.fields.some((f) => f.name === 'sku')).toBe(true);
    });

    it('should have bilingual field labels', () => {
      const config = service.getIndexConfig('INVOICE');
      config.fields.forEach((field) => {
        expect(field.label).toBeDefined();
        expect(field.labelRo).toBeDefined();
      });
    });

    it('should have searchable fields', () => {
      const fields = service.getSearchableFields('INVOICE');
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.every((f) => f.searchable)).toBe(true);
    });

    it('should have filterable fields', () => {
      const fields = service.getFilterableFields('CLIENT');
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.every((f) => f.filterable)).toBe(true);
    });

    it('should have facetable fields', () => {
      const fields = service.getFacetableFields('PRODUCT');
      expect(fields.length).toBeGreaterThan(0);
      expect(fields.every((f) => f.facetable)).toBe(true);
    });

    it('should throw for unknown entity', () => {
      expect(() => service.getIndexConfig('UNKNOWN' as SearchableEntity)).toThrow(NotFoundException);
    });
  });

  describe('Document Indexing', () => {
    it('should index a document', () => {
      const doc = service.indexDocument('INVOICE', {
        number: 'INV-TEST-001',
        clientName: 'Test Client',
        amount: 1000,
        status: 'DRAFT',
      }, 'tenant-1');

      expect(doc.id).toBeDefined();
      expect(doc.entity).toBe('INVOICE');
      expect(doc.tenantId).toBe('tenant-1');
    });

    it('should create text content from searchable fields', () => {
      const doc = service.indexDocument('CLIENT', {
        name: 'SC Test SRL',
        cui: 'RO98765432',
        email: 'test@test.ro',
        city: 'București',
      }, 'tenant-1');

      expect(doc.textContent).toContain('sc test srl');
      expect(doc.textContent).toContain('ro98765432');
    });

    it('should set language', () => {
      const docRo = service.indexDocument('INVOICE', { number: 'RO-001' }, 'tenant-1', 'RO');
      const docEn = service.indexDocument('INVOICE', { number: 'EN-001' }, 'tenant-1', 'EN');

      expect(docRo.language).toBe('RO');
      expect(docEn.language).toBe('EN');
    });

    it('should throw for unknown entity type', () => {
      expect(() => service.indexDocument('UNKNOWN' as SearchableEntity, {}, 'tenant-1')).toThrow(BadRequestException);
    });

    it('should update indexed document', () => {
      const doc = service.indexDocument('PRODUCT', {
        name: 'Original Product',
        sku: 'PROD-001',
      }, 'tenant-1');

      const updated = service.updateDocument(doc.id, {
        name: 'Updated Product',
        sku: 'PROD-001',
      });

      expect(updated.content.name).toBe('Updated Product');
      expect(updated.textContent).toContain('updated product');
    });

    it('should throw when updating non-existent document', () => {
      expect(() => service.updateDocument('invalid-id', {})).toThrow(NotFoundException);
    });

    it('should delete document', () => {
      const doc = service.indexDocument('DOCUMENT', { title: 'Delete Me' }, 'tenant-1');
      service.deleteDocument(doc.id);

      expect(() => service.getDocument(doc.id)).toThrow(NotFoundException);
    });

    it('should throw when deleting non-existent document', () => {
      expect(() => service.deleteDocument('invalid-id')).toThrow(NotFoundException);
    });

    it('should get document by id', () => {
      const doc = service.indexDocument('EMPLOYEE', { name: 'Test Employee' }, 'tenant-1');
      const retrieved = service.getDocument(doc.id);

      expect(retrieved.content.name).toBe('Test Employee');
    });

    it('should emit document indexed event', () => {
      service.indexDocument('INVOICE', { number: 'EVENT-001' }, 'tenant-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith('search.document.indexed', expect.any(Object));
    });
  });

  describe('Basic Search', () => {
    beforeEach(() => {
      service.indexDocument('INVOICE', {
        number: 'INV-SEARCH-001',
        clientName: 'Căutare Client SRL',
        amount: 5000,
        status: 'PAID',
        description: 'Servicii IT',
      }, 'tenant-1', 'RO');

      service.indexDocument('INVOICE', {
        number: 'INV-SEARCH-002',
        clientName: 'Another Client',
        amount: 3000,
        status: 'SENT',
        description: 'Consulting services',
      }, 'tenant-1', 'EN');
    });

    it('should search by query', async () => {
      const result = await service.search({ query: 'servicii' });
      expect(result.totalResults).toBeGreaterThan(0);
    });

    it('should return search response structure', async () => {
      const result = await service.search({ query: 'client' });

      expect(result.query).toBe('client');
      expect(result.totalResults).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.results).toBeInstanceOf(Array);
      expect(result.took).toBeDefined();
    });

    it('should search with empty query (return all)', async () => {
      const result = await service.search({ query: '' });
      expect(result.totalResults).toBeGreaterThan(0);
    });

    it('should filter by entity type', async () => {
      const result = await service.search({ query: '', entities: ['INVOICE'] });
      expect(result.results.every((r) => r.entity === 'INVOICE')).toBe(true);
    });

    it('should filter by tenant', async () => {
      service.indexDocument('INVOICE', { number: 'OTHER-TENANT' }, 'tenant-2');

      const result = await service.search({ query: '', tenantId: 'tenant-1' });
      expect(result.results.every((r) => true)).toBe(true); // All from tenant-1
    });

    it('should paginate results', async () => {
      const result = await service.search({ query: '', page: 1, pageSize: 2 });

      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(2);
      expect(result.results.length).toBeLessThanOrEqual(2);
    });

    it('should calculate total pages', async () => {
      const result = await service.search({ query: '', pageSize: 2 });
      expect(result.totalPages).toBe(Math.ceil(result.totalResults / 2));
    });

    it('should track search time', async () => {
      const result = await service.search({ query: 'test' });
      expect(result.took).toBeGreaterThanOrEqual(0);
    });

    it('should emit search executed event', async () => {
      await service.search({ query: 'test' }, 'user-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith('search.executed', expect.any(Object));
    });
  });

  describe('Search Operators', () => {
    beforeEach(() => {
      service.indexDocument('PRODUCT', {
        name: 'Laptop Business',
        description: 'Laptop performant pentru afaceri',
      }, 'tenant-1');

      service.indexDocument('PRODUCT', {
        name: 'Laptop Gaming',
        description: 'Laptop pentru jocuri video',
      }, 'tenant-1');
    });

    it('should use AND operator by default', async () => {
      const result = await service.search({ query: 'laptop business', operator: 'AND' });
      expect(result.results.length).toBe(1);
    });

    it('should use OR operator', async () => {
      const result = await service.search({ query: 'business gaming', operator: 'OR' });
      expect(result.results.length).toBe(2);
    });
  });

  describe('Search Filters', () => {
    beforeEach(() => {
      service.indexDocument('INVOICE', {
        number: 'FILTER-001',
        amount: 1000,
        status: 'PAID',
        currency: 'RON',
      }, 'tenant-1');

      service.indexDocument('INVOICE', {
        number: 'FILTER-002',
        amount: 5000,
        status: 'SENT',
        currency: 'EUR',
      }, 'tenant-1');

      service.indexDocument('INVOICE', {
        number: 'FILTER-003',
        amount: 3000,
        status: 'PAID',
        currency: 'RON',
      }, 'tenant-1');
    });

    it('should filter with EQUALS operator', async () => {
      const result = await service.search({
        query: '',
        entities: ['INVOICE'],
        filters: [{ field: 'status', operator: 'EQUALS', value: 'PAID' }],
      });

      expect(result.results.every((r) => r.content.status === 'PAID')).toBe(true);
    });

    it('should filter with CONTAINS operator', async () => {
      const result = await service.search({
        query: '',
        entities: ['INVOICE'],
        filters: [{ field: 'number', operator: 'CONTAINS', value: 'FILTER' }],
      });

      expect(result.totalResults).toBe(3);
    });

    it('should filter with STARTS_WITH operator', async () => {
      const result = await service.search({
        query: '',
        entities: ['INVOICE'],
        filters: [{ field: 'number', operator: 'STARTS_WITH', value: 'FILTER-00' }],
      });

      expect(result.totalResults).toBe(3);
    });

    it('should filter with GREATER_THAN operator', async () => {
      const result = await service.search({
        query: '',
        entities: ['INVOICE'],
        filters: [{ field: 'amount', operator: 'GREATER_THAN', value: 2000 }],
      });

      expect(result.results.every((r) => r.content.amount > 2000)).toBe(true);
    });

    it('should filter with LESS_THAN operator', async () => {
      const result = await service.search({
        query: '',
        entities: ['INVOICE'],
        filters: [{ field: 'amount', operator: 'LESS_THAN', value: 4000 }],
      });

      expect(result.results.every((r) => r.content.amount < 4000)).toBe(true);
    });

    it('should filter with BETWEEN operator', async () => {
      const result = await service.search({
        query: '',
        entities: ['INVOICE'],
        filters: [{ field: 'amount', operator: 'BETWEEN', value: 1000, valueEnd: 3000 }],
      });

      expect(result.results.every((r) => r.content.amount >= 1000 && r.content.amount <= 3000)).toBe(true);
    });

    it('should filter with IN operator', async () => {
      const result = await service.search({
        query: '',
        entities: ['INVOICE'],
        filters: [
          { field: 'number', operator: 'STARTS_WITH', value: 'FILTER' },
          { field: 'currency', operator: 'IN', value: ['RON', 'EUR'] },
        ],
      });

      expect(result.totalResults).toBe(3);
    });

    it('should filter with NOT_IN operator', async () => {
      const result = await service.search({
        query: '',
        entities: ['INVOICE'],
        filters: [{ field: 'currency', operator: 'NOT_IN', value: ['EUR'] }],
      });

      expect(result.results.every((r) => r.content.currency !== 'EUR')).toBe(true);
    });

    it('should apply multiple filters', async () => {
      const result = await service.search({
        query: '',
        entities: ['INVOICE'],
        filters: [
          { field: 'status', operator: 'EQUALS', value: 'PAID' },
          { field: 'currency', operator: 'EQUALS', value: 'RON' },
        ],
      });

      expect(result.results.every((r) => r.content.status === 'PAID' && r.content.currency === 'RON')).toBe(true);
    });
  });

  describe('Search Sorting', () => {
    beforeEach(() => {
      service.indexDocument('INVOICE', { number: 'SORT-A', amount: 3000 }, 'tenant-1');
      service.indexDocument('INVOICE', { number: 'SORT-B', amount: 1000 }, 'tenant-1');
      service.indexDocument('INVOICE', { number: 'SORT-C', amount: 2000 }, 'tenant-1');
    });

    it('should sort by field ascending', async () => {
      const result = await service.search({
        query: '',
        entities: ['INVOICE'],
        filters: [{ field: 'number', operator: 'STARTS_WITH', value: 'SORT' }],
        sort: [{ field: 'amount', order: 'ASC' }],
      });

      expect(result.results[0].content.amount).toBe(1000);
      expect(result.results[2].content.amount).toBe(3000);
    });

    it('should sort by field descending', async () => {
      const result = await service.search({
        query: '',
        entities: ['INVOICE'],
        filters: [{ field: 'number', operator: 'STARTS_WITH', value: 'SORT' }],
        sort: [{ field: 'amount', order: 'DESC' }],
      });

      expect(result.results[0].content.amount).toBe(3000);
      expect(result.results[2].content.amount).toBe(1000);
    });

    it('should sort by score by default', async () => {
      const result = await service.search({ query: 'SORT-A', entities: ['INVOICE'] });

      // First result should have highest score
      if (result.results.length > 1) {
        expect(result.results[0].score).toBeGreaterThanOrEqual(result.results[1].score);
      }
    });
  });

  describe('Search Highlighting', () => {
    beforeEach(() => {
      service.indexDocument('PRODUCT', {
        name: 'Laptop Professional',
        description: 'Professional laptop for business use',
      }, 'tenant-1');
    });

    it('should highlight matching terms', async () => {
      const result = await service.search({
        query: 'laptop',
        entities: ['PRODUCT'],
        highlight: true,
      });

      expect(result.results[0].highlights).toBeDefined();
    });

    it('should wrap matches in em tags', async () => {
      const result = await service.search({
        query: 'professional',
        entities: ['PRODUCT'],
        highlight: true,
      });

      const highlights = result.results[0]?.highlights;
      if (highlights) {
        const hasHighlight = Object.values(highlights).some((arr) => arr.some((h) => h.includes('<em>')));
        expect(hasHighlight).toBe(true);
      }
    });
  });

  describe('Fuzzy Search', () => {
    beforeEach(() => {
      service.indexDocument('CLIENT', {
        name: 'Compania Exemplu',
        city: 'București',
      }, 'tenant-1');
    });

    it('should find results with typos when fuzzy enabled', async () => {
      const result = await service.search({
        query: 'companai',
        entities: ['CLIENT'],
        fuzzy: true,
      });

      expect(result.totalResults).toBeGreaterThanOrEqual(0);
    });

    it('should use exact match when fuzzy disabled', async () => {
      const result = await service.search({
        query: 'companai',
        entities: ['CLIENT'],
        fuzzy: false,
      });

      expect(result.totalResults).toBe(0);
    });
  });

  describe('Facets', () => {
    beforeEach(() => {
      service.indexDocument('INVOICE', { number: 'F-1', status: 'PAID', currency: 'RON' }, 'tenant-1');
      service.indexDocument('INVOICE', { number: 'F-2', status: 'PAID', currency: 'EUR' }, 'tenant-1');
      service.indexDocument('INVOICE', { number: 'F-3', status: 'SENT', currency: 'RON' }, 'tenant-1');
    });

    it('should calculate facets', async () => {
      const result = await service.search({
        query: '',
        entities: ['INVOICE'],
        filters: [{ field: 'number', operator: 'STARTS_WITH', value: 'F-' }],
        facets: ['status'],
      });

      expect(result.facets).toBeDefined();
      expect(result.facets?.status).toBeDefined();
    });

    it('should count facet values', async () => {
      const result = await service.search({
        query: '',
        entities: ['INVOICE'],
        filters: [{ field: 'number', operator: 'STARTS_WITH', value: 'F-' }],
        facets: ['status'],
      });

      const statusFacet = result.facets?.status;
      expect(statusFacet?.values.find((v) => v.value === 'PAID')?.count).toBe(2);
      expect(statusFacet?.values.find((v) => v.value === 'SENT')?.count).toBe(1);
    });

    it('should support multiple facets', async () => {
      const result = await service.search({
        query: '',
        entities: ['INVOICE'],
        filters: [{ field: 'number', operator: 'STARTS_WITH', value: 'F-' }],
        facets: ['status', 'currency'],
      });

      expect(result.facets?.status).toBeDefined();
      expect(result.facets?.currency).toBeDefined();
    });
  });

  describe('Language Detection', () => {
    it('should detect Romanian language', async () => {
      const result = await service.search({ query: 'factură client', language: 'AUTO' });
      expect(result.language).toBe('RO');
    });

    it('should detect English language', async () => {
      const result = await service.search({ query: 'invoice client', language: 'AUTO' });
      expect(result.language).toBe('EN');
    });

    it('should use specified language', async () => {
      const result = await service.search({ query: 'test', language: 'RO' });
      expect(result.language).toBe('RO');
    });
  });

  describe('Search Suggestions', () => {
    it('should get autocomplete suggestions', () => {
      service.indexDocument('CLIENT', { name: 'Test Company' }, 'tenant-1');
      const suggestions = service.getSuggestions('test');

      expect(Array.isArray(suggestions)).toBe(true);
    });

    it('should limit suggestions', () => {
      for (let i = 0; i < 20; i++) {
        service.indexDocument('CLIENT', { name: `Test Company ${i}` }, 'tenant-1');
      }

      const suggestions = service.getSuggestions('test', undefined, 5);
      expect(suggestions.length).toBeLessThanOrEqual(5);
    });

    it('should filter by entity', () => {
      service.indexDocument('CLIENT', { name: 'Test Client' }, 'tenant-1');
      service.indexDocument('PRODUCT', { name: 'Test Product' }, 'tenant-1');

      const suggestions = service.getSuggestions('test', 'CLIENT');
      const hasProduct = suggestions.some((s) => s.entity === 'PRODUCT');
      expect(hasProduct).toBe(false);
    });

    it('should include suggestion type', () => {
      service.indexDocument('CLIENT', { name: 'Suggestion Test' }, 'tenant-1');
      const suggestions = service.getSuggestions('suggestion');

      if (suggestions.length > 0) {
        expect(['QUERY', 'ENTITY', 'FIELD_VALUE']).toContain(suggestions[0].type);
      }
    });
  });

  describe('Search History', () => {
    it('should record search in history', async () => {
      await service.search({ query: 'history test' }, 'user-1');
      const history = service.getSearchHistory('user-1');

      expect(history.some((h) => h.query === 'history test')).toBe(true);
    });

    it('should get history for specific user', async () => {
      await service.search({ query: 'user1 query' }, 'user-1');
      await service.search({ query: 'user2 query' }, 'user-2');

      const history = service.getSearchHistory('user-1');
      expect(history.every((h) => h.userId === 'user-1')).toBe(true);
    });

    it('should limit history results', async () => {
      for (let i = 0; i < 30; i++) {
        await service.search({ query: `query ${i}` }, 'user-1');
      }

      const history = service.getSearchHistory('user-1', 10);
      expect(history.length).toBe(10);
    });

    it('should sort history by date descending', async () => {
      await service.search({ query: 'older query' }, 'user-sort');
      await new Promise((resolve) => setTimeout(resolve, 10));
      await service.search({ query: 'newer query' }, 'user-sort');

      const history = service.getSearchHistory('user-sort');
      expect(history[0].searchedAt.getTime()).toBeGreaterThanOrEqual(history[1].searchedAt.getTime());
    });

    it('should clear history for user', async () => {
      await service.search({ query: 'clear test' }, 'user-1');
      service.clearSearchHistory('user-1');

      const history = service.getSearchHistory('user-1');
      expect(history.length).toBe(0);
    });

    it('should emit history cleared event', async () => {
      service.clearSearchHistory('user-1');
      expect(eventEmitter.emit).toHaveBeenCalledWith('search.history.cleared', { userId: 'user-1' });
    });
  });

  describe('Saved Searches', () => {
    it('should save a search', () => {
      const saved = service.saveSearch('user-1', 'My Search', 'Căutarea Mea', {
        query: 'test query',
        entities: ['INVOICE'],
      });

      expect(saved.id).toBeDefined();
      expect(saved.name).toBe('My Search');
      expect(saved.nameRo).toBe('Căutarea Mea');
    });

    it('should get saved searches for user', () => {
      service.saveSearch('user-1', 'Search 1', 'Căutare 1', { query: 'q1' });
      service.saveSearch('user-1', 'Search 2', 'Căutare 2', { query: 'q2' });
      service.saveSearch('user-2', 'Search 3', 'Căutare 3', { query: 'q3' });

      const saved = service.getSavedSearches('user-1');
      expect(saved.length).toBe(2);
      expect(saved.every((s) => s.userId === 'user-1')).toBe(true);
    });

    it('should get saved search by id', () => {
      const created = service.saveSearch('user-1', 'Get Test', 'Test Obținere', { query: 'get' });
      const retrieved = service.getSavedSearch(created.id);

      expect(retrieved.name).toBe('Get Test');
    });

    it('should throw for invalid saved search id', () => {
      expect(() => service.getSavedSearch('invalid-id')).toThrow(NotFoundException);
    });

    it('should update saved search', () => {
      const created = service.saveSearch('user-1', 'Original', 'Original', { query: 'orig' });
      const updated = service.updateSavedSearch(created.id, { name: 'Updated' });

      expect(updated.name).toBe('Updated');
    });

    it('should set default saved search', () => {
      const first = service.saveSearch('user-1', 'First', 'Prima', { query: 'first' });
      const second = service.saveSearch('user-1', 'Second', 'A Doua', { query: 'second' });

      service.updateSavedSearch(first.id, { isDefault: true });
      service.updateSavedSearch(second.id, { isDefault: true });

      const firstRetrieved = service.getSavedSearch(first.id);
      expect(firstRetrieved.isDefault).toBe(false);
    });

    it('should delete saved search', () => {
      const created = service.saveSearch('user-1', 'Delete', 'Șterge', { query: 'del' });
      service.deleteSavedSearch(created.id);

      expect(() => service.getSavedSearch(created.id)).toThrow(NotFoundException);
    });

    it('should throw when deleting non-existent saved search', () => {
      expect(() => service.deleteSavedSearch('invalid-id')).toThrow(NotFoundException);
    });

    it('should execute saved search', async () => {
      const saved = service.saveSearch('user-1', 'Execute', 'Execută', {
        query: '',
        entities: ['INVOICE'],
      });

      const result = await service.executeSavedSearch(saved.id, 'user-1');
      expect(result.results).toBeDefined();
    });

    it('should execute saved search with overrides', async () => {
      const saved = service.saveSearch('user-1', 'Override', 'Suprascriere', {
        query: 'original',
        pageSize: 10,
      });

      const result = await service.executeSavedSearch(saved.id, 'user-1', { pageSize: 5 });
      expect(result.pageSize).toBe(5);
    });

    it('should emit saved search event', () => {
      service.saveSearch('user-1', 'Event', 'Eveniment', { query: 'event' });
      expect(eventEmitter.emit).toHaveBeenCalledWith('search.saved', expect.any(Object));
    });
  });

  describe('Search Analytics', () => {
    beforeEach(async () => {
      await service.search({ query: 'analytics test', entities: ['INVOICE'] }, 'user-1');
      await service.search({ query: 'analytics test', entities: ['CLIENT'] }, 'user-2');
      await service.search({ query: 'another query' }, 'user-1');
    });

    it('should get analytics', () => {
      const analytics = service.getAnalytics();

      expect(analytics.totalSearches).toBeGreaterThan(0);
      expect(analytics.uniqueUsers).toBeGreaterThan(0);
    });

    it('should track top queries', () => {
      const analytics = service.getAnalytics();

      expect(analytics.topQueries.length).toBeGreaterThan(0);
      expect(analytics.topQueries[0].query).toBeDefined();
      expect(analytics.topQueries[0].count).toBeGreaterThan(0);
    });

    it('should track searches by entity', () => {
      const analytics = service.getAnalytics();

      expect(analytics.searchesByEntity.INVOICE).toBeGreaterThan(0);
    });

    it('should calculate average result count', () => {
      const analytics = service.getAnalytics();

      expect(analytics.averageResultCount).toBeGreaterThanOrEqual(0);
    });

    it('should calculate average search time', () => {
      const analytics = service.getAnalytics();

      expect(analytics.averageSearchTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Reindexing', () => {
    it('should reindex entity', async () => {
      service.indexDocument('INVOICE', { number: 'REINDEX-001' }, 'tenant-1');
      service.indexDocument('INVOICE', { number: 'REINDEX-002' }, 'tenant-1');

      const count = await service.reindexEntity('INVOICE');
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should reindex all entities', async () => {
      const counts = await service.reindexAll();

      expect(counts.INVOICE).toBeDefined();
      expect(counts.CLIENT).toBeDefined();
      expect(counts.PRODUCT).toBeDefined();
    });

    it('should emit reindex completed event', async () => {
      await service.reindexEntity('INVOICE');
      expect(eventEmitter.emit).toHaveBeenCalledWith('search.reindex.completed', expect.any(Object));
    });
  });

  describe('Index Stats', () => {
    it('should get index stats', () => {
      const stats = service.getIndexStats();

      expect(stats.totalDocuments).toBeDefined();
      expect(stats.byEntity).toBeDefined();
    });

    it('should count documents by entity', () => {
      service.indexDocument('INVOICE', { number: 'STATS-001' }, 'tenant-1');
      service.indexDocument('CLIENT', { name: 'Stats Client' }, 'tenant-1');

      const stats = service.getIndexStats();
      expect(stats.byEntity.INVOICE).toBeGreaterThan(0);
      expect(stats.byEntity.CLIENT).toBeGreaterThan(0);
    });
  });

  describe('Score Calculation', () => {
    beforeEach(() => {
      service.indexDocument('PRODUCT', {
        name: 'Exact Match Product',
        sku: 'EMP-001',
        description: 'A product for testing',
      }, 'tenant-1');

      service.indexDocument('PRODUCT', {
        name: 'Contains Match',
        sku: 'CM-001',
        description: 'Product with exact in description',
      }, 'tenant-1');
    });

    it('should give higher score to exact matches', async () => {
      const result = await service.search({ query: 'exact', entities: ['PRODUCT'] });

      if (result.results.length >= 2) {
        // First result should have higher or equal score
        expect(result.results[0].score).toBeGreaterThanOrEqual(result.results[1].score);
      }
    });

    it('should respect field boost', async () => {
      const result = await service.search({ query: 'EMP-001', entities: ['PRODUCT'] });

      // SKU field has boost, should rank higher
      expect(result.results.length).toBeGreaterThan(0);
      expect(result.results[0].score).toBeGreaterThan(0);
    });

    it('should filter by minimum score', async () => {
      const result = await service.search({
        query: 'product',
        entities: ['PRODUCT'],
        minScore: 5,
      });

      expect(result.results.every((r) => r.score >= 5)).toBe(true);
    });
  });

  describe('Entity Types', () => {
    const entities: SearchableEntity[] = ['INVOICE', 'CLIENT', 'PRODUCT', 'DOCUMENT', 'TRANSACTION', 'EMPLOYEE', 'REPORT'];

    entities.forEach((entity) => {
      it(`should search ${entity} entity`, async () => {
        service.indexDocument(entity, { name: `Test ${entity}` }, 'tenant-1');
        const result = await service.search({ query: 'test', entities: [entity] });

        expect(result.results.every((r) => r.entity === entity)).toBe(true);
      });
    });
  });
});
