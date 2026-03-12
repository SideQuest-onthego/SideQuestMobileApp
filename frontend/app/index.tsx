import { useEffect, useRef } from 'react'; //need to change the logo 
import { View, Text, StyleSheet, ImageBackground, Pressable, StatusBar, Animated, Dimensions } from 'react-native';
import { Link } from 'expo-router';

const first_page = require('@/assets/images/first_page.png');
const { width, height } = Dimensions.get('window');
const NUM_PARTICLES = 30;

// Floating Particle
const Particle = ({ index }: { index: number }) => {
  const translateY = useRef(new Animated.Value(height)).current;
  const translateX = useRef(new Animated.Value(Math.random() * width)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(Math.random() * 0.8 + 0.3)).current;

  useEffect(() => {
    const duration = Math.random() * 4000 + 4000;
    const delay = Math.random() * 6000;

    const animate = () => {
      translateY.setValue(height + 20);
      translateX.setValue(Math.random() * width);
      opacity.setValue(0);

      Animated.parallel([
        Animated.timing(translateY, {
          toValue: -20,
          duration,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 0.8,
            duration: duration * 0.2,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: duration * 0.3,
            delay: duration * 0.5,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animate());
    };

    const timeout = setTimeout(animate, delay);
    return () => clearTimeout(timeout);
  }, []);

  const size = Math.random() * 12 + 4;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: index % 3 === 0 ? '#95D5B2' : index % 3 === 1 ? '#ffffff' : '#52b788',
        transform: [{ translateX }, { translateY }, { scale }],
        opacity,
      }}
    />
  );
};

const App = () => {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Logo fade in
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(30)).current;

  // Tagline fade in (delayed)
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(20)).current;

  // Button pulse
  const buttonScale = useRef(new Animated.Value(1)).current;

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/(tabs)');
      } else {
        setCheckingAuth(false);
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (checkingAuth) return;

    // Logo fade in
    Animated.parallel([
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      }),
      Animated.timing(logoTranslateY, {
        toValue: 0,
        duration: 1200,
        useNativeDriver: true,
      }),
    ]).start();

    // Tagline fade in after logo
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(taglineOpacity, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(taglineTranslateY, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start();
    }, 800);

    // Button pulse loop
    const pulse = () => {
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 1.06,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };

    setTimeout(() => pulse(), 1500);
  }, [checkingAuth]);

  if (checkingAuth) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#95D5B2" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ImageBackground
        source={first_page}
        resizeMode="cover"
        style={styles.image}
      >
        {/* Floating Particles */}
        {Array.from({ length: NUM_PARTICLES }).map((_, i) => (
          <Particle key={i} index={i} />
        ))}

        {/* Logo */}
        <Animated.View
          style={[
            styles.logoContainer,
            { opacity: logoOpacity, transform: [{ translateY: logoTranslateY }] },
          ]}
        >
          <Text style={styles.logoText}>SideQuest</Text>
          <Animated.View
            style={[
              styles.taglineContainer,
              { opacity: taglineOpacity, transform: [{ translateY: taglineTranslateY }] },
            ]}
          >
            <Text style={styles.tagline}>on the go</Text>
          </Animated.View>
        </Animated.View>

        {/* Explore Button - top right */}
        <Animated.View style={[styles.exploreButtonWrapper, { transform: [{ scale: buttonScale }] }]}>
          <Link href="/explore" asChild>
            <Pressable style={styles.button}>
              <Text style={styles.buttonText}>Explore</Text>
            </Pressable>
          </Link>
        </Animated.View>

        {/* Log In Button */}
        <Animated.View style={[styles.loginButtonWrapper, { transform: [{ scale: buttonScale }] }]}>
          <Link href="/login" asChild>
            <Pressable style={styles.loginButton}>
              <Text style={styles.buttonText}>Log In</Text>
            </Pressable>
          </Link>
        </Animated.View>

        {/* Sign Up Button */}
        <Animated.View style={[styles.signUpButtonWrapper, { transform: [{ scale: buttonScale }] }]}>
          <Link href="/signup" asChild>
            <Pressable style={styles.signUpButton}>
              <Text style={styles.buttonText}>Sign Up</Text>
            </Pressable>
          </Link>
        </Animated.View>

      </ImageBackground>
    </View>
  );
};

export default App;

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#1a3d2f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: '#1a3d2f',
  },
  image: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  logoContainer: {
    position: 'absolute',
    top: 200,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 3 },
    textShadowRadius: 6,
  },
  taglineContainer: {
    backgroundColor: '#2D5F4F',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
  },
  tagline: {
    fontSize: 16,
    color: '#95D5B2',
    letterSpacing: 6,
    fontWeight: '600',
  },
  exploreButtonWrapper: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
  button: {
    backgroundColor: '#2D5F4F',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#52b788',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  signUpButtonWrapper: {
    position: 'absolute',
    bottom: 60,
    alignSelf: 'center',
  },
  signUpButton: {
    backgroundColor: '#2D5F4F',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#52b788',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
  loginButtonWrapper: {
    position: 'absolute',
    bottom: 130,
    alignSelf: 'center',
  },
  loginButton: {
    backgroundColor: '#2D5F4F',
    paddingHorizontal: 40,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#52b788',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 8,
  },
});