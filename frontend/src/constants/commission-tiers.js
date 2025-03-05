/**
 * Commission tier definitions
 * Each tier has different commission rates for different product categories
 */

export const commissionTiers = [
  {
    id: 1,
    name: 'Tier 1',
    accessoryTarget: 500, // $500 target
    accessoryRate: 0.08, // 8% commission
    activationRates: {
      type30: 10, // $10 per $30 activation
      type40: 15, // $15 per $40 activation
      type55: 20, // $20 per $55 activation
      type60: 25  // $25 per $60 activation
    },
    upgradeRate: 10, // $10 per upgrade
    cpRate: 15, // $15 per CP
    apoRate: 0.10 // 10% for APO $60+
  },
  {
    id: 2,
    name: 'Tier 2',
    accessoryTarget: 750, // $750 target
    accessoryRate: 0.10, // 10% commission
    activationRates: {
      type30: 12, // $12 per $30 activation
      type40: 18, // $18 per $40 activation
      type55: 25, // $25 per $55 activation
      type60: 30  // $30 per $60 activation
    },
    upgradeRate: 12, // $12 per upgrade
    cpRate: 18, // $18 per CP
    apoRate: 0.12 // 12% for APO $60+
  },
  {
    id: 3,
    name: 'Tier 3',
    accessoryTarget: 1000, // $1000 target
    accessoryRate: 0.10, // 10% commission
    activationRates: {
      type30: 15, // $15 per $30 activation
      type40: 22, // $22 per $40 activation
      type55: 30, // $30 per $55 activation
      type60: 35  // $35 per $60 activation
    },
    upgradeRate: 15, // $15 per upgrade
    cpRate: 20, // $20 per CP
    apoRate: 0.15 // 15% for APO $60+
  },
  {
    id: 4,
    name: 'Tier 4',
    accessoryTarget: 1750, // $1750 target
    accessoryRate: 0.1, // 10% commission
    activationRates: {
      type30: 18, // $18 per $30 activation
      type40: 25, // $25 per $40 activation
      type55: 35, // $35 per $55 activation
      type60: 40  // $40 per $60 activation
    },
    upgradeRate: 18, // $18 per upgrade
    cpRate: 25, // $25 per CP
    apoRate: 0.18 // 18% for APO $60+
  }
];

export default commissionTiers;
