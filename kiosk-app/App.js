import "./global.css";

import { StatusBar } from "expo-status-bar";
import { SQLiteProvider } from "expo-sqlite";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { KioskProvider } from "./src/context/KioskContext";
import RootScreen from "./src/screens/RootScreen";
import { initializeDatabase } from "./src/services/database";

export default function App() {
  return (
    <SafeAreaProvider>
      <SQLiteProvider databaseName="attendify-kiosk.db" onInit={initializeDatabase}>
        <KioskProvider>
          <StatusBar style="light" />
          <RootScreen />
        </KioskProvider>
      </SQLiteProvider>
    </SafeAreaProvider>
  );
}
