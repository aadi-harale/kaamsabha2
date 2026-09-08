import React, { useMemo, useState } from "react";
import * as Haptics from "expo-haptics";
import MapView, { Marker, Polyline } from "react-native-maps";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BrandHeader, Card, Divider, Metric, Pill, PrimaryButton, Screen, SecondaryButton, SectionTitle } from "./components";
import { earnings, federationCandidates, services, workers } from "./data";
import { colors, radius, spacing } from "./theme";
import { useStore } from "./store";
import type { Role, Service } from "./types";

const kharadi = { latitude: 18.5515, longitude: 73.9348 };
const yerawada = { latitude: 18.5529, longitude: 73.8868 };

export function LoginScreen() {
  const { dispatch } = useStore();
  const [role, setRole] = useState<Role>("customer");
  const [worker, setWorker] = useState("Ravi Shinde");

  const selectRole = async (next: Role) => {
    await Haptics.selectionAsync();
    setRole(next);
  };

  return (
    <Screen style={styles.loginScreen}>
      <View style={styles.loginBrandPanel}>
        <Text style={styles.loginWordmark}>KAAMSABHA</Text>
        <View style={styles.loginLogo}><Text style={styles.loginLogoText}>K</Text></View>
      </View>
      <View style={styles.loginCard}>
        <Text style={styles.loginTitle}>Sign in</Text>
        <Text style={styles.loginSubtitle}>Choose how you use KaamSabha.</Text>
        <View style={styles.roleGrid}>
          {([
            ["customer", "Customer", "Book and track services"],
            ["worker", "Worker member", "Jobs, earnings and fair work"],
            ["admin", "Cooperative admin", "Operations and governance"],
          ] as const).map(([value, title, note]) => (
            <Pressable key={value} onPress={() => selectRole(value)} style={[styles.roleCard, role === value && styles.roleCardActive]}>
              <Text style={styles.roleTitle}>{title}</Text>
              <Text style={styles.roleNote}>{note}</Text>
            </Pressable>
          ))}
        </View>
        {role === "worker" ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.fieldLabel}>Member</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {workers.map((item) => (
                <Pressable key={item.id} onPress={() => setWorker(item.name)} style={[styles.workerChip, worker === item.name && styles.workerChipActive]}>
                  <Text style={[styles.workerChipText, worker === item.name && styles.workerChipTextActive]}>{item.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}
        <PrimaryButton label="Continue" onPress={() => dispatch({ type: "login", role, identity: role === "worker" ? worker : role === "customer" ? "Customer 01" : "Cooperative Admin" })} />
      </View>
    </Screen>
  );
}

export function CustomerApp() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState("Home");
  const assigned = workers.find((w) => w.id === state.booking?.workerId);
  const tabs = ["Home", "Bookings", "Help", "Profile"];
  return (
    <Screen>
      <BrandHeader title={tab === "Home" ? "Kharadi, Pune" : tab} subtitle={tab === "Home" ? "What service do you need?" : undefined} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === "Home" ? <CustomerHome /> : null}
        {tab === "Bookings" ? <CustomerBooking assignedName={assigned?.name} /> : null}
        {tab === "Help" ? <CustomerHelp /> : null}
        {tab === "Profile" ? <Profile role="Customer" onLogout={() => dispatch({ type: "logout" })} /> : null}
      </ScrollView>
      <BottomTabs tabs={tabs} active={tab} onChange={setTab} />
    </Screen>
  );
}

function CustomerHome() {
  const { state, dispatch } = useStore();
  return (
    <>
      <Card style={styles.searchCard}>
        <Text style={styles.searchIcon}>⌕</Text><Text style={styles.searchText}>Search electrical, cleaning, plumbing…</Text>
      </Card>
      {state.booking ? (
        <Card style={styles.activeJobCard}>
          <View style={styles.rowBetween}><View><Text style={styles.kicker}>ACTIVE BOOKING</Text><Text style={styles.h2}>{state.booking.service}</Text></View><Pill text={state.booking.status.replaceAll("_", " ")} /></View>
          <Text style={styles.muted}>{state.booking.id} · {state.booking.locality}</Text>
        </Card>
      ) : null}
      <SectionTitle title="Popular services" note="Verified members. Protected pricing. No reverse bidding." />
      <View style={styles.serviceGrid}>
        {services.map((service) => (
          <Pressable key={service.name} onPress={() => dispatch({ type: "book", service: service.name })} style={styles.serviceCard}>
            <View style={styles.serviceIcon}><Text style={{ fontSize: 24 }}>{service.icon}</Text></View>
            <Text style={styles.serviceName}>{service.name}</Text>
            <Text style={styles.serviceDesc}>{service.description}</Text>
            <Text style={styles.servicePrice}>From ₹{service.from}</Text>
          </Pressable>
        ))}
      </View>
      <Card style={styles.trustCard}>
        <Text style={styles.trustTitle}>Fair work built into every booking</Text>
        <Text style={styles.muted}>The app checks skill, availability, workload safety and worker protections before allocation.</Text>
      </Card>
    </>
  );
}

function CustomerBooking({ assignedName }: { assignedName?: string }) {
  const { state, dispatch } = useStore();
  const booking = state.booking;
  if (!booking) return <Empty title="No active booking" note="Book a service from Home to start the shared customer-worker flow." />;
  const canIssueStart = booking.status === "scope_approved" || booking.status === "arrived";
  return (
    <>
      <Card>
        <View style={styles.rowBetween}><View><Text style={styles.kicker}>YOUR SERVICE</Text><Text style={styles.h2}>{booking.service}</Text></View><Pill text={booking.status.replaceAll("_", " ")} /></View>
        <Text style={styles.muted}>{booking.id} · {booking.locality}</Text>
        <Divider />
        <Text style={styles.personName}>{assignedName ?? "Assigned member"}</Text>
        <Text style={styles.muted}>Verified cooperative member · protected payout ₹{booking.protectedFloor}</Text>
      </Card>
      <Card style={{ padding: 0, overflow: "hidden" }}>
        <MapView style={styles.map} initialRegion={{ ...kharadi, latitudeDelta: 0.07, longitudeDelta: 0.07 }} scrollEnabled={false} zoomEnabled={false}>
          <Marker coordinate={kharadi} title="Service location" />
          <Marker coordinate={yerawada} title="Worker service position" />
          <Polyline coordinates={[kharadi, yerawada]} strokeWidth={4} strokeColor={colors.green700} />
        </MapView>
        <View style={styles.mapFooter}><Text style={styles.mapTitle}>Route preview</Text><Text style={styles.muted}>Approximate demo position · 18 min</Text></View>
      </Card>
      <Card>
        <SectionTitle title="Scope Lock" note="Extra work cannot begin until you approve it." />
        <Text style={styles.bodyStrong}>Original</Text><Text style={styles.muted}>{booking.originalScope}</Text>
        {booking.addedScope ? <><Divider /><Text style={styles.bodyStrong}>Requested addition</Text><Text style={styles.muted}>{booking.addedScope} · +₹{booking.addedAmount}</Text></> : null}
        {booking.status === "scope_pending" ? <View style={styles.buttonStack}><PrimaryButton label="Approve added scope" onPress={() => dispatch({ type: "scope_approve" })} /><SecondaryButton label="Keep original scope" onPress={() => dispatch({ type: "advance", status: "arrived" })} /></View> : null}
      </Card>
      <Card>
        <SectionTitle title="Start confirmation" note="Pending scope changes block the Start OTP." />
        {booking.startOtp ? <Otp code={booking.startOtp} label="Start OTP" /> : <PrimaryButton disabled={!canIssueStart} label={canIssueStart ? "Generate Start OTP" : "Waiting for worker arrival / scope decision"} onPress={() => dispatch({ type: "issue_start_otp" })} />}
      </Card>
      <Card>
        <SectionTitle title="Completion" note="Completion OTP is available only after proof is submitted." />
        {booking.completionOtp ? <Otp code={booking.completionOtp} label="Completion OTP" /> : <PrimaryButton disabled={!booking.proofReady} label={booking.proofReady ? "Generate Completion OTP" : "Waiting for work proof"} onPress={() => dispatch({ type: "issue_completion_otp" })} />}
      </Card>
      {booking.status === "completed" || booking.completionOtp ? (
        <Card>
          <SectionTitle title="Checkout" note="Razorpay-style checkout · Demo payment" />
          <View style={styles.paymentRow}><Text style={styles.paymentLabel}>Total</Text><Text style={styles.paymentValue}>₹{booking.amount}</Text></View>
          <Text style={styles.muted}>UPI · Card · Netbanking</Text>
          <PrimaryButton label={booking.paid ? "Payment successful ✓" : "Pay demo amount"} disabled={booking.paid} onPress={() => dispatch({ type: "pay" })} />
        </Card>
      ) : null}
    </>
  );
}

function CustomerHelp() {
  const { state, dispatch } = useStore();
  const options = ["Track my booking", "Scope / extra charge", "Payment / invoice", "Service quality", "Safety concern", "Worker delayed / no-show"];
  const [selected, setSelected] = useState(options[0]);
  return <Card><SectionTitle title="KaamSabha Help" note="Guided support. AI may assist language, but it cannot punish workers, refund, dispatch or decide fault." />
    <View style={styles.helpGrid}>{options.map((option) => <Pressable key={option} onPress={() => setSelected(option)} style={[styles.helpChip, selected === option && styles.helpChipActive]}><Text style={styles.helpChipText}>{option}</Text></Pressable>)}</View>
    <TextInput style={styles.input} placeholder="Tell us what happened" multiline />
    <PrimaryButton label="Submit support case" onPress={() => dispatch({ type: "support" })} />
    {state.supportCases > 0 ? <Text style={styles.successText}>Case created for cooperative review.</Text> : null}
  </Card>;
}

export function WorkerApp() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState("Today");
  const tabs = ["Today", "Earnings", "Fair Work", "Voice", "Profile"];
  return (
    <Screen>
      <BrandHeader title={tab === "Today" ? `Good afternoon, ${state.identity}` : tab} subtitle={tab === "Today" ? "Your work, protections and next action" : undefined} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {tab === "Today" ? <WorkerToday /> : null}
        {tab === "Earnings" ? <WorkerEarnings /> : null}
        {tab === "Fair Work" ? <FairWork /> : null}
        {tab === "Voice" ? <WorkerVoice /> : null}
        {tab === "Profile" ? <Profile role="Worker member" onLogout={() => dispatch({ type: "logout" })} /> : null}
      </ScrollView>
      <BottomTabs tabs={tabs} active={tab} onChange={setTab} />
    </Screen>
  );
}

