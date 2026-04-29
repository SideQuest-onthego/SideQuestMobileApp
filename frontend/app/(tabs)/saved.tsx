
import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  Pressable,
  TextInput,
  SafeAreaView,
} from "react-native";
import { useRouter } from "expo-router";
import { useSavedPlaces } from "../../context/SavedPlacesContext";
import SavedPlaceCard from "../../components/SavedPlaceCard";

function getAveragePrice(min?: number, max?: number) {
  const safeMin = min ?? 0;
  const safeMax = max ?? 0;

  if (safeMin === safeMax) return safeMax;
  return Math.round((safeMin + safeMax) / 2);
}

export default function SavedScreen() {
  const router = useRouter();
  const { savedPlaces, removePlace, addToItinerary } = useSavedPlaces();

  const [selectedFilter, setSelectedFilter] =
    useState<"all" | "free" | "paid">("all");

  const [selectedSort, setSelectedSort] =
    useState<"default" | "az" | "lowToHigh" | "highToLow">("default");

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (
      selectedFilter === "free" &&
      (selectedSort === "lowToHigh" || selectedSort === "highToLow")
    ) {
      setSelectedSort("default");
    }
  }, [selectedFilter, selectedSort]);

  const filteredPlaces = savedPlaces
    .filter((place) => {
      const min = place.estimatedCost?.min ?? 0;
      const max = place.estimatedCost?.max ?? 0;
      const isFree = min === 0 && max === 0;

      if (selectedFilter === "free") return isFree;
      if (selectedFilter === "paid") return !isFree;
      return true;
    })
    .filter((place) =>
      place.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const sortedPlaces = [...filteredPlaces].sort((a, b) => {
    if (selectedSort === "az") return a.name.localeCompare(b.name);

    if (selectedSort === "lowToHigh") {
      return (
        getAveragePrice(a.estimatedCost?.min, a.estimatedCost?.max) -
        getAveragePrice(b.estimatedCost?.min, b.estimatedCost?.max)
      );
    }

    if (selectedSort === "highToLow") {
      return (
        getAveragePrice(b.estimatedCost?.min, b.estimatedCost?.max) -
        getAveragePrice(a.estimatedCost?.min, a.estimatedCost?.max)
      );
    }

    return 0;
  });

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={sortedPlaces}
        keyExtractor={(item) => item.id}

        ListHeaderComponent={
          <View style={styles.header}>
            {/* SEARCH BAR */}
            <TextInput
              style={styles.searchInput}
              placeholder="Search saved places..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />

            {/* FILTER BUTTONS */}
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

            {/* SORT BUTTONS */}
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
                      selectedSort === "lowToHigh" &&
                        styles.activeSortButton,
                    ]}
                    onPress={() => setSelectedSort("lowToHigh")}
                  >
                    <Text
                      style={[
                        styles.sortText,
                        selectedSort === "lowToHigh" &&
                          styles.activeSortText,
                      ]}
                    >
                      $Low-High
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.sortButton,
                      selectedSort === "highToLow" &&
                        styles.activeSortButton,
                    ]}
                    onPress={() => setSelectedSort("highToLow")}
                  >
                    <Text
                      style={[
                        styles.sortText,
                        selectedSort === "highToLow" &&
                          styles.activeSortText,
                      ]}
                    >
                      $High-Low
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        }

        renderItem={({ item }) => (
          <SavedPlaceCard
            item={item}
            onRemove={removePlace}
            onAddToItinerary={addToItinerary}
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

        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {searchQuery
              ? "No places match your search."
              : selectedFilter === "free"
              ? "No free places saved yet."
              : selectedFilter === "paid"
              ? "No paid places saved yet."
              : "No saved places yet."}
          </Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#DBFEF7",
  },

  header: {
    paddingTop: 10,
    paddingHorizontal: 12,
  },

  searchInput: {
    width: "99%",
    alignSelf: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#000",
    fontSize: 16,
    marginBottom: 12,
  },

  filterRow: {
    flexDirection: "row",
    gap: 10,
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
    marginBottom: 12,
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

  listContent: {
    paddingBottom: 20,
  },

  emptyText: {
    textAlign: "center",
    marginTop: 30,
    fontSize: 16,
    color: "#555",
  },
});

