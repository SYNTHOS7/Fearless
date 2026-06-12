import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import bleManager from '../services/BleManager';
import storageService from '../services/StorageService';
import type {
  Contact,
  Settings,
  AlertEvent,
  BleDevice,
  ConnectionStatus,
  RiskStatus,
  SensitivityLevel,
} from '../types';
import { StruggleStatus, AlertControl } from '../types';
import { DEFAULT_SETTINGS, RISK_THRESHOLDS } from '../utils/constants';

// ─── App Context Interface ────────────────────────────────────────────────────

export interface AppContextType {
  // BLE Connection State
  connectionStatus: ConnectionStatus;
  pairedDevice: BleDevice | null;
  discoveredDevices: BleDevice[];
  batteryLevel: number;
  lastStruggleStatus: StruggleStatus;
  lastConfidence: number;
  riskLevel: number;
  riskStatus: RiskStatus;

  // Settings & Config
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => Promise<void>;

  // Emergency Contacts
  contacts: Contact[];
  addContact: (contact: Omit<Contact, 'id'>) => Promise<void>;
  updateContact: (contact: Contact) => Promise<void>;
  removeContact: (id: string) => Promise<void>;

  // Alert History
  alertHistory: AlertEvent[];
  clearHistory: () => Promise<void>;

  // Emergency Alert Flow State
  alertState: 'idle' | 'countdown' | 'alerting';
  countdownRemaining: number;
  activeAlert: AlertEvent | null;

  // Actions
  startScan: () => Promise<void>;
  stopScan: () => void;
  connectDevice: (deviceId: string, deviceName: string) => Promise<void>;
  disconnectDevice: () => Promise<void>;
  triggerManualSos: () => Promise<void>;
  cancelEmergency: () => Promise<void>;
  confirmEmergency: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// ─── App Context Provider ─────────────────────────────────────────────────────

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // --- BLE Connection State ---
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [pairedDevice, setPairedDevice] = useState<BleDevice | null>(null);
  const [discoveredDevices, setDiscoveredDevices] = useState<BleDevice[]>([]);
  const [batteryLevel, setBatteryLevel] = useState<number>(-1);
  const [lastStruggleStatus, setLastStruggleStatus] = useState<StruggleStatus>(StruggleStatus.Normal);
  const [lastConfidence, setLastConfidence] = useState<number>(0);

  // --- Settings & Data ---
  const [settings, setSettings] = useState<Settings>({ ...DEFAULT_SETTINGS });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertEvent[]>([]);

  // --- Active Emergency State ---
  const [alertState, setAlertState] = useState<'idle' | 'countdown' | 'alerting'>('idle');
  const [countdownRemaining, setCountdownRemaining] = useState<number>(0);
  const [activeAlert, setActiveAlert] = useState<AlertEvent | null>(null);

  // --- Scan State helper ---
  const scanDevicesMap = useRef<Map<string, BleDevice>>(new Map());

  // ─── Derived State ────────────────────────────────────────────────────────
  
  const riskLevel = lastConfidence;
  
  let riskStatus: RiskStatus = 'safe';
  if (riskLevel >= RISK_THRESHOLDS.DANGER) {
    riskStatus = 'danger';
  } else if (riskLevel >= RISK_THRESHOLDS.ELEVATED) {
    riskStatus = 'elevated';
  }

  // ─── Initial Load ─────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadData() {
      const storedSettings = await storageService.getSettings();
      const storedContacts = await storageService.getContacts();
      const storedHistory = await storageService.getAlertHistory();

      setSettings(storedSettings);
      setContacts(storedContacts);
      setAlertHistory(storedHistory);

      // Set BLE Manager initial demoMode
      bleManager.setDemoMode(storedSettings.demoMode);
      
