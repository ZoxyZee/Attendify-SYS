import { CameraView, useCameraPermissions } from "expo-camera";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

function KioskCamera({ cameraRef, onReady, children }) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <Text className="text-white">Loading camera permissions...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950 px-8">
        <Text className="text-center text-lg font-semibold text-white">Camera access is required for kiosk scanning.</Text>
        <TouchableOpacity onPress={requestPermission} className="mt-6 rounded-full bg-indigo-500 px-6 py-3">
          <Text className="font-semibold text-white">Grant Camera Access</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-950">
      <CameraView
        ref={cameraRef}
        facing="front"
        ratio="16:9"
        mirror
        style={StyleSheet.absoluteFillObject}
        onCameraReady={onReady}
      />
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFillObject, styles.overlay]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    zIndex: 20
  }
});

export default KioskCamera;
