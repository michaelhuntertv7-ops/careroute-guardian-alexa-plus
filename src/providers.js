export const syntheticTransportAdapters = {
  primaryRide: {
    id: 'primary-nemt-sim',
    label: 'Primary transport adapter',
    checkPickup() {
      return {
        outcome: 'FAILED',
        evidence: {
          source: 'synthetic-provider-adapter',
          type: 'pickup_check',
          summary: 'Scheduled 7:15 AM pickup has no completed arrival event by 7:23 AM.',
          data: { scheduledPickup: '07:15', observedAt: '07:23', arrived: false }
        }
      };
    }
  },
  backupRide: {
    id: 'backup-nemt-sim',
    label: 'Approved backup transport adapter',
    arrange() {
      return {
        outcome: 'CONFIRMED',
        evidence: {
          source: 'synthetic-provider-adapter',
          type: 'booking_confirmation',
          summary: 'Backup ride BR-2048 confirmed with a 7:41 AM pickup estimate.',
          data: { bookingId: 'BR-2048', eta: '07:41', providerClass: 'backup-transport' }
        }
      };
    }
  },
  returnRide: {
    id: 'return-nemt-sim',
    label: 'Return transport adapter',
    check() {
      return {
        outcome: 'FAILED',
        evidence: {
          source: 'synthetic-provider-adapter',
          type: 'return_trip_exception',
          summary: 'Return vehicle was marked dispatched, but no pickup confirmation exists after the policy window.',
          data: { dispatchAttempted: true, pickupConfirmed: false, policyWindowMinutes: 12 }
        }
      };
    }
  },
  caregiverRide: {
    id: 'caregiver-vehicle-sim',
    label: 'Caregiver vehicle adapter',
    arrange() {
      return {
        outcome: 'CONFIRMED',
        evidence: {
          source: 'synthetic-care-circle',
          type: 'alternate_return_confirmation',
          summary: 'Caregiver accepted the approved alternate return pickup.',
          data: { accepted: true, etaMinutes: 18 }
        }
      };
    }
  }
};

export function getSyntheticWellnessContext() {
  return {
    source: 'synthetic-wearable-adapter',
    authorized: true,
    interpretation: 'none',
    signals: [
      { label: 'Heart-rate sample', value: '78 bpm', synthetic: true },
      { label: 'Sleep context', value: '6 h 42 m', synthetic: true },
      { label: 'Device connection', value: 'available', synthetic: true }
    ],
    boundary: 'Context only. No diagnosis, emergency detection, treatment decision, or medical-safety determination.'
  };
}
