import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

function SuccessOverlay({ visible, employeeName, offline }) {
  if (!visible) {
    return null;
  }

  return (
    <View className="absolute inset-0 items-center justify-center bg-[rgba(5,150,105,0.9)] px-8">
      <View className="items-center rounded-[34px] border border-white/15 bg-white/10 px-8 py-10 backdrop-blur-xl">
        <View className="h-28 w-28 items-center justify-center rounded-full border border-white/20 bg-white/15">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-white/10">
            <MaterialIcons name="check-circle" size={66} color="white" />
          </View>
        </View>
        <View className="mt-5 rounded-full border border-white/15 bg-white/10 px-4 py-2">
          <Text className="text-[11px] font-semibold uppercase tracking-[2px] text-emerald-50">Attendance Confirmed</Text>
        </View>
        <Text className="mt-5 text-center text-3xl font-bold text-white">{employeeName}</Text>
        <Text className="mt-2 text-center text-lg leading-7 text-emerald-50">
          Welcome {employeeName} - Attendance recorded
        </Text>
        {offline ? (
          <Text className="mt-3 max-w-[16rem] text-center text-sm leading-6 text-emerald-100">
            Saved offline and will sync automatically when the connection returns.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default SuccessOverlay;
