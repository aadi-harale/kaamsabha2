import React from "react";
import { Pressable, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { colors, radius, spacing } from "./theme";

export function Screen({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.screen, style]}>{children}</View>;
}

export function BrandHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.logo}><Text style={styles.logoText}>K</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.brand}>KAAMSABHA</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Pill({ text, tone = "green" }: { text: string; tone?: "green" | "warning" | "danger" | "muted" }) {
  const background = tone === "green" ? colors.green100 : tone === "warning" ? "#FFF3E8" : tone === "danger" ? "#FDECEC" : "#EEF2F0";
  const color = tone === "green" ? colors.green700 : tone === "warning" ? colors.warning : tone === "danger" ? colors.danger : colors.muted;
  return <View style={[styles.pill, { backgroundColor: background }]}><Text style={[styles.pillText, { color }]}>{text}</Text></View>;
}

export function PrimaryButton({ label, onPress, disabled = false }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [styles.primary, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
      <Text style={styles.secondaryText}>{label}</Text>
    </Pressable>
  );
}

export function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
      {note ? <Text style={styles.metricNote}>{note}</Text> : null}
    </Card>
  );
}

export function SectionTitle({ title, note }: { title: string; note?: string }) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionHeading}>{title}</Text>{note ? <Text style={styles.sectionNote}>{note}</Text> : null}</View>;
}

export function Divider() { return <View style={styles.divider} />; }

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", gap: 14, alignItems: "center", paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.surface },
  logo: { width: 54, height: 54, borderRadius: 17, backgroundColor: colors.green900, alignItems: "center", justifyContent: "center" },
  logoText: { color: "white", fontSize: 24, fontWeight: "900" },
  brand: { fontSize: 11, letterSpacing: 1.8, color: colors.green700, fontWeight: "900" },
  title: { marginTop: 2, fontSize: 22, color: colors.ink, fontWeight: "800" },
  subtitle: { marginTop: 2, fontSize: 13, color: colors.muted },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: spacing.md },
  pill: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  pillText: { fontSize: 12, fontWeight: "700" },
  primary: { minHeight: 50, borderRadius: radius.md, backgroundColor: colors.green700, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  primaryText: { color: "white", fontSize: 15, fontWeight: "800" },
  secondary: { minHeight: 48, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  secondaryText: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.45 },
  pressed: { transform: [{ scale: 0.985 }] },
  metric: { flex: 1, minWidth: 145 },
  metricLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  metricValue: { color: colors.ink, fontSize: 24, fontWeight: "900", marginTop: 6 },
  metricNote: { color: colors.muted, fontSize: 11, marginTop: 5 },
  sectionTitle: { gap: 4, marginBottom: 10 },
  sectionHeading: { color: colors.ink, fontSize: 18, fontWeight: "800" },
  sectionNote: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
});
