import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import api from '../../services/api';
import { OCRResult } from '../../types';

export default function ScannerScreen() {
  const { theme } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const handleCapture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
        });
        if (photo) {
          setCapturedImage(photo.uri);
          processImage(photo.uri);
        }
      } catch (error) {
        console.error('Error capturing photo:', error);
        Alert.alert('Eroare', 'Nu s-a putut captura imaginea');
      }
    }
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCapturedImage(result.assets[0].uri);
      processImage(result.assets[0].uri);
    }
  };

  const processImage = async (imageUri: string) => {
    setIsProcessing(true);
    try {
      // Mock OCR result for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      const mockResult: OCRResult = {
        success: true,
        confidence: 0.94,
        extractedData: {
          vendorName: 'SC Example SRL',
          vendorCUI: 'RO12345678',
          invoiceNumber: 'FACT-2025-0042',
          invoiceDate: '2025-01-10',
          totalAmount: 1250.00,
          vatAmount: 237.50,
          currency: 'RON',
          items: [
            { description: 'Servicii consultanta IT', quantity: 10, unitPrice: 100, total: 1000 },
            { description: 'Licenta software', quantity: 1, unitPrice: 250, total: 250 },
          ],
        },
      };
      setOcrResult(mockResult);
    } catch (error) {
      Alert.alert('Eroare', 'Nu s-au putut extrage datele din imagine');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetScanner = () => {
    setCapturedImage(null);
    setOcrResult(null);
  };

  const saveInvoice = async () => {
    if (!ocrResult?.extractedData) return;

    Alert.alert(
      'Succes',
      'Factura a fost salvata cu succes!',
      [{ text: 'OK', onPress: resetScanner }]
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    permissionText: {
      fontSize: 16,
      color: theme.colors.muted,
      textAlign: 'center',
      marginBottom: 24,
    },
    permissionButton: {
      backgroundColor: theme.colors.primary,
      paddingHorizontal: 24,
      paddingVertical: 12,
      borderRadius: 12,
    },
    permissionButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    cameraContainer: {
      flex: 1,
    },
    camera: {
      flex: 1,
    },
    cameraOverlay: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scanFrame: {
      flex: 1,
      margin: 40,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.5)',
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
    },
    scanText: {
      color: '#FFFFFF',
      fontSize: 16,
      textAlign: 'center',
      paddingHorizontal: 24,
    },
    controlsContainer: {
      padding: 24,
      backgroundColor: theme.colors.background,
    },
    captureRow: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
    },
    iconButton: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor: theme.colors.card,
      justifyContent: 'center',
      alignItems: 'center',
    },
    captureButton: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: '#FFFFFF',
    },
    resultContainer: {
      flex: 1,
    },
    previewImage: {
      width: '100%',
      height: 200,
      resizeMode: 'contain',
      backgroundColor: '#000',
    },
    resultContent: {
      flex: 1,
      padding: 16,
    },
    resultHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    resultTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
      marginLeft: 12,
    },
    confidenceBadge: {
      backgroundColor: theme.colors.success + '20',
      paddingHorizontal: 12,
      paddingVertical: 4,
      borderRadius: 12,
      marginLeft: 'auto',
    },
    confidenceText: {
      fontSize: 12,
      color: theme.colors.success,
      fontWeight: '600',
    },
    resultCard: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 16,
      marginBottom: 12,
    },
    resultLabel: {
      fontSize: 12,
      color: theme.colors.muted,
      marginBottom: 4,
    },
    resultValue: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: '500',
    },
    resultRow: {
      flexDirection: 'row',
      marginBottom: 12,
    },
    resultField: {
      flex: 1,
    },
    itemsTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: 12,
    },
    itemRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    itemDescription: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
    },
    itemAmount: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '500',
    },
    buttonRow: {
      flexDirection: 'row',
      padding: 16,
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    cancelButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    saveButton: {
      flex: 1,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      height: 50,
      justifyContent: 'center',
      alignItems: 'center',
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: 16,
      fontWeight: '600',
    },
    processingOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    processingText: {
      color: '#FFFFFF',
      fontSize: 16,
      marginTop: 16,
    },
  });

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Ionicons name="camera-outline" size={64} color={theme.colors.muted} />
        <Text style={styles.permissionText}>
          Pentru a scana facturi, avem nevoie de acces la camera dispozitivului.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Permite accesul</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (capturedImage && ocrResult) {
    return (
      <View style={styles.resultContainer}>
        <Image source={{ uri: capturedImage }} style={styles.previewImage} />

        <ScrollView style={styles.resultContent}>
          <View style={styles.resultHeader}>
            <Ionicons name="checkmark-circle" size={28} color={theme.colors.success} />
            <Text style={styles.resultTitle}>Date Extrase</Text>
            <View style={styles.confidenceBadge}>
              <Text style={styles.confidenceText}>
                {Math.round(ocrResult.confidence * 100)}% acuratete
              </Text>
            </View>
          </View>

          <View style={styles.resultCard}>
            <View style={styles.resultRow}>
              <View style={styles.resultField}>
                <Text style={styles.resultLabel}>Furnizor</Text>
                <Text style={styles.resultValue}>
                  {ocrResult.extractedData.vendorName || '-'}
                </Text>
              </View>
              <View style={styles.resultField}>
                <Text style={styles.resultLabel}>CUI</Text>
                <Text style={styles.resultValue}>
                  {ocrResult.extractedData.vendorCUI || '-'}
                </Text>
              </View>
            </View>

            <View style={styles.resultRow}>
              <View style={styles.resultField}>
                <Text style={styles.resultLabel}>Nr. Factura</Text>
                <Text style={styles.resultValue}>
                  {ocrResult.extractedData.invoiceNumber || '-'}
                </Text>
              </View>
              <View style={styles.resultField}>
                <Text style={styles.resultLabel}>Data</Text>
                <Text style={styles.resultValue}>
                  {ocrResult.extractedData.invoiceDate || '-'}
                </Text>
              </View>
            </View>

            <View style={styles.resultRow}>
              <View style={styles.resultField}>
                <Text style={styles.resultLabel}>Total</Text>
                <Text style={styles.resultValue}>
                  {ocrResult.extractedData.totalAmount?.toFixed(2) || '-'}{' '}
                  {ocrResult.extractedData.currency || 'RON'}
                </Text>
              </View>
              <View style={styles.resultField}>
                <Text style={styles.resultLabel}>TVA</Text>
                <Text style={styles.resultValue}>
                  {ocrResult.extractedData.vatAmount?.toFixed(2) || '-'}{' '}
                  {ocrResult.extractedData.currency || 'RON'}
                </Text>
              </View>
            </View>
          </View>

          {ocrResult.extractedData.items && ocrResult.extractedData.items.length > 0 && (
            <View style={styles.resultCard}>
              <Text style={styles.itemsTitle}>Articole ({ocrResult.extractedData.items.length})</Text>
              {ocrResult.extractedData.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <Text style={styles.itemAmount}>
                    {item.total?.toFixed(2)} {ocrResult.extractedData.currency || 'RON'}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.cancelButton} onPress={resetScanner}>
            <Text style={styles.cancelButtonText}>Rescaneaza</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={saveInvoice}>
            <Text style={styles.saveButtonText}>Salveaza</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.cameraContainer}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
        <View style={styles.cameraOverlay}>
          <View style={styles.scanFrame}>
            <Text style={styles.scanText}>
              Pozitionati factura in cadru pentru scanare
            </Text>
          </View>
        </View>
      </CameraView>

      <View style={styles.controlsContainer}>
        <View style={styles.captureRow}>
          <TouchableOpacity style={styles.iconButton} onPress={handlePickImage}>
            <Ionicons name="images-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
            <Ionicons name="scan" size={32} color="#FFFFFF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
          >
            <Ionicons name="camera-reverse-outline" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {isProcessing && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.processingText}>Se proceseaza imaginea...</Text>
        </View>
      )}
    </View>
  );
}
