import envPaths from 'env-paths';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as url from 'url';
import * as crypto from 'crypto';

const defaultCacheRoot = envPaths('reforged', {
  suffix: '',
}).cache;

export class Cache {
  public static getCacheDirectory(downloadUrl: string): string {
    const parsedDownloadUrl = url.parse(downloadUrl);
    const { search, hash, pathname, ...rest } = parsedDownloadUrl;
    const strippedUrl = url.format({ ...rest, pathname: path.dirname(pathname ?? 'reforged') });

    return crypto
      .createHash('sha256')
      .update(strippedUrl)
      .digest('hex');
  }

  public getCachePath(downloadUrl: string, fileName: string): string {
    return path.resolve(defaultCacheRoot, Cache.getCacheDirectory(downloadUrl), fileName);
  }

  public async getPathForFileInCache(url: string, fileName: string): Promise<string | null> {
    const cachePath = this.getCachePath(url, fileName);
    if (await fs.pathExists(cachePath)) {
      return cachePath;
    }

    return null;
  }

  public async putFileInCache(url: string, fileName: string, fileBuffer: ArrayBuffer): Promise<string> {
    const cachePath = this.getCachePath(url, fileName);
    if (await fs.pathExists(cachePath)) {
      await fs.remove(cachePath);
    }

    await fs.ensureDir(path.dirname(cachePath));
    await fs.writeFile(cachePath, Buffer.from(fileBuffer));

    return cachePath;
  }
}