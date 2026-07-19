import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../ui";
import { useTheme } from "../theme/theme-store";
import { formatRelativeTr } from "../lib/relative-time";
import { toTrUpper } from "../lib/turkish";
import type { FeedEvent } from "../hooks/usePublishedEvents";

interface Selected {
  event: FeedEvent;
  categoryName: string;
}

export interface NewsDetailSheetRef {
  present: (event: FeedEvent, categoryName: string) => void;
}

interface NewsDetailSheetProps {
  onOpenSource: (url: string) => void;
}

type Eli5State = "idle" | "thinking" | "revealed";

// The eli5 text is already in the DB; the "thinking" delay is intentional
// UX theater so the simplification feels considered.
const ELI5_THINKING_MS = 1400;

export const NewsDetailSheet = forwardRef<
  NewsDetailSheetRef,
  NewsDetailSheetProps
>(function NewsDetailSheet({ onOpenSource }, ref) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const modalRef = useRef<BottomSheetModal>(null);
  const [selected, setSelected] = useState<Selected | null>(null);
  const [eli5State, setEli5State] = useState<Eli5State>("idle");
  const eli5Timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const snapPoints = useMemo(() => ["92%"], []);

  useImperativeHandle(
    ref,
    () => ({
      present: (event, categoryName) => {
        if (eli5Timer.current) clearTimeout(eli5Timer.current);
        setSelected({ event, categoryName });
        setEli5State("idle");
        modalRef.current?.present();
      },
    }),
    [],
  );

  const revealEli5 = () => {
    setEli5State("thinking");
    if (eli5Timer.current) clearTimeout(eli5Timer.current);
    eli5Timer.current = setTimeout(
      () => setEli5State("revealed"),
      ELI5_THINKING_MS,
    );
  };

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

  const event = selected?.event ?? null;

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
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
      {selected !== null && event !== null && (
        <BottomSheetScrollView
          contentContainerStyle={{
            paddingBottom: insets.bottom + theme.spacing.xl,
          }}
        >
          <Image
            source={{ uri: event.cover_image_url }}
            accessibilityLabel={event.cover_image_alt ?? event.title}
            style={{
              width: "100%",
              aspectRatio: 3 / 4,
              backgroundColor: theme.colors.skeleton,
            }}
            contentFit="cover"
          />
          <View style={{ padding: theme.spacing.md, gap: theme.spacing.smd }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "baseline",
                gap: theme.spacing.xs,
              }}
            >
              <Text variant="label" color="secondary">
                {toTrUpper(selected.categoryName)}
              </Text>
              <Text variant="caption" color="secondary">
                · {formatRelativeTr(event.published_at)}
              </Text>
            </View>
            <Text variant="title">{event.title}</Text>
            <View
              style={{
                height: StyleSheet.hairlineWidth,
                backgroundColor: theme.colors.border,
              }}
            />
            <Text variant="body">{event.summary}</Text>

            {/* ELI5: accent button -> "thinking" spinner -> revealed text */}
            {event.eli5_text !== null && eli5State === "idle" && (
              <Pressable
                accessibilityRole="button"
                onPress={revealEli5}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: theme.spacing.sm,
                  minHeight: 48,
                  paddingHorizontal: theme.spacing.lg,
                  marginTop: theme.spacing.xs,
                  backgroundColor: theme.colors.accent,
                  borderRadius: theme.radii.xs,
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Feather name="smile" size={18} color={theme.colors.onAccent} />
                <Text
                  variant="body"
                  style={{ color: theme.colors.onAccent, fontWeight: "600" }}
                >
                  5 yaşındaymışım gibi anlat
                </Text>
              </Pressable>
            )}
            {eli5State === "thinking" && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.sm,
                  minHeight: 48,
                  marginTop: theme.spacing.xs,
                }}
              >
                <ActivityIndicator color={theme.colors.accent} />
                <Text variant="body" color="secondary">
                  Basitleştiriliyor…
                </Text>
              </View>
            )}
            {eli5State === "revealed" && event.eli5_text !== null && (
              <View
                style={{ gap: theme.spacing.xs, marginTop: theme.spacing.xs }}
              >
                <Text variant="label" color="secondary">
                  BASİTÇE
                </Text>
                <Text variant="body">{event.eli5_text}</Text>
              </View>
            )}

            {/* Source link (neutral text link — accent is spent on ELI5) */}
            {event.source_url !== null && (
              <Pressable
                accessibilityRole="link"
                hitSlop={8}
                onPress={() => onOpenSource(event.source_url as string)}
                style={({ pressed }) => ({
                  flexDirection: "row",
                  alignItems: "center",
                  gap: theme.spacing.xs,
                  marginTop: theme.spacing.sm,
                  opacity: pressed ? 0.6 : 1,
                })}
              >
                <Feather
                  name="external-link"
                  size={16}
                  color={theme.colors.textPrimary}
                />
                <Text
                  variant="body"
                  style={{
                    color: theme.colors.textPrimary,
                    textDecorationLine: "underline",
                  }}
                >
                  Kaynakta oku
                </Text>
              </Pressable>
            )}

            <Text
              variant="caption"
              color="secondary"
              style={{ marginTop: theme.spacing.sm }}
            >
              Görsel yapay zekâ ile üretildi
            </Text>
          </View>
        </BottomSheetScrollView>
      )}
    </BottomSheetModal>
  );
});
