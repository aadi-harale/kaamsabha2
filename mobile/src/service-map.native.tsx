import React from "react";
import MapView, { Marker, Polyline } from "react-native-maps";
import { colors } from "./theme";

const kharadi = { latitude: 18.5515, longitude: 73.9348 };
const yerawada = { latitude: 18.5529, longitude: 73.8868 };

export function ServiceMap({ variant }: { variant: "booking" | "federation" }) {
  const isFederation = variant === "federation";
  return (
    <MapView
      style={{ height: isFederation ? 260 : 190, width: "100%" }}
      initialRegion={isFederation
        ? { latitude: 18.54, longitude: 73.91, latitudeDelta: 0.16, longitudeDelta: 0.16 }
        : { ...kharadi, latitudeDelta: 0.07, longitudeDelta: 0.07 }}
      scrollEnabled={isFederation}
      zoomEnabled={isFederation}
    >
      <Marker coordinate={kharadi} title={isFederation ? "Kharadi" : "Service location"} description={isFederation ? "Electrical shortage" : undefined} />
      <Marker coordinate={yerawada} title={isFederation ? "Yerawada" : "Worker service position"} description={isFederation ? "2 safe workers" : undefined} />
      {!isFederation ? <Polyline coordinates={[kharadi, yerawada]} strokeWidth={4} strokeColor={colors.green700} /> : null}
    </MapView>
  );
}
