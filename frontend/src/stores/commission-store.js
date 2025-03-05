import { create } from 'zustand';
import axios from 'axios';
import { commissionTiers } from '../constants/commission-tiers';

/**
 * Commission Store using Zustand
 * Manages state for commission data and calculations
 */
export const useCommissionStore = create((set, get) => ({
  // State
  sales: [],
  commissionData: null,
  commissionStructures: [],
  selectedStructureId: null,
  currentTier: 1,
  accessoryRevenue: 0,
  activations: {
    type30: 0,
    type40: 0,
    type55: 0,
    type60: 0,
    total: 0
  },
  upgrades: {
    count: 0
  },
  cp: {
    count: 0
  },
  apo: {
    revenue: 0
  },
  isLoading: false,
  error: null,
  dateRange: {
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    endDate: new Date()
  },

  // Actions
  setDateRange: (startDate, endDate) => set({ 
    dateRange: { startDate, endDate } 
  }),

  fetchCommissionData: async (userId) => {
    const { dateRange } = get();
    
    set({ isLoading: true, error: null });
    
    try {
      // Format dates for API
      const formattedStartDate = dateRange.startDate.toISOString().split('T')[0];
      const formattedEndDate = dateRange.endDate.toISOString().split('T')[0];
      
      // Use the improved commission API directly
      const response = await axios.get(
        `/api/commission/${userId}?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
      );
      
      const commissionData = response.data;
      
      // Also fetch the sales data for charts and details
      const salesResponse = await axios.get(
        `/api/sales/employee/${userId}?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
      );
      
      const sales = salesResponse.data || [];
      
      // Update state with the commission data from API
      set({
        commissionData,
        sales,
        accessoryRevenue: commissionData.accessoryRevenue || 0,
        activations: commissionData.activations?.counts || { type30: 0, type40: 0, type55: 0, type60: 0, total: 0 },
        upgrades: { count: commissionData.upgrades?.count || 0 },
        cp: { count: commissionData.cp?.count || 0 },
        apo: { revenue: commissionData.apo?.revenue || 0 },
        currentTier: commissionData.tier || 1,
        isLoading: false
      });
      
    } catch (error) {
      console.error('Error fetching commission data:', error);
      set({ 
        error: error.message || 'Failed to fetch commission data', 
        isLoading: false 
      });
    }
  },

  // For admin to fetch commission structures 
  fetchCommissionStructures: async () => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await axios.get('/api/commission-structures');
      set({ 
        commissionStructures: response.data,
        isLoading: false
      });
    } catch (error) {
      console.error('Error fetching commission structures:', error);
      set({ 
        error: error.message || 'Failed to fetch commission structures', 
        isLoading: false 
      });
    }
  },
  
  // Save a commission structure
  saveCommissionStructure: async (structure) => {
    set({ isLoading: true, error: null });
    
    try {
      let response;
      
      if (structure._id) {
        // Update existing structure
        response = await axios.put(`/api/commission-structures/${structure._id}`, structure);
      } else {
        // Create new structure
        response = await axios.post('/api/commission-structures', structure);
      }
      
      // Refresh structures
      const structuresResponse = await axios.get('/api/commission-structures');
      
      set({ 
        commissionStructures: structuresResponse.data,
        selectedStructureId: response.data._id, 
        isLoading: false
      });
      
      return response.data;
    } catch (error) {
      console.error('Error saving commission structure:', error);
      set({ 
        error: error.message || 'Failed to save commission structure', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  // Delete a commission structure
  deleteCommissionStructure: async (structureId) => {
    set({ isLoading: true, error: null });
    
    try {
      await axios.delete(`/api/commission-structures/${structureId}`);
      
      // Refresh structures
      const response = await axios.get('/api/commission-structures');
      
      set({ 
        commissionStructures: response.data,
        selectedStructureId: null,
        isLoading: false
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting commission structure:', error);
      set({ 
        error: error.message || 'Failed to delete commission structure', 
        isLoading: false 
      });
      throw error;
    }
  },
  
  setSelectedStructure: (structureId) => {
    set({ selectedStructureId: structureId });
  },

  // Calculate current commission based on store state
  getCommission: () => {
    // If we have data from the API, use that
    const { commissionData } = get();
    if (commissionData) {
      return commissionData;
    }
    
    // Otherwise fallback to local calculation
    const { 
      accessoryRevenue, 
      activations, 
      upgrades, 
      cp, 
      apo, 
      currentTier 
    } = get();
    
    // Get the tier configuration
    const tier = commissionTiers.find(t => t.id === currentTier) || commissionTiers[0];
    
    // Calculate accessory commission
    const accessoryCommission = accessoryRevenue * tier.accessoryRate;
    
    // Calculate activations commission
    const activationsCommission = 
      (activations.type30 * tier.activationRates.type30) +
      (activations.type40 * tier.activationRates.type40) +
      (activations.type55 * tier.activationRates.type55) +
      (activations.type60 * tier.activationRates.type60);
    
    // Calculate upgrades commission
    const upgradesCommission = upgrades.count * tier.upgradeRate;
    
    // Calculate CP commission
    const cpCommission = cp.count * tier.cpRate;
    
    // Calculate APO commission
    const apoCommission = apo.revenue * tier.apoRate;
    
    // Total commission
    const totalCommission = 
      accessoryCommission + 
      activationsCommission + 
      upgradesCommission + 
      cpCommission + 
      apoCommission;
    
    // Return detailed commission breakdown
    return {
      tier: currentTier,
      accessoryRevenue,
      accessoryCommission,
      activations: {
        counts: activations,
        commission: activationsCommission
      },
      upgrades: {
        count: upgrades.count,
        commission: upgradesCommission
      },
      cp: {
        count: cp.count,
        commission: cpCommission
      },
      apo: {
        revenue: apo.revenue,
        commission: apoCommission
      },
      totalCommission
    };
  },

  // "What if" calculator to simulate commission with different numbers
  calculateWhatIfCommission: (
    accessoryRevenue, 
    activations = { type30: 0, type40: 0, type55: 0, type60: 0 },
    upgradeCount = 0,
    cpCount = 0,
    apoRevenue = 0,
    structureId = null
  ) => {
    // Get the current structures
    const { commissionStructures, selectedStructureId } = get();
    
    // Find the selected structure, or use default commissionTiers if not found
    let tiers = commissionTiers;
    
    if (structureId || selectedStructureId) {
      const structId = structureId || selectedStructureId;
      const structure = commissionStructures.find(s => s._id === structId);
      if (structure && structure.tiers) {
        tiers = structure.tiers;
      }
    }
    
    // Calculate for each tier
    return tiers.map(tier => {
      // Calculate accessory commission
      const accessoryCommission = accessoryRevenue * tier.accessoryRate;
      
      // Calculate activations commission
      const activationsCommission = 
        (activations.type30 * tier.activationRates.type30) +
        (activations.type40 * tier.activationRates.type40) +
        (activations.type55 * tier.activationRates.type55) +
        (activations.type60 * tier.activationRates.type60);
      
      // Calculate upgrades commission
      const upgradesCommission = upgradeCount * tier.upgradeRate;
      
      // Calculate CP commission
      const cpCommission = cpCount * tier.cpRate;
      
      // Calculate APO commission
      const apoCommission = apoRevenue * tier.apoRate;
      
      // Total commission
      const totalCommission = 
        accessoryCommission + 
        activationsCommission + 
        upgradesCommission + 
        cpCommission + 
        apoCommission;
      
      // Return detailed commission breakdown for this tier
      return {
        tier: tier.id,
        name: tier.name,
        accessoryTarget: tier.accessoryTarget,
        accessoryRevenue,
        accessoryCommission,
        activations: {
          counts: activations,
          commission: activationsCommission
        },
        upgrades: {
          count: upgradeCount,
          commission: upgradesCommission
        },
        cp: {
          count: cpCount,
          commission: cpCommission
        },
        apo: {
          revenue: apoRevenue,
          commission: apoCommission
        },
        totalCommission
      };
    });
  }
}));

export default useCommissionStore;