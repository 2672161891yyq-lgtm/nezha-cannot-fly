export type RuntimePlatform = 'editor-or-browser' | 'wechat-mini-game';

type WeChatGlobal = typeof globalThis & {
  wx?: object;
};

export class PlatformAdapter {
  public static detect(): RuntimePlatform {
    const runtime = globalThis as WeChatGlobal;
    return runtime.wx ? 'wechat-mini-game' : 'editor-or-browser';
  }
}

