import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { WebView } from "react-native-webview";
import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { Text } from "../ui";
import { useTheme } from "../theme/theme-store";

export interface SourceWebSheetRef {
  present: (url: string) => void;
}

const HANDLE_HEIGHT = 24;
const HEADER_HEIGHT = 44;

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// In-app browser as a bottom sheet (DESIGN.md 2026-07-20). stackBehavior
// "push" keeps the news detail sheet open underneath, so closing this
// returns the reader to where they left off. Content panning is disabled
// so the page scrolls without fighting the sheet.
export const SourceWebSheet = forwardRef<SourceWebSheetRef>(
  function SourceWebSheet(_props, ref) {
    const theme = useTheme();
    const { height: windowHeight } = useWindowDimensions();
    const modalRef = useRef<BottomSheetModal>(null);
    const [url, setUrl] = useState<string | null>(null);
    // Matches the news detail sheet height (DESIGN.md)
    const snapPoints = useMemo(() => ["92%"], []);
    // WebView needs an explicit height; flex:1 collapses inside the sheet
    const webHeight = windowHeight * 0.92 - HANDLE_HEIGHT - HEADER_HEIGHT;

    useImperativeHandle(
      ref,
      () => ({
        present: (u) => {
          setUrl(u);
          modalRef.current?.present();
        },
      }),
      [],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.55}
        />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={modalRef}
        snapPoints={snapPoints}
        enableDynamicSizing={false}
        enableContentPanningGesture={false}
        stackBehavior="push"
        backdropComponent={renderBackdrop}
        handleIndicatorStyle={{
          backgroundColor: theme.colors.border,
          width: 32,
          height: 4,
        }}
        backgroundStyle={{
          backgroundColor: theme.colors.surface,
          borderTopLeftRadius: theme.radii.md,
          borderTopRightRadius: theme.radii.md,
        }}
      >
        <BottomSheetView>
          <View
            style={{
              height: HEADER_HEIGHT,
              flexDirection: "row",
              alignItems: "center",
              gap: theme.spacing.sm,
              paddingHorizontal: theme.spacing.md,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Text
              variant="caption"
              color="secondary"
              numberOfLines={1}
              style={{ flex: 1 }}
            >
              {url !== null ? domainOf(url) : ""}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Kapat"
              hitSlop={12}
              onPress={() => modalRef.current?.dismiss()}
            >
              <Feather name="x" size={22} color={theme.colors.textPrimary} />
            </Pressable>
          </View>
          {url !== null && (
            <WebView
              source={{ uri: url }}
              style={{ width: "100%", height: webHeight }}
              startInLoadingState
            />
          )}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);
