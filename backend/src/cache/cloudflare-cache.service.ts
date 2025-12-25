import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import axios from 'axios';

/**
 * Cloudflare Cache Purge Service
 * Automatically purges Cloudflare cache when content changes
 */

export interface CachePurgeResult {
  success: boolean;
  purgedUrls: string[];
  errors: string[];
}

export type ContentType = 'courses' | 'blog' | 'forum' | 'all';

@Injectable()
export class CloudflareCacheService implements OnModuleInit {
  private readonly logger = new Logger(CloudflareCacheService.name);
  private readonly apiToken: string;
  private readonly zoneId: string;
  private readonly baseUrl: string;
  private readonly enabled: boolean;

  // URL patterns for each content type
  private readonly urlPatterns: Record<ContentType, string[]> = {
    courses: [
      'https://documentiulia.ro/ro/courses',
      'https://documentiulia.ro/en/courses',
      'https://documentiulia.ro/api/v1/courses',
      'https://documentiulia.ro/api/v1/content/stats',
    ],
    blog: [
      'https://documentiulia.ro/ro/blog',
      'https://documentiulia.ro/en/blog',
      'https://documentiulia.ro/api/v1/blog/articles',
      'https://documentiulia.ro/api/v1/blog/categories',
      'https://documentiulia.ro/api/v1/content/stats',
    ],
    forum: [
      'https://documentiulia.ro/ro/forum',
      'https://documentiulia.ro/en/forum',
      'https://documentiulia.ro/api/v1/forum/categories',
      'https://documentiulia.ro/api/v1/forum/threads',
      'https://documentiulia.ro/api/v1/content/stats',
    ],
    all: [
      'https://documentiulia.ro/',
      'https://documentiulia.ro/ro',
      'https://documentiulia.ro/en',
    ],
  };

  constructor(
    private readonly config: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.apiToken = this.config.get('CLOUDFLARE_API_TOKEN') || '';
    this.zoneId = this.config.get('CLOUDFLARE_ZONE_ID') || '';
    this.baseUrl = 'https://api.cloudflare.com/client/v4';
    this.enabled = !!(this.apiToken && this.zoneId);
  }

  onModuleInit(): void {
    if (this.enabled) {
      this.logger.log('Cloudflare Cache Service initialized with zone: ' + this.zoneId.substring(0, 8) + '...');
    } else {
      this.logger.warn('Cloudflare Cache Service disabled - missing API token or zone ID');
    }
  }

  /**
   * Purge specific URLs from Cloudflare cache
   */
  async purgeUrls(urls: string[]): Promise<CachePurgeResult> {
    if (!this.enabled) {
      this.logger.debug('Cache purge skipped - Cloudflare not configured');
      return { success: true, purgedUrls: [], errors: ['Cloudflare not configured'] };
    }

    if (urls.length === 0) {
      return { success: true, purgedUrls: [], errors: [] };
    }

    try {
      // Cloudflare allows max 30 URLs per request
      const chunks = this.chunkArray(urls, 30);
      const purgedUrls: string[] = [];
      const errors: string[] = [];

      for (const chunk of chunks) {
        try {
          const response = await axios.post(
            `${this.baseUrl}/zones/${this.zoneId}/purge_cache`,
            { files: chunk },
            {
              headers: {
                'Authorization': `Bearer ${this.apiToken}`,
                'Content-Type': 'application/json',
              },
            },
          );

          if (response.data.success) {
            purgedUrls.push(...chunk);
            this.logger.log(`Purged ${chunk.length} URLs from Cloudflare cache`);
          } else {
            errors.push(...response.data.errors.map((e: any) => e.message));
          }
        } catch (error: any) {
          errors.push(error.message);
          this.logger.error(`Failed to purge cache chunk: ${error.message}`);
        }
      }

      return {
        success: errors.length === 0,
        purgedUrls,
        errors,
      };
    } catch (error: any) {
      this.logger.error(`Cache purge failed: ${error.message}`);
      return {
        success: false,
        purgedUrls: [],
        errors: [error.message],
      };
    }
  }

  /**
   * Purge cache for a specific content type
   */
  async purgeByContentType(contentType: ContentType): Promise<CachePurgeResult> {
    const urls = this.urlPatterns[contentType] || [];

    // For 'all', combine all patterns
    if (contentType === 'all') {
      const allUrls = new Set<string>();
      Object.values(this.urlPatterns).forEach(patterns => {
        patterns.forEach(url => allUrls.add(url));
      });
      return this.purgeUrls(Array.from(allUrls));
    }

    return this.purgeUrls(urls);
  }

