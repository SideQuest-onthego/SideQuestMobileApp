import { useState } from "react";
import { Alert, Button, View } from "react-native";
import { type Href, useRouter } from "expo-router";
import { signOut } from "firebase/auth";

import { auth } from "@/FirebaseConfig";

type LogoutButtonProps = {
  label?: string;
  redirectTo?: Href;
  onLoggedOut?: () => void | Promise<void>;
};

// Portable logout button
export function LogoutButton({
  label = "Log Out",
  redirectTo = "/",
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
    <View>
      <Button
        title={isSigningOut ? "Logging Out..." : label}
        onPress={handleLogout}
        disabled={isSigningOut}
        color="#1F6F5F"
      />
    </View>
  );
}
