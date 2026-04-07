import Store from 'electron-store';
import crypto from 'node:crypto';

const store = new Store({
  name: 'sys-cfg',
  encryptionKey: 'etq-sys-2024-xK9mP3',
});

const TRIAL_DAYS = 7;

// Activation code: ETQ-2024  (stored as SHA-256 hash)
const EXPECTED_HASH = crypto.createHash('sha256').update('ETQ-2024').digest('hex');

function getFirstLaunch(): string | null {
  return store.get('fl', null) as string | null;
}

function setFirstLaunch(date: string) {
  store.set('fl', date);
}

function isActivated(): boolean {
  return store.get('act', false) as boolean;
}

function setActivated() {
  store.set('act', true);
}

export function checkActivation(): { activated: boolean; expired: boolean; daysLeft: number } {
  // Already activated
  if (isActivated()) {
    return { activated: true, expired: false, daysLeft: -1 };
  }

  // Record first launch date
  let first = getFirstLaunch();
  if (!first) {
    first = new Date().toISOString().split('T')[0];
    setFirstLaunch(first);
  }

  const firstDate = new Date(first);
  const now = new Date();
  const diffMs = now.getTime() - firstDate.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays >= TRIAL_DAYS) {
    return { activated: false, expired: true, daysLeft: 0 };
  }

  return { activated: false, expired: false, daysLeft: TRIAL_DAYS - diffDays };
}

export function verifyAndActivate(code: string): boolean {
  const hash = crypto.createHash('sha256').update(code).digest('hex');
  if (hash === EXPECTED_HASH) {
    setActivated();
    return true;
  }
  return false;
}
