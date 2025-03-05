import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, ActivityIndicator, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Camera, FileCheck, FileImage, FilePlus, Receipt, Check, X, AlertCircle, FileText } from 'lucide-react-native';
import { useSalesStore } from '@/stores/sales-store';
import Colors from '@/constants/colors';
// Mock OCR result based on the sample receipt
const mockParseReceipt = () => {
  // In a real app, this would be replaced with actual OCR processing
  return {
    store: 'Spring Hill',
    date: new Date().toISOString(),
    customer: 'KAREN ROBERTS',
    orderNumber: '12429983633975743',
    items: [
      {
        id: 'DAPN4506',
        name: 'Apple iPhone 16 Pro Max 256GB',
        quantity: 1,
        price: 1199.99,
        category: 'activation',
      },
      {
        id: 'STHN4006',
        name: 'DEVICE SIM',
        quantity: 1,
        price: 0,
        category: 'activation',
      },
      {
        id: '150728-3199',
        name: 'Speck Apple iPhone 16 Pro Max Case',
        quantity: 1,
        price: 49.99,
        category: 'accessory',
      },
      {
        id: 'QCPD35W',
        name: 'Quikcell 35W PD A+C Dual Ports Wall Charger',
        quantity: 1,
        price: 39.99,
        category: 'accessory',
      },
      {
        id: 'LSP-PHONE-PRO-PLUS',
        name: 'Liquid Glass - Phone / Tablet / Watch - $300 Coverage',
        quantity: 1,
        price: 80.00,
        category: 'accessory',
      },
      {
        id: 'STWG1000',
        name: 'STW Tempered Glass - Clear',
        quantity: 1,
        price: 69.99,
        category: 'accessory',
      }
    ],
    total: 1458.82,
    taxes: 84.86
  };
};
export default function UploadScreen() {
  const { addSale } = useSalesStore();
  const [image, setImage] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  useEffect(() => {
    (async () => {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          setError('Permission to access media library is required!');
        }
      }
    })();
  }, []);
});
const pickImage = async () => {
    setError(null);
    setSuccess(false);
    setParsedData(null);
    setPdfName(null);
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });
      if (!result.canceled) {
        setImage(result.assets[0].uri);
        setLoading(true);
        
        // Simulate API call delay
        setTimeout(() => {
          try {
            const data = mockParseReceipt();
            setParsedData(data);
            setLoading(false);
          } catch (err) {
            setError('Failed to parse receipt. Please try again.');
            setLoading(false);
          }
        }, 2000);
      }
    } catch (err) {
      setError('Failed to pick image. Please try again.');
    }
  };
  const pickPdf = async () => {
    setError(null);
    setSuccess(false);
    setParsedData(null);
    setImage(null);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });
      if (result.canceled === false) {
        setPdfName(result.assets[0].name);
        setLoading(true);
        
        // Simulate API call delay
        setTimeout(() => {
          try {
            const data = mockParseReceipt();
            setParsedData(data);
            setLoading(false);
          } catch (err) {
            setError('Failed to parse PDF. Please try again.');
            setLoading(false);
          }
        }, 2000);
      }
    } catch (err) {
      setError('Failed to pick PDF. Please try again.');
    }
  };
  const handleConfirm = () => {
    if (!parsedData) return;
    
    // Determine the primary category based on items
    const hasActivation = parsedData.items.some((item: any) => item.category === 'activation');
    const hasUpgrade = parsedData.items.some((item: any) => item.category === 'upgrade');
    
    let primaryCategory: 'activation' | 'upgrade' | 'accessory' | 'other' = 'other';
    
    if (hasActivation) {
      primaryCategory = 'activation';
    } else if (hasUpgrade) {
      primaryCategory = 'upgrade';
    } else if (parsedData.items.length > 0) {
      primaryCategory = 'accessory';
    }
    
 // Add the sale
    addSale({
      date: parsedData.date,
      amount: parsedData.total,
      items: parsedData.items.map((item: any) => ({
        id: item.id || Date.now().toString() + Math.random().toString(36).substring(2, 9),
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        category: item.category,
      })),
      category: primaryCategory,
    });
    
    // Reset state
    setSuccess(true);
    setImage(null);
    setPdfName(null);
    setParsedData(null);
    
    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess(false);
    }, 3000);
  };
  const handleCancel = () => {
    setImage(null);
    setPdfName(null);
    setParsedData(null);
    setError(null);
    setSuccess(false);
  };