function WorkerToday() {
  const { state, dispatch } = useStore();
  const booking = state.booking;
  return <>
    <View style={styles.metricsRow}><Metric label="Today" value="₹920" note="Protected earnings" /><Metric label="Workload" value="3h" note="Inside safe limit" /></View>
    {!booking ? <Empty title="No current task" note="A customer booking will appear here when assigned." /> : <Card style={styles.currentTask}>
      <View style={styles.rowBetween}><View><Text style={styles.kicker}>CURRENT TASK</Text><Text style={styles.h2}>{booking.service}</Text></View><Pill text={booking.status.replaceAll("_", " ")} /></View>
      <Text style={styles.muted}>{booking.locality} · protected payout from ₹{booking.protectedFloor}</Text>
      <Divider />
      <Text style={styles.bodyStrong}>Scope</Text><Text style={styles.muted}>{booking.originalScope}</Text>
      <View style={styles.buttonStack}>
        {booking.status === "assigned" ? <><PrimaryButton label="Accept opportunity" onPress={() => dispatch({ type: "advance", status: "accepted" })} /><SecondaryButton label="Safe decline · zero penalty" onPress={() => dispatch({ type: "advance", status: "assigned" })} /></> : null}
        {booking.status === "accepted" ? <PrimaryButton label="Start travel" onPress={() => dispatch({ type: "advance", status: "travelling" })} /> : null}
        {booking.status === "travelling" ? <PrimaryButton label="I have arrived" onPress={() => dispatch({ type: "advance", status: "arrived" })} /> : null}
        {booking.status === "arrived" ? <><PrimaryButton label="Add extra work" onPress={() => dispatch({ type: "scope_propose" })} /><SecondaryButton label="Original scope is correct" onPress={() => dispatch({ type: "advance", status: "scope_approved" })} /></> : null}
        {booking.status === "scope_pending" ? <Pill text="Waiting for customer approval" tone="warning" /> : null}
        {(booking.status === "scope_approved" || booking.status === "arrived") && !booking.startOtp ? <Pill text="Waiting for customer Start OTP" tone="muted" /> : null}
        {booking.startOtp && booking.status !== "started" && booking.status !== "proof_ready" ? <PrimaryButton label="Verify Start OTP and begin" onPress={() => dispatch({ type: "advance", status: "started" })} /> : null}
        {booking.status === "started" ? <PrimaryButton label="Upload work proof" onPress={() => dispatch({ type: "submit_proof" })} /> : null}
        {booking.status === "proof_ready" && !booking.completionOtp ? <Pill text="Proof ready · waiting for Completion OTP" /> : null}
        {booking.completionOtp && booking.status !== "completed" && booking.status !== "paid" ? <PrimaryButton label="Verify Completion OTP" onPress={() => dispatch({ type: "advance", status: "completed" })} /> : null}
      </View>
    </Card>}
    <Card><SectionTitle title="Safe decline" /><Text style={styles.muted}>You may decline an eligible opportunity without rating or opportunity-access penalty.</Text></Card>
  </>;
}

