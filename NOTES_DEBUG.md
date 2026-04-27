# NOTES_DEBUG.md — Exercice 5 : Analyse des tests défaillants

## Bug 1 — Assertion incorrecte sur les flottants

### Cause
En JavaScript (standard IEEE 754), `0.1 + 0.2` ne vaut pas exactement `0.3`
mais `0.30000000000000004` à cause de la représentation binaire des nombres décimaux.
`toBe()` utilise `Object.is()` (égalité stricte), donc l'assertion échoue.

### Correction appliquée
```js
// ❌ Avant
expect(result).toBe(0.3);

// ✅ Après
expect(result).toBeCloseTo(0.3);
```

### Principe général à retenir
> Ne jamais comparer des flottants avec `toBe()`. Utiliser toujours `toBeCloseTo(valeur, précision)` pour les calculs sur les nombres décimaux.

---

## Bug 2 — Mock non réinitialisé entre les tests

### Cause
Le `jest.fn()` est créé une seule fois à l'extérieur des tests et partagé.
Après le 1er test, le mock a compté 1 appel. Au 2ème test, ce compteur n'a pas
été réinitialisé, donc après le 2ème `register()`, il vaut 2 — alors qu'on
attend 1. Le test échoue avec `Expected: 1, Received: 2`.

### Correction appliquée
```js
// ✅ Réinitialiser le mock avant chaque test
beforeEach(() => {
  emailSvc.send.mockClear();
});
```

### Principe général à retenir
> Toujours réinitialiser les mocks entre les tests dans un `beforeEach`, via `mockClear()`, `mockReset()` ou `jest.clearAllMocks()`. Un mock partagé non réinitialisé crée des dépendances entre les tests.

---

## Bug 3 — Test asynchrone mal géré

### Cause
Le test n'est pas `async` et ne retourne pas la promesse.
Jest considère le test terminé dès la fin de la fonction synchrone, avant que
la promesse soit résolue. Le `.catch()` n'est jamais exécuté, les `expect()` à
l'intérieur ne sont jamais évalués. Le test "passe" donc toujours, y compris
quand il devrait échouer — c'est un **faux positif**.

### Correction appliquée
```js
// ❌ Avant — test non async, promesse non attendue
test('lève une erreur pour ville inconnue', () => {
  weatherService.getCurrentWeather('INVALID').catch(err => {
    expect(err.message).toContain('introuvable');
  });
});

// ✅ Après — async/await + expect().rejects
test('lève une erreur pour ville inconnue', async () => {
  await expect(weatherService.getCurrentWeather('INVALID'))
    .rejects
    .toThrow('introuvable');
});
```

### Principe général à retenir
> Tout test de code asynchrone **doit** utiliser `async/await` ou retourner la promesse. Sinon Jest ne détecte pas les échecs et produit de faux positifs. Préférer `expect().rejects.toThrow()` pour tester les rejets de promesses.

---

## Bug 4 — Ordre d'exécution des tests (état partagé mutable)

### Cause
La variable `counter` est déclarée à l'extérieur des tests et mutée par le test
"incrémente le compteur". Si Jest réordonne les tests (`--randomize`) ou si un
futur test modifie `counter`, le test "compteur est toujours 0" peut trouver
`counter = 1` et échouer. L'état partagé crée une dépendance sur l'ordre
d'exécution, rendant les tests fragiles et non-déterministes.

### Correction appliquée
```js
// ✅ Réinitialiser counter dans beforeEach
let counter;
beforeEach(() => {
  counter = 0; // Chaque test repart d'un état propre
});
```

### Principe général à retenir
> Les tests ne doivent **jamais** partager d'état mutable. Utiliser `beforeEach` pour réinitialiser l'état avant chaque test, ou utiliser des variables locales à chaque test. Un bon test est **indépendant** de l'ordre d'exécution.

---

## Bug 5 — Mock trop précis (test fragile sur les internals)

### Cause
Le test espionne une méthode **privée interne** (`_buildQuery`) et vérifie son
implémentation exacte (structure de la query, noms des champs, sélection).
Dès qu'on refactore l'implémentation (renommer `_buildQuery`, changer la structure
de la requête Prisma, ajouter un champ), le test casse — même si le comportement
observable final reste identique. C'est un test sur l'**implémentation**, pas sur
le **comportement**.

### Correction appliquée
```js
// ❌ Avant — test sur l'implémentation interne
const spy = jest.spyOn(userRepo, '_buildQuery');
userRepo.findByEmail('alice@ex.com');
expect(spy).toHaveBeenCalledWith({ where: { email: 'alice@ex.com' }, select: {...} });

// ✅ Après — test sur le comportement observable
const result = await userRepo.findByEmail('alice@ex.com');
expect(result.email).toBe('alice@ex.com');
expect(result.name).toBe('Alice');
```

### Principe général à retenir
> Tester le **comportement** (boîte noire), pas l'**implémentation** (boîte blanche). Un bon test doit survivre au refactoring. Ne jamais espionner des méthodes privées/internes. Si un test casse à chaque refactoring sans que le comportement change, c'est un signal qu'il teste trop finement.

---

## Bug 6 — Handles ouverts (connexion Prisma non fermée)

### Cause
La connexion Prisma est ouverte dans `beforeAll()` via `$connect()` mais n'est
jamais fermée. À la fin des tests, la connexion reste active et Jest détecte un
"open handle" (ressource non libérée). Jest peut rester bloqué en attendant
que la connexion se ferme, ou afficher des warnings avec `--detectOpenHandles`.

### Correction appliquée
```js
// ✅ Ajouter un afterAll() pour fermer la connexion
afterAll(async () => {
  await prisma.$disconnect(); // ← c'était manquant !
});
```

### Principe général à retenir
> Toujours fermer les ressources ouvertes (connexions DB, serveurs HTTP, timers, streams) dans `afterAll()` ou `afterEach()`. Utiliser `npx jest --detectOpenHandles` pour identifier les ressources non fermées. Une règle simple : toute ressource ouverte dans un `beforeAll` doit avoir son pendant de fermeture dans un `afterAll`.

---

## Commandes de débogage utiles

| Commande | Utilité |
|----------|---------|
| `npx jest --verbose` | Affiche le détail de chaque test |
| `npx jest --detectOpenHandles` | Détecte les ressources non fermées |
| `npx jest --testNamePattern='nom'` | Lance un seul test |
| `npx jest --coverage` | Rapport de couverture de code |
| `npx jest --runInBand` | Exécution séquentielle (debug race conditions) |
| `npx jest --randomize` | Ordre aléatoire (détecte les dépendances entre tests) |
