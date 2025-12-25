import { Injectable, Logger } from '@nestjs/common';
import { HelpService, HelpArticle, FAQ, Glossary, Tutorial } from './help.service';

/**
 * Search result with relevance scoring
 */
export interface SearchResult {
  type: 'article' | 'faq' | 'glossary' | 'tutorial';
  id: string;
  title: string;
  titleRo: string;
  description: string;
  descriptionRo: string;
  url: string;
  score: number;
  highlights: SearchHighlight[];
  category?: string;
}

export interface SearchHighlight {
  field: string;
  matches: string[];
}

export interface SearchSuggestion {
  text: string;
  type: 'article' | 'faq' | 'glossary' | 'tutorial' | 'term';
  count: number;
}

export interface SearchAnalytics {
  query: string;
  resultsCount: number;
  timestamp: Date;
  locale: string;
  userId?: string;
  clicked?: string;
}

export interface UnifiedSearchResult {
  query: string;
  totalResults: number;
  results: SearchResult[];
  suggestions: SearchSuggestion[];
  relatedTerms: string[];
  searchTime: number;
}

@Injectable()
export class HelpSearchService {
  private readonly logger = new Logger(HelpSearchService.name);
  private searchHistory: SearchAnalytics[] = [];
  private popularSearches: Map<string, number> = new Map();

  constructor(private readonly helpService: HelpService) {}

  /**
   * Unified search across all help content
   */
  async search(
    query: string,
    locale: string = 'en',
    options: {
      limit?: number;
      types?: ('article' | 'faq' | 'glossary' | 'tutorial')[];
      category?: string;
    } = {},
  ): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    const { limit = 20, types, category } = options;

    const normalizedQuery = this.normalizeQuery(query);
    const tokens = this.tokenize(normalizedQuery);

    // Track search
    this.trackSearch(query, locale);

    // Search all content types
    const allResults: SearchResult[] = [];

    if (!types || types.includes('article')) {
      const articles = this.searchArticles(tokens, locale, category);
      allResults.push(...articles);
    }

    if (!types || types.includes('faq')) {
      const faqs = this.searchFaqs(tokens, locale, category);
      allResults.push(...faqs);
    }

    if (!types || types.includes('glossary')) {
      const glossaryTerms = this.searchGlossaryTerms(tokens, locale);
      allResults.push(...glossaryTerms);
    }

    if (!types || types.includes('tutorial')) {
      const tutorials = this.searchTutorials(tokens, locale, category);
      allResults.push(...tutorials);
    }

    // Sort by score and limit
    const sortedResults = allResults
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    // Generate suggestions
    const suggestions = this.generateSuggestions(normalizedQuery, locale);

    // Find related terms
    const relatedTerms = this.findRelatedTerms(tokens, locale);

    const searchTime = Date.now() - startTime;

