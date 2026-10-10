import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';
import { realtimeService } from '../services/realtime';

interface NetworkContextType {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  connectionType: NetInfoStateType | string | null;
  isOffline: boolean;
  checkConnectivity: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType>({
  isConnected: true,
  isInternetReachable: true,
  connectionType: null,
  isOffline: false,
  checkConnectivity: async () => true,
});

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [netState, setNetState] = useState<{
    isConnected: boolean | null;
    isInternetReachable: boolean | null;
    type: NetInfoStateType | string | null;
  }>({
    isConnected: true,
    isInternetReachable: true,
    type: null,
  });

  const wasOfflineRef = useRef(false);

  // Evaluate offline status
  // True only if explicitly not connected or internet is confirmed unreachable
  const isOffline =
    netState.isConnected === false ||
    (netState.isConnected === true && netState.isInternetReachable === false);

  const handleStateChange = useCallback((state: NetInfoState) => {
    const offlineNow =
      state.isConnected === false ||
      (state.isConnected === true && state.isInternetReachable === false);

    // If returning online after being offline, reconnect Directus websocket
    if (wasOfflineRef.current && !offlineNow && state.isConnected === true) {
      realtimeService.connect(true);
    }

    if (offlineNow) {
      wasOfflineRef.current = true;
    }

    setNetState({
      isConnected: state.isConnected,
      isInternetReachable: state.isInternetReachable,
      type: state.type,
    });
  }, []);

  useEffect(() => {
    // Initial fetch
    NetInfo.fetch().then(handleStateChange);

    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(handleStateChange);

    return () => {
      unsubscribe();
    };
  }, [handleStateChange]);

  const checkConnectivity = useCallback(async (): Promise<boolean> => {
    try {
      const state = await NetInfo.refresh();
      handleStateChange(state);
      const online = state.isConnected === true && state.isInternetReachable !== false;
      return online;
    } catch {
      return false;
    }
  }, [handleStateChange]);

  return (
    <NetworkContext.Provider
      value={{
        isConnected: netState.isConnected,
        isInternetReachable: netState.isInternetReachable,
        connectionType: netState.type,
        isOffline,
        checkConnectivity,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => useContext(NetworkContext);
