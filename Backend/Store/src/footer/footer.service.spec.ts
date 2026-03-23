import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { FooterService, DEFAULT_FOOTER_SETTINGS } from './footer.service';

jest.mock('node:fs', () => ({
  promises: {
    mkdir: jest.fn().mockResolvedValue(undefined),
    readFile: jest.fn(),
    writeFile: jest.fn().mockResolvedValue(undefined),
  },
}));

const mockedFs = fs as jest.Mocked<typeof fs>;

describe('FooterService', () => {
  let service: FooterService;
  const storageDir = join(process.cwd(), 'storage', 'footer');
  const settingsPath = join(storageDir, 'settings.json');

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.FOOTER_STORAGE_DIR;
    service = new FooterService();
  });

  describe('getSettings', () => {
    it('returns DEFAULT_FOOTER_SETTINGS when settings file does not exist', async () => {
      mockedFs.readFile.mockRejectedValue(
        Object.assign(new Error('ENOENT'), { code: 'ENOENT' }),
      );

      const result = await service.getSettings();

      expect(result).toEqual(DEFAULT_FOOTER_SETTINGS);
    });

    it('merges persisted overrides on top of defaults', async () => {
      const stored = { contactEmail: 'custom@example.com', contactPhone: '+34 999 000 000' };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(stored) as any);

      const result = await service.getSettings();

      expect(result.contactEmail).toBe('custom@example.com');
      expect(result.contactPhone).toBe('+34 999 000 000');
      // Un-overridden fields come from defaults
      expect(result.logoUrl).toBe(DEFAULT_FOOTER_SETTINGS.logoUrl);
      expect(result.legalLinks).toEqual(DEFAULT_FOOTER_SETTINGS.legalLinks);
    });

    it('returns defaults when the stored file contains invalid JSON', async () => {
      mockedFs.readFile.mockResolvedValue('not-valid-json' as any);

      const result = await service.getSettings();

      expect(result).toEqual(DEFAULT_FOOTER_SETTINGS);
    });

    it('normalizes string fields by trimming whitespace', async () => {
      const stored = { contactEmail: '  trimmed@example.com  ', logoUrl: '  /logo.png  ' };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(stored) as any);

      const result = await service.getSettings();

      expect(result.contactEmail).toBe('trimmed@example.com');
      expect(result.logoUrl).toBe('/logo.png');
    });

    it('falls back to default arrays when stored value is not an array', async () => {
      const stored = { legalLinks: 'not-an-array', socialLinks: null };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(stored) as any);

      const result = await service.getSettings();

      expect(result.legalLinks).toEqual(DEFAULT_FOOTER_SETTINGS.legalLinks);
      expect(result.socialLinks).toEqual(DEFAULT_FOOTER_SETTINGS.socialLinks);
    });

    it('filters out malformed array entries', async () => {
      const stored = {
        legalLinks: [
          { label: 'Aviso legal', url: '/legal' },
          null,
          { label: 123 }, // non-string label — filtered out
          { label: 'Privacidad', url: '/privacidad' },
        ],
      };
      mockedFs.readFile.mockResolvedValue(JSON.stringify(stored) as any);

      const result = await service.getSettings();

      expect(result.legalLinks).toHaveLength(2);
      expect(result.legalLinks[0].label).toBe('Aviso legal');
      expect(result.legalLinks[1].label).toBe('Privacidad');
    });
  });

  describe('saveSettings', () => {
    it('creates the storage directory and writes normalized settings', async () => {
      const input = {
        contactEmail: '  save@example.com  ',
        newsletterEnabled: false,
        legalLinks: [{ label: 'Legal', url: '/legal' }],
      };

      const result = await service.saveSettings(input);

      expect(mockedFs.mkdir).toHaveBeenCalledWith(storageDir, { recursive: true });
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        settingsPath,
        expect.stringContaining('"contactEmail": "save@example.com"'),
        'utf8',
      );
      expect(result.contactEmail).toBe('save@example.com');
      expect(result.newsletterEnabled).toBe(false);
    });

    it('applies defaults for fields not provided in the input', async () => {
      const result = await service.saveSettings({ contactEmail: 'partial@example.com' });

      expect(result.logoUrl).toBe(DEFAULT_FOOTER_SETTINGS.logoUrl);
      expect(result.copyrightText).toBe(DEFAULT_FOOTER_SETTINGS.copyrightText);
    });

    it('writes valid JSON to the storage file', async () => {
      let writtenContent = '';
      mockedFs.writeFile.mockImplementation((_path, content) => {
        writtenContent = content as string;
        return Promise.resolve();
      });

      await service.saveSettings({ contactEmail: 'json@example.com' });

      expect(() => JSON.parse(writtenContent)).not.toThrow();
      const parsed = JSON.parse(writtenContent);
      expect(parsed.contactEmail).toBe('json@example.com');
    });
  });

  describe('resetToDefaults', () => {
    it('writes DEFAULT_FOOTER_SETTINGS to disk and returns them', async () => {
      let writtenContent = '';
      mockedFs.writeFile.mockImplementation((_path, content) => {
        writtenContent = content as string;
        return Promise.resolve();
      });

      const result = await service.resetToDefaults();

      expect(result).toEqual(DEFAULT_FOOTER_SETTINGS);
      const parsed = JSON.parse(writtenContent);
      expect(parsed).toEqual(DEFAULT_FOOTER_SETTINGS);
    });

    it('creates the storage directory before writing', async () => {
      await service.resetToDefaults();

      expect(mockedFs.mkdir).toHaveBeenCalledWith(storageDir, { recursive: true });
    });
  });

  describe('constructor path validation', () => {
    afterEach(() => {
      delete process.env.FOOTER_STORAGE_DIR;
    });

    it('throws when FOOTER_STORAGE_DIR is a relative path', () => {
      process.env.FOOTER_STORAGE_DIR = 'relative/path';

      expect(() => new FooterService()).toThrow(
        /FOOTER_STORAGE_DIR must be an absolute path/,
      );
    });

    it('accepts FOOTER_STORAGE_DIR as an absolute path', () => {
      process.env.FOOTER_STORAGE_DIR = '/custom/storage/footer';

      expect(() => new FooterService()).not.toThrow();
    });
  });
});
