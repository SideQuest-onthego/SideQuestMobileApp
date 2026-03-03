import type { ActivityModel } from "../types/sidequest-models";

export type Place = ActivityModel;

export const places: ActivityModel[] = [
  {
    id: "1",
    name: "Statue of Liberty",
    type: "activity",
    category: "landmark",
    tags: ["outdoor", "historic", "popular"],
    active: true,
    location: {
      address: "Liberty Island, New York, NY",
      city: "New York",
      state: "NY",
      country: "US",
      lat: 40.6892,
      lng: -74.0445,
    },
    source: {
      provider: "manual",
    },
    estimatedCost: {
      currency: "USD",
      type: "per_person",
      min: 26,
      max: 26,
    },
    typicalDurationMins: 120,
    links: {
      imageUrl:
        "https://images.unsplash.com/photo-1585155967849-91c736589c84?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHN0YXR1ZSUyMG9mJTIwbGliZXJ0eXxlbnwwfHwwfHx8MA%3D%3D",
    },
    createdAt: null,
    updatedAt: null,
  },

  {
    id: "2",
    name: "The Metropolitan Museum of Art",
    type: "museum",
    category: "museum",
    tags: ["art", "indoor", "popular"],
    active: true,
    location: {
      address: "1000 5th Ave, New York, NY",
      city: "New York",
      state: "NY",
      country: "US",
      lat: 40.7794,
      lng: -73.9632,
    },
    source: {
      provider: "manual",
    },
    estimatedCost: {
      currency: "USD",
      type: "per_person",
      min: 17,
      max: 30,
    },
    typicalDurationMins: 150,
    links: {
      imageUrl:
        "https://images.unsplash.com/photo-1665399320904-51baf9adac8e?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    createdAt: null,
    updatedAt: null,
  },

  {
    id: "3",
    name: "Brooklyn Bridge",
    type: "activity",
    category: "landmark",
    tags: ["outdoor", "walk", "views"],
    active: true,
    location: {
      address: "Brooklyn Bridge, New York, NY",
      city: "New York",
      state: "NY",
      country: "US",
      lat: 40.7061,
      lng: -73.9969,
    },
    source: {
      provider: "manual",
    },
    estimatedCost: {
      currency: "USD",
      type: "flat",
      min: 0,
      max: 0,
    },
    typicalDurationMins: 60,
    links: {
      imageUrl:
        "https://images.unsplash.com/photo-1573261658953-8b29e144d1af?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    createdAt: null,
    updatedAt: null,
  },
];
