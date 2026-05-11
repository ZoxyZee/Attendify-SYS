import { MaterialIcons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

function AdminPanel({
  visible,
  onClose,
  onBeginEnrollment,
  registrationSamples,
  onImportEmployees,
  employees,
  logs,
  scanDiagnostic,
  syncing,
  onSync,
  onRegisterDevice,
  onLogout,
  settings,
  onSaveSettings
}) {
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    employee_id: "",
    department: "",
    face_label: ""
  });
  const [settingsForm, setSettingsForm] = useState(settings);

  useEffect(() => {
    setSettingsForm(settings);
  }, [settings]);

  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 z-40 bg-slate-950/95 px-5 py-10">
      <View className="mb-6 flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-white">Admin Mode</Text>
          <Text className="mt-1 text-sm text-slate-400">Register employees, review attendance logs, and sync offline data.</Text>
        </View>
        <TouchableOpacity onPress={onClose} className="rounded-full bg-white/10 p-3">
          <MaterialIcons name="close" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="rounded-3xl bg-white/5 p-5">
          <Text className="text-lg font-semibold text-white">Kiosk Settings</Text>
          {[
            { key: "apiBaseUrl", label: "API Base URL" },
            { key: "recognitionBaseUrl", label: "Recognition API URL" },
            { key: "deviceId", label: "Device ID" },
            { key: "deviceName", label: "Device Name" },
            { key: "adminPin", label: "Admin PIN" }
          ].map((field) => (
            <View key={field.key} className="mt-4">
              <Text className="mb-2 text-sm text-slate-300">{field.label}</Text>
              <TextInput
                value={settingsForm[field.key]}
                onChangeText={(value) => setSettingsForm((current) => ({ ...current, [field.key]: value }))}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-white"
                placeholderTextColor="#64748B"
                secureTextEntry={field.key === "adminPin"}
              />
            </View>
          ))}
          <View className="mt-4 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3">
            <Text className="text-sm text-slate-300">Company Session</Text>
            <Text className="mt-1 text-xs text-slate-500">
              {settings.adminEmail
                ? `Signed in as ${settings.adminEmail}. Use Switch Company to refresh the kiosk session.`
                : "No active company session."}
            </Text>
          </View>
          <TouchableOpacity onPress={() => onSaveSettings(settingsForm)} className="mt-5 rounded-2xl bg-indigo-500 px-4 py-3">
            <Text className="text-center font-semibold text-white">Save Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onRegisterDevice} className="mt-3 rounded-2xl bg-emerald-500 px-4 py-3">
            <Text className="text-center font-semibold text-white">Register This Device</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout} className="mt-3 rounded-2xl bg-rose-500/90 px-4 py-3">
            <Text className="text-center font-semibold text-white">Switch Company</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-5 rounded-3xl bg-white/5 p-5">
          <Text className="text-lg font-semibold text-white">Register Employee</Text>
          <Text className="mt-1 text-sm text-slate-400">
            Capture 5 face samples to build a stronger local embedding profile in SQLite.
          </Text>

          {[
            { key: "name", label: "Name" },
            { key: "employee_id", label: "Employee ID" },
            { key: "department", label: "Department" },
            { key: "face_label", label: "Face Label (optional)" }
          ].map((field) => (
            <View key={field.key} className="mt-4">
              <Text className="mb-2 text-sm text-slate-300">{field.label}</Text>
              <TextInput
                value={employeeForm[field.key]}
                onChangeText={(value) => setEmployeeForm((current) => ({ ...current, [field.key]: value }))}
                className="rounded-2xl bg-slate-900 px-4 py-3 text-white"
                placeholderTextColor="#64748B"
              />
            </View>
          ))}

          <TouchableOpacity onPress={() => onBeginEnrollment(employeeForm)} className="mt-5 rounded-2xl bg-sky-500 px-4 py-3">
            <Text className="text-center font-semibold text-white">Open Capture Camera</Text>
          </TouchableOpacity>
          <Text className="mt-3 text-center text-sm text-slate-400">
            Samples captured: {registrationSamples.length}/5
          </Text>

          <TouchableOpacity
            onPress={async () => {
              await onBeginEnrollment(employeeForm);
            }}
            disabled
            className={`mt-3 rounded-2xl px-4 py-3 ${registrationSamples.length < 5 ? "bg-slate-700" : "bg-emerald-500"}`}
          >
            <Text className="text-center font-semibold text-white">Save From Capture Screen</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onImportEmployees} className="mt-3 rounded-2xl bg-indigo-500 px-4 py-3">
            <Text className="text-center font-semibold text-white">Import Employees From Website</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-5 rounded-3xl bg-white/5 p-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-lg font-semibold text-white">Offline Sync</Text>
              <Text className="mt-1 text-sm text-slate-400">Send queued attendance records every 60 seconds or manually.</Text>
            </View>
            <TouchableOpacity
              onPress={onSync}
              className="h-14 w-14 items-center justify-center rounded-2xl bg-sky-500"
            >
              <MaterialIcons name={syncing ? "sync" : "sync"} size={26} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-5 rounded-3xl bg-white/5 p-5">
          <Text className="text-lg font-semibold text-white">Scanner Status</Text>
          <View className="mt-4 rounded-2xl bg-slate-900/80 px-4 py-3">
            <Text className="text-xs font-semibold uppercase tracking-[1.5px] text-slate-500">Latest diagnostic</Text>
            <Text className="mt-2 text-sm text-white">{scanDiagnostic || "Idle"}</Text>
          </View>
        </View>

        <View className="mt-5 rounded-3xl bg-white/5 p-5">
          <Text className="text-lg font-semibold text-white">Employee List</Text>
          {employees.length ? (
            employees.map((employee) => (
              <View key={employee.employee_id} className="mt-4 rounded-2xl bg-slate-900/80 px-4 py-3">
                <Text className="font-semibold text-white">{employee.name}</Text>
                <Text className="mt-1 text-sm text-slate-400">
                  {employee.employee_id} | {employee.department || "No department"}
                </Text>
                <Text className="mt-1 text-xs text-slate-500">
                  {employee.embeddings?.length
                    ? `${employee.embeddings.length} embedding sample${employee.embeddings.length > 1 ? "s" : ""} stored`
                    : employee.face_embedding?.length
                      ? "Legacy embedding stored"
                      : "No embedding"}
                </Text>
              </View>
            ))
          ) : (
            <Text className="mt-4 text-sm text-slate-400">No employees registered on this kiosk yet.</Text>
          )}
        </View>

        <View className="mt-5 rounded-3xl bg-white/5 p-5">
          <Text className="text-lg font-semibold text-white">Attendance Logs</Text>
          {logs.length ? (
            logs.map((log) => (
              <View key={log.id} className="mt-4 rounded-2xl bg-slate-900/80 px-4 py-3">
                <View className="flex-row items-center justify-between">
                  <Text className="font-semibold text-white">{log.employee_name}</Text>
                  <Text className={`text-xs font-semibold ${log.synced ? "text-emerald-400" : "text-amber-400"}`}>
                    {log.synced ? "SYNCED" : "QUEUED"}
                  </Text>
                </View>
                <Text className="mt-1 text-sm text-slate-400">{new Date(log.timestamp).toLocaleString()}</Text>
                <Text className="mt-1 text-xs text-slate-500">{log.response_message || log.status}</Text>
              </View>
            ))
          ) : (
            <Text className="mt-4 text-sm text-slate-400">No attendance logs yet.</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

export default AdminPanel;
