import { useState, useEffect, useCallback } from 'react';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth.store';

export function useLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [permission, setPermission] = useState<boolean>(false);
  const { profile } = useAuthStore();

  const requestPermission = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
    setPermission(granted);
    return granted;
  }, []);

  const getCurrentLocation = useCallback(async () => {
    const granted = await requestPermission();
    if (!granted) {
      setErrorMsg('Permiso de ubicación denegado');
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    setLocation(loc);
    return loc;
  }, [requestPermission]);

  const startSharingLocation = useCallback(async () => {
    if (profile?.role !== 'nurse') return;

    const granted = await requestPermission();
    if (!granted) return;

    const subscription = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, timeInterval: 30000, distanceInterval: 50 },
      async (loc) => {
        setLocation(loc);
        await supabase.from('nurse_locations').upsert({
          nurse_id: profile.id,
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          accuracy: loc.coords.accuracy,
          updated_at: new Date().toISOString(),
        });
      }
    );

    return () => subscription.remove();
  }, [profile, requestPermission]);

  const stopSharingLocation = useCallback(async () => {
    if (!profile) return;
    await supabase.from('nurse_locations').delete().eq('nurse_id', profile.id);
  }, [profile]);

  return {
    location,
    errorMsg,
    permission,
    requestPermission,
    getCurrentLocation,
    startSharingLocation,
    stopSharingLocation,
  };
}
