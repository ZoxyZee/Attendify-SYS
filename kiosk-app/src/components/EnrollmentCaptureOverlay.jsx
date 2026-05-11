import { MaterialIcons } from "@expo/vector-icons";
import { ActivityIndicator, Image, Text, TouchableOpacity, View } from "react-native";

function EnrollmentCaptureOverlay({
  visible,
  employee,
  sampleCount,
  previews,
  busy,
  error,
  onClose,
  onCapture,
  onSave
}) {
  if (!visible || !employee) {
    return null;
  }

  const canSave = sampleCount >= 5 && !busy;

  return (
    <View className="absolute inset-0 z-40 justify-between bg-[rgba(2,6,23,0.34)] px-5 py-8">
      <View className="rounded-[30px] border border-white/10 bg-slate-950/78 p-5 backdrop-blur-xl">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <View className="self-start rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1.5">
              <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-sky-200">Face Enrollment</Text>
            </View>
            <Text className="mt-4 text-[1.7rem] font-bold text-white">Register Face Profile</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-300">
              {employee.name} | {employee.employee_id} | {employee.department || "General"}
            </Text>
            <Text className="mt-3 text-sm leading-6 text-slate-400">
              Keep the face centered inside the guide. Capture 5 clear samples with small angle changes to make recognition more reliable.
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} className="rounded-full border border-white/10 bg-white/10 p-3">
            <MaterialIcons name="close" size={22} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="items-center">
        <View className="h-80 w-80 items-center justify-center rounded-full border-4 border-sky-400/90 bg-black/10 shadow-[0_0_90px_rgba(56,189,248,0.24)]">
          <View className="absolute h-[22rem] w-[22rem] rounded-full border border-white/10" />
          <View className="absolute h-[19rem] w-[19rem] rounded-full border border-white/10" />
          <View className="absolute h-[15.5rem] w-[15.5rem] rounded-full border border-sky-300/20 bg-sky-400/5" />
          <View className="h-64 w-64 rounded-full border border-dashed border-white/70" />
          <View className="absolute left-10 top-24 h-10 w-10 rounded-tl-3xl border-l-4 border-t-4 border-sky-300/90" />
          <View className="absolute right-10 top-24 h-10 w-10 rounded-tr-3xl border-r-4 border-t-4 border-sky-300/90" />
          <View className="absolute bottom-24 left-10 h-10 w-10 rounded-bl-3xl border-b-4 border-l-4 border-sky-300/90" />
          <View className="absolute bottom-24 right-10 h-10 w-10 rounded-br-3xl border-b-4 border-r-4 border-sky-300/90" />
          <View className="absolute bottom-7 rounded-full border border-white/10 bg-black/55 px-4 py-2">
            <Text className="text-sm font-semibold uppercase tracking-[1.4px] text-white">Align face and tap capture</Text>
          </View>
        </View>
      </View>

      <View className="rounded-[32px] border border-white/10 bg-slate-950/80 p-5 backdrop-blur-xl">
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-sm font-semibold uppercase tracking-[1.6px] text-slate-400">Progress</Text>
            <Text className="mt-1 text-lg font-semibold text-white">{sampleCount}/5 samples captured</Text>
          </View>
          <View className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-2">
            <Text className="text-sm font-semibold text-sky-200">{Math.round((sampleCount / 5) * 100)}%</Text>
          </View>
        </View>

        <View className="mb-5 h-2 overflow-hidden rounded-full bg-white/10">
          <View className="h-full rounded-full bg-sky-400" style={{ width: `${(sampleCount / 5) * 100}%` }} />
        </View>

        <View className="flex-row justify-center gap-3">
          {[0, 1, 2, 3, 4].map((index) => (
            <View
              key={index}
              className={`h-20 w-20 items-center justify-center overflow-hidden rounded-[24px] border ${
                previews[index] ? "border-emerald-400 bg-emerald-500/10" : "border-white/10 bg-slate-800/90"
              }`}
            >
              {previews[index] ? (
                <Image source={{ uri: previews[index].uri }} className="h-full w-full" resizeMode="cover" />
              ) : (
                <View className="items-center">
                  <View className="mb-2 h-7 w-7 items-center justify-center rounded-full bg-white/5">
                    <Text className="text-xs font-semibold text-slate-300">{index + 1}</Text>
                  </View>
                  <Text className="text-[11px] font-semibold uppercase tracking-[1px] text-slate-400">Sample</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {error ? (
          <View className="mt-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
            <Text className="text-sm text-rose-200">{error}</Text>
          </View>
        ) : null}

        <Text className="mb-4 mt-4 text-center text-sm leading-6 text-slate-300">
          Change angle slightly between captures for a stronger face profile.
        </Text>
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={onCapture}
            disabled={busy || sampleCount >= 5}
            className={`flex-1 flex-row items-center justify-center rounded-[22px] px-4 py-4 ${
              busy || sampleCount >= 5 ? "bg-slate-700" : "bg-sky-500"
            }`}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <MaterialIcons name="photo-camera" size={20} color="#fff" />}
            <Text className="ml-2 text-base font-semibold text-white">
              {busy ? "Capturing..." : sampleCount >= 5 ? "All Samples Captured" : `Capture ${sampleCount + 1}`}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onSave}
            disabled={!canSave}
            className={`flex-1 flex-row items-center justify-center rounded-[22px] px-4 py-4 ${
              canSave ? "bg-emerald-500" : "bg-slate-700"
            }`}
          >
            <MaterialIcons name="check-circle" size={20} color="#fff" />
            <Text className="ml-2 text-base font-semibold text-white">Save Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

export default EnrollmentCaptureOverlay;
