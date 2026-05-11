import { useEffect, useState } from "react";
import { Text, TextInput, TouchableOpacity, View } from "react-native";

function PinUnlockModal({ visible, expectedPin, onClose, onUnlock }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) {
      setPin("");
      setError("");
    }
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 z-50 items-center justify-center bg-slate-950/85 px-6">
      <View className="w-full max-w-md rounded-[32px] bg-slate-900 px-6 py-7">
        <Text className="text-center text-2xl font-bold text-white">Admin PIN</Text>
        <Text className="mt-2 text-center text-sm text-slate-400">
          Enter the kiosk admin PIN to access employee tools and sync controls.
        </Text>

        <TextInput
          value={pin}
          onChangeText={setPin}
          secureTextEntry
          keyboardType="number-pad"
          maxLength={6}
          className="mt-6 rounded-2xl bg-slate-800 px-4 py-4 text-center text-2xl tracking-[10px] text-white"
          placeholder="****"
          placeholderTextColor="#64748B"
        />

        {error ? <Text className="mt-3 text-center text-sm text-rose-400">{error}</Text> : null}

        <View className="mt-6 flex-row gap-3">
          <TouchableOpacity onPress={onClose} className="flex-1 rounded-2xl bg-slate-800 px-4 py-4">
            <Text className="text-center font-semibold text-white">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              const enteredPin = String(pin || "").trim();
              const validPin = String(expectedPin || "1234").trim();

              if (enteredPin === validPin) {
                onUnlock();
              } else {
                setError("Incorrect PIN");
              }
            }}
            className="flex-1 rounded-2xl bg-indigo-500 px-4 py-4"
          >
            <Text className="text-center font-semibold text-white">Unlock</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default PinUnlockModal;
