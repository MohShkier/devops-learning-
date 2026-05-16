const {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} = require('@firebase/rules-unit-testing');
const {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  addDoc,
  collection,
} = require('firebase/firestore');
const fs = require('fs');

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-rules-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

const seed = async (path, data) =>
  testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), path), data);
  });

describe('Profile rules', () => {
  test('owner can read own profile', async () => {
    await seed('users/alice', { email: 'alice@x.com', createdAt: new Date() });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(getDoc(doc(db, 'users/alice')));
  });

  test('user cannot read another user profile', async () => {
    await seed('users/bob', { email: 'bob@x.com', createdAt: new Date() });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(getDoc(doc(db, 'users/bob')));
  });

  test('profile with extra field is rejected on create', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      setDoc(doc(db, 'users/alice'), {
        email: 'alice@x.com',
        createdAt: new Date(),
        isAdmin: true,
      })
    );
  });

  test('profile cannot be deleted (allow delete: if false)', async () => {
    await seed('users/alice', { email: 'alice@x.com', createdAt: new Date() });
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(deleteDoc(doc(db, 'users/alice')));
  });
});

describe('Notes rules', () => {
  test('owner can create valid note', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertSucceeds(
      addDoc(collection(db, 'users/alice/notes'), {
        text: 'hello',
        createdAt: new Date(),
      })
    );
  });

  test('note text > 500 chars is rejected', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      addDoc(collection(db, 'users/alice/notes'), {
        text: 'a'.repeat(501),
        createdAt: new Date(),
      })
    );
  });

  test('note with extra field is rejected', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      addDoc(collection(db, 'users/alice/notes'), {
        text: 'hi',
        createdAt: new Date(),
        flagged: true,
      })
    );
  });

  test('user cannot create note in another user subcollection', async () => {
    const db = testEnv.authenticatedContext('alice').firestore();
    await assertFails(
      addDoc(collection(db, 'users/bob/notes'), {
        text: 'sneaky',
        createdAt: new Date(),
      })
    );
  });
});
