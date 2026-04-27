// tests/debugBugs.test.js
// Exercice 5 — Débogage de tests défaillants
// Pour chaque bug : cause, correction, principe général

// ─────────────────────────────────────────────────────────────────────────────
// BUG 1 — Assertion incorrecte sur les flottants
// ─────────────────────────────────────────────────────────────────────────────
// CAUSE : En JavaScript (IEEE 754), 0.1 + 0.2 donne 0.30000000000000004 et non
//         exactement 0.3. toBe() utilise Object.is() (égalité stricte) et échoue.
// CORRECTION : Utiliser toBeCloseTo() qui tolère une imprécision flottante.
// PRINCIPE : Ne jamais comparer des flottants avec toBe(). Toujours utiliser
//            toBeCloseTo(valeur, précision) pour les calculs sur les décimaux.

describe('Bug 1 — Assertion incorrecte sur les flottants', () => {
  test('additionne deux nombres flottants', () => {
    const result = 0.1 + 0.2;
    // ❌ AVANT : expect(result).toBe(0.3);  // Échoue : 0.30000000000000004 !== 0.3
    // ✅ APRÈS :
    expect(result).toBeCloseTo(0.3); // Tolérance de précision flottante
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG 2 — Mock non réinitialisé entre les tests
// ─────────────────────────────────────────────────────────────────────────────
// CAUSE : Le jest.fn() est créé une seule fois et partagé entre les deux tests.
//         Après le 1er test, emailSvc.send a été appelé 1 fois. Au 2ème test,
//         le compteur d'appels est toujours à 1, et après register() il passe à 2.
//         expect(toHaveBeenCalledTimes(1)) échoue car le mock retourne 2.
// CORRECTION : Appeler emailSvc.send.mockClear() (ou jest.clearAllMocks()) dans
//              un beforeEach pour remettre le compteur à zéro avant chaque test.
// PRINCIPE : Toujours réinitialiser les mocks entre les tests avec beforeEach
//            pour garantir l'isolation. Utiliser jest.clearAllMocks() globalement
//            ou mockClear() sur chaque mock individuel.

describe('Bug 2 — Mock non réinitialisé', () => {
  // Simulation d'un service simple
  const service = {
    register: (user, emailSvc) => {
      emailSvc.send(`Bienvenue ${user.name}`);
    }
  };

  const emailSvc = { send: jest.fn() };

  // ✅ CORRECTION : réinitialiser le mock avant chaque test
  beforeEach(() => {
    emailSvc.send.mockClear();
  });

  test("envoie 1 email à l'inscription d'Alice", () => {
    service.register({ name: 'Alice', email: 'a@ex.com' }, emailSvc);
    expect(emailSvc.send).toHaveBeenCalledTimes(1);
  });

  test("envoie 1 email à la 2ème inscription (Bob)", () => {
    service.register({ name: 'Bob', email: 'b@ex.com' }, emailSvc);
    // ✅ Grâce à mockClear(), le compteur repart à 0
    expect(emailSvc.send).toHaveBeenCalledTimes(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG 3 — Test asynchrone mal géré
// ─────────────────────────────────────────────────────────────────────────────
// CAUSE : Le test n'est pas async et ne retourne pas la promesse. Jest considère
//         le test comme terminé dès la fin de la fonction synchrone, avant même
//         que la promesse se résolve. Le .catch() n'est jamais attendu, donc les
//         expect() à l'intérieur ne sont jamais exécutés. Le test "passe" toujours.
// CORRECTION : Déclarer le test async et utiliser await + expect().rejects
//              pour attendre et tester le rejet de la promesse.
// PRINCIPE : Tout test testant du code asynchrone DOIT soit utiliser async/await,
//            soit retourner la promesse. Sinon Jest termine le test sans attendre.

describe('Bug 3 — Test asynchrone mal géré', () => {
  // Mock minimal du weatherService pour le test
  const weatherService = {
    getCurrentWeather: async (city) => {
      if (city === 'INVALID') throw new Error('Ville introuvable');
      return { city };
    }
  };

  // ❌ AVANT : test non async → passe toujours, n'attend pas la promesse
  // test('lève une erreur pour ville inconnue', () => {
  //   weatherService.getCurrentWeather('INVALID').catch(err => {
  //     expect(err.message).toContain('introuvable');
  //   });
  // });

  // ✅ APRÈS : utiliser async/await + expect().rejects
  test('lève une erreur pour ville inconnue', async () => {
    await expect(weatherService.getCurrentWeather('INVALID'))
      .rejects
      .toThrow('introuvable');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG 4 — Ordre d'exécution des tests (état partagé mutable)
// ─────────────────────────────────────────────────────────────────────────────
// CAUSE : La variable `counter` est déclarée à l'extérieur des tests et mutée
//         par "incrémente le compteur". Si Jest réordonne les tests (--randomize)
//         ou si un futur test modifie counter, "compteur est toujours 0" peut
//         trouver counter=1 et échouer. L'état partagé entre tests crée une
//         dépendance sur l'ordre d'exécution.
// CORRECTION : Réinitialiser counter dans un beforeEach, ou utiliser des
//              variables locales à chaque test. Chaque test doit être indépendant.
// PRINCIPE : Les tests ne doivent JAMAIS partager d'état mutable. Utiliser
//            beforeEach pour réinitialiser l'état, ou des variables locales.

describe('Bug 4 — Ordre d\'exécution des tests', () => {
  // ✅ CORRECTION : réinitialiser counter avant chaque test
  let counter;

  beforeEach(() => {
    counter = 0; // Réinitialisation garantie → isolation totale
  });

  test('compteur démarre à 0', () => {
    expect(counter).toBe(0);
  });

  test('incrémente le compteur', () => {
    counter++;
    expect(counter).toBe(1);
  });

  test('compteur revient à 0 après reset', () => {
    counter = 0;
    expect(counter).toBe(0);
  });

  test('compteur est toujours 0 (isolation garantie par beforeEach)', () => {
    // ✅ Grâce au beforeEach, counter est toujours 0 ici, peu importe l'ordre
    expect(counter).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG 5 — Mock trop précis (test fragile sur les internals)
// ─────────────────────────────────────────────────────────────────────────────
// CAUSE : Le test espionne une méthode privée interne (_buildQuery) et vérifie
//         son implémentation exacte. Dès qu'on refactore (ex: renommer le champ,
//         changer la structure de la query, ajouter un champ), le test casse
//         même si le comportement observable reste correct.
//         C'est un test sur l'implémentation, pas sur le comportement.
// CORRECTION : Tester le résultat visible (comportement) plutôt que les détails
//              internes. Vérifier ce que findByEmail() retourne, pas comment elle
//              construit sa requête en interne.
// PRINCIPE : Tester le COMPORTEMENT (black box), pas l'IMPLÉMENTATION (white box).
//            Les méthodes privées/internes ne doivent pas être testées directement.
//            Un bon test résiste au refactoring.

describe('Bug 5 — Mock trop précis (test fragile)', () => {
  // Simulation d'un userRepo avec une méthode publique findByEmail
  const db = {
    users: [{ id: 1, name: 'Alice', email: 'alice@ex.com' }]
  };

  const userRepo = {
    // Méthode interne (ne pas espionner)
    _buildQuery: (email) => ({ where: { email }, select: { id: true, name: true, email: true } }),

    findByEmail: async (email) => {
      return db.users.find(u => u.email === email) || null;
    }
  };

  // ❌ AVANT : test fragile — espionne l'implémentation interne
  // test('appelle la BDD avec les bons paramètres internes', () => {
  //   const spy = jest.spyOn(userRepo, '_buildQuery');
  //   userRepo.findByEmail('alice@ex.com');
  //   expect(spy).toHaveBeenCalledWith(
  //     { where: { email: 'alice@ex.com' }, select: { id:true, name:true, email:true } }
  //   );
  // });

  // ✅ APRÈS : tester le comportement observable (ce que retourne findByEmail)
  test('findByEmail retourne le bon utilisateur pour un email valide', async () => {
    const result = await userRepo.findByEmail('alice@ex.com');
    expect(result).toBeDefined();
    expect(result.email).toBe('alice@ex.com');
    expect(result.name).toBe('Alice');
  });

  test('findByEmail retourne null pour un email inexistant', async () => {
    const result = await userRepo.findByEmail('inconnu@ex.com');
    expect(result).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// BUG 6 — Handles ouverts (connexion Prisma non fermée)
// ─────────────────────────────────────────────────────────────────────────────
// CAUSE : La connexion Prisma est ouverte dans beforeAll() mais jamais fermée.
//         Jest détecte que la connexion reste active après la fin des tests
//         et affiche "open handles". Cela peut aussi empêcher Jest de terminer.
// CORRECTION : Ajouter un afterAll() qui appelle prisma.$disconnect() pour
//              fermer proprement la connexion à la base de données.
// PRINCIPE : Toujours fermer les ressources ouvertes (DB, serveurs, timers)
//            dans afterAll() ou afterEach(). Jest --detectOpenHandles aide à
//            identifier les ressources non fermées.

// ─────────────────────────────────────────────────────────────────────────────
// BUG 6 — Handles ouverts (connexion Prisma non fermée)
// ─────────────────────────────────────────────────────────────────────────────

// ✅ On importe l'instance qui marche déjà dans les autres tests
const { prisma: prismaShared, resetDb } = require('./helpers/testDb');

describe('Bug 6 — Handles ouverts', () => {
  
  beforeEach(async () => {
    // On s'assure que la base est propre et les tables créées
    await resetDb();
  });

  test('crée un utilisateur', async () => {
    // On utilise l'instance partagée pour vérifier que tout fonctionne
    const user = await prismaShared.user.create({ 
      data: { name: 'Alice Bug6', email: `bug6_${Date.now()}@example.com` } 
    });
    expect(user.id).toBeDefined();
    expect(user.name).toBe('Alice Bug6');
  });

  // ✅ LA CORRECTION DU BUG : 
  // Le principe est de toujours fermer la connexion à la fin des tests
  // pour éviter les "open handles" (fuites de ressources).
  afterAll(async () => {
    await prismaShared.$disconnect(); 
  });
});