import React, { createContext, useContext, useState } from "react";

type Coords = { latitude: number; longitude: number } | null;

type LocationContextType = {
  userLocation: Coords;
  setUserLocation: (c: Coords) => void;
  radiusMiles: number;
  setRadiusMiles: (r: number) => void;
};

const LocationContext = createContext<LocationContextType>({
  userLocation: null,
  setUserLocation: () => {},
  radiusMiles: 10,
  setRadiusMiles: () => {},
});

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [userLocation, setUserLocation] = useState<Coords>(null);
  const [radiusMiles, setRadiusMiles] = useState<number>(10);

  return (
    <LocationContext.Provider
      value={{ userLocation, setUserLocation, radiusMiles, setRadiusMiles }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  return useContext(LocationContext);
}