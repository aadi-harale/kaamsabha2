import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";

export function ServiceMap({ variant }: { variant: "booking" | "federation" }) {
  const isFederation = variant === "federation";
  return (
    <View style={[styles.map, { height: isFederation ? 260 : 190 }]}>
      <View style={styles.gridA} />
      <View style={styles.gridB} />
      <View style={[styles.route, isFederation && styles.routeWide]} />
      <View style={[styles.pin, styles.pinLeft]}><Text style={styles.pinText}>K</Text></View>
      <View style={[styles.pin, styles.pinRight]}><Text style={styles.pinText}>Y</Text></View>
      <View style={styles.legend}>
        <Text style={styles.title}>{isFederation ? "Kharadi → Yerawada" : "Approximate service route"}</Text>
        <Text style={styles.note}>{isFederation ? "Capacity routing preview" : "Illustrative service positions"}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { width: "100%", overflow: "hidden", backgroundColor: "#E8EFEA", position: "relative" },
  gridA: { position: "absolute", width: 260, height: 1, backgroundColor: "#CBD8D1", top: 68, left: -20, transform: [{ rotate: "-18deg" }] },
  gridB: { position: "absolute", width: 300, height: 1, backgroundColor: "#D2DDD7", top: 128, left: 40, transform: [{ rotate: "24deg" }] },
  route: { position: "absolute", width: 150, height: 4, borderRadius: 99, backgroundColor: colors.green700, top: 92, left: "30%", transform: [{ rotate: "-12deg" }] },
  routeWide: { width: 190, top: 122, left: "22%" },
  pin: { position: "absolute", width: 34, height: 34, borderRadius: 17, backgroundColor: colors.green900, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "white" },
  pinLeft: { left: "24%", top: 105 },
  pinRight: { right: "20%", top: 68 },
  pinText: { color: "white", fontWeight: "900", fontSize: 12 },
  legend: { position: "absolute", left: 12, right: 12, bottom: 10, backgroundColor: "rgba(255,255,255,0.92)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9 },
  title: { color: "#17352F", fontWeight: "800", fontSize: 12 },
  note: { color: "#6A7A74", fontSize: 10, marginTop: 2 },
});
