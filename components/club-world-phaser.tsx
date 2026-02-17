"use client";

import { useEffect, useMemo, useRef } from "react";
import { normalizeSkinId } from "@/lib/skins";
import type { BotStatus } from "@/types/clawclub";

interface WorldBot {
  id: string;
  name: string;
  status: BotStatus;
  skin: string;
  x: number;
  y: number;
}

interface ClubWorldPhaserProps {
  bots: WorldBot[];
  selectedBotId: string;
  onSelectBot: (botId: string) => void;
}

interface BotRenderState {
  id: string;
  status: BotStatus;
  targetX: number;
  targetY: number;
  body: {
    setFillStyle: (color: number) => void;
    setStrokeStyle: (lineWidth: number, color: number) => void;
  };
  statusText: {
    setText: (value: string) => void;
  };
  nameText: {
    setText: (value: string) => void;
  };
  container: {
    x: number;
    y: number;
    setPosition: (x: number, y: number) => void;
    setSize: (width: number, height: number) => void;
    setInteractive: (shape: unknown, containsCallback: unknown) => void;
    on: (event: string, callback: () => void) => void;
    destroy: () => void;
  };
}

interface WorldController {
  syncBots: (bots: WorldBot[]) => void;
  focusBot: (botId: string) => void;
  resize: (width: number, height: number) => void;
  destroy: () => void;
}

function skinToColor(skin: string) {
  const normalized = normalizeSkinId(skin);

  switch (normalized) {
    case "solar":
      return 0xffa03f;
    case "mint":
      return 0x4ec7a6;
    case "graphite":
      return 0x7a8399;
    case "sunset":
      return 0xff7298;
    case "neon":
      return 0x4b6aff;
    default:
      return 0xff7f63;
  }
}

function statusToLabel(status: BotStatus) {
  if (status === "ACTIVE") {
    return "ACTIVE";
  }

  if (status === "PAUSED") {
    return "PAUSED";
  }

  return "OFFLINE";
}