function WorkerEarnings() {
  const total = earnings.reduce((sum, e) => sum + e.amount, 0);
  return <><View style={styles.metricsRow}><Metric label="Protected earnings" value={`₹${total.toLocaleString("en-IN")}`} /><Metric label="Avg / job" value="₹996" /></View>
    <Card><SectionTitle title="6-week earnings trend" note="Seeded demo history + new settlements" /><View style={styles.bars}>{[62, 78, 54, 88, 72, 96].map((h, i) => <View key={i} style={styles.barCol}><Text style={styles.barLabel}>W{i + 1}</Text><View style={[styles.bar, { height: h }]} /></View>)}</View></Card>
    <Card><SectionTitle title="Recent protected earnings" />{earnings.map((item) => <View key={`${item.label}${item.date}`} style={styles.listRow}><View><Text style={styles.bodyStrong}>{item.label}</Text><Text style={styles.muted}>{item.date}</Text></View><Text style={styles.amount}>₹{item.amount}</Text></View>)}</Card>
  </>;
}

function FairWork() {
  const { state, dispatch } = useStore();
  const booking = state.booking;
  return <>
    <Card><SectionTitle title="Why did I get this job?" note="Human-readable Decision Receipt" />
      <View style={styles.checkGrid}>{["Skill verified", "Available", "Workload safe", "Service area", "Protection floor applied"].map((item) => <Pill key={item} text={`✓ ${item}`} />)}</View>
      <Divider /><Text style={styles.bodyStrong}>Why you?</Text><Text style={styles.muted}>{booking ? `You were eligible for ${booking.service}, available, inside workload limits, and protected pay was applied.` : "No current allocation yet."}</Text>
    </Card>
    <Card><SectionTitle title="Replay Court" note="Replay the decision using frozen decision-time evidence, not today's database." />
      <Text style={styles.bodyStrong}>What felt wrong?</Text><View style={styles.helpGrid}>{["Allocation unfair", "Workload/rest wrong", "Skill/eligibility wrong", "Protected pay wrong", "Federation routing wrong"].map((x) => <View key={x} style={styles.helpChip}><Text style={styles.helpChipText}>{x}</Text></View>)}</View>
      <PrimaryButton label="Open Replay Court case" onPress={() => dispatch({ type: "replay" })} />
      {state.replayCases > 0 ? <Text style={styles.successText}>Replay case open · deterministic replay requires admin review.</Text> : null}
    </Card>
  </>;
}

