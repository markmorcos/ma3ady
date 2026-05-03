import { render } from '@testing-library/react-native';
import { Time } from '../Time';
import { useSessionPrefsStore } from '@/state/sessionPrefsStore';

describe('<Time>', () => {
  beforeEach(() => {
    useSessionPrefsStore.getState().resetSessionPrefs();
  });

  it('renders the value in the tenant timezone for public-booking by default', () => {
    const { getByText } = render(
      <Time
        value="2026-06-15T12:00:00.000Z"
        context="public-booking"
        tenantTimezone="Europe/Berlin"
        format="short"
      />,
    );
    // Berlin is UTC+2 in mid-June.
    expect(getByText('14:00')).toBeTruthy();
  });

  it('honors the session override for public-booking', () => {
    useSessionPrefsStore.getState().setDisplayTimezoneOverride('America/Los_Angeles');
    const { getByText } = render(
      <Time
        value="2026-06-15T12:00:00.000Z"
        context="public-booking"
        tenantTimezone="Europe/Berlin"
        format="short"
      />,
    );
    // LA is UTC-7 in mid-June.
    expect(getByText('05:00')).toBeTruthy();
  });

  it('renders DST spring-forward day correctly for Berlin', () => {
    // 2026-03-29 02:30 Berlin local does not exist (skipped). The IANA expectation:
    // an instant 01:30 UTC on that day is 03:30 Berlin (after the jump).
    const { getByText } = render(
      <Time
        value="2026-03-29T01:30:00.000Z"
        context="public-booking"
        tenantTimezone="Europe/Berlin"
        format="short"
      />,
    );
    expect(getByText('03:30')).toBeTruthy();
  });

  it('honors the admin override on admin surfaces', () => {
    const { getByText } = render(
      <Time
        value="2026-06-15T12:00:00.000Z"
        context="admin"
        tenantTimezone="Europe/Berlin"
        adminOverride="Asia/Dubai"
        format="short"
      />,
    );
    // Dubai is UTC+4 year-round.
    expect(getByText('16:00')).toBeTruthy();
  });
});
