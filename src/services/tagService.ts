import * as fs from 'fs';
import * as path from 'path';

const MOCK_DATA_PATH = '/Users/LenMiller/code/banno/responsive-tiles/src/api/data';

function loadMockData(filename: string) {
  const filePath = path.join(MOCK_DATA_PATH, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

const userTagsStore: Map<string, string[]> = new Map();

export const tagService = {
  async getDefaultTags() {
    const mockData = loadMockData('tags.json');
    return mockData.defaultTags || [];
  },

  async getUserTags(userId: string) {
    const stored = userTagsStore.get(userId);
    if (stored) {
      return stored;
    }

    const mockData = loadMockData('tags.json');
    return mockData.userTags || [];
  },

  async updateUserTags(userId: string, tags: string[]) {
    userTagsStore.set(userId, tags);
    return tags;
  }
};
