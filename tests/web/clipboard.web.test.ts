import { copyToClipboard } from '@/services/clipboard.web';

describe('copyToClipboard (web)', () => {
  const writeText = jest.fn(async () => undefined);

  beforeEach(() => {
    writeText.mockReset();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });
  });

  it('uses navigator.clipboard.writeText when available', async () => {
    writeText.mockResolvedValueOnce(undefined);
    await copyToClipboard('hello');
    expect(writeText).toHaveBeenCalledWith('hello');
  });

  it('falls back to a temporary textarea + select when writeText rejects', async () => {
    writeText.mockRejectedValueOnce(new Error('insecure context'));
    // jsdom 20 doesn't implement document.execCommand; stub it on the
    // prototype just for the fallback assertion.
    const execStub = jest.fn().mockReturnValue(true);
    (document as unknown as { execCommand: typeof execStub }).execCommand = execStub;
    await copyToClipboard('fallback-value');
    expect(execStub).toHaveBeenCalledWith('copy');
  });
});
