import { Injectable } from '@nestjs/common';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import type { ChartConfiguration } from 'chart.js';

export interface ChartRenderOptions {
  width?: number;
  height?: number;
  /** Background fill; defaults to white so charts embed cleanly in Excel/PPT/PDF. */
  background?: string;
}

/**
 * F-5 — one chart definition → PNG buffer / base64 data URI, reused by every
 * deliverable generator (Excel picture, PPTX image, PDF <img>, frontend).
 * Canvas instances are cached per size so repeated renders stay cheap.
 */
@Injectable()
export class ChartService {
  private readonly canvasCache = new Map<string, ChartJSNodeCanvas>();

  private getCanvas(width: number, height: number, background: string): ChartJSNodeCanvas {
    const key = `${width}x${height}:${background}`;
    let canvas = this.canvasCache.get(key);
    if (!canvas) {
      canvas = new ChartJSNodeCanvas({ width, height, backgroundColour: background });
      this.canvasCache.set(key, canvas);
    }
    return canvas;
  }

  /** Render any Chart.js config to a PNG buffer. */
  async renderToBuffer(config: ChartConfiguration, opts: ChartRenderOptions = {}): Promise<Buffer> {
    const { width = 640, height = 360, background = 'white' } = opts;
    return this.getCanvas(width, height, background).renderToBuffer(config, 'image/png');
  }

  /** Render to a `data:image/png;base64,...` URI for HTML/PDF embedding. */
  async renderToDataUri(config: ChartConfiguration, opts: ChartRenderOptions = {}): Promise<string> {
    const buf = await this.renderToBuffer(config, opts);
    return `data:image/png;base64,${buf.toString('base64')}`;
  }

  // ---- convenience builders (keep call sites declarative) ----

  barConfig(labels: string[], datasets: { label?: string; data: number[]; color?: string }[]): ChartConfiguration {
    return {
      type: 'bar',
      data: {
        labels,
        datasets: datasets.map((d) => ({ label: d.label, data: d.data, backgroundColor: d.color ?? '#0b7681' })),
      },
      options: { plugins: { legend: { display: datasets.length > 1 } } },
    };
  }

  lineConfig(labels: string[], datasets: { label?: string; data: number[]; color?: string }[]): ChartConfiguration {
    return {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map((d) => ({
          label: d.label,
          data: d.data,
          borderColor: d.color ?? '#0b7681',
          backgroundColor: 'transparent',
          tension: 0.25,
        })),
      },
      options: { plugins: { legend: { display: datasets.length > 1 } } },
    };
  }

  /** Horizontal bars sorted by magnitude — the shape sensitivity/tornado charts need. */
  tornadoConfig(rows: { label: string; value: number }[]): ChartConfiguration {
    const sorted = [...rows].sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    return {
      type: 'bar',
      data: {
        labels: sorted.map((r) => r.label),
        datasets: [{ data: sorted.map((r) => r.value), backgroundColor: sorted.map((r) => (r.value < 0 ? '#c2453d' : '#0b7681')) }],
      },
      options: { indexAxis: 'y', plugins: { legend: { display: false } } },
    };
  }
}
