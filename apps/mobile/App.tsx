import { QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Fraunces_600SemiBold,
  Fraunces_700Bold,
} from "@expo-google-fonts/fraunces";
import { queryClient } from "./src/lib/query-client";
import { FeedScreen } from "./src/screens/FeedScreen";

export default function App() {
  // Load Fraunces in the background — never block the whole app on a font.
  // Headlines briefly use the system serif until it registers. (A splash
  // gate to avoid that flash is a later polish task.)
  const [fontsLoaded, fontError] = useFonts({
    Fraunces_600SemiBold,
    Fraunces_700Bold,
  });
  if (fontError) {
    console.warn("Fraunces load failed, using fallback serif:", fontError);
  } else if (!fontsLoaded) {
    console.log("Fraunces still loading…");
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <FeedScreen />
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