function WorkerVoice() {
  const { state, dispatch } = useStore();
  return <>
    <Card><SectionTitle title="Speak up" note="Three simple paths. The complexity stays inside the system." />
      {["Today's problem", "Past decision", "Future rule"].map((title, i) => <View key={title} style={styles.voiceRow}><View style={styles.voiceNumber}><Text style={styles.voiceNumberText}>{i + 1}</Text></View><View style={{ flex: 1 }}><Text style={styles.bodyStrong}>{title}</Text><Text style={styles.muted}>{i === 0 ? "Something is wrong with a current job." : i === 1 ? "I think an allocation was unfair." : "I think a policy should change."}</Text></View></View>)}
    </Card>
    <Card><SectionTitle title="Policy suggestion" /><TextInput style={styles.input} placeholder="Example: Raise the protected payout floor" multiline /><PrimaryButton label="Submit suggestion" onPress={() => dispatch({ type: "suggest" })} />{state.suggestionSubmitted ? <Text style={styles.successText}>Suggestion submitted · human review required before any policy change.</Text> : null}</Card>
  </>;
}

export function AdminApp() {
  const { state, dispatch } = useStore();
  const [tab, setTab] = useState("Operations");
  const tabs = ["Operations", "Cases", "Federation", "Governance", "More"];
  return <Screen><BrandHeader title={tab} subtitle={tab === "Operations" ? "Cooperative operations console" : undefined} /><ScrollView contentContainerStyle={styles.scroll}>
    {tab === "Operations" ? <AdminOperations /> : null}
    {tab === "Cases" ? <AdminCases /> : null}
    {tab === "Federation" ? <Federation /> : null}
    {tab === "Governance" ? <Governance /> : null}
    {tab === "More" ? <Profile role="Cooperative admin" onLogout={() => dispatch({ type: "logout" })} /> : null}
  </ScrollView><BottomTabs tabs={tabs} active={tab} onChange={setTab} /></Screen>;
}