  /**
   * Purge entire zone cache (use sparingly)
   */
  async purgeEverything(): Promise<CachePurgeResult> {
    if (!this.enabled) {
      return { success: true, purgedUrls: [], errors: ['Cloudflare not configured'] };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/zones/${this.zoneId}/purge_cache`,
        { purge_everything: true },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.success) {
        this.logger.log('Purged entire Cloudflare cache for zone');
        return { success: true, purgedUrls: ['*'], errors: [] };
      }

      return {
        success: false,
        purgedUrls: [],
        errors: response.data.errors.map((e: any) => e.message),
      };
    } catch (error: any) {
      this.logger.error(`Full cache purge failed: ${error.message}`);
      return { success: false, purgedUrls: [], errors: [error.message] };
    }
  }

  /**
   * Purge cache by prefix/tag (Enterprise only)
   */
  async purgeByPrefix(prefixes: string[]): Promise<CachePurgeResult> {
    if (!this.enabled) {
      return { success: true, purgedUrls: [], errors: ['Cloudflare not configured'] };
    }

    try {
      const response = await axios.post(
        `${this.baseUrl}/zones/${this.zoneId}/purge_cache`,
        { prefixes },
        {
          headers: {
            'Authorization': `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        },
      );

      if (response.data.success) {
        this.logger.log(`Purged cache for ${prefixes.length} prefixes`);
        return { success: true, purgedUrls: prefixes, errors: [] };
      }

      return {
        success: false,
        purgedUrls: [],
        errors: response.data.errors.map((e: any) => e.message),
      };
    } catch (error: any) {
      // Prefix purge requires Enterprise - fallback to URL purge
      this.logger.warn('Prefix purge failed (requires Enterprise), using URL purge fallback');
      const urls = prefixes.map(p => p.replace('*', ''));
      return this.purgeUrls(urls);
    }
  }

  // ==================== Event Handlers ====================

  /**
   * Auto-purge when courses are updated
   */
  @OnEvent('content.courses.updated')
  async handleCoursesUpdated(payload: { courseIds?: string[] }): Promise<void> {
    this.logger.log('Courses updated, purging cache...');
    const result = await this.purgeByContentType('courses');

    // Also purge individual course URLs if IDs provided
    if (payload.courseIds?.length) {
      const courseUrls = payload.courseIds.flatMap(id => [
        `https://documentiulia.ro/ro/courses/${id}`,
        `https://documentiulia.ro/en/courses/${id}`,
      ]);
      await this.purgeUrls(courseUrls);
    }

    this.eventEmitter.emit('cache.purged', { type: 'courses', result });
  }

  /**
   * Auto-purge when blog articles are updated
   */
  @OnEvent('content.blog.updated')
  async handleBlogUpdated(payload: { articleSlugs?: string[] }): Promise<void> {
    this.logger.log('Blog updated, purging cache...');
    const result = await this.purgeByContentType('blog');

    if (payload.articleSlugs?.length) {
      const articleUrls = payload.articleSlugs.flatMap(slug => [
        `https://documentiulia.ro/ro/blog/${slug}`,
        `https://documentiulia.ro/en/blog/${slug}`,
      ]);
      await this.purgeUrls(articleUrls);
    }

    this.eventEmitter.emit('cache.purged', { type: 'blog', result });
  }

  /**
   * Auto-purge when forum content is updated
   */
  @OnEvent('content.forum.updated')
  async handleForumUpdated(): Promise<void> {
    this.logger.log('Forum updated, purging cache...');
    const result = await this.purgeByContentType('forum');
    this.eventEmitter.emit('cache.purged', { type: 'forum', result });
  }

  /**
   * Auto-purge on deployment
   */
  @OnEvent('deployment.completed')
  async handleDeployment(): Promise<void> {
    this.logger.log('Deployment detected, purging all cache...');
    const result = await this.purgeEverything();
    this.eventEmitter.emit('cache.purged', { type: 'deployment', result });
  }

  // ==================== Utilities ====================

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Get cache status (for health checks)
   */
  getStatus(): { enabled: boolean; zoneId: string } {
    return {
      enabled: this.enabled,
      zoneId: this.enabled ? this.zoneId.substring(0, 8) + '...' : 'not configured',
    };
  }
}
