// src/githubService.js
const axios = require('axios');

class GitHubService {
  constructor(token) {
    this.client = axios.create({
      baseURL: 'https://api.github.com',
      headers: { Authorization: `token ${token}` }
    });
  }

  async getOrgRepos(org) {
    const { data } = await this.client.get(`/orgs/${org}/repos`);
    return data.map(r => ({ name: r.name, stars: r.stargazers_count, language: r.language }));
  }

  async getTopContributors(owner, repo, limit = 5) {
    const { data } = await this.client.get(`/repos/${owner}/${repo}/contributors`);
    return data.slice(0, limit).map(c => ({ login: c.login, contributions: c.contributions }));
  }

  async getOrgStats(org) {
    const repos = await this.getOrgRepos(org);
    const totalStars = repos.reduce((sum, r) => sum + r.stars, 0);
    const languages = [...new Set(repos.map(r => r.language).filter(Boolean))];
    return { repoCount: repos.length, totalStars, languages };
  }
}

module.exports = { GitHubService };