    return {
      query,
      totalResults: allResults.length,
      results: sortedResults,
      suggestions,
      relatedTerms,
      searchTime,
    };
  }

  /**
   * Get autocomplete suggestions
   */
  getAutocompleteSuggestions(
    prefix: string,
    locale: string = 'en',
    limit: number = 8,
  ): SearchSuggestion[] {
    const normalizedPrefix = prefix.toLowerCase().trim();
    if (normalizedPrefix.length < 2) return [];

    const suggestions: SearchSuggestion[] = [];

    // Get article titles
    const articles = this.helpService.searchArticles('', locale);
    articles.forEach((article) => {
      const title = locale === 'ro' ? article.titleRo : article.title;
      if (title.toLowerCase().includes(normalizedPrefix)) {
        suggestions.push({
          text: title,
          type: 'article',
          count: article.views,
        });
      }
    });

    // Get FAQ questions
    const faqs = this.helpService.getAllFaqs();
    faqs.forEach((faq) => {
      const question = locale === 'ro' ? faq.questionRo : faq.question;
      if (question.toLowerCase().includes(normalizedPrefix)) {
        suggestions.push({
          text: question,
          type: 'faq',
          count: 1,
        });
      }
    });

    // Get glossary terms
    const glossary = this.helpService.getAllGlossaryTerms();
    glossary.forEach((term) => {
      const termText = locale === 'ro' ? term.termRo : term.term;
      if (termText.toLowerCase().includes(normalizedPrefix)) {
        suggestions.push({
          text: termText,
          type: 'term',
          count: 1,
        });
      }
    });

    // Add popular searches
    this.popularSearches.forEach((count, searchQuery) => {
      if (searchQuery.toLowerCase().includes(normalizedPrefix)) {
        const existing = suggestions.find(
          (s) => s.text.toLowerCase() === searchQuery.toLowerCase(),
        );
        if (!existing) {
          suggestions.push({
            text: searchQuery,
            type: 'article',
            count: count * 10, // Boost popular searches
          });
        }
      }
    });

    // Sort by count and limit
    return suggestions.sort((a, b) => b.count - a.count).slice(0, limit);
  }

  /**
   * Get popular searches
   */
  getPopularSearches(limit: number = 10): { query: string; count: number }[] {
    const sorted = Array.from(this.popularSearches.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count);

    return sorted.slice(0, limit);
  }

  /**
   * Get recent searches for a user
   */
  getRecentSearches(userId: string, limit: number = 10): string[] {
    return this.searchHistory
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
      .map((s) => s.query);
  }

  /**
   * Record a click on a search result
   */
  recordSearchClick(query: string, resultId: string, userId?: string): void {
    const recentSearch = this.searchHistory.find(
      (s) => s.query === query && s.userId === userId && !s.clicked,
    );
    if (recentSearch) {
      recentSearch.clicked = resultId;
    }
  }

  /**
   * Get search analytics
   */
  getSearchAnalytics(): {
    totalSearches: number;
    uniqueQueries: number;
    avgResultsCount: number;
    clickThroughRate: number;
    topQueries: { query: string; count: number }[];
    zeroResultQueries: string[];
  } {
    const totalSearches = this.searchHistory.length;
    const uniqueQueries = new Set(this.searchHistory.map((s) => s.query)).size;
    const avgResultsCount =
      totalSearches > 0
        ? this.searchHistory.reduce((sum, s) => sum + s.resultsCount, 0) / totalSearches
        : 0;
    const clickedSearches = this.searchHistory.filter((s) => s.clicked).length;
    const clickThroughRate = totalSearches > 0 ? clickedSearches / totalSearches : 0;

    const zeroResultQueries = Array.from(
      new Set(
        this.searchHistory
          .filter((s) => s.resultsCount === 0)
          .map((s) => s.query),
      ),
    );

    return {
      totalSearches,
      uniqueQueries,
      avgResultsCount,
      clickThroughRate,
      topQueries: this.getPopularSearches(10),
      zeroResultQueries,
    };
  }

  // Private helper methods

  private searchArticles(
    tokens: string[],
    locale: string,
    category?: string,
  ): SearchResult[] {
    const articles = category
      ? this.helpService.getArticlesByCategory(category)
      : this.getAllArticles();

    return articles
      .map((article) => this.scoreArticle(article, tokens, locale))
      .filter((result) => result.score > 0);
  }

  private getAllArticles(): HelpArticle[] {
    const categories = this.helpService.getAllCategories();
    const allArticles: HelpArticle[] = [];
    categories.forEach((cat) => {
      const articles = this.helpService.getArticlesByCategory(cat.id);
      allArticles.push(...articles);
    });
    return allArticles;
  }

  private scoreArticle(
    article: HelpArticle,
    tokens: string[],
    locale: string,
  ): SearchResult {
    const title = locale === 'ro' ? article.titleRo : article.title;
    const content = locale === 'ro' ? article.contentRo : article.content;
    const highlights: SearchHighlight[] = [];

    let score = 0;

    // Title matching (highest weight)
    const titleScore = this.calculateTextScore(title, tokens, 3.0);
    if (titleScore > 0) {
      highlights.push({
        field: 'title',
        matches: this.findMatches(title, tokens),
      });
    }
    score += titleScore;

    // Tag matching (high weight)
    const tagScore = article.tags.reduce((sum, tag) => {
      const tagMatch = this.calculateTextScore(tag, tokens, 2.5);
      if (tagMatch > 0) {
        highlights.push({
          field: 'tags',
          matches: [tag],
        });
      }
      return sum + tagMatch;
    }, 0);
    score += tagScore;

    // Content matching (medium weight)
    const contentScore = this.calculateTextScore(content, tokens, 1.0);
    if (contentScore > 0) {
      highlights.push({
        field: 'content',
        matches: this.findMatches(content, tokens).slice(0, 3),
      });
    }
    score += contentScore;

    // Boost by popularity
    const popularityBoost = Math.log10(article.views + 1) * 0.1;
    score += popularityBoost;

    // Boost by helpfulness
    const helpfulRatio =
      article.helpful + article.notHelpful > 0
        ? article.helpful / (article.helpful + article.notHelpful)
        : 0.5;
    score *= 0.8 + helpfulRatio * 0.4;

    return {
      type: 'article',
      id: article.id,
      title,
      titleRo: article.titleRo,
      description: content.slice(0, 200) + '...',
      descriptionRo: article.contentRo.slice(0, 200) + '...',
      url: `/help/articles/${article.slug}`,
      score,
      highlights,
      category: article.category.id,
    };
  }

  private searchFaqs(tokens: string[], locale: string, category?: string): SearchResult[] {
    let faqs = this.helpService.getAllFaqs();
    if (category) {
      faqs = faqs.filter((f) => f.category === category);
    }

    return faqs
      .map((faq) => this.scoreFaq(faq, tokens, locale))
      .filter((result) => result.score > 0);
  }

  private scoreFaq(faq: FAQ, tokens: string[], locale: string): SearchResult {
    const question = locale === 'ro' ? faq.questionRo : faq.question;
    const answer = locale === 'ro' ? faq.answerRo : faq.answer;
    const highlights: SearchHighlight[] = [];

    let score = 0;

    // Question matching (highest weight for FAQs)
    const questionScore = this.calculateTextScore(question, tokens, 3.5);
    if (questionScore > 0) {
      highlights.push({
        field: 'question',
        matches: this.findMatches(question, tokens),
      });
    }
    score += questionScore;

    // Answer matching
    const answerScore = this.calculateTextScore(answer, tokens, 1.5);
    if (answerScore > 0) {
      highlights.push({
        field: 'answer',
        matches: this.findMatches(answer, tokens).slice(0, 2),
      });
    }
    score += answerScore;

    return {
      type: 'faq',
      id: faq.id,
      title: question,
      titleRo: faq.questionRo,
      description: answer,
      descriptionRo: faq.answerRo,
      url: `/help/faqs#${faq.id}`,
      score,
      highlights,
      category: faq.category,
    };
  }

  private searchGlossaryTerms(tokens: string[], locale: string): SearchResult[] {
    const terms = this.helpService.getAllGlossaryTerms();

    return terms
      .map((term) => this.scoreGlossaryTerm(term, tokens, locale))
      .filter((result) => result.score > 0);
  }

  private scoreGlossaryTerm(
    term: Glossary,
    tokens: string[],
    locale: string,
  ): SearchResult {
    const termText = locale === 'ro' ? term.termRo : term.term;
    const definition = locale === 'ro' ? term.definitionRo : term.definition;
    const highlights: SearchHighlight[] = [];

    let score = 0;

    // Term matching (exact matches highly valued)
    const termScore = this.calculateTextScore(termText, tokens, 4.0);
    if (termScore > 0) {
      highlights.push({
        field: 'term',
        matches: [termText],
      });
    }
    score += termScore;

    // Definition matching
    const defScore = this.calculateTextScore(definition, tokens, 1.0);
    if (defScore > 0) {
      highlights.push({
        field: 'definition',
        matches: this.findMatches(definition, tokens).slice(0, 2),
      });
    }
    score += defScore;

    return {
      type: 'glossary',
      id: termText,
      title: termText,
      titleRo: term.termRo,
      description: definition,
      descriptionRo: term.definitionRo,
      url: `/help/glossary#${termText.toLowerCase()}`,
      score,
      highlights,
      category: term.category,
    };
  }

  private searchTutorials(
    tokens: string[],
    locale: string,
    module?: string,
  ): SearchResult[] {
    let tutorials = this.helpService.getAllTutorials();
    if (module) {
      tutorials = tutorials.filter((t) => t.module === module);
    }

    return tutorials
      .map((tutorial) => this.scoreTutorial(tutorial, tokens, locale))
      .filter((result) => result.score > 0);
  }

  private scoreTutorial(
    tutorial: Tutorial,
    tokens: string[],
    locale: string,
  ): SearchResult {
    const title = locale === 'ro' ? tutorial.titleRo : tutorial.title;
    const description = locale === 'ro' ? tutorial.descriptionRo : tutorial.description;
    const highlights: SearchHighlight[] = [];

    let score = 0;

    // Title matching
    const titleScore = this.calculateTextScore(title, tokens, 3.0);
    if (titleScore > 0) {
      highlights.push({
        field: 'title',
        matches: this.findMatches(title, tokens),
      });
    }
    score += titleScore;

    // Description matching
    const descScore = this.calculateTextScore(description, tokens, 1.5);
    if (descScore > 0) {
      highlights.push({
        field: 'description',
        matches: this.findMatches(description, tokens),
      });
    }
    score += descScore;

    // Step content matching
    tutorial.steps.forEach((step) => {
      const stepContent = locale === 'ro' ? step.contentRo : step.content;
      const stepScore = this.calculateTextScore(stepContent, tokens, 0.5);
      score += stepScore;
    });

    return {
      type: 'tutorial',
      id: tutorial.id,
      title,
      titleRo: tutorial.titleRo,
      description,
      descriptionRo: tutorial.descriptionRo,
      url: `/help/tutorials/${tutorial.id}`,
      score,
      highlights,
      category: tutorial.module,
    };
  }

  private calculateTextScore(text: string, tokens: string[], weight: number): number {
    const normalizedText = text.toLowerCase();
    let score = 0;

    tokens.forEach((token) => {
      // Exact match
      if (normalizedText.includes(token)) {
        score += weight * 2;
      }

      // Fuzzy match (for typos)
      const fuzzyMatch = this.fuzzyMatch(normalizedText, token);
      if (fuzzyMatch > 0.8) {
        score += weight * fuzzyMatch;
      }
    });

    return score;
  }

  private fuzzyMatch(text: string, token: string): number {
    // Simple Levenshtein-based fuzzy matching
    const words = text.split(/\s+/);
    let bestMatch = 0;

    words.forEach((word) => {
      const similarity = this.calculateSimilarity(word, token);
      if (similarity > bestMatch) {
        bestMatch = similarity;
      }
    });

    return bestMatch;
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str1.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str2.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str1.length; i++) {
      for (let j = 1; j <= str2.length; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str1.length][str2.length];
  }

  private findMatches(text: string, tokens: string[]): string[] {
    const matches: string[] = [];
    const sentences = text.split(/[.!?]+/);

    tokens.forEach((token) => {
      sentences.forEach((sentence) => {
        if (sentence.toLowerCase().includes(token)) {
          const trimmed = sentence.trim();
          if (trimmed && !matches.includes(trimmed)) {
            matches.push(trimmed);
          }
        }
      });
    });

    return matches;
  }

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ');
  }

  private tokenize(query: string): string[] {
    const stopWords = new Set([
      'a',
      'an',
      'the',
      'is',
      'are',
      'was',
      'were',
      'be',
      'been',
      'being',
      'have',
      'has',
      'had',
      'do',
      'does',
      'did',
      'will',
      'would',
      'could',
      'should',
      'may',
      'might',
      'must',
      'shall',
      'can',
      'to',
      'of',
      'in',
      'for',
      'on',
      'with',
      'at',
      'by',
      'from',
      'as',
      'into',
      'through',
      'during',
      'before',
      'after',
      'above',
      'below',
      'and',
      'but',
      'or',
      'nor',
      'so',
      'yet',
      'both',
      'either',
      'neither',
      'not',
      'only',
      'own',
      'same',
      'than',
      'too',
      'very',
      'just',
      'also',
      // Romanian stop words
      'un',
      'o',
      'la',
      'de',
      'pe',
      'în',
      'cu',
      'din',
      'pentru',
      'este',
      'sunt',
      'și',
      'sau',
      'dar',
      'că',
      'care',
      'ce',
      'cum',
      'când',
    ]);

    return query
      .split(/\s+/)
      .filter((word) => word.length > 1 && !stopWords.has(word));
  }

  private generateSuggestions(query: string, locale: string): SearchSuggestion[] {
    const suggestions: SearchSuggestion[] = [];

    // Add spelling suggestions (simplified)
    const tokens = this.tokenize(query);
    tokens.forEach((token) => {
      // Check common misspellings
      const corrections = this.getSpellingCorrections(token);
      corrections.forEach((correction) => {
        const newQuery = query.replace(token, correction);
        suggestions.push({
          text: newQuery,
          type: 'article',
          count: 1,
        });
      });
    });

    return suggestions.slice(0, 3);
  }

  private getSpellingCorrections(word: string): string[] {
    // Common misspellings for accounting/tax terms
    const commonCorrections: Record<string, string[]> = {
      tva: ['vat'],
      vat: ['tva'],
      factura: ['invoice', 'e-factura'],
      invoice: ['factura', 'e-factura'],
      anaf: [],
      saft: ['saf-t'],
      'saf-t': ['saft'],
      ocr: [],
      contabilitate: ['accounting'],
      accounting: ['contabilitate'],
    };

    return commonCorrections[word] || [];
  }

  private findRelatedTerms(tokens: string[], locale: string): string[] {
    const glossary = this.helpService.getAllGlossaryTerms();
    const relatedTerms: string[] = [];

    tokens.forEach((token) => {
      glossary.forEach((term) => {
        const termText = locale === 'ro' ? term.termRo : term.term;
        if (
          termText.toLowerCase().includes(token) ||
          term.relatedTerms.some((rt) => rt.toLowerCase().includes(token))
        ) {
          if (!relatedTerms.includes(termText)) {
            relatedTerms.push(termText);
          }
          term.relatedTerms.forEach((rt) => {
            if (!relatedTerms.includes(rt)) {
              relatedTerms.push(rt);
            }
          });
        }
      });
    });

    return relatedTerms.slice(0, 5);
  }

  private trackSearch(query: string, locale: string, userId?: string): void {
    // Update popular searches
    const count = this.popularSearches.get(query) || 0;
    this.popularSearches.set(query, count + 1);

    // Store search analytics
    this.searchHistory.push({
      query,
      resultsCount: 0, // Will be updated later
      timestamp: new Date(),
      locale,
      userId,
    });

    // Keep history limited
    if (this.searchHistory.length > 10000) {
      this.searchHistory = this.searchHistory.slice(-5000);
    }
  }
}
