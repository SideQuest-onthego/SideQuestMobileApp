import { IconSymbol } from "@/components/ui/icon-symbol";
import type { GeneratedItinerary } from "@/services/geminiItinerary";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  itinerary: GeneratedItinerary | null;
  isLoading: boolean;
  onClose: () => void;
};

function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (hours === 0) return `${remainder} min`;
  if (remainder === 0) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

export default function AiItineraryModal({
  visible,
  itinerary,
  isLoading,
  onClose,
}: Props) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>AI Itinerary</Text>
            <Text style={styles.title}>Your day, planned by Gemini</Text>
          </View>

          <Pressable
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={10}
            accessibilityLabel="Close AI itinerary"
          >
            <IconSymbol size={18} name="xmark" color="#102C26" />
          </Pressable>
        </View>

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color="#0B3B33" />
            <Text style={styles.loadingText}>
              Gemini is sequencing your stops...
            </Text>
          </View>
        ) : !itinerary ? (
          <View style={styles.loadingState}>
            <Text style={styles.loadingText}>
              No itinerary yet. Try generating again.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {itinerary.summary ? (
              <View style={styles.summaryCard}>
                <View style={styles.summaryIconBox}>
                  <IconSymbol size={20} name="sparkles" color="#102C26" />
                </View>
                <Text style={styles.summaryText}>{itinerary.summary}</Text>
              </View>
            ) : null}

            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Stops</Text>
                <Text style={styles.statValue}>{itinerary.stops.length}</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>
                  {formatHours(itinerary.totalDurationMins)}
                </Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statLabel}>Est. cost</Text>
                <Text style={styles.statValue}>
                  ${Math.round(itinerary.totalEstimatedCost)}
                </Text>
              </View>
            </View>

            <Text style={styles.sectionTitle}>What to do at each stop</Text>

            <View style={styles.timeline}>
              <View style={styles.timelineRail} />
              {itinerary.stops.map((stop) => (
                <View key={stop.place.id} style={styles.stopRow}>
                  <View style={styles.markerColumn}>
                    <View style={styles.marker}>
                      <Text style={styles.markerText}>{stop.order}</Text>
                    </View>
                  </View>

                  <View style={styles.stopCard}>
                    <Text style={styles.stopTime}>
                      {stop.startTime} - {stop.endTime}
                    </Text>
                    <Text style={styles.stopName} numberOfLines={2}>
                      {stop.place.name}
                    </Text>
                    {stop.place.location?.address ? (
                      <Text style={styles.stopAddress} numberOfLines={1}>
                        {stop.place.location.address}
                      </Text>
                    ) : null}

                    {stop.notes ? (
                      <View style={styles.notesBlock}>
                        <Text style={styles.notesLabel}>Suggestion</Text>
                        <Text style={styles.notesText}>{stop.notes}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        )}

        <View style={styles.footer}>
          <Pressable style={styles.primaryButton} onPress={onClose}>
            <Text style={styles.primaryButtonText}>Done</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DBFEF7",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: "700",
    color: "#34524C",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  title: {
    marginTop: 4,
    fontSize: 24,
    fontWeight: "800",
    color: "#102C26",
    maxWidth: 280,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#102C26",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#34524C",
    textAlign: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  summaryCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#102C26",
    padding: 14,
    marginBottom: 16,
  },
  summaryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#CFEFE9",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: "#102C26",
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#102C26",
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5A7069",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  statValue: {
    marginTop: 4,
    fontSize: 18,
    fontWeight: "800",
    color: "#102C26",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#102C26",
    marginBottom: 12,
  },
  timeline: {
    position: "relative",
    paddingLeft: 4,
  },
  timelineRail: {
    position: "absolute",
    left: 17,
    top: 18,
    bottom: 18,
    width: 3,
    borderRadius: 999,
    backgroundColor: "#12362E",
  },
  stopRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 14,
  },
  markerColumn: {
    width: 30,
    alignItems: "center",
    paddingTop: 14,
    zIndex: 1,
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#12362E",
    alignItems: "center",
    justifyContent: "center",
  },
  markerText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  stopCard: {
    flex: 1,
    marginLeft: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#102C26",
    padding: 14,
  },
  stopTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#34524C",
  },
  stopName: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: "800",
    color: "#102C26",
  },
  stopAddress: {
    marginTop: 2,
    fontSize: 13,
    color: "#6B7280",
  },
  notesBlock: {
    marginTop: 10,
    backgroundColor: "#EFF7F4",
    borderRadius: 12,
    padding: 10,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#34524C",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#102C26",
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#B7CFC8",
    backgroundColor: "#DBFEF7",
  },
  primaryButton: {
    backgroundColor: "#0B3B33",
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