function AdminOperations() {
  const { state } = useStore();
  return <><View style={styles.metricsRow}><Metric label="Active jobs" value={state.booking ? "1" : "0"} /><Metric label="Available members" value="7" /><Metric label="Open cases" value={`${state.supportCases + state.replayCases}`} /></View>
    <Card><SectionTitle title="Live operations" />{state.booking ? <View style={styles.listRow}><View><Text style={styles.bodyStrong}>{state.booking.service}</Text><Text style={styles.muted}>{state.booking.id} · {state.booking.locality}</Text></View><Pill text={state.booking.status.replaceAll("_", " ")} /></View> : <Text style={styles.muted}>No active jobs.</Text>}</Card>
    <Card><SectionTitle title="Worker Protection Firewall" /><Text style={styles.muted}>Low ratings create human-review cases. They do not silently deactivate members or reduce opportunity access.</Text></Card>
  </>;
}

function AdminCases() {
  const { state } = useStore();
  return <Card><SectionTitle title="Human-readable case inbox" note="No raw machine metadata is shown." />
    {[state.supportCases > 0 ? ["Customer", "Scope / support case", `${state.supportCases} open`] : null, state.replayCases > 0 ? ["Worker", "Replay Court challenge", `${state.replayCases} open`] : null, state.suggestionSubmitted ? ["Worker", "Policy suggestion", "Under review"] : null].filter(Boolean).map((item, index) => <View key={index} style={styles.caseRow}><View><Text style={styles.bodyStrong}>{item?.[1]}</Text><Text style={styles.muted}>{item?.[0]}</Text></View><Pill text={item?.[2] ?? "Open"} /></View>)}
    {state.supportCases + state.replayCases === 0 && !state.suggestionSubmitted ? <Text style={styles.muted}>No cases yet. Customer support, Replay Court and worker suggestions appear here.</Text> : null}
  </Card>;
}