function statusTint(status: BotStatus, color: number) {
  if (status === "ACTIVE") {
    return color;
  }

  if (status === "PAUSED") {
    return 0x95a0b4;
  }

  return 0x905e73;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function toWorldCoordinates(xPercent: number, yPercent: number, worldWidth: number, worldHeight: number) {
  const marginX = clamp(Math.round(worldWidth * 0.08), 52, 96);
  const marginY = clamp(Math.round(worldHeight * 0.12), 56, 100);

  const x = marginX + (xPercent / 100) * (worldWidth - marginX * 2);
  const y = marginY + (yPercent / 100) * (worldHeight - marginY * 2);

  return {
    x: clamp(x, marginX, worldWidth - marginX),
    y: clamp(y, marginY, worldHeight - marginY)
  };
}

function createWorldController(Phaser: any, mountNode: HTMLDivElement, onSelectBot: (botId: string) => void) {
  const actorMap = new Map<string, BotRenderState>();
  let selectedBotId = "";
  let latestBots: WorldBot[] = [];
  let sceneReady = false;
  let pendingBots: WorldBot[] | null = null;
  let pendingFocus: string | null = null;

  class ClubWorldScene extends Phaser.Scene {
    private environmentLayer?: any;

    constructor() {
      super("club-world-scene");
    }

    private configureBounds() {
      const width = this.scale.width;
      const height = this.scale.height;

      this.cameras.main.setBackgroundColor("#89d97d");
      this.cameras.main.setBounds(0, 0, width, height);
      this.cameras.main.setViewport(0, 0, width, height);
      this.cameras.main.centerOn(width / 2, height / 2);
      this.physics.world.setBounds(0, 0, width, height);
    }

    private drawEnvironment() {
      const width = this.scale.width;
      const height = this.scale.height;

      if (this.environmentLayer) {
        this.environmentLayer.destroy(true);
      }

      const layer = this.add.container(0, 0);

      const grassGrid = this.add.graphics();
      grassGrid.fillStyle(0x7ece6d, 1);
      grassGrid.fillRect(0, 0, width, height);
      grassGrid.lineStyle(1, 0x91df85, 0.28);

      for (let gx = 0; gx <= width; gx += 28) {
        grassGrid.lineBetween(gx, 0, gx, height);
      }
      for (let gy = 0; gy <= height; gy += 28) {
        grassGrid.lineBetween(0, gy, width, gy);
      }

      const path = this.add.graphics();
      const pathWidth = width + 180;
      const pathHeight = Math.max(52, height * 0.14);
      path.fillStyle(0xd8b487, 1);
      path.fillRoundedRect(-90, height * 0.47, pathWidth, pathHeight, 16);
      path.lineStyle(2, 0xa88158, 0.9);
      path.strokeRoundedRect(-90, height * 0.47, pathWidth, pathHeight, 16);
      path.setRotation(Phaser.Math.DegToRad(-9));

      const makeHouse = (x: number, y: number, scale = 1) => {
        const house = this.add.container(x, y);
        const body = this.add
          .rectangle(0, 30 * scale, 170 * scale, 125 * scale, 0xf6ddb5)
          .setStrokeStyle(3, 0x44577f);
        const roof = this.add
          .rectangle(0, -18 * scale, 190 * scale, 54 * scale, 0xdc775f)
          .setStrokeStyle(3, 0x8f4a3f);
        const door = this.add
          .rectangle(0, 65 * scale, 34 * scale, 56 * scale, 0x9a6e44)
          .setStrokeStyle(2, 0x704728);

        house.add([body, roof, door]);
        return house;
      };

      const houseA = makeHouse(width * 0.14, height * 0.22, 0.8);
      const houseB = makeHouse(width * 0.82, height * 0.28, 0.75);

      const pond = this.add
        .ellipse(width * 0.84, height * 0.78, width * 0.2, height * 0.17, 0x72c9ff)
        .setStrokeStyle(3, 0x3b79ad);
      pond.setAngle(-4);

      const fence = this.add.graphics();
      const fenceWidth = width * 0.24;
      const fenceHeight = height * 0.13;
      const fenceX = width * 0.06;
      const fenceY = height * 0.74;
      fence.fillStyle(0xdcba8e, 1);
      fence.fillRoundedRect(fenceX, fenceY, fenceWidth, fenceHeight, 8);
      fence.lineStyle(2, 0x87603c, 1);
      fence.strokeRoundedRect(fenceX, fenceY, fenceWidth, fenceHeight, 8);

      const postCount = 10;
      for (let i = 1; i < postCount; i += 1) {
        const x = fenceX + (fenceWidth / postCount) * i;
        fence.lineBetween(x, fenceY, x, fenceY + fenceHeight);
      }

      layer.add([grassGrid, path, houseA, houseB, pond, fence]);
      this.environmentLayer = layer;
    }

    create() {
      this.configureBounds();
      this.drawEnvironment();
      sceneReady = true;

      if (pendingBots) {
        this.upsertBots(pendingBots);
        pendingBots = null;
      }

      if (pendingFocus !== null) {
        this.focusSelected(pendingFocus);
        pendingFocus = null;
      }

      this.scale.on("resize", () => {
        this.configureBounds();
        this.drawEnvironment();
        this.upsertBots(latestBots);
      });
    }

    update(time: number) {
      const width = this.scale.width;
      const height = this.scale.height;
      const marginX = clamp(Math.round(width * 0.08), 52, 96);
      const marginY = clamp(Math.round(height * 0.12), 56, 100);

      for (const actor of actorMap.values()) {
        const lerp = actor.status === "ACTIVE" ? 0.22 : 0.16;
        const nextX = clamp(Phaser.Math.Linear(actor.container.x, actor.targetX, lerp), marginX, width - marginX);
        const nextY = clamp(Phaser.Math.Linear(actor.container.y, actor.targetY, lerp), marginY, height - marginY);

        if (actor.status === "ACTIVE") {
          const bob = Math.sin(time / 140 + actor.container.x / 180) * 0.75;
          actor.container.setPosition(nextX, clamp(nextY + bob, marginY, height - marginY));
        } else {
          actor.container.setPosition(nextX, nextY);
        }
      }
    }

    upsertBots(bots: WorldBot[]) {
      latestBots = bots;
      const width = this.scale.width;
      const height = this.scale.height;
      const nextIds = new Set(bots.map((bot) => bot.id));

      for (const [id, actor] of actorMap.entries()) {
        if (!nextIds.has(id)) {
          actor.container.destroy();
          actorMap.delete(id);
        }
      }

      for (const bot of bots) {
        const point = toWorldCoordinates(bot.x, bot.y, width, height);
        const fill = statusTint(bot.status, skinToColor(bot.skin));
        const label = statusToLabel(bot.status);
        const existing = actorMap.get(bot.id);

        if (!existing) {
          const body = this.add.rectangle(0, 0, 30, 30, fill).setStrokeStyle(2, 0x23365d);
          const leftEye = this.add.circle(-7, -2, 2.2, 0x132141);
          const rightEye = this.add.circle(7, -2, 2.2, 0x132141);
          const nameText = this.add
            .text(0, 22, bot.name, {
              fontFamily: "Trebuchet MS",
              fontSize: "11px",
              color: "#1f2e4d",
              fontStyle: "bold"
            })
            .setOrigin(0.5, 0);
          const statusText = this.add
            .text(0, 35, label, {
              fontFamily: "Trebuchet MS",
              fontSize: "9px",
              color: "#2f446c"
            })
            .setOrigin(0.5, 0);

          const container = this.add.container(point.x, point.y, [body, leftEye, rightEye, nameText, statusText]);
          container.setSize(52, 52);
          container.setInteractive(new Phaser.Geom.Rectangle(-26, -26, 52, 52), Phaser.Geom.Rectangle.Contains);
          container.on("pointerdown", () => onSelectBot(bot.id));

          actorMap.set(bot.id, {
            id: bot.id,
            status: bot.status,
            targetX: point.x,
            targetY: point.y,
            body,
            statusText,
            nameText,
            container
          });
        } else {
          existing.targetX = point.x;
          existing.targetY = point.y;
          existing.status = bot.status;
          existing.body.setFillStyle(fill);
          existing.statusText.setText(label);
          existing.nameText.setText(bot.name);
        }
      }

      this.focusSelected(selectedBotId);
    }

    focusSelected(botId: string) {
      selectedBotId = botId;

      for (const [id, actor] of actorMap.entries()) {
        if (id === botId) {
          actor.body.setStrokeStyle(3, 0xffffff);
        } else {
          actor.body.setStrokeStyle(2, 0x23365d);
        }
      }
    }
  }

  const scene = new ClubWorldScene();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: mountNode,
    width: mountNode.clientWidth || 900,
    height: mountNode.clientHeight || 420,
    backgroundColor: "#8ad87d",
    scene,
    physics: {
      default: "arcade"
    },
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: mountNode.clientWidth || 900,
      height: mountNode.clientHeight || 420
    },
    pixelArt: false,
    antialias: true
  });

  return {
    syncBots(nextBots: WorldBot[]) {
      if (sceneReady) {
        scene.upsertBots(nextBots);
      } else {
        pendingBots = nextBots;
      }
    },
    focusBot(botId: string) {
      if (sceneReady) {
        scene.focusSelected(botId);
      } else {
        pendingFocus = botId;
      }
    },
    resize(width: number, height: number) {
      game.scale.resize(width, height);
    },
    destroy() {
      actorMap.clear();
      game.destroy(true);
    }
  } as WorldController;
}

export default function ClubWorldPhaser({ bots, selectedBotId, onSelectBot }: ClubWorldPhaserProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<WorldController | null>(null);

  const normalizedBots = useMemo(() => {
    return bots.map((bot) => ({
      ...bot,
      skin: normalizeSkinId(bot.skin)
    }));
  }, [bots]);

  const latestBotsRef = useRef<WorldBot[]>(normalizedBots);
  const latestSelectedRef = useRef<string>(selectedBotId);

  useEffect(() => {
    latestBotsRef.current = normalizedBots;
    controllerRef.current?.syncBots(normalizedBots);
  }, [normalizedBots]);

  useEffect(() => {
    latestSelectedRef.current = selectedBotId;
    controllerRef.current?.focusBot(selectedBotId);
  }, [selectedBotId]);

  useEffect(() => {
    const mountNode = mountRef.current;

    if (!mountNode) {
      return;
    }

    let isCancelled = false;

    const boot = async () => {
      const PhaserModule = await import("phaser");
      const Phaser = (PhaserModule as any).default ?? PhaserModule;

      if (isCancelled || !mountRef.current) {
        return;
      }

      controllerRef.current = createWorldController(Phaser, mountRef.current, onSelectBot);
      controllerRef.current.syncBots(latestBotsRef.current);
      controllerRef.current.focusBot(latestSelectedRef.current);
    };

    void boot();

    return () => {
      isCancelled = true;
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, [onSelectBot]);

  useEffect(() => {
    const node = mountRef.current;

    if (!node) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      const width = Math.max(320, Math.floor(entry.contentRect.width));
      const height = Math.max(320, Math.floor(entry.contentRect.height));
      controllerRef.current?.resize(width, height);
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="phaser-world-shell">
      <div className="phaser-world-canvas" ref={mountRef} />
      <div className="phaser-bot-overlay">
        {normalizedBots.map((bot) => {
          const x = clamp(bot.x, 10, 90);
          const y = clamp(bot.y, 12, 88);
          const skin = normalizeSkinId(bot.skin);

          return (
            <button
              key={`overlay-${bot.id}`}
              type="button"
              className={`phaser-bot-marker phaser-bot-marker--${bot.status.toLowerCase()} phaser-bot-marker--${skin} ${
                selectedBotId === bot.id ? "is-selected" : ""
              }`}
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => onSelectBot(bot.id)}
            >
              <span className="phaser-bot-sprite" aria-hidden>
                <span className="phaser-bot-eye phaser-bot-eye--left" />
                <span className="phaser-bot-eye phaser-bot-eye--right" />
              </span>
              <span className="phaser-bot-name">{bot.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
