/**
 * Australian National Greenhouse Accounts (NGA) Emission Factors
 * Based on DCEEW published factors for Australian businesses.
 * Used to convert activity data to tonnes CO2-e.
 */

const EMISSION_FACTORS = {
  // Scope 1 - Direct emissions
  scope1: {
    natural_gas: { factor: 51.53, unit: 'GJ', description: 'Natural gas combustion' },
    diesel: { factor: 2.7006, unit: 'L', description: 'Diesel fuel combustion' },
    petrol: { factor: 2.3292, unit: 'L', description: 'Petrol fuel combustion' },
    lpg: { factor: 1.5441, unit: 'L', description: 'LPG combustion' },
    fleet_diesel: { factor: 2.7006, unit: 'L', description: 'Fleet vehicle - diesel' },
    fleet_petrol: { factor: 2.3292, unit: 'L', description: 'Fleet vehicle - petrol' },
    refrigerant_r410a: { factor: 2088, unit: 'kg', description: 'Refrigerant R-410A leakage' },
    refrigerant_r134a: { factor: 1430, unit: 'kg', description: 'Refrigerant R-134a leakage' },
  },
  // Scope 2 - Indirect (purchased electricity)
  scope2: {
    electricity_nsw: { factor: 0.79, unit: 'kWh', description: 'Grid electricity - NSW/ACT' },
    electricity_vic: { factor: 1.02, unit: 'kWh', description: 'Grid electricity - VIC' },
    electricity_qld: { factor: 0.80, unit: 'kWh', description: 'Grid electricity - QLD' },
    electricity_sa: { factor: 0.35, unit: 'kWh', description: 'Grid electricity - SA' },
    electricity_wa: { factor: 0.68, unit: 'kWh', description: 'Grid electricity - WA' },
    electricity_tas: { factor: 0.17, unit: 'kWh', description: 'Grid electricity - TAS' },
    electricity_nt: { factor: 0.60, unit: 'kWh', description: 'Grid electricity - NT' },
    electricity_national: { factor: 0.73, unit: 'kWh', description: 'Grid electricity - National average' },
  },
  // Scope 3 - Indirect (value chain)
  scope3: {
    business_travel_air_domestic: { factor: 0.195, unit: 'km', description: 'Domestic air travel' },
    business_travel_air_international: { factor: 0.115, unit: 'km', description: 'International air travel' },
    employee_commute_car: { factor: 0.171, unit: 'km', description: 'Employee commute by car' },
    waste_landfill: { factor: 1.1, unit: 'tonnes', description: 'Waste to landfill' },
    waste_recycled: { factor: 0.021, unit: 'tonnes', description: 'Waste recycled' },
    water_supply: { factor: 0.394, unit: 'kL', description: 'Water supply & treatment' },
    paper: { factor: 0.919, unit: 'tonnes', description: 'Paper consumption' },
  }
};

// Convert quantity to tonnes CO2-e
function calculateEmissions(category, sourceType, quantity) {
  const factors = EMISSION_FACTORS[category];
  if (!factors || !factors[sourceType]) return null;

  const ef = factors[sourceType];
  // Factor is in kg CO2-e per unit, convert to tonnes
  const co2eKg = quantity * ef.factor;
  const co2eTonnes = co2eKg / 1000;

  return {
    co2e_tonnes: Math.round(co2eTonnes * 10000) / 10000,
    emission_factor: ef.factor,
    unit: ef.unit,
    description: ef.description
  };
}

function getSourceTypes() {
  const types = {};
  for (const [category, sources] of Object.entries(EMISSION_FACTORS)) {
    types[category] = Object.entries(sources).map(([key, val]) => ({
      key,
      unit: val.unit,
      description: val.description,
      factor: val.factor
    }));
  }
  return types;
}

module.exports = { EMISSION_FACTORS, calculateEmissions, getSourceTypes };