function Federation() {
  const { state, dispatch } = useStore();
  return <>
    <Card style={{ padding: 0, overflow: "hidden" }}><MapView style={styles.mapLarge} initialRegion={{ latitude: 18.54, longitude: 73.91, latitudeDelta: 0.16, longitudeDelta: 0.16 }}><Marker coordinate={kharadi} title="Kharadi" description="Electrical shortage" /><Marker coordinate={yerawada} title="Yerawada" description="2 safe workers" /></MapView><View style={styles.mapFooter}><Text style={styles.mapTitle}>Federation control map</Text><Text style={styles.muted}>Choose a receiving cooperative, never an individual cross-network worker.</Text></View></Card>
    <Card><SectionTitle title="Electrical shortage · Kharadi" note="0 safe local workers · customer SLA 35 min" />
      {federationCandidates.map((c) => <View key={c.cooperative} style={styles.candidate}><View style={{ flex: 1 }}><Text style={styles.bodyStrong}>{c.locality}</Text><Text style={styles.muted}>{c.safeWorkers} safe · {c.eta} min {c.reason ? `· ${c.reason}` : ""}</Text></View>{c.eligible ? <PrimaryButton label={state.federationReceiver === c.cooperative ? "Selected ✓" : "Select"} onPress={() => dispatch({ type: "federate", receiver: c.cooperative })} /> : <Pill text="Blocked" tone="warning" />}</View>)}
      {state.federationReceiver ? <><Divider /><Text style={styles.bodyStrong}>Federation Receipt</Text><Text style={styles.muted}>{state.federationReceiver} selected first. Its own constitution must select its worker second.</Text></> : null}
    </Card>
  </>;
}

function Governance() {
  const { state, dispatch } = useStore();
  const p = state.proposal;
  const participation = p.yes + p.no;
  const passes = participation >= p.quorum && p.yes >= p.approval && p.proposedFloor >= 760;
  return <>
    <Card style={styles.policyTwin}><Text style={styles.policyEyebrow}>COUNTERFACTUAL POLICY TWIN</Text><Text style={styles.policyHero}>SAME JOBS</Text><Text style={styles.policyHero}>SAME WORKERS</Text><Text style={styles.policyHeroAccent}>DIFFERENT RULES</Text></Card>
    <Card><SectionTitle title="Protected payout proposal" note="Simulation is non-mutating until activation is explicitly confirmed." />
      <View style={styles.compareRow}><View style={styles.compareBox}><Text style={styles.muted}>CURRENT</Text><Text style={styles.compareValue}>₹{p.currentFloor}</Text></View><Text style={styles.arrow}>→</Text><View style={[styles.compareBox, styles.compareBoxGreen]}><Text style={styles.muted}>PROPOSED</Text><Text style={styles.compareValue}>₹{p.proposedFloor}</Text></View></View>
      <Divider /><Text style={styles.bodyStrong}>Voting Simulator</Text><Text style={styles.muted}>{p.yes} Yes · {p.no} No · {participation}/{p.quorum} quorum · {p.yes}/{p.approval} support</Text>
      <View style={styles.buttonRow}><SecondaryButton label="6 Yes / 0 No" onPress={() => dispatch({ type: "vote_sim", yes: 6, no: 0 })} /><SecondaryButton label="7 Yes / 2 No" onPress={() => dispatch({ type: "vote_sim", yes: 7, no: 2 })} /></View>
      <Pill text={passes ? "Would pass" : "Would not pass"} tone={passes ? "green" : "warning"} />
      {passes ? <PrimaryButton label={p.active ? "Policy active for future jobs ✓" : "Apply simulated policy update"} disabled={p.active} onPress={() => dispatch({ type: "activate_policy" })} /> : null}
      <Text style={styles.muted}>Protection Validator blocks reverse auctions, paid ranking and payout below the immutable floor. Past receipts remain frozen.</Text>
    </Card>
    <Card><SectionTitle title="Policy Signal Monitor" note="AI-assisted clustering only. Human review and member vote remain mandatory." /><Text style={styles.bodyStrong}>Repeated themes</Text><View style={styles.checkGrid}><Pill text="Pay & protection · 5" /><Pill text="Workload & safety · 3" /><Pill text="Opportunity access · 4" /></View></Card>
  </>;
}

