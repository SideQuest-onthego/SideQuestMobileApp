export type Place = {
  id: string;
  title: string;
  price: string;
  image: string;
};

export const places: Place[] = [
  {
    id: "1",
    title: "Statue of Liberty",
    price: "$26",
    image:
      "https://images.unsplash.com/photo-1585155967849-91c736589c84?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTF8fHN0YXR1ZSUyMG9mJTIwbGliZXJ0eXxlbnwwfHwwfHx8MA%3D%3D",
  },

  {
    id: "2",
    title: "The Metropolitan Museum of Art",
    price: "$17-$30",
    image:
      "https://images.unsplash.com/photo-1665399320904-51baf9adac8e?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },

  {
    id: "3",
    title: "Brooklyn Bridge",
    price: "Free",
    image:
      "https://images.unsplash.com/photo-1573261658953-8b29e144d1af?q=80&w=987&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];
