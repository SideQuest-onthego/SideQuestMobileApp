import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";
import { signOut } from "firebase/auth";

import { auth } from "@/FirebaseConfig";

type LogoutButtonProps = {
  label?: string;
  redirectTo?: Href;
  size?: "default" | "compact";
  onLoggedOut?: () => void | Promise<void>;
};

export function LogoutButton({
  label = "Log Out",
  redirectTo = "/",
  size = "default",
  onLoggedOut,
}: LogoutButtonProps) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleLogout = async () => {
    if (isSigningOut) {
      return;
    }

    try {
      setIsSigningOut(true);
      await signOut(auth);
      console.log("User logged out");
      await onLoggedOut?.();
      router.replace(redirectTo);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to log out.";
      Alert.alert("Logout failed", message);
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <View style={size === "compact" ? styles.compactContainer : undefined}>
      <Pressable
        style={[
          styles.button,
          size === "compact" ? styles.compactButton : styles.defaultButton,
          isSigningOut && styles.disabledButton,
        ]}
        onPress={handleLogout}
        disabled={isSigningOut}
      >
        <Text
          style={[
            styles.label,
            size === "compact" ? styles.compactLabel : styles.defaultLabel,
          ]}
        >
          {isSigningOut ? "Logging Out..." : label}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#102C26",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  defaultButton: {
    minWidth: 110,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  compactButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  disabledButton: {
    opacity: 0.7,
  },
  label: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  defaultLabel: {
    fontSize: 14,
  },
  compactLabel: {
    fontSize: 12,
  },
  compactContainer: {
    alignSelf: "flex-end",
  },
});
