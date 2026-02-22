import { StyleSheet, Text, View } from "react-native";

export default function AccountScreen() {
   return (
      <View style={styles.container}>
         <Text>Account</Text>
         <Text>Arman was here</Text>
      </View>
   );
}

const styles = StyleSheet.create({
   container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
   },
});