      // Auto-reconnect if device paired in settings
      // In a production app, the paired device id would be saved in settings
      // We will read a custom key or just paired status
      // For now, if we are not in demo mode, let's load last connected device if any
    }
    loadData();
  }, []);

  // ─── BLE Manager Event Subscriptions ──────────────────────────────────────

  useEffect(() => {
    // 1. Connection Lifecycle
    const onConnectionChange = (status: ConnectionStatus) => {
      setConnectionStatus(status);
      if (status === 'disconnected') {
        setBatteryLevel(-1);
        setLastStruggleStatus(StruggleStatus.Normal);
        setLastConfidence(0);
      }
    };

    // 2. Struggle Detection updates from bracelet
    const onStruggleUpdate = (payload: { status: StruggleStatus; confidence: number }) => {
      setLastStruggleStatus(payload.status);
      setLastConfidence(payload.confidence);
    };

    // 3. Battery status updates
    const onBatteryUpdate = (payload: { level: number }) => {
      setBatteryLevel(payload.level);
    };

    // 4. Scanning device discovery
    const onDeviceDiscovered = (device: BleDevice) => {
      scanDevicesMap.current.set(device.id, device);
      setDiscoveredDevices(Array.from(scanDevicesMap.current.values()));
    };

    // 5. General Error handler
    const onError = (err: { message: string }) => {
      console.warn('[BLE Manager Error]:', err.message);
    };

    bleManager.on('connectionChange', onConnectionChange);
    bleManager.on('struggleUpdate', onStruggleUpdate);
    bleManager.on('batteryUpdate', onBatteryUpdate);
    bleManager.on('deviceDiscovered', onDeviceDiscovered);
    bleManager.on('error', onError);

    // Initial state sync
    setConnectionStatus(bleManager.connectionStatus);
    setLastStruggleStatus(bleManager.lastStruggleStatus);
    setLastConfidence(bleManager.lastConfidence);
    setBatteryLevel(bleManager.batteryLevel);

    return () => {
      bleManager.off('connectionChange', onConnectionChange);
      bleManager.off('struggleUpdate', onStruggleUpdate);
      bleManager.off('batteryUpdate', onBatteryUpdate);
      bleManager.off('deviceDiscovered', onDeviceDiscovered);
      bleManager.off('error', onError);
    };
  }, []);

  // ─── Emergency Engine Event Hook ──────────────────────────────────────────

  useEffect(() => {
    // We will bind to the EmergencyEngine singleton once it's created.
    // The AppContext will register callbacks on EmergencyEngine.
    try {
      const emergencyEngine = require('../services/EmergencyEngine').default;
      
      const onStateChange = (payload: { state: 'idle' | 'countdown' | 'alerting'; remaining: number; activeAlert: AlertEvent | null }) => {
        setAlertState(payload.state);
        setCountdownRemaining(payload.remaining);
        setActiveAlert(payload.activeAlert);

        // If the state just finished/alerted, reload the history
        if (payload.state === 'idle' && payload.activeAlert && !payload.activeAlert.dismissed) {
          storageService.getAlertHistory().then(setAlertHistory);
        }
      };

      const onTick = (remaining: number) => {
        setCountdownRemaining(remaining);
      };

      emergencyEngine.on('stateChange', onStateChange);
      emergencyEngine.on('tick', onTick);

      return () => {
        emergencyEngine.off('stateChange', onStateChange);
        emergencyEngine.off('tick', onTick);
      };
    } catch (error) {
      console.warn('[AppContext] EmergencyEngine require/binding failed:', error);
    }
  }, []);

  // ─── Context Actions ──────────────────────────────────────────────────────

  const startScan = async () => {
    scanDevicesMap.current.clear();
    setDiscoveredDevices([]);
    await bleManager.startScan();
  };

  const stopScan = () => {
    bleManager.stopScan();
  };

  const connectDevice = async (deviceId: string, deviceName: string) => {
    setPairedDevice({ id: deviceId, name: deviceName, rssi: 0 });
    await bleManager.connect(deviceId);
    
    // Sync current sensitivity to bracelet upon successful connection
    const currentSens = settings.sensitivity;
    try {
      await bleManager.writeSensitivity(currentSens);
    } catch (e) {
      console.warn('Could not write initial sensitivity to bracelet:', e);
    }
  };

  const disconnectDevice = async () => {
    await bleManager.disconnect();
    setPairedDevice(null);
  };

  const updateSettings = async (partial: Partial<Settings>) => {
    const updated = await storageService.updateSettings(partial);
    setSettings(updated);

    // If demoMode changed, update BleManager
    if (partial.demoMode !== undefined) {
      bleManager.setDemoMode(partial.demoMode);
    }

    // If sensitivity changed, and connected to physical device, write sensitivity configuration
    if (partial.sensitivity !== undefined && connectionStatus === 'connected' && !settings.demoMode) {
      await bleManager.writeSensitivity(partial.sensitivity);
    }
  };

  // --- Emergency Contact CRUD ---

  const addContact = async (contactInput: Omit<Contact, 'id'>) => {
    const newContact: Contact = {
      ...contactInput,
      id: Math.random().toString(36).substr(2, 9), // Simple ID generator
    };
    const updated = await storageService.addContact(newContact);
    setContacts(updated);
  };

  const updateContact = async (updatedContact: Contact) => {
    const updated = await storageService.updateContact(updatedContact);
    setContacts(updated);
  };

  const removeContact = async (id: string) => {
    const updated = await storageService.removeContact(id);
    setContacts(updated);
  };

  // --- Alert Actions ---

  const triggerManualSos = async () => {
    try {
      const emergencyEngine = require('../services/EmergencyEngine').default;
      await emergencyEngine.triggerManualSOS();
    } catch (error) {
      console.error('[AppContext] Failed to trigger manual SOS:', error);
    }
  };

  const cancelEmergency = async () => {
    try {
      const emergencyEngine = require('../services/EmergencyEngine').default;
      await emergencyEngine.cancelAlert();
      await bleManager.writeAlertControl(AlertControl.Cancel);
    } catch (error) {
      console.error('[AppContext] Failed to cancel emergency:', error);
    }
  };

  const confirmEmergency = async () => {
    try {
      const emergencyEngine = require('../services/EmergencyEngine').default;
      await emergencyEngine.triggerSMSImmediate();
    } catch (error) {
      console.error('[AppContext] Failed to force emergency:', error);
    }
  };

  const clearHistory = async () => {
    await storageService.clearAlertHistory();
    setAlertHistory([]);
  };

  return (
    <AppContext.Provider
      value={{
        connectionStatus,
        pairedDevice,
        discoveredDevices,
        batteryLevel,
        lastStruggleStatus,
        lastConfidence,
        riskLevel,
        riskStatus,
        settings,
        updateSettings,
        contacts,
        addContact,
        updateContact,
        removeContact,
        alertHistory,
        clearHistory,
        alertState,
        countdownRemaining,
        activeAlert,
        startScan,
        stopScan,
        connectDevice,
        disconnectDevice,
        triggerManualSos,
        cancelEmergency,
        confirmEmergency,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  return context;
};