return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Upload Receipt</Text>
          <Text style={styles.subtitle}>
            Upload an image or PDF of a receipt to automatically add a sale
          </Text>
        </View>
        
        {!image && !pdfName && !parsedData && !success && (
          <View style={styles.uploadContainer}>
            <Pressable style={styles.uploadButton} onPress={pickImage}>
              <Camera size={32} color={Colors.text} />
              <Text style={styles.uploadText}>Select Receipt Image</Text>
            </Pressable>
            
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>
            
            <Pressable style={styles.uploadButton} onPress={pickPdf}>
              <FileText size={32} color={Colors.text} />
              <Text style={styles.uploadText}>Select Receipt PDF</Text>
            </Pressable>
          </View>
        )}
        
        {image && !parsedData && !success && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>Receipt Preview</Text>
            <Image source={{ uri: image }} style={styles.previewImage} />
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Parsing receipt...</Text>
              </View>
            ) : (
              <View style={styles.buttonRow}>
                <Pressable style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.button, styles.retryButton]} onPress={pickImage}>
                  <Text style={styles.buttonText}>Try Another</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
        
        {pdfName && !parsedData && !success && (
          <View style={styles.previewContainer}>
            <Text style={styles.previewTitle}>PDF Receipt</Text>
            
            <View style={styles.pdfPreview}>
              <FileText size={64} color={Colors.primary} />
              <Text style={styles.pdfName}>{pdfName}</Text>
            </View>
            
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Parsing PDF receipt...</Text>
              </View>
            ) : (
              <View style={styles.buttonRow}>
                <Pressable style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                  <Text style={styles.buttonText}>Cancel</Text>
                </Pressable>
                <Pressable style={[styles.button, styles.retryButton]} onPress={pickPdf}>
                  <Text style={styles.buttonText}>Try Another</Text>
                </Pressable>
              </View>
            )}
 </View>
        )}
        
        {parsedData && !success && (
          <View style={styles.resultContainer}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultTitle}>Parsed Receipt</Text>
              <Text style={styles.resultSubtitle}>Please verify the information below</Text>
            </View>
            
            <View style={styles.resultCard}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Store:</Text>
                <Text style={styles.resultValue}>{parsedData.store}</Text>
              </View>
              
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Date:</Text>
                <Text style={styles.resultValue}>
                  {new Date(parsedData.date).toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Customer:</Text>
                <Text style={styles.resultValue}>{parsedData.customer}</Text>
              </View>
              
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Order #:</Text>
                <Text style={styles.resultValue}>{parsedData.orderNumber}</Text>
              </View>
              
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Total:</Text>
                <Text style={styles.resultValue}>${parsedData.total.toFixed(2)}</Text>
              </View>
            </View>
            
            <Text style={styles.itemsTitle}>Items</Text>
            
            {parsedData.items.map((item: any, index: number) => (
              <View key={index} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={[
                    styles.categoryBadge,
                    { backgroundColor: getCategoryColor(item.category, true) }
                  ]}>
                    <Text style={styles.categoryText}>
                      {item.category.toUpperCase()}
                    </Text>
                  </View>
                </View>
<View style={styles.itemDetails}>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemPrice}>${item.price.toFixed(2)}</Text>
                </View>
              </View>
            ))}
            
            <View style={styles.buttonRow}>
              <Pressable style={[styles.button, styles.cancelButton]} onPress={handleCancel}>
                <Text style={styles.buttonText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.button, styles.confirmButton]} onPress={handleConfirm}>
                <Text style={styles.buttonText}>Confirm & Add Sale</Text>
              </Pressable>
            </View>
          </View>
        )}
        
        {error && (
          <View style={styles.errorContainer}>
            <AlertCircle size={24} color={Colors.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
        
        {success && (
          <View style={styles.successContainer}>
            <Check size={32} color={Colors.success} />
            <Text style={styles.successText}>Sale added successfully!</Text>
            <View style={styles.successButtonRow}>
              <Pressable style={styles.newUploadButton} onPress={pickImage}>
                <Text style={styles.newUploadText}>Upload Image</Text>
              </Pressable>
              <Pressable style={styles.newUploadButton} onPress={pickPdf}>
                <Text style={styles.newUploadText}>Upload PDF</Text>
              </Pressable>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
const getCategoryColor = (category: string, isBackground = false) => {
  const alpha = isBackground ? '20' : '';
  switch (category) {
    case 'accessory': return Colors.primary + alpha;
    case 'activation': return Colors.secondary + alpha;
    case 'upgrade': return Colors.accent + alpha;
    default: return Colors.textSecondary + alpha;
  }
};
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
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
  uploadContainer: {
    padding: 16,
    gap: 16,
  },
  uploadButton: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color: Colors.textSecondary,
  },
  previewContainer: {
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
  previewTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  previewImage: {
    width: '100%',
    height: 400,
    borderRadius: 8,
    marginBottom: 16,
  },
  pdfPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: 16,
  },
  pdfName: {
    marginTop: 16,
    color: Colors.text,
    fontSize: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 16,
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
 button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: Colors.surfaceAlt,
  },
  retryButton: {
    backgroundColor: Colors.secondary,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '500',
  },
  resultContainer: {
    margin: 16,
  },
  resultHeader: {
    marginBottom: 16,
  },
  resultTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  resultSubtitle: {
    color: Colors.textSecondary,
    marginTop: 4,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  resultLabel: {
    color: Colors.textSecondary,
    flex: 1,
  },
resultValue: {
    color: Colors.text,
    fontWeight: '500',
    flex: 2,
  },
  itemsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    color: Colors.text,
    fontSize: 10,
    fontWeight: 'bold',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemQuantity: {
    color: Colors.textSecondary,
  },
  itemPrice: {
    color: Colors.text,
    fontWeight: '500',
  },
errorContainer: {
    margin: 16,
    backgroundColor: Colors.error + '20',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  errorText: {
    color: Colors.error,
    flex: 1,
  },
  successContainer: {
    margin: 16,
    alignItems: 'center',
    padding: 24,
    backgroundColor: Colors.success + '20',
    borderRadius: 12,
  },
  successText: {
    color: Colors.success,
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 24,
  },
  successButtonRow: {
    flexDirection: 'row',
    gap: 16,
  },
  newUploadButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  newUploadText: {
    color: Colors.background,
    fontWeight: '500',
  },
});



