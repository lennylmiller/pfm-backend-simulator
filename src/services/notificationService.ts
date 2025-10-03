import * as fs from 'fs';
import * as path from 'path';

const MOCK_DATA_PATH = '/Users/LenMiller/code/banno/responsive-tiles/src/api/data';

function loadMockData(filename: string) {
  const filePath = path.join(MOCK_DATA_PATH, filename);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

const deletedNotifications: Set<string> = new Set();

export const notificationService = {
  async getNotifications(userId: string) {
    const mockData = loadMockData('notifications.json');

    return mockData.notifications.filter((n: any) => !deletedNotifications.has(n.id.toString()));
  },

  async deleteNotification(userId: string, notificationId: string) {
    deletedNotifications.add(notificationId);
    return;
  }
};
