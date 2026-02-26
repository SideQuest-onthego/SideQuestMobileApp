import { StyleSheet, Text, View } from "react-native";

export default function MapScreen() {
   return (
      <View style={styles.container}>
         <Text>Optional user story. Map feature as discussed before!</Text>
         <Text> Arman was here ^.^</Text>
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
