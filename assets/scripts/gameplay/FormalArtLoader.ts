import { resources, SpriteFrame } from 'cc';
import {
  FORMAL_ART_ASSET_KEYS,
  FORMAL_ART_RESOURCE_PATHS,
  FormalArtAssetKey,
} from './FormalArtConfig';

export type FormalArtAssets = Readonly<Record<FormalArtAssetKey, SpriteFrame>>;

const loadSpriteFrame = (path: string): Promise<SpriteFrame> =>
  new Promise((resolve, reject) => {
    resources.load(path, SpriteFrame, (error, spriteFrame) => {
      if (error || !spriteFrame) {
        reject(error ?? new Error(`Missing sprite frame: ${path}`));
        return;
      }
      resolve(spriteFrame);
    });
  });

export const loadFormalArtAssets = async (): Promise<FormalArtAssets> => {
  const entries = await Promise.all(
    FORMAL_ART_ASSET_KEYS.map(async (key) => {
      const spriteFrame = await loadSpriteFrame(FORMAL_ART_RESOURCE_PATHS[key]);
      return [key, spriteFrame] as const;
    }),
  );

  return Object.freeze(
    entries.reduce<Record<FormalArtAssetKey, SpriteFrame>>(
      (result, [key, spriteFrame]) => {
        result[key] = spriteFrame;
        return result;
      },
      {} as Record<FormalArtAssetKey, SpriteFrame>,
    ),
  );
};
