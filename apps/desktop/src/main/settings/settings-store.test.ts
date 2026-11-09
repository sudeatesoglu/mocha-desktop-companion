import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES } from '../../shared/preferences.ts';
import { createSettingsStore, type SettingsFiles } from './settings-store.ts';

const PATH = '/user-data/settings.json';

/** An in-memory file system that records the order of operations. */
function memoryFiles(initial?: string) {
  const disk = new Map<string, string>();
  if (initial !== undefined) disk.set(PATH, initial);
  const log: string[] = [];
  const files: SettingsFiles = {
    read: async (path) => {
      const content = disk.get(path);
      if (content === undefined) {
        throw Object.assign(new Error(`ENOENT: ${path}`), { code: 'ENOENT' });
      }
      return content;
    },
    write: async (path, data) => {
      log.push(`write ${path}`);
      disk.set(path, data);
    },
    rename: async (from, to) => {
      log.push(`rename ${from} -> ${to}`);
      disk.set(to, disk.get(from) ?? '');
      disk.delete(from);
    },
  };
  return { files, disk, log };
}

describe('createSettingsStore', () => {
  const logger = { warn: vi.fn() };

  beforeEach(() => {
    logger.warn.mockClear();
  });

  describe('load', () => {
    it('reads a valid file', async () => {
      const { files } = memoryFiles('{"overlayPosition":{"x":10,"y":-20}}');

      await expect(createSettingsStore(PATH, files, logger).load()).resolves.toEqual({
        overlayPosition: { x: 10, y: -20 },
      });
    });

    it('reads valid preferences', async () => {
      const { files } = memoryFiles(JSON.stringify({ preferences: DEFAULT_PREFERENCES }));

      await expect(createSettingsStore(PATH, files, logger).load()).resolves.toEqual({
        preferences: DEFAULT_PREFERENCES,
      });
    });

    it('drops only invalid preferences and keeps the rest', async () => {
      const { files } = memoryFiles(
        JSON.stringify({
          overlayPosition: { x: 1, y: 2 },
          preferences: { ...DEFAULT_PREFERENCES, workMinutes: 1_000 },
        }),
      );

      await expect(createSettingsStore(PATH, files, logger).load()).resolves.toEqual({
        overlayPosition: { x: 1, y: 2 },
      });
    });

    it('starts with defaults when there is no file yet, without a warning', async () => {
      const { files } = memoryFiles();

      await expect(createSettingsStore(PATH, files, logger).load()).resolves.toEqual({});
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it.each([
      ['broken JSON', '{"overlayPosition":'],
      ['a wrong type', '{"overlayPosition":{"x":"left","y":0}}'],
      ['a fractional coordinate', '{"overlayPosition":{"x":1.5,"y":0}}'],
      ['an absurd coordinate', '{"overlayPosition":{"x":1e12,"y":0}}'],
      ['not an object', '[1,2,3]'],
    ])('falls back to defaults on %s, with a warning', async (_case, content) => {
      const { files } = memoryFiles(content);

      await expect(createSettingsStore(PATH, files, logger).load()).resolves.toEqual({});
      expect(logger.warn).toHaveBeenCalledOnce();
    });

    it('drops unknown keys, e.g. from a newer version', async () => {
      const { files } = memoryFiles('{"overlayPosition":{"x":1,"y":2},"theme":"dark"}');

      await expect(createSettingsStore(PATH, files, logger).load()).resolves.toEqual({
        overlayPosition: { x: 1, y: 2 },
      });
    });

    it('warns and uses defaults when the file cannot be read', async () => {
      const { files } = memoryFiles();
      files.read = () => Promise.reject(new Error('EACCES: permission denied'));

      await expect(createSettingsStore(PATH, files, logger).load()).resolves.toEqual({});
      expect(logger.warn).toHaveBeenCalledOnce();
    });
  });

  describe('update', () => {
    it('writes a temporary file and renames it over the real one', async () => {
      const { files, disk, log } = memoryFiles();
      const store = createSettingsStore(PATH, files, logger);

      await store.update({ overlayPosition: { x: 5, y: 6 } });

      expect(log).toEqual([`write ${PATH}.tmp`, `rename ${PATH}.tmp -> ${PATH}`]);
      expect(JSON.parse(disk.get(PATH) ?? '')).toEqual({ overlayPosition: { x: 5, y: 6 } });
      expect(disk.has(`${PATH}.tmp`)).toBe(false);
    });

    it('keeps settings it loaded when saving a change', async () => {
      const { files, disk } = memoryFiles('{"overlayPosition":{"x":1,"y":2}}');
      const store = createSettingsStore(PATH, files, logger);
      await store.load();

      await store.update({});

      expect(JSON.parse(disk.get(PATH) ?? '')).toEqual({ overlayPosition: { x: 1, y: 2 } });
    });

    it('runs saves one after another, the last one winning', async () => {
      const { files, disk, log } = memoryFiles();
      const store = createSettingsStore(PATH, files, logger);

      void store.update({ overlayPosition: { x: 1, y: 1 } });
      await store.update({ overlayPosition: { x: 2, y: 2 } });

      expect(log).toEqual([
        `write ${PATH}.tmp`,
        `rename ${PATH}.tmp -> ${PATH}`,
        `write ${PATH}.tmp`,
        `rename ${PATH}.tmp -> ${PATH}`,
      ]);
      expect(JSON.parse(disk.get(PATH) ?? '')).toEqual({ overlayPosition: { x: 2, y: 2 } });
    });

    it('logs a failed save instead of throwing, and keeps saving afterwards', async () => {
      const { files, disk } = memoryFiles();
      const store = createSettingsStore(PATH, files, logger);
      const write = files.write;
      files.write = () => Promise.reject(new Error('ENOSPC: disk full'));

      await expect(store.update({ overlayPosition: { x: 1, y: 1 } })).resolves.toBeUndefined();
      expect(logger.warn).toHaveBeenCalledOnce();

      files.write = write;
      await store.update({ overlayPosition: { x: 3, y: 3 } });
      expect(JSON.parse(disk.get(PATH) ?? '')).toEqual({ overlayPosition: { x: 3, y: 3 } });
    });
  });
});
