import { MaterialIcons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function KioskSetupScreen({ initialSettings, loading, sessionMessage, onLogin }) {
  const [form, setForm] = useState({
    apiBaseUrl: initialSettings.apiBaseUrl || "http://192.168.29.245:5000",
    recognitionBaseUrl: initialSettings.recognitionBaseUrl || "http://192.168.29.245:5000",
    email: initialSettings.adminEmail || "",
    password: "",
    deviceId: initialSettings.deviceId || "KIOSK-01",
    deviceName: initialSettings.deviceName || "Attendify Front Desk",
    adminPin: initialSettings.adminPin || "1234"
  });
  const [error, setError] = useState("");

  const disabled = useMemo(
    () =>
      loading ||
      !form.apiBaseUrl.trim() ||
      !form.recognitionBaseUrl.trim() ||
      !form.email.trim() ||
      !form.password.trim() ||
      !form.deviceId.trim() ||
      !form.deviceName.trim(),
    [form, loading]
  );

  const handleChange = (key, value) => {
    setForm((current) => ({
      ...current,
      [key]: value
    }));
  };

  const handleSubmit = async () => {
    setError("");
    try {
      await onLogin({
        apiBaseUrl: form.apiBaseUrl.trim(),
        recognitionBaseUrl: form.recognitionBaseUrl.trim(),
        email: form.email.trim(),
        password: form.password,
        deviceId: form.deviceId.trim(),
        deviceName: form.deviceName.trim(),
        adminPin: form.adminPin.trim() || "1234"
      });
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in to this kiosk.");
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 px-6 py-6">
        <View className="flex-1 justify-center">
          <View className="self-start rounded-full bg-indigo-500/15 px-4 py-2">
            <Text className="text-xs font-semibold uppercase tracking-[2px] text-indigo-200">Attendify Kiosk Setup</Text>
          </View>

          <Text className="mt-6 text-4xl font-bold text-white">Sign in your company before scanning</Text>
          <Text className="mt-3 text-base leading-7 text-slate-300">
            Each kiosk belongs to one company session. Sign in with the company admin account so attendance and employees stay isolated.
          </Text>

          <View className="mt-8 rounded-[32px] bg-slate-900/80 p-5">
            {[
              { key: "apiBaseUrl", label: "API Base URL", placeholder: "http://192.168.29.245:5000", keyboardType: "url" },
              {
                key: "recognitionBaseUrl",
                label: "Recognition API URL",
                placeholder: "http://192.168.29.245:5000",
                keyboardType: "url"
              },
              { key: "email", label: "Admin Email", placeholder: "admin@company.com", keyboardType: "email-address" },
              { key: "password", label: "Admin Password", placeholder: "Enter password", secureTextEntry: true },
              { key: "deviceId", label: "Device ID", placeholder: "KIOSK-01" },
              { key: "deviceName", label: "Device Name", placeholder: "Attendify Front Desk" },
              { key: "adminPin", label: "Local Admin PIN", placeholder: "1234", secureTextEntry: true, keyboardType: "number-pad" }
            ].map((field) => (
              <View key={field.key} className="mt-4">
                <Text className="mb-2 text-sm font-medium text-slate-300">{field.label}</Text>
                <TextInput
                  value={form[field.key]}
                  onChangeText={(value) => handleChange(field.key, value)}
                  className="rounded-2xl bg-slate-800 px-4 py-4 text-white"
                  placeholder={field.placeholder}
                  placeholderTextColor="#64748B"
                  autoCapitalize="none"
                  secureTextEntry={field.secureTextEntry}
                  keyboardType={field.keyboardType}
                />
              </View>
            ))}

            {sessionMessage ? (
              <View className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
                <Text className="text-sm text-amber-100">{sessionMessage}</Text>
              </View>
            ) : null}

            {error ? (
              <View className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
                <Text className="text-sm text-rose-200">{error}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              onPress={handleSubmit}
              disabled={disabled}
              className={`mt-6 flex-row items-center justify-center rounded-2xl px-4 py-4 ${
                disabled ? "bg-slate-700" : "bg-indigo-500"
              }`}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <MaterialIcons name="login" size={20} color="#fff" />}
              <Text className="ml-2 text-base font-semibold text-white">Sign In and Activate Kiosk</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default KioskSetupScreen;
