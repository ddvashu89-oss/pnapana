import type { PlantSetupValues } from '@/components/PlantSetupWizard';

// A photograph cannot establish the plant's room, pot drainage, or watering history.
export function automaticPlantSetup(waterFrequency?: number): PlantSetupValues {
  const frequency = Number(waterFrequency);
  const soilCheckDays = [1, 2, 3, 5, 7, 10, 14].includes(frequency) ? frequency : 7;
  return {
    placement: 'unknown' as PlantSetupValues['placement'],
    room: 'Not specified',
    light: 'Not sure',
    pot_size: 'not-sure',
    has_drainage: null,
    soil_condition: 'not-sure',
    moisture_level: 'not-sure',
    last_watered: 'not-sure',
    last_repotted: 'not-sure',
    soil_check_days: soilCheckDays,
    fertilizer_weeks: 0,
    rotation_days: 0,
    light_review_days: 14,
    leaf_cleaning_days: 0,
    health_check_days: 14,
    reminder_time: '09:00',
    notification_mode: 'in-app',
  };
}
