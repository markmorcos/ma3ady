import { reloadApp } from '@/services/reloadApp.web';

describe('reloadApp (web)', () => {
  it('calls window.location.reload', async () => {
    const reload = jest.fn();
    Object.defineProperty(window, 'location', {
      value: { ...window.location, reload },
      configurable: true,
    });
    await reloadApp();
    expect(reload).toHaveBeenCalled();
  });
});
