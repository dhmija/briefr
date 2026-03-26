import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

export default function App() {
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("https://hn.algolia.com/api/v1/search?tags=front_page")
      .then((res) => res.json())
      .then((data) => {
        setNews(data.hits || []);
      })
      .catch(() => {
        setError("Could not load news");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.smallText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Simple News</Text>
      </View>
      <FlatList
        data={news}
        keyExtractor={(item) => String(item.objectID)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => item.url && Linking.openURL(item.url)}
          >
            <Text style={styles.cardTitle}>{item.title || "No title"}</Text>
            <Text style={styles.meta}>{item.author || "unknown"}</Text>
          </TouchableOpacity>
        )}
      />
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5"
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  smallText: {
    fontSize: 14,
    color: "#555"
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd"
  },
  title: {
    fontSize: 24,
    fontWeight: "700"
  },
  list: {
    padding: 12,
    gap: 10
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e5e5"
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 6
  },
  meta: {
    fontSize: 12,
    color: "#666"
  }
});
