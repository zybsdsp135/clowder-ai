import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { homedir } from 'node:os';
import puppeteer, { type Browser } from 'puppeteer';
import sharp from 'sharp';
import { createModuleLogger } from '../infrastructure/logger.js';

const log = createModuleLogger('image-exporter');

/** Chunk height for scroll-and-stitch. 4000px is well under Chrome's ~16384 GPU limit. */
const CHUNK_HEIGHT = 4000;
const VIEWPORT_WIDTH = 1280;
const USERSPACE_CHROME_LIB_DIR = `${homedir()}/.local/share/puppeteer-deps/root/usr/lib/x86_64-linux-gnu`;
const EXPORT_FONT_DIR = `${homedir()}/.local/share/fonts/cat-cafe-export`;
const EXPORT_FONT_CANDIDATES = [
  { family: 'CatCafeExportZh', path: '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', linkName: 'NotoSansCJK-Regular.ttc' },
  { family: 'CatCafeExportZh', path: '/usr/share/fonts/opentype/noto/NotoSansCJKSC-Regular.otf', linkName: 'NotoSansCJKSC-Regular.otf' },
  { family: 'CatCafeExportZh', path: '/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc', linkName: 'NotoSansCJK-Regular-alt.ttc' },
  { family: 'CatCafeExportZh', path: '/mnt/c/Windows/Fonts/msyh.ttc', linkName: 'msyh.ttc' },
  { family: 'CatCafeExportZh', path: '/mnt/c/Windows/Fonts/msyhbd.ttc', linkName: 'msyhbd.ttc' },
  { family: 'CatCafeExportZh', path: '/mnt/c/Windows/Fonts/msyhl.ttc', linkName: 'msyhl.ttc' },
  { family: 'CatCafeExportZh', path: '/mnt/c/Windows/Fonts/simhei.ttf', linkName: 'simhei.ttf' },
] as const;

/**
 * ImageExporter service for capturing screenshots of web pages using Chrome headless.
 * Uses scroll-and-stitch with Sharp to handle pages of any height without
 * hitting Chrome's GPU texture limit (~16384px) which causes content duplication.
 */
export class ImageExporter {
  private browser: Browser | null = null;

  /**
   * Capture a screenshot of the given URL.
   * For pages taller than CHUNK_HEIGHT, scrolls through the page in chunks
   * and stitches them together using Sharp.
   */
  async capture(url: string, userId: string): Promise<Buffer> {
    try {
      if (!this.browser) {
        this.ensureExportFontsAvailable();
        const launchEnv = this.resolveLaunchEnv();
        this.browser = await puppeteer.launch({
          headless: true,
          env: launchEnv,
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
        });
      }

      const page = await this.browser.newPage();

      await page.setExtraHTTPHeaders({ 'X-Cat-Cafe-User': userId });
      await page.setViewport({ width: VIEWPORT_WIDTH, height: CHUNK_HEIGHT });

      const exportUrl = new URL(url);
      exportUrl.searchParams.set('export', 'true');
      exportUrl.searchParams.set('userId', userId);

      await page.goto(exportUrl.toString(), {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      await this.injectExportFonts(page);

      // Wait for messages to render (export mode uses flow layout, no data-chat-container)
      await page.waitForSelector('[data-message-id]', { timeout: 15000 });

      // Let React settle
      await this.waitForPaint(page);

      const pageHeight = await page.evaluate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => (globalThis as any).document.documentElement.scrollHeight as number,
      );
      const messageCount = await page.evaluate(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        () => ((globalThis as any).document.querySelectorAll('[data-message-id]') ?? []).length,
      );
      log.info(
        { pageHeight, messageCount, chunks: Math.ceil(pageHeight / CHUNK_HEIGHT) },
        'Page height and message count captured',
      );

      // Short page: single viewport screenshot (no stitching needed)
      if (pageHeight <= CHUNK_HEIGHT) {
        await page.setViewport({ width: VIEWPORT_WIDTH, height: pageHeight });
        await this.waitForPaint(page);
        const screenshot = await page.screenshot({ type: 'png' });
        log.info({ bytes: screenshot.length }, 'Captured single screenshot');
        await page.close();
        return screenshot as Buffer;
      }

      // Tall page: scroll-and-stitch to avoid Chrome's tiling duplication bug
      const chunks: { buffer: Buffer; top: number; height: number }[] = [];

      // Scroll to top first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await page.evaluate(() => (globalThis as any).window.scrollTo(0, 0));
      await this.waitForPaint(page);

      for (let y = 0; y < pageHeight; y += CHUNK_HEIGHT) {
        const chunkH = Math.min(CHUNK_HEIGHT, pageHeight - y);

        // Scroll to this chunk's position
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await page.evaluate((scrollY: number) => {
          (globalThis as any).window.scrollTo(0, scrollY);
        }, y);
        await this.waitForPaint(page);

        // For the last chunk, resize viewport to exact remaining height
        if (chunkH < CHUNK_HEIGHT) {
          await page.setViewport({ width: VIEWPORT_WIDTH, height: chunkH });
          await this.waitForPaint(page);
        }

        const chunk = (await page.screenshot({ type: 'png' })) as Buffer;
        chunks.push({ buffer: chunk, top: y, height: chunkH });
      }

      log.info({ chunks: chunks.length }, 'Chunks captured, stitching...');

      // Stitch chunks vertically using Sharp
      const stitched = await sharp({
        create: {
          width: VIEWPORT_WIDTH,
          height: pageHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .composite(
          chunks.map((c) => ({
            input: c.buffer,
            top: c.top,
            left: 0,
          })),
        )
        .png()
        .toBuffer();

      log.info({ bytes: stitched.length }, 'Stitched image ready');
      await page.close();
      return stitched;
    } catch (error) {
      throw new Error(`Screenshot capture failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async injectExportFonts(page: puppeteer.Page): Promise<void> {
    const availableFonts = EXPORT_FONT_CANDIDATES.filter((font) => existsSync(font.path));
    if (availableFonts.length === 0) {
      log.warn('No export CJK font candidates found; screenshots may render tofu for Chinese text');
      return;
    }

    const fontFaces = availableFonts
      .map(
        (font) => `
@font-face {
  font-family: '${font.family}';
  src: url('file://${font.path}') format('truetype');
  font-display: swap;
}`,
      )
      .join('\n');

    await page.addStyleTag({
      content: `
${fontFaces}

html,
body,
button,
input,
textarea,
select,
[data-message-id],
[data-message-id] * {
  font-family:
    'CatCafeExportZh',
    'Microsoft YaHei',
    'PingFang SC',
    'Hiragino Sans GB',
    'Noto Sans CJK SC',
    'WenQuanYi Micro Hei',
    sans-serif !important;
}
`,
    });

    await page.evaluate(async () => {
      const fonts = (globalThis as { document?: { fonts?: { ready: Promise<unknown> } } }).document?.fonts;
      if (fonts) {
        await fonts.ready;
      }
    });
  }

  private ensureExportFontsAvailable(): void {
    const availableFonts = EXPORT_FONT_CANDIDATES.filter((font) => existsSync(font.path));
    if (availableFonts.length === 0) {
      return;
    }

    mkdirSync(EXPORT_FONT_DIR, { recursive: true });

    for (const font of availableFonts) {
      const linkPath = `${EXPORT_FONT_DIR}/${font.linkName}`;
      try {
        if (existsSync(linkPath)) {
          const currentTarget = realpathSync(linkPath);
          if (currentTarget === font.path) {
            continue;
          }
          rmSync(linkPath, { force: true });
        }
        symlinkSync(font.path, linkPath);
      } catch (error) {
        log.warn(
          { linkPath, sourcePath: font.path, error: error instanceof Error ? error.message : String(error) },
          'Failed to link export font candidate',
        );
      }
    }

    try {
      execFileSync('fc-cache', ['-f', EXPORT_FONT_DIR], { stdio: 'ignore' });
    } catch (error) {
      log.warn({ error: error instanceof Error ? error.message : String(error) }, 'Failed to refresh font cache');
    }
  }

  /** Wait for two animation frames (one paint cycle). */
  private async waitForPaint(page: puppeteer.Page): Promise<void> {
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (globalThis as any).requestAnimationFrame(() =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (globalThis as any).requestAnimationFrame(() => resolve()),
          ),
        ),
    );
  }

  private resolveLaunchEnv(): NodeJS.ProcessEnv {
    if (!existsSync(USERSPACE_CHROME_LIB_DIR)) {
      return process.env;
    }

    const current = process.env.LD_LIBRARY_PATH?.trim();
    const paths = current
      ? [USERSPACE_CHROME_LIB_DIR, ...current.split(':').filter(Boolean)]
      : [USERSPACE_CHROME_LIB_DIR];
    const libraryPath = Array.from(new Set(paths)).join(':');

    log.info({ libraryPath }, 'Using userspace Chrome runtime libraries for export');
    return {
      ...process.env,
      LD_LIBRARY_PATH: libraryPath,
    };
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