function Profile({ role, onLogout }: { role: string; onLogout: () => void }) {
  const { state } = useStore();
  return <Card><SectionTitle title={state.identity ?? role} note={role} /><Text style={styles.muted}>English · हिन्दी · मराठी ready architecture</Text><Divider /><SecondaryButton label="Sign out" onPress={onLogout} /></Card>;
}

function Otp({ code, label }: { code: string; label: string }) {
  return <View style={styles.otp}><Text style={styles.otpLabel}>{label}</Text><Text style={styles.otpCode}>{code}</Text><Text style={styles.muted}>Demo-only deterministic OTP. Real deployment requires server-side secret and delivery provider.</Text></View>;
}

function Empty({ title, note }: { title: string; note: string }) { return <Card><Text style={styles.h2}>{title}</Text><Text style={styles.muted}>{note}</Text></Card>; }

function BottomTabs({ tabs, active, onChange }: { tabs: string[]; active: string; onChange: (tab: string) => void }) {
  return <View style={styles.bottomTabs}>{tabs.map((tab) => <Pressable key={tab} onPress={() => onChange(tab)} style={styles.tab}><View style={[styles.tabDot, active === tab && styles.tabDotActive]} /><Text numberOfLines={1} style={[styles.tabText, active === tab && styles.tabTextActive]}>{tab}</Text></Pressable>)}</View>;
}

const styles = StyleSheet.create({
  loginScreen: { justifyContent: "center", padding: 18 },
  loginBrandPanel: { backgroundColor: colors.green900, minHeight: 230, borderRadius: radius.xl, alignItems: "center", justifyContent: "center", gap: 22, padding: 24 },
  loginWordmark: { color: "white", letterSpacing: 3, fontWeight: "900", fontSize: 24 },
  loginLogo: { width: 96, height: 96, borderRadius: 28, backgroundColor: "white", alignItems: "center", justifyContent: "center" },
  loginLogoText: { color: colors.green900, fontSize: 42, fontWeight: "900" },
  loginCard: { marginTop: -22, marginHorizontal: 12, backgroundColor: "white", borderRadius: radius.xl, padding: 22, gap: 18, borderWidth: 1, borderColor: colors.border },
  loginTitle: { color: colors.ink, fontSize: 26, fontWeight: "900" },
  loginSubtitle: { color: colors.muted, marginTop: -12 },
  roleGrid: { gap: 10 },
  roleCard: { minHeight: 72, padding: 14, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: "white" },
  roleCardActive: { borderColor: colors.green700, backgroundColor: colors.green050 },
  roleTitle: { color: colors.ink, fontWeight: "850", fontSize: 15 },
  roleNote: { color: colors.muted, fontSize: 12, marginTop: 4 },
  fieldLabel: { color: colors.ink, fontWeight: "800" },
  workerChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: "white" },
  workerChipActive: { backgroundColor: colors.green700, borderColor: colors.green700 },
  workerChipText: { color: colors.ink, fontWeight: "700", fontSize: 12 },
  workerChipTextActive: { color: "white" },
  scroll: { padding: spacing.md, gap: 14, paddingBottom: 110 },
  searchCard: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
  searchIcon: { fontSize: 24, color: colors.green700 }, searchText: { color: colors.muted, fontSize: 14 },
  activeJobCard: { backgroundColor: colors.green900 },
  kicker: { color: colors.green700, fontSize: 10, letterSpacing: 1.4, fontWeight: "900" },
  h2: { color: colors.ink, fontSize: 20, fontWeight: "900", marginTop: 3 },
  muted: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  serviceGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  serviceCard: { width: "48%", backgroundColor: "white", borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: 14 },
  serviceIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: colors.green050, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  serviceName: { color: colors.ink, fontWeight: "850", fontSize: 14 },
  serviceDesc: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  servicePrice: { color: colors.green700, fontWeight: "850", fontSize: 12, marginTop: 9 },
  trustCard: { backgroundColor: colors.green050 }, trustTitle: { color: colors.green900, fontWeight: "900", marginBottom: 6 },
  personName: { color: colors.ink, fontSize: 18, fontWeight: "900" },
  map: { height: 190, width: "100%" }, mapLarge: { height: 260, width: "100%" }, mapFooter: { padding: 14 }, mapTitle: { color: colors.ink, fontWeight: "850", marginBottom: 3 },
  bodyStrong: { color: colors.ink, fontWeight: "850", fontSize: 14 },
  buttonStack: { gap: 9, marginTop: 14 },
  paymentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }, paymentLabel: { color: colors.muted }, paymentValue: { color: colors.ink, fontSize: 26, fontWeight: "900" },
  helpGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginVertical: 10 }, helpChip: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 8 }, helpChipActive: { borderColor: colors.green700, backgroundColor: colors.green050 }, helpChipText: { color: colors.ink, fontWeight: "700", fontSize: 11 },
  input: { minHeight: 92, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: 12, textAlignVertical: "top", color: colors.ink, marginVertical: 10, backgroundColor: "white" },
  successText: { color: colors.success, fontWeight: "750", fontSize: 12, marginTop: 10 },
  metricsRow: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  currentTask: { borderColor: "#C8DDD4" },
  bars: { height: 130, flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 8, marginTop: 8 }, barCol: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 }, bar: { width: "100%", maxWidth: 34, backgroundColor: colors.green700, borderRadius: 8 }, barLabel: { color: colors.muted, fontSize: 10 },
  listRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }, amount: { color: colors.ink, fontWeight: "900" },
  checkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 8 },
  voiceRow: { flexDirection: "row", gap: 12, alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border }, voiceNumber: { width: 34, height: 34, borderRadius: 12, backgroundColor: colors.green100, alignItems: "center", justifyContent: "center" }, voiceNumberText: { color: colors.green700, fontWeight: "900" },
  caseRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  candidate: { flexDirection: "row", gap: 10, alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  policyTwin: { backgroundColor: colors.green900 }, policyEyebrow: { color: "#A7D7C6", fontSize: 10, letterSpacing: 1.5, fontWeight: "900" }, policyHero: { color: "white", fontSize: 24, fontWeight: "900", lineHeight: 27 }, policyHeroAccent: { color: "#A9E6CF", fontSize: 24, fontWeight: "900", lineHeight: 27 },
  compareRow: { flexDirection: "row", alignItems: "center", gap: 10 }, compareBox: { flex: 1, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: 14 }, compareBoxGreen: { backgroundColor: colors.green050, borderColor: "#BFD8CD" }, compareValue: { color: colors.ink, fontSize: 26, fontWeight: "900", marginTop: 4 }, arrow: { color: colors.green700, fontSize: 20, fontWeight: "900" },
  buttonRow: { flexDirection: "row", gap: 8, marginVertical: 12 },
  otp: { gap: 8 }, otpLabel: { color: colors.muted, fontWeight: "700" }, otpCode: { color: colors.green900, fontSize: 34, letterSpacing: 6, fontWeight: "900" },
  bottomTabs: { position: "absolute", left: 10, right: 10, bottom: 10, minHeight: 68, backgroundColor: "white", borderRadius: 22, borderWidth: 1, borderColor: colors.border, flexDirection: "row", alignItems: "center", paddingHorizontal: 6 },
  tab: { flex: 1, minWidth: 0, alignItems: "center", justifyContent: "center", gap: 5, paddingHorizontal: 3 }, tabDot: { width: 7, height: 7, borderRadius: 99, backgroundColor: "#CAD4D0" }, tabDotActive: { backgroundColor: colors.green700 }, tabText: { color: colors.muted, fontSize: 9, fontWeight: "700" }, tabTextActive: { color: colors.green700, fontWeight: "900" },
});
