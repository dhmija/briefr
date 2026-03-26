import { StatusBar } from "expo-status-bar";
import { useEffect, useState, useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
  RefreshControl,
  Platform,
} from "react-native";
import { Feather, MaterialIcons } from "@expo/vector-icons";

// The API key is securely loaded from .env variables by Expo
const API_KEY = process.env.EXPO_PUBLIC_NEWS_API_KEY;
const CATEGORIES = [
  "general",
  "business",
  "entertainment",
  "health",
  "science",
  "sports",
  "technology"
];
const REQUEST_TIMEOUT_MS = 12000;

function buildEndpoints(category, apiKey) {
  return [
    `https://newsapi.org/v2/top-headlines?country=us&category=${category}&apiKey=${apiKey}`,
    `https://newsapi.org/v2/top-headlines?category=${category}&language=en&apiKey=${apiKey}`,
    `https://newsapi.org/v2/everything?q=${category}&language=en&sortBy=publishedAt&pageSize=25&apiKey=${apiKey}`
  ];
}

async function fetchJsonWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      }
    });

    const raw = await response.text();
    let data = {};

    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = {};
    }

    return { response, data };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function requestNews(category, apiKey) {
  const endpoints = buildEndpoints(category, apiKey);
  let lastError = "Could not load news";

  for (const endpoint of endpoints) {
    try {
      const { response, data } = await fetchJsonWithTimeout(endpoint, REQUEST_TIMEOUT_MS);

      if (response.ok && data.status === "ok") {
        // Filter out [Removed] and articles without titles
        const validArticles = (data.articles || []).filter(
          a => a.title && a.title !== "[Removed]" && a.url
        );
        return validArticles;
      }

      const code = response.status;
      const message = data.message || data.code || "Unknown API error";
      lastError = `NewsAPI ${code}: ${message}`;

      if (code >= 500) {
        // Retry immediately on server error
        const retry = await fetchJsonWithTimeout(endpoint, REQUEST_TIMEOUT_MS);
        if (retry.response.ok && retry.data.status === "ok") {
          return retry.data.articles || [];
        }
      }
    } catch (networkError) {
      if (networkError.name === "AbortError") {
        lastError = "Request timeout. Check internet connection and try again.";
      } else {
        lastError = networkError.message || "Network request failed";
      }
    }
  }

  throw new Error(lastError);
}

const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export default function App() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [news, setNews] = useState([]);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("general");

  const fetchNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      if (!API_KEY) {
        throw new Error("Missing NewsAPI key. Set EXPO_PUBLIC_NEWS_API_KEY in .env");
      }

      const articles = await requestNews(selectedCategory, API_KEY);
      setNews(articles);
    } catch (fetchError) {
      setNews([]);
      setError(fetchError.message || "Could not load news");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const onRefresh = () => {
    fetchNews(true);
  };

  const renderArticle = ({ item, index }) => {
    const hasImage = !!item.urlToImage;
    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => item.url && Linking.openURL(item.url)}
      >
        {hasImage && (
          <Image
            source={{ uri: item.urlToImage }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        )}
        <View style={styles.cardContent}>
          <Text style={styles.sourceTag}>
            {item.source?.name || "News Source"}
          </Text>
          <Text style={styles.cardTitle} numberOfLines={3}>
            {item.title || "No title available"}
          </Text>
          {!!item.description && (
            <Text style={styles.description} numberOfLines={2}>
              {item.description}
            </Text>
          )}
          <View style={styles.metaContainer}>
            <View style={styles.dateRow}>
              <Feather name="clock" size={12} color="#8e8e93" />
              <Text style={styles.metaText}>{formatDate(item.publishedAt)}</Text>
            </View>
            <Feather name="arrow-up-right" size={16} color="#007AFF" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Feather name="inbox" size={48} color="#c7c7cc" />
      <Text style={styles.emptyTitle}>No Articles Found</Text>
      <Text style={styles.emptyText}>We couldn't find any news for this category.</Text>
      <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
        <Text style={styles.retryButtonText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Daily<Text style={styles.headerTitleHighlight}>News</Text></Text>
        </View>
      </View>

      {/* Categories Bar */}
      <View style={styles.categoriesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
        >
          {CATEGORIES.map((category) => {
            const isActive = category === selectedCategory;
            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryPill,
                  isActive && styles.categoryPillActive,
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isActive && styles.categoryTextActive,
                  ]}
                >
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Main Content */}
      <View style={styles.mainContent}>
        {loading && !refreshing ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Fetching latest headlines...</Text>
          </View>
        ) : error ? (
          <View style={styles.centerContainer}>
            <Feather name="alert-circle" size={48} color="#FF3B30" />
            <Text style={styles.errorTitle}>Oops! Something went wrong.</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => fetchNews()}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={news}
            keyExtractor={(item, index) => item.url ? item.url : `article-${index}`}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={renderArticle}
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#007AFF"
                colors={['#007AFF']}
              />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7', // iOS system gray 6
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E', // iOS dark text
    letterSpacing: -0.5,
  },
  headerTitleHighlight: {
    color: '#007AFF', // iOS blue
  },
  categoriesContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryPillActive: {
    backgroundColor: '#007AFF',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  mainContent: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: '#8E8E93',
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  cardImage: {
    width: '100%',
    height: 180,
    backgroundColor: '#E5E5EA',
  },
  cardContent: {
    padding: 16,
  },
  sourceTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#007AFF',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    lineHeight: 24,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#F2F2F7',
    paddingTop: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  retryButton: {
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
