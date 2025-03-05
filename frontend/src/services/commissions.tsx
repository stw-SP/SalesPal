import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { DollarSign, Calculator, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react-native';
import { useCommissionStore } from '@/stores/commission-store';
import { commissionTiers } from '@/constants/commission-tiers';
import Colors from '@/constants/colors';
export default function CommissionScreen() {
  const { calculateCommission, calculateWhatIfCommission } = useCommissionStore();
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [accessoryRevenue, setAccessoryRevenue] = useState('');
  const [activations30, setActivations30] = useState('');
  const [activations40, setActivations40] = useState('');
  const [activations55, setActivations55] = useState('');
  const [activations60, setActivations60] = useState('');
  const [upgrades, setUpgrades] = useState('');
  const [cp, setCp] = useState('');
  const [apo, setApo] = useState('');
  const [whatIfResults, setWhatIfResults] = useState<any[]>([]);
  const currentCommission = calculateCommission();
  const handleCalculateWhatIf = () => {
    const results = calculateWhatIfCommission(
      parseFloat(accessoryRevenue) || 0,
      {
        type30: parseInt(activations30) || 0,
        type40: parseInt(activations40) || 0,
        type55: parseInt(activations55) || 0,
        type60: parseInt(activations60) || 0
      },
      parseInt(upgrades) || 0,
      parseInt(cp) || 0,
      parseFloat(apo) || 0
    );
    
    setWhatIfResults(results);
  };
  const resetWhatIf = () => {
    setAccessoryRevenue('');
    setActivations30('');
    setActivations40('');
    setActivations55('');
    setActivations60('');
    setUpgrades('');
    setCp('');
    setApo('');
    setWhatIfResults([]);
  };
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Commission Calculator</Text>
        <Text style={styles.subtitle}>Track your earnings and simulate potential commissions</Text>
      </View>
      <View style={styles.currentCommissionCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Current Commission</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierBadgeText}>Tier {currentCommission.tier}</Text>
          </View>
        </View>
        <Text style={styles.totalCommission}>
          ${currentCommission.totalCommission.toFixed(2)}
        </Text>
        <View style={styles.commissionBreakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Accessory</Text>
            <Text style={styles.breakdownValue}>
              ${currentCommission.accessoryCommission.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Activations</Text>
            <Text style={styles.breakdownValue}>
              ${currentCommission.activations.commission.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Upgrades</Text>
            <Text style={styles.breakdownValue}>
              ${currentCommission.upgrades.commission.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>APO $60+</Text>
            <Text style={styles.breakdownValue}>
              ${currentCommission.apo.commission.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
<View style={styles.tierProgressCard}>
              <View 
                key={tier.id} 
                style={[
                  styles.tierProgressItem,
                  isCurrentTier && styles.currentTierItem
                ]}
              >
                <View style={styles.tierHeader}>
                  <Text style={styles.tierName}>{tier.name}</Text>
                  {isReached && (
                    <View style={styles.reachedBadge}>
                      <Text style={styles.reachedBadgeText}>Reached</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.progressBarContainer}>
                  <View 
                    style={[
                      styles.progressBar,
                      { width: `${progress}%` },
                      isReached && styles.progressBarComplete
                    ]}
                  />
                </View>
                
                <Text style={styles.tierTarget}>
                  ${currentCommission.accessoryRevenue.toFixed(2)} / ${tier.accessoryTarget.toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
      <Pressable 
        style={styles.whatIfToggle}
        onPress={() => setShowWhatIf(!showWhatIf)}
      >
        <Text style={styles.whatIfToggleText}>
          {showWhatIf ? 'Hide "What If" Calculator' : 'Show "What If" Calculator'}
        </Text>
        {showWhatIf ? (
          <ChevronUp size={20} color={Colors.primary} />
        ) : (
          <ChevronDown size={20} color={Colors.primary} />
        )}
      </Pressable>
      {showWhatIf && (
        <View style={styles.whatIfContainer}>
          <Text style={styles.whatIfTitle}>
            "What If" Commission Calculator
          </Text>
          <Text style={styles.whatIfSubtitle}>
            Simulate your commission with different sales numbers
          </Text>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Accessory Revenue ($)</Text>
            <TextInput
              style={styles.input}
              value={accessoryRevenue}
              onChangeText={setAccessoryRevenue}
              keyboardType="decimal-pad"
              placeholder="Enter accessory revenue"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
          <Text style={styles.sectionLabel}>Activations</Text>
          <View style={styles.activationInputs}>
            <View style={styles.inputGroupSmall}>
              <Text style={styles.inputLabel}>$30</Text>
              <TextInput
                style={styles.inputSmall}
                value={activations30}
                onChangeText={setActivations30}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
      
            
            <View style={styles.inputGroupSmall}>
              <Text style={styles.inputLabel}>$60</Text>
              <TextInput
                style={styles.inputSmall}
                value={activations60}
                onChangeText={setActivations60}
                keyboardType="number-pad"
                placeholder="0"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Upgrades</Text>
              <TextInput
                style={styles.input}
                value={upgrades}
                onChangeText={setUpgrades}
                keyboardType="number-pad"
                placeholder="Enter count"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
            
            <View style={[styles.inputGroup, { flex: 1, marginLeft: 12 }]}>
              <Text style={styles.inputLabel}>CP</Text>
              <TextInput
                style={styles.input}
                value={cp}
                onChangeText={setCp}
                keyboardType="number-pad"
                placeholder="Enter count"
                placeholderTextColor={Colors.textTertiary}
              />
            </View>
          </View>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>APO $60+ Revenue</Text>
            <TextInput
              style={styles.input}
              value={apo}
              onChangeText={setApo}
              keyboardType="decimal-pad"
              placeholder="Enter APO revenue"
              placeholderTextColor={Colors.textTertiary}
            />
          </View>
          <View style={styles.buttonRow}>
            <Pressable 
              style={[styles.button, styles.resetButton]} 
              onPress={resetWhatIf}
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </Pressable>
            
            <Pressable 
              style={[styles.button, styles.calculateButton]} 
              onPress={handleCalculateWhatIf}
            >
              <Calculator size={16} color={Colors.background} />
              <Text style={styles.calculateButtonText}>Calculate</Text>
            </Pressable>
          </View>
          {whatIfResults.length > 0 && (
            <View style={styles.resultsContainer}>
              <Text style={styles.resultsTitle}>Results</Text>
              
              {whatIfResults.map((result) => (
                <View key={result.tier} style={styles.resultCard}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultTierName}>Tier {result.tier}</Text>
                    <Text style={styles.resultCommission}>
                      ${result.totalCommission.toFixed(2)}
                    </Text>
                  </View>
    <View style={styles.resultBreakdown}>
                      <Text style={styles.resultItemValue}>
                        ${result.accessoryCommission.toFixed(2)}
                      </Text>
                    </View>
                    
                    <View style={styles.resultItem}>
                      <Text style={styles.resultItemLabel}>Activations</Text>
                      <Text style={styles.resultItemValue}>
                        ${result.activations.commission.toFixed(2)}
                      </Text>
                    </View>
                    
                    <View style={styles.resultItem}>
                      <Text style={styles.resultItemLabel}>Upgrades</Text>
                      <Text style={styles.resultItemValue}>
                        ${result.upgrades.commission.toFixed(2)}
                      </Text>
                    </View>
                    
                    <View style={styles.resultItem}>
                      <Text style={styles.resultItemLabel}>CP</Text>
                      <Text style={styles.resultItemValue}>
                        ${result.cp.commission.toFixed(2)}
                      </Text>
                    </View>
                    
                    <View style={styles.resultItem}>
                      <Text style={styles.resultItemLabel}>APO $60+</Text>
                      <Text style={styles.resultItemValue}>
                        ${result.apo.commission.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  
                  {result.tier > currentCommission.tier && (
                    <View style={styles.potentialContainer}>
                      <TrendingUp size={16} color={Colors.primary} />
                      <Text style={styles.potentialText}>
                        Potential increase: ${(result.totalCommission - currentCommission.totalCommission).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: Colors.primary,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.background,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.background,
    opacity: 0.8,
    marginTop: 4,
  },
  currentCommissionCard: {
    margin: 16,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
},
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    color: Colors.textSecondary,
  },
  breakdownValue: {
    color: Colors.text,
    fontWeight: '500',
  },
  tierProgressCard: {
    margin: 16,
    marginTop: 0,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tierProgressContainer: {
    marginTop: 12,
    gap: 16,
  },
  tierProgressItem: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
  },
  currentTierItem: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tierName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  reachedBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reachedBadgeText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.secondary,
  },
  progressBarComplete: {
    backgroundColor: Colors.success,
  },
  tierTarget: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
whatIfToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    marginHorizontal: 16,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    marginBottom: 16,
  },
  whatIfToggleText: {
    color: Colors.primary,
    fontWeight: '500',
    marginRight: 8,
  },
  whatIfContainer: {
    margin: 16,
    marginTop: 0,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  whatIfTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  whatIfSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 12,
  },
  activationInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  inputGroupSmall: {
    flex: 1,
    marginRight: 8,
  },
  inputSmall: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  resetButton: {
    backgroundColor: Colors.surfaceAlt,
  },
  resetButtonText: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  calculateButton: {
    backgroundColor: Colors.primary,
  },
calculateButtonText: {
    color: Colors.background,
    fontWeight: '500',
    marginLeft: 8,
  },
  resultsContainer: {
    marginTop: 8,
  },
  resultsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultTierName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  resultCommission: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  resultBreakdown: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  resultItemLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  resultItemValue: {
    color: Colors.text,
    fontSize: 12,
  },
  potentialContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: Colors.lightPrimary + '20',
    borderRadius: 4,
  },
  potentialText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 8,
  },
});


