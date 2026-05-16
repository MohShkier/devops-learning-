import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notes, setNotes] = useState([]);
  const [draft, setDraft] = useState('');

  // Listen to auth state — fires on sign in, sign out, app reload.
  useEffect(() => onAuthStateChanged(auth, setUser), []);

  // Subscribe to this user's notes whenever they sign in.
  useEffect(() => {
    if (!user) {
      setNotes([]);
      return;
    }
    const notesRef = collection(db, 'users', user.uid, 'notes');
    const q = query(notesRef, orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snap) => {
      setNotes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [user]);

  const handleAuth = async (mode) => {
    setError('');
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          email: cred.user.email,
          createdAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAddNote = async () => {
    if (!draft.trim()) return;
    await addDoc(collection(db, 'users', user.uid, 'notes'), {
      text: draft.trim(),
      createdAt: serverTimestamp(),
    });
    setDraft('');
  };

  if (!user) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <Text style={styles.title}>Sign in</Text>
        <TextInput
          placeholder="email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          placeholder="password (6+ chars)"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={styles.row}>
          <Button title="Sign up" onPress={() => handleAuth('signup')} />
          <Button title="Sign in" onPress={() => handleAuth('signin')} />
        </View>
        <StatusBar style="auto" />
      </KeyboardAvoidingView>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.email}>{user.email}</Text>
        <Button title="Sign out" onPress={() => signOut(auth)} />
      </View>
      <View style={styles.row}>
        <TextInput
          placeholder="new note"
          value={draft}
          onChangeText={setDraft}
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
        />
        <Button title="Add" onPress={handleAddNote} />
      </View>
      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        renderItem={({ item }) => <Text style={styles.note}>{item.text}</Text>}
        ListEmptyComponent={<Text style={styles.empty}>No notes yet.</Text>}
      />
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60, backgroundColor: '#fff' },
  title: { fontSize: 24, marginBottom: 20 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  email: { flex: 1, color: '#666' },
  note: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  empty: { textAlign: 'center', color: '#999', marginTop: 20 },
  error: { color: 'red', marginBottom: 10 },
});
