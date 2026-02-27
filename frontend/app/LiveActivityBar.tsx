import React, { useState, useEffect } from "react";
import { View, Text } from "react-native";
import { TrendingUp } from "lucide-react-native";

// ALL FAKE DATA (except product names)
const moroccanNames = [
  "Yassine", "Fatima", "Mohamed", "Khadija", "Omar", "Amina", "Rachid", "Nadia",
  "Hassan", "Zineb", "Karim", "Sara", "Driss", "Leila", "Mehdi", "Imane"
];

interface Activity {
  user: string;
  action: string;
  time: string;
}

export function LiveActivityBar(props: any) {
  const [currentActivity, setCurrentActivity] = useState<Activity | null>(null);
  const [products, setProducts] = useState([]);

  // ONLY THIS PART IS REAL - fetching product names from database
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('https://haba-haba-api.ubua.cloud/api/auth/products-names');
        const data = await response.json();
        setProducts(data.names || []);
      } catch (err) {
        console.error("API failed:", err);
      }
    };
    fetchProducts();
  }, []);

  // EVERYTHING HERE IS 100% FAKE
  useEffect(() => {
    if (products.length === 0) return;

    const generateFakeActivity = () => {
      const fakeName = moroccanNames[Math.floor(Math.random() * moroccanNames.length)];
      const fakeProduct = products[Math.floor(Math.random() * products.length)];
      const fakeTime = `${Math.floor(Math.random() * 30) + 1} min ago`;
      
      setCurrentActivity({
        user: fakeName,
        action: `just ordered ${fakeProduct}`,
        time: fakeTime
      });
    };

    generateFakeActivity(); // First fake message
    const interval = setInterval(generateFakeActivity, 30000); // New fake every 30s
    return () => clearInterval(interval);
  }, [products]);

  if (!currentActivity) return null;

  const { user, action, time } = currentActivity;

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 25 }} {...props}>
      <View style={{
        backgroundColor: "#FDF2E9",
        borderRadius: 16,
        padding: 14,
        marginTop: 10,
        borderWidth: 1,
        borderColor: "#F0E6D2",
        flexDirection: "row",
        alignItems: "center",
      }}>
        <View style={{
          width: 8,
          height: 8,
          backgroundColor: "#4CAF50",
          borderRadius: 4,
          marginRight: 10,
        }} />
        
        <TrendingUp size={16} color="#8B4513" />
        
        <Text style={{
          flex: 1,
          fontFamily: "Inter_400Regular",
          fontSize: 13,
          color: "#5D4E37",
          marginLeft: 8,
        }} numberOfLines={1}>
          <Text style={{ fontFamily: "Inter_600SemiBold" }}>
            {user}
          </Text> {action}
        </Text>
        
        <Text style={{
          fontFamily: "Inter_400Regular",
          fontSize: 11,
          color: "#A08C7D",
          marginLeft: 8,
        }}>
          {time}
        </Text>
      </View>
    </View>
  );
}