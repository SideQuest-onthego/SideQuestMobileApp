// frontend/app/(tabs)/saved.tsx
import React, { useState, useEffect } from "react";
import { View, FlatList, StyleSheet, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useSavedPlaces } from "../../context/SavedPlacesContext";
import SavedPlaceCard from "../../components/SavedPlaceCard";

// Helper function to get average price for sorting
function getAveragePrice(min?: number, max?: number) {
  const safeMin = min ?? 0;
  const safeMax = max ?? 0;

  if (safeMin === safeMax) {
    return safeMax;
  }

  return Math.round((safeMin + safeMax) / 2);
}

export default function SavedScreen() {
  const router = useRouter();
  const { savedPlaces, removePlace } = useSavedPlaces();
  const [selectedFilter, setSelectedFilter] = useState<"all" | "free" | "paid">(
    "all",
  );

  const [selectedSort, setSelectedSort] = useState<
    "default" | "az" | "lowToHigh" | "highToLow"
  >("default");

  useEffect(() => {
    if (
      selectedFilter === "free" &&
      (selectedSort === "lowToHigh" || selectedSort === "highToLow")
    ) {
      setSelectedSort("default");
    }
  }, [selectedFilter, selectedSort]);

  const filteredPlaces = savedPlaces.filter((place) => {
    const min = place.estimatedCost?.min ?? 0;
    const max = place.estimatedCost?.max ?? 0;
    const isFree = min === 0 && max === 0;

    if (selectedFilter === "free") return isFree;
    if (selectedFilter === "paid") return !isFree;
    return true;
  });

  const sortedPlaces = [...filteredPlaces].sort((a, b) => {
    // sort alphabetically by place name
    if (selectedSort === "az") {
      return a.name.localeCompare(b.name);
    }

    // sort by price from lowest to highest
    if (selectedSort === "lowToHigh") {
      const priceA = getAveragePrice(
        a.estimatedCost?.min,
        a.estimatedCost?.max,
      );
      const priceB = getAveragePrice(
        b.estimatedCost?.min,
        b.estimatedCost?.max,
      );
      return priceA - priceB;
    }

    // sort by price from highest to lowest
    if (selectedSort === "highToLow") {
      const priceA = getAveragePrice(
        a.estimatedCost?.min,
        a.estimatedCost?.max,
      );
      const priceB = getAveragePrice(
        b.estimatedCost?.min,
        b.estimatedCost?.max,
      );
      return priceB - priceA;
    }

    // default keeps the original order
    return 0;
  });

  return (
    <View style={styles.container}>
      {sortedPlaces.length === 0 ? (
        <Text style={styles.emptyText}>
          {selectedFilter === "free"
            ? "No free places saved yet."
            : selectedFilter === "paid"
              ? "No paid places saved yet."
              : "No saved places yet."}
        </Text>
      ) : (
        <FlatList
          data={sortedPlaces}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <>
              {/* Filter buttons */}
              <View style={styles.filterRow}>
                <Pressable
                  style={[
                    styles.filterButton,
                    selectedFilter === "all" && styles.activeFilterButton,
                  ]}
                  onPress={() => setSelectedFilter("all")}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selectedFilter === "all" && styles.activeFilterText,
                    ]}
                  >
                    All
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.filterButton,
                    selectedFilter === "free" && styles.activeFilterButton,
                  ]}
                  onPress={() => setSelectedFilter("free")}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selectedFilter === "free" && styles.activeFilterText,
                    ]}
                  >
                    Free
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.filterButton,
                    selectedFilter === "paid" && styles.activeFilterButton,
                  ]}
                  onPress={() => setSelectedFilter("paid")}
                >
                  <Text
                    style={[
                      styles.filterText,
                      selectedFilter === "paid" && styles.activeFilterText,
                    ]}
                  >
                    Paid
                  </Text>
                </Pressable>
              </View>

              <View style={styles.sortRow}>
                <Pressable
                  style={[
                    styles.sortButton,
                    selectedSort === "default" && styles.activeSortButton,
                  ]}
                  onPress={() => setSelectedSort("default")}
                >
                  <Text
                    style={[
                      styles.sortText,
                      selectedSort === "default" && styles.activeSortText,
                    ]}
                  >
                    Default
                  </Text>
                </Pressable>

                <Pressable
                  style={[
                    styles.sortButton,
                    selectedSort === "az" && styles.activeSortButton,
                  ]}
                  onPress={() => setSelectedSort("az")}
                >
                  <Text
                    style={[
                      styles.sortText,
                      selectedSort === "az" && styles.activeSortText,
                    ]}
                  >
                    A-Z
                  </Text>
                </Pressable>

                {selectedFilter !== "free" && (
                  <>
                    <Pressable
                      style={[
                        styles.sortButton,
                        selectedSort === "lowToHigh" && styles.activeSortButton,
                      ]}
                      onPress={() => setSelectedSort("lowToHigh")}
                    >
                      <Text
                        style={[
                          styles.sortText,
                          selectedSort === "lowToHigh" && styles.activeSortText,
                        ]}
                      >
                        $Low-High
                      </Text>
                    </Pressable>

                    <Pressable
                      style={[
                        styles.sortButton,
                        selectedSort === "highToLow" && styles.activeSortButton,
                      ]}
                      onPress={() => setSelectedSort("highToLow")}
                    >
                      <Text
                        style={[
                          styles.sortText,
                          selectedSort === "highToLow" && styles.activeSortText,
                        ]}
                      >
                        $High-Low
                      </Text>
                    </Pressable>
                  </>
                )}
              </View>
            </>
          }
          renderItem={({ item }) => (
            <SavedPlaceCard
              item={item}
              onRemove={removePlace}
              onPress={(place) =>
                router.push({
                  pathname: "/itinerary/[placeId]",
                  params: { placeId: place.id },
                })
              }
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 12,
    backgroundColor: "#DBFEF7",
  },
  filterRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
    marginBottom: 12,
    justifyContent: "center",
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#000000",
  },
  activeFilterButton: {
    backgroundColor: "#000000",
  },
  filterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
  activeFilterText: {
    color: "#FFFFFF",
  },
  sortRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 18,
    justifyContent: "center",
  },
  sortButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#000000",
  },
  activeSortButton: {
    backgroundColor: "#000000",
  },
  sortText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#000000",
  },
  activeSortText: {
    color: "#FFFFFF",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#555",
  },
  listContent: {
    paddingBottom: 20,
  },
});
