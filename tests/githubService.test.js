const axios = require('axios');
jest.mock('axios'); // [cite: 150]
const { GitHubService } = require('../src/githubService'); // [cite: 148]

describe('GitHubService', () => {
  let service;
  let mockAxiosInstance; // Déclaré avec let pour pouvoir être modifié dans beforeEach

  beforeEach(() => {
    jest.clearAllMocks(); // [cite: 85, 319, 328]
    
    // Initialisation du mock de l'instance axios
    mockAxiosInstance = { 
      get: jest.fn().mockResolvedValue({ data: [] }) 
    };
    
    // On force axios.create à retourner notre mock [cite: 152, 154]
    axios.create.mockReturnValue(mockAxiosInstance);
    
    // On instancie le service (qui appelle axios.create dans son constructor) [cite: 127, 128]
    service = new GitHubService('fake-token-123');
  });

  describe('getOrgRepos()', () => {
    const mockReposData = [
      { name: 'react', stargazers_count: 210000, language: 'JavaScript' },
      { name: 'react-native', stargazers_count: 110000, language: 'JavaScript' },
      { name: 'jest', stargazers_count: 43000, language: 'JavaScript' },
    ];

    test('retourne un tableau { name, stars, language } mappé correctement', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockReposData }); // [cite: 156, 162]
      const result = await service.getOrgRepos('facebook');
      expect(result).toEqual([
        { name: 'react', stars: 210000, language: 'JavaScript' },
        { name: 'react-native', stars: 110000, language: 'JavaScript' },
        { name: 'jest', stars: 43000, language: 'JavaScript' },
      ]); // [cite: 136, 162]
    });

    test('appelle /orgs/facebook/repos avec le bon endpoint', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockReposData });
      await service.getOrgRepos('facebook');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/orgs/facebook/repos'); // [cite: 135, 162]
      expect(axios.create).toHaveBeenCalledWith(expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'token fake-token-123' })
      })); // [cite: 130, 162]
    });
  });

  describe('getOrgStats()', () => {
    test('calcule correctement totalStars et déduplique les languages', async () => {
      const mockData = [
        { name: 'r1', stargazers_count: 10, language: 'JS' },
        { name: 'r2', stargazers_count: 5, language: 'JS' },
        { name: 'r3', stargazers_count: 1, language: 'HTML' }
      ];
      mockAxiosInstance.get.mockResolvedValue({ data: mockData });
      
      const result = await service.getOrgStats('facebook');
      expect(result).toEqual({
        repoCount: 3,
        totalStars: 16,
        languages: ['JS', 'HTML']
      }); // [cite: 141, 145, 162]
    });
  });

  // Suppression du afterAll car prisma n'est pas utilisé ici
});