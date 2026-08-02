import Phaser from 'phaser';

/**
 * Bind keyboard handlers that auto-unbind on scene shutdown,
 * and ignore events if the scene is no longer active.
 * Prevents stacked global listeners from freezing later scenes.
 */
export function bindSceneKeys(
  scene: Phaser.Scene,
  bindings: Record<string, () => void>,
): void {
  const kb = scene.input.keyboard;
  if (!kb) return;

  const bound: { event: string; handler: () => void }[] = [];
  for (const [event, fn] of Object.entries(bindings)) {
    const handler = (): void => {
      // Ignore keys for shut-down / sleeping scenes (stacked global listeners).
      if (!scene.sys.isActive()) return;
      try {
        fn();
      } catch {
        /* never let a key handler kill the game loop */
      }
    };
    kb.on(event, handler);
    bound.push({ event, handler });
  }

  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    for (const { event, handler } of bound) {
      kb.off(event, handler);
    }
  });
}
