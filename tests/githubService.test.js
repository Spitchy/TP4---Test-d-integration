// tests/githubService.test.js
// Exercice 2 — Mock d'API GitHub — Scénario réaliste

jest.mock('axios');

const axios = require('axios');
const { GitHubService } = require('../src/githubService');

// axios.create retourne un objet avec .get, .post...
const mockAxiosInstance = { get: jest.fn() };
axios.create.mockReturnValue(mockAxiosInstance);

describe('GitHubService', () => {
  let service;

  beforeEach(() => {
    service = new GitHubService('fake-token-123');
    jest.clearAllMocks();
    // Réappliquer le mock après clearAllMocks car create est appelé dans le constructeur
    axios.create.mockReturnValue(mockAxiosInstance);
  });

  describe('getOrgRepos()', () => {
    const mockReposData = [
      { name: 'react', stargazers_count: 210000, language: 'JavaScript' },
      { name: 'react-native', stargazers_count: 110000, language: 'JavaScript' },
      { name: 'jest', stargazers_count: 43000, language: 'JavaScript' },
    ];

    // Test 8 — getOrgRepos('facebook') → retourne tableau { name, stars, language }
    test('retourne un tableau { name, stars, language } mappé correctement', async () => {
      // ARRANGE
      mockAxiosInstance.get.mockResolvedValue({ data: mockReposData });

      // ACT
      const result = await service.getOrgRepos('facebook');

      // ASSERT
      expect(result).toEqual([
        { name: 'react', stars: 210000, language: 'JavaScript' },
        { name: 'react-native', stars: 110000, language: 'JavaScript' },
        { name: 'jest', stars: 43000, language: 'JavaScript' },
      ]);
    });

    // Test 9 — getOrgRepos() appelle /orgs/facebook/repos avec le bon token Authorization
    test('appelle /orgs/facebook/repos avec le bon endpoint', async () => {
      // ARRANGE
      mockAxiosInstance.get.mockResolvedValue({ data: mockReposData });

      // ACT
      await service.getOrgRepos('facebook');

      // ASSERT
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/orgs/facebook/repos');
      // Vérifier que axios.create a été appelé avec le bon token
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.github.com',
        headers: { Authorization: 'token fake-token-123' }
      });
    });

    // Test 14 — getOrgRepos() avec erreur 403 → lève une erreur (rate limit GitHub)
    test('lève une erreur 403 pour rate limit GitHub', async () => {
      // ARRANGE
      mockAxiosInstance.get.mockRejectedValue({
        response: { status: 403, data: { message: 'API rate limit exceeded' } }
      });

      // ACT & ASSERT
      await expect(service.getOrgRepos('facebook'))
        .rejects
        .toBeDefined();
    });
  });

  describe('getTopContributors()', () => {
    const mockContributorsData = [
      { login: 'gaearon', contributions: 2500 },
      { login: 'acdlite', contributions: 1800 },
      { login: 'sebmarkbage', contributions: 1600 },
      { login: 'sophiebits', contributions: 1400 },
      { login: 'trueadm', contributions: 1200 },
    ];

    // Test 10 — getTopContributors('facebook', 'react', 3) → retourne les 3 premiers
    test('retourne les 3 premiers contributeurs avec limit=3', async () => {
      // ARRANGE
      mockAxiosInstance.get.mockResolvedValue({ data: mockContributorsData });

      // ACT
      const result = await service.getTopContributors('facebook', 'react', 3);

      // ASSERT
      expect(result).toHaveLength(3);
      expect(result).toEqual([
        { login: 'gaearon', contributions: 2500 },
        { login: 'acdlite', contributions: 1800 },
        { login: 'sebmarkbage', contributions: 1600 },
      ]);
    });

    // Test 11 — getTopContributors() avec limit=2 sur 5 contributeurs → retourne bien 2
    test('retourne bien 2 éléments avec limit=2 sur 5 contributeurs', async () => {
      // ARRANGE
      mockAxiosInstance.get.mockResolvedValue({ data: mockContributorsData });

      // ACT
      const result = await service.getTopContributors('facebook', 'react', 2);

      // ASSERT
      expect(result).toHaveLength(2);
      expect(result[0].login).toBe('gaearon');
      expect(result[1].login).toBe('acdlite');
    });
  });

  describe('getOrgStats()', () => {
    const mockReposData = [
      { name: 'react', stargazers_count: 210000, language: 'JavaScript' },
      { name: 'react-native', stargazers_count: 110000, language: 'JavaScript' },
      { name: 'flow', stargazers_count: 22000, language: 'OCaml' },
      { name: 'buck', stargazers_count: 8000, language: null }, // language null = filtré
    ];

    // Test 12 — getOrgStats('facebook') → calcule correctement totalStars et déduplique languages
    test('calcule correctement totalStars et déduplique les languages', async () => {
      // ARRANGE
      mockAxiosInstance.get.mockResolvedValue({ data: mockReposData });

      // ACT
      const result = await service.getOrgStats('facebook');

      // ASSERT
      expect(result).toEqual({
        repoCount: 4,
        totalStars: 210000 + 110000 + 22000 + 8000, // 350000
        languages: ['JavaScript', 'OCaml'], // null filtré, pas de doublon
      });
    });

    // Test 13 — getOrgStats() → appelle getOrgRepos() exactement une fois
    test('appelle getOrgRepos() exactement une fois', async () => {
      // ARRANGE
      mockAxiosInstance.get.mockResolvedValue({ data: mockReposData });
      const spy = jest.spyOn(service, 'getOrgRepos');

      // ACT
      await service.getOrgStats('facebook');

      // ASSERT
      expect(spy).toHaveBeenCalledTimes(1);
      expect(spy).toHaveBeenCalledWith('facebook');
    });
  });
});
