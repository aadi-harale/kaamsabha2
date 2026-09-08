import { SafeAreaView } from "react-native-safe-area-context";
import { AdminApp, CustomerApp, LoginScreen, WorkerApp } from "../src/screens";
import { useStore } from "../src/store";

export default function Index() {
  const { state } = useStore();
  return (
    <SafeAreaView style={{ flex: 1 }} edges={["top", "left", "right"]}>
      {!state.role ? <LoginScreen /> : state.role === "customer" ? <CustomerApp /> : state.role === "worker" ? <WorkerApp /> : <AdminApp />}
    </SafeAreaView>
  );
}
