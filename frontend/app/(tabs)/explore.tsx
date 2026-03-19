import { Button, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import ParallaxScrollView from "@/components/parallax-scroll-view";
import { LogoutButton } from "@/components/logout-button";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Fonts } from "@/constants/theme";

// TEMPORARY USAGE: ONLY FOR TESTING
const firstTimeScreens = [
   { label: "Budget", href: "/(first-time)/budget" },
   { label: "Distance", href: "/(first-time)/distance" },
   { label: "Travel", href: "/(first-time)/travel" },
   { label: "Restrictions", href: "/(first-time)/restrictions" },
   { label: "Dietary", href: "/(first-time)/dietary" },
];

export default function TabTwoScreen() {
   const router = useRouter();
   return (
      <ParallaxScrollView
         headerBackgroundColor={{ light: "#D0D0D0", dark: "#353636" }}
         headerImage={
            <IconSymbol
               size={310}
               color="#808080"
               name="chevron.left.forwardslash.chevron.right"
               style={styles.headerImage}
            />
         }
      >
         <ThemedView style={styles.titleContainer}>
            <ThemedText
               type="title"
               style={{
                  fontFamily: Fonts.rounded,
               }}
            >
               TESTING SCREEN. All test buttons are here.
            </ThemedText>
         </ThemedView>
         {firstTimeScreens.map((screen) => (
            <Button
               key={screen.href}
               title={`Go to ${screen.label}`}
               onPress={() => router.push(screen.href as any)}
            />
         ))}
         <ThemedView style={styles.logoutContainer}>
            <LogoutButton redirectTo="/" />
         </ThemedView>
      </ParallaxScrollView>
   );
}

const styles = StyleSheet.create({
   headerImage: {
      color: "#808080",
      bottom: -90,
      left: -35,
      position: "absolute",
   },
   titleContainer: {
      flexDirection: "row",
      gap: 8,
   },
   logoutContainer: {
      marginTop: 16,
      alignItems: "flex-start",
   },
});
