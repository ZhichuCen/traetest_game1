import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

type Vec2 = {
  x: number;
  y: number;
};

type Bullet = {
  id: number;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  damage: number;
  color: string;
  owner: "player" | "enemy" | "drone";
  life: number;
};

type Pulse = {
  id: number;
  position: Vec2;
  radius: number;
  maxRadius: number;
  alpha: number;
};

type Pickup = {
  id: number;
  position: Vec2;
  type: "repair" | "overdrive";
  radius: number;
  ttl: number;
};

type Drone = {
  id: number;
  position: Vec2;
  velocity: Vec2;
  health: number;
  maxHealth: number;
  radius: number;
  shootCooldown: number;
  bob: number;
};

type Unit = {
  position: Vec2;
  velocity: Vec2;
  health: number;
  maxHealth: number;
  radius: number;
  heat: number;
  overdrive: number;
  dashCooldown: number;
  pulseCooldown: number;
  shootCooldown: number;
  invulnerable: number;
  facing: number;
};

type Core = {
  position: Vec2;
  health: number;
  maxHealth: number;
  radius: number;
};

type Particle = {
  id: number;
  position: Vec2;
  velocity: Vec2;
  size: number;
  life: number;
  color: string;
};

type CombatLog = {
  text: string;
  ttl: number;
};

type GameStats = {
  score: number;
  wave: number;
  timeSurvived: number;
  enemyAceHealth: number;
  enemyCoreHealth: number;
  playerCoreHealth: number;
  dronesDestroyed: number;
  result: "victory" | "defeat";
};

type GameSnapshot = {
  player: Unit;
  enemy: Unit;
  playerCore: Core;
  enemyCore: Core;
  drones: Drone[];
  bullets: Bullet[];
  pulses: Pulse[];
  pickups: Pickup[];
  particles: Particle[];
  logs: CombatLog[];
  score: number;
  wave: number;
  elapsed: number;
  enemyAggression: number;
  spawnTimer: number;
  pickupTimer: number;
  enemyDecisionTimer: number;
  enemyGoal: Vec2;
  phaseTimer: number;
  bulletId: number;
  entityId: number;
  paused: boolean;
  result?: GameStats;
};

const WORLD = { width: 1280, height: 720 };
const PLAYER_CORE_POS = { x: 150, y: WORLD.height / 2 };
const ENEMY_CORE_POS = { x: WORLD.width - 150, y: WORLD.height / 2 };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y);

const normalize = (vector: Vec2) => {
  const length = Math.hypot(vector.x, vector.y) || 1;
  return { x: vector.x / length, y: vector.y / length };
};

const createUnit = (position: Vec2): Unit => ({
  position: { ...position },
  velocity: { x: 0, y: 0 },
  health: 100,
  maxHealth: 100,
  radius: 24,
  heat: 0,
  overdrive: 20,
  dashCooldown: 0,
  pulseCooldown: 0,
  shootCooldown: 0,
  invulnerable: 0,
  facing: 1,
});

const createSnapshot = (): GameSnapshot => ({
  player: createUnit({ x: 270, y: WORLD.height / 2 }),
  enemy: createUnit({ x: WORLD.width - 270, y: WORLD.height / 2 }),
  playerCore: {
    position: { ...PLAYER_CORE_POS },
    health: 240,
    maxHealth: 240,
    radius: 60,
  },
  enemyCore: {
    position: { ...ENEMY_CORE_POS },
    health: 260,
    maxHealth: 260,
    radius: 60,
  },
  drones: [],
  bullets: [],
  pulses: [],
  pickups: [],
  particles: [],
  logs: [{ text: "Engage the rival ace and crack the enemy core.", ttl: 4 }],
  score: 0,
  wave: 1,
  elapsed: 0,
  enemyAggression: 0.6,
  spawnTimer: 4,
  pickupTimer: 9,
  enemyDecisionTimer: 0,
  enemyGoal: { x: WORLD.width - 340, y: WORLD.height / 2 },
  phaseTimer: 0,
  bulletId: 0,
  entityId: 0,
  paused: false,
});

const formatTime = (seconds: number) => {
  const total = Math.floor(seconds);
  const mins = String(Math.floor(total / 60)).padStart(2, "0");
  const secs = String(total % 60).padStart(2, "0");
  return `${mins}:${secs}`;
};

const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const snapshotRef = useRef<GameSnapshot>(createSnapshot());
  const keysRef = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const endedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      const viewportWidth = parent?.clientWidth ?? window.innerWidth;
      const viewportHeight = parent?.clientHeight ?? window.innerHeight;
      const scale = Math.min(viewportWidth / WORLD.width, viewportHeight / WORLD.height);

      canvas.width = WORLD.width * window.devicePixelRatio;
      canvas.height = WORLD.height * window.devicePixelRatio;
      canvas.style.width = `${WORLD.width * scale}px`;
      canvas.style.height = `${WORLD.height * scale}px`;

      context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      keysRef.current.add(key);

      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(key)) {
        event.preventDefault();
      }

      if (key === "p") {
        snapshotRef.current.paused = !snapshotRef.current.paused;
        pushLog(
          snapshotRef.current,
          snapshotRef.current.paused ? "Combat paused." : "Combat resumed.",
        );
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      keysRef.current.delete(event.key.toLowerCase());
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    const frame = (timestamp: number) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp;
      }

      const delta = clamp((timestamp - lastTimeRef.current) / 1000, 0, 0.05);
      lastTimeRef.current = timestamp;

      if (!snapshotRef.current.paused && !endedRef.current) {
        updateGame(snapshotRef.current, delta, keysRef.current);
      }

      drawGame(context, snapshotRef.current);
      animationFrameRef.current = requestAnimationFrame(frame);
    };

    animationFrameRef.current = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
    // This loop intentionally captures the current game engine closures once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const pushLog = (snapshot: GameSnapshot, text: string) => {
    snapshot.logs.unshift({ text, ttl: 4.2 });
    snapshot.logs = snapshot.logs.slice(0, 4);
  };

  const spawnParticles = (
    snapshot: GameSnapshot,
    position: Vec2,
    amount: number,
    color: string,
    force = 180,
  ) => {
    for (let index = 0; index < amount; index += 1) {
      const angle = (Math.PI * 2 * index) / amount + Math.random() * 0.5;
      const speed = force * (0.4 + Math.random() * 0.8);
      snapshot.particles.push({
        id: snapshot.entityId++,
        position: { ...position },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed,
        },
        size: 2 + Math.random() * 5,
        life: 0.25 + Math.random() * 0.4,
        color,
      });
    }
  };

  const spawnBullet = (
    snapshot: GameSnapshot,
    origin: Vec2,
    target: Vec2,
    owner: Bullet["owner"],
    speed: number,
    damage: number,
    color: string,
    radius: number,
  ) => {
    const direction = normalize({ x: target.x - origin.x, y: target.y - origin.y });
    snapshot.bullets.push({
      id: snapshot.bulletId++,
      position: { ...origin },
      velocity: { x: direction.x * speed, y: direction.y * speed },
      radius,
      damage,
      color,
      owner,
      life: 3,
    });
  };

  const endRun = (snapshot: GameSnapshot, result: GameStats["result"]) => {
    if (endedRef.current) return;
    endedRef.current = true;
    snapshot.result = {
      score: snapshot.score,
      wave: snapshot.wave,
      timeSurvived: snapshot.elapsed,
      enemyAceHealth: Math.round(snapshot.enemy.health),
      enemyCoreHealth: Math.round(snapshot.enemyCore.health),
      playerCoreHealth: Math.round(snapshot.playerCore.health),
      dronesDestroyed: snapshot.score / 120,
      result,
    };

    window.setTimeout(() => {
      navigate("/gameover", { state: snapshot.result });
    }, 450);
  };

  const updateGame = (snapshot: GameSnapshot, delta: number, keys: Set<string>) => {
    snapshot.elapsed += delta;
    snapshot.phaseTimer += delta;
    snapshot.spawnTimer -= delta;
    snapshot.pickupTimer -= delta;
    snapshot.enemyDecisionTimer -= delta;

    const player = snapshot.player;
    const enemy = snapshot.enemy;

    player.dashCooldown = Math.max(0, player.dashCooldown - delta);
    player.pulseCooldown = Math.max(0, player.pulseCooldown - delta);
    player.shootCooldown = Math.max(0, player.shootCooldown - delta);
    player.invulnerable = Math.max(0, player.invulnerable - delta);
    player.heat = Math.max(0, player.heat - delta * 14);
    player.overdrive = clamp(player.overdrive + delta * 5, 0, 100);

    enemy.dashCooldown = Math.max(0, enemy.dashCooldown - delta);
    enemy.pulseCooldown = Math.max(0, enemy.pulseCooldown - delta);
    enemy.shootCooldown = Math.max(0, enemy.shootCooldown - delta);
    enemy.invulnerable = Math.max(0, enemy.invulnerable - delta);
    enemy.heat = Math.max(0, enemy.heat - delta * 12);
    enemy.overdrive = clamp(enemy.overdrive + delta * (3 + snapshot.wave * 0.1), 0, 100);

    handlePlayer(snapshot, keys, delta);
    handleEnemy(snapshot, delta);
    handleDrones(snapshot, delta);
    updateBullets(snapshot, delta);
    updatePulses(snapshot, delta);
    updatePickups(snapshot, delta);
    updateParticles(snapshot, delta);
    updateLogs(snapshot, delta);
    updateWave(snapshot);
    resolveBodies(snapshot);
    checkEndConditions(snapshot);
  };

  const handlePlayer = (snapshot: GameSnapshot, keys: Set<string>, delta: number) => {
    const player = snapshot.player;
    const movement = {
      x: (keys.has("d") ? 1 : 0) - (keys.has("a") ? 1 : 0),
      y: (keys.has("s") ? 1 : 0) - (keys.has("w") ? 1 : 0),
    };
    const direction = normalize(movement);
    const isMoving = movement.x !== 0 || movement.y !== 0;
    const boost = keys.has("shift") ? 1.18 : 1;
    const speed = 290 * boost;

    player.velocity.x = direction.x * speed;
    player.velocity.y = direction.y * speed;

    player.position.x = clamp(player.position.x + player.velocity.x * delta, 80, WORLD.width - 80);
    player.position.y = clamp(player.position.y + player.velocity.y * delta, 80, WORLD.height - 80);

    if (isMoving && Math.abs(direction.x) > 0.2) {
      player.facing = Math.sign(direction.x);
    }

    if ((keys.has("j") || keys.has(" ")) && player.shootCooldown <= 0 && player.heat < 88) {
      const aim = {
        x: snapshot.enemy.position.x + (snapshot.enemyCore.health > 0 ? 0 : 30),
        y: snapshot.enemy.position.y,
      };
      spawnBullet(
        snapshot,
        {
          x: player.position.x + player.facing * 34,
          y: player.position.y - 4,
        },
        aim,
        "player",
        680,
        12,
        "#7ef9ff",
        6,
      );
      player.shootCooldown = 0.16;
      player.heat = clamp(player.heat + 14, 0, 100);
      spawnParticles(snapshot, player.position, 5, "#7ef9ff", 60);
    }

    if (keys.has("k") && player.dashCooldown <= 0) {
      const dashDirection = isMoving
        ? direction
        : normalize({
            x: snapshot.enemy.position.x - player.position.x,
            y: snapshot.enemy.position.y - player.position.y,
          });

      player.position.x = clamp(player.position.x + dashDirection.x * 140, 80, WORLD.width - 80);
      player.position.y = clamp(player.position.y + dashDirection.y * 140, 80, WORLD.height - 80);
      player.dashCooldown = 2.8;
      player.invulnerable = 0.25;
      player.overdrive = clamp(player.overdrive + 8, 0, 100);
      pushLog(snapshot, "Vector dash primed. Repositioning complete.");
      spawnParticles(snapshot, player.position, 12, "#9bf6ff", 230);
    }

    if (keys.has("l") && player.pulseCooldown <= 0 && player.overdrive >= 35) {
      snapshot.pulses.push({
        id: snapshot.entityId++,
        position: { ...player.position },
        radius: 20,
        maxRadius: 170,
        alpha: 0.55,
      });
      player.pulseCooldown = 7.5;
      player.overdrive -= 35;
      pushLog(snapshot, "Nova pulse fired. Enemy projectiles disrupted.");
      spawnParticles(snapshot, player.position, 18, "#ffe66d", 260);
    }
  };

  const handleEnemy = (snapshot: GameSnapshot, delta: number) => {
    const { enemy, player, enemyCore, playerCore } = snapshot;

    if (snapshot.enemyDecisionTimer <= 0) {
      snapshot.enemyDecisionTimer = 1.1 + Math.random() * 0.9;
      const pressureBias = playerCore.health < 110 ? 0.62 : 0.38;
      const attackCore = Math.random() < pressureBias;

      snapshot.enemyGoal = attackCore
        ? {
            x: playerCore.position.x + 180 + Math.random() * 80,
            y: playerCore.position.y + (Math.random() - 0.5) * 220,
          }
        : {
            x: player.position.x + 120 + Math.random() * 100,
            y: player.position.y + (Math.random() - 0.5) * 160,
          };
    }

    const desired = normalize({
      x: snapshot.enemyGoal.x - enemy.position.x,
      y: snapshot.enemyGoal.y - enemy.position.y,
    });
    const speed = 175 + snapshot.wave * 10;
    enemy.velocity.x = desired.x * speed;
    enemy.velocity.y = desired.y * speed;
    enemy.position.x = clamp(enemy.position.x + enemy.velocity.x * delta, 80, WORLD.width - 80);
    enemy.position.y = clamp(enemy.position.y + enemy.velocity.y * delta, 80, WORLD.height - 80);

    if (Math.abs(enemy.velocity.x) > 4) {
      enemy.facing = Math.sign(enemy.velocity.x);
    }

    const target = distance(enemy.position, player.position) < 250 ? player.position : playerCore.position;
    if (enemy.shootCooldown <= 0 && enemy.heat < 90) {
      spawnBullet(
        snapshot,
        {
          x: enemy.position.x + enemy.facing * 34,
          y: enemy.position.y - 4,
        },
        target,
        "enemy",
        500 + snapshot.wave * 20,
        10 + snapshot.wave * 0.7,
        "#ff6b9d",
        7,
      );
      enemy.shootCooldown = Math.max(0.33, 0.85 - snapshot.enemyAggression * 0.2);
      enemy.heat = clamp(enemy.heat + 12, 0, 100);
      spawnParticles(snapshot, enemy.position, 4, "#ff6b9d", 50);
    }

    if (
      enemy.overdrive > 55 &&
      enemy.dashCooldown <= 0 &&
      distance(enemy.position, player.position) < 200
    ) {
      const evade = normalize({
        x: enemy.position.x - player.position.x,
        y: (Math.random() - 0.5) * 2,
      });
      enemy.position.x = clamp(enemy.position.x + evade.x * 120, 80, WORLD.width - 80);
      enemy.position.y = clamp(enemy.position.y + evade.y * 120, 80, WORLD.height - 80);
      enemy.dashCooldown = 4.2;
      enemy.overdrive -= 35;
      enemy.invulnerable = 0.18;
      spawnParticles(snapshot, enemy.position, 10, "#ff9eb5", 180);
    }

    if (
      enemy.pulseCooldown <= 0 &&
      enemy.overdrive >= 75 &&
      distance(enemy.position, player.position) < 185
    ) {
      snapshot.pulses.push({
        id: snapshot.entityId++,
        position: { ...enemy.position },
        radius: 16,
        maxRadius: 140,
        alpha: 0.4,
      });
      enemy.pulseCooldown = 9;
      enemy.overdrive -= 50;
      pushLog(snapshot, "Enemy ace unleashed a shockwave.");
      spawnParticles(snapshot, enemy.position, 15, "#ff8fab", 230);
    }

    if (enemyCore.health <= 120) {
      snapshot.enemyAggression = 0.82;
    }
  };

  const spawnDrone = (snapshot: GameSnapshot) => {
    const side = Math.random() < 0.5 ? -1 : 1;
    const yBand = 120 + Math.random() * (WORLD.height - 240);
    snapshot.drones.push({
      id: snapshot.entityId++,
      position: {
        x: WORLD.width / 2 + side * (80 + Math.random() * 120),
        y: yBand,
      },
      velocity: { x: 0, y: 0 },
      health: 28 + snapshot.wave * 4,
      maxHealth: 28 + snapshot.wave * 4,
      radius: 18,
      shootCooldown: 1.4 + Math.random(),
      bob: Math.random() * Math.PI * 2,
    });
  };

  const handleDrones = (snapshot: GameSnapshot, delta: number) => {
    if (snapshot.spawnTimer <= 0) {
      const amount = snapshot.wave >= 4 ? 2 : 1;
      for (let count = 0; count < amount; count += 1) {
        spawnDrone(snapshot);
      }
      snapshot.spawnTimer = Math.max(2.6, 5.2 - snapshot.wave * 0.3);
      pushLog(snapshot, `Wave ${snapshot.wave} pressure spike detected.`);
    }

    snapshot.drones = snapshot.drones.filter((drone) => {
      drone.shootCooldown -= delta;
      drone.bob += delta * 3;

      const target =
        distance(drone.position, snapshot.player.position) < 260
          ? snapshot.player.position
          : snapshot.playerCore.position;
      const drift = normalize({
        x: target.x - drone.position.x,
        y: target.y - drone.position.y + Math.sin(drone.bob) * 30,
      });
      drone.velocity.x = drift.x * (110 + snapshot.wave * 8);
      drone.velocity.y = drift.y * (110 + snapshot.wave * 8);
      drone.position.x = clamp(drone.position.x + drone.velocity.x * delta, 120, WORLD.width - 120);
      drone.position.y = clamp(drone.position.y + drone.velocity.y * delta, 90, WORLD.height - 90);

      if (drone.shootCooldown <= 0) {
        spawnBullet(
          snapshot,
          { ...drone.position },
          target,
          "drone",
          360 + snapshot.wave * 10,
          8 + snapshot.wave * 0.4,
          "#f7aef8",
          5,
        );
        drone.shootCooldown = 1.8 + Math.random() * 0.9;
      }

      if (drone.health <= 0) {
        snapshot.score += 120;
        snapshot.player.overdrive = clamp(snapshot.player.overdrive + 10, 0, 100);
        spawnParticles(snapshot, drone.position, 16, "#f7aef8", 220);
        return false;
      }

      return true;
    });
  };

  const applyDamage = (
    snapshot: GameSnapshot,
    target: Unit | Core | Drone,
    amount: number,
    color: string,
  ) => {
    target.health = Math.max(0, target.health - amount);
    spawnParticles(snapshot, target.position, 7, color, 130);
  };

  const updateBullets = (snapshot: GameSnapshot, delta: number) => {
    snapshot.bullets = snapshot.bullets.filter((bullet) => {
      bullet.position.x += bullet.velocity.x * delta;
      bullet.position.y += bullet.velocity.y * delta;
      bullet.life -= delta;

      if (
        bullet.life <= 0 ||
        bullet.position.x < -80 ||
        bullet.position.x > WORLD.width + 80 ||
        bullet.position.y < -80 ||
        bullet.position.y > WORLD.height + 80
      ) {
        return false;
      }

      if (bullet.owner !== "player") {
        if (
          distance(bullet.position, snapshot.player.position) <
            bullet.radius + snapshot.player.radius &&
          snapshot.player.invulnerable <= 0
        ) {
          applyDamage(snapshot, snapshot.player, bullet.damage, "#7ef9ff");
          snapshot.player.overdrive = clamp(snapshot.player.overdrive + 12, 0, 100);
          return false;
        }

        if (distance(bullet.position, snapshot.playerCore.position) < bullet.radius + snapshot.playerCore.radius) {
          applyDamage(snapshot, snapshot.playerCore, bullet.damage * 0.9, "#8bd3ff");
          return false;
        }
      }

      if (bullet.owner === "player") {
        if (
          distance(bullet.position, snapshot.enemy.position) <
            bullet.radius + snapshot.enemy.radius &&
          snapshot.enemy.invulnerable <= 0
        ) {
          applyDamage(snapshot, snapshot.enemy, bullet.damage, "#ff9eb5");
          snapshot.score += 35;
          snapshot.player.overdrive = clamp(snapshot.player.overdrive + 5, 0, 100);
          return false;
        }

        if (distance(bullet.position, snapshot.enemyCore.position) < bullet.radius + snapshot.enemyCore.radius) {
          applyDamage(snapshot, snapshot.enemyCore, bullet.damage * 1.2, "#ffd166");
          snapshot.score += 50;
          return false;
        }

        for (const drone of snapshot.drones) {
          if (distance(bullet.position, drone.position) < bullet.radius + drone.radius) {
            applyDamage(snapshot, drone, bullet.damage * 1.4, "#f7aef8");
            snapshot.score += 20;
            return false;
          }
        }
      }

      return true;
    });
  };

  const updatePulses = (snapshot: GameSnapshot, delta: number) => {
    snapshot.pulses = snapshot.pulses.filter((pulse) => {
      pulse.radius += delta * 320;
      pulse.alpha = Math.max(0, pulse.alpha - delta * 0.8);

      if (distance(pulse.position, snapshot.player.position) < pulse.radius + snapshot.player.radius) {
        snapshot.player.invulnerable = Math.max(snapshot.player.invulnerable, 0.14);
      }

      if (distance(pulse.position, snapshot.enemy.position) < pulse.radius + snapshot.enemy.radius) {
        snapshot.enemy.invulnerable = Math.max(snapshot.enemy.invulnerable, 0.1);
        snapshot.enemy.health = Math.max(0, snapshot.enemy.health - delta * 12);
      }

      snapshot.bullets = snapshot.bullets.filter(
        (bullet) => distance(bullet.position, pulse.position) > pulse.radius + bullet.radius,
      );

      for (const drone of snapshot.drones) {
        if (distance(drone.position, pulse.position) < pulse.radius + drone.radius) {
          drone.health = Math.max(0, drone.health - delta * 24);
        }
      }

      return pulse.radius < pulse.maxRadius;
    });
  };

  const updatePickups = (snapshot: GameSnapshot, delta: number) => {
    if (snapshot.pickupTimer <= 0) {
      snapshot.pickupTimer = 11 + Math.random() * 4;
      const type: Pickup["type"] = Math.random() < 0.5 ? "repair" : "overdrive";
      snapshot.pickups.push({
        id: snapshot.entityId++,
        type,
        position: {
          x: WORLD.width / 2 + (Math.random() - 0.5) * 280,
          y: 130 + Math.random() * (WORLD.height - 260),
        },
        radius: 16,
        ttl: 12,
      });
      pushLog(snapshot, type === "repair" ? "Field repair node online." : "Overdrive shard deployed.");
    }

    snapshot.pickups = snapshot.pickups.filter((pickup) => {
      pickup.ttl -= delta;
      if (pickup.ttl <= 0) {
        return false;
      }

      if (distance(pickup.position, snapshot.player.position) < pickup.radius + snapshot.player.radius) {
        if (pickup.type === "repair") {
          snapshot.player.health = clamp(snapshot.player.health + 24, 0, snapshot.player.maxHealth);
          snapshot.playerCore.health = clamp(
            snapshot.playerCore.health + 18,
            0,
            snapshot.playerCore.maxHealth,
          );
          pushLog(snapshot, "Systems repaired. Hull integrity restored.");
        } else {
          snapshot.player.overdrive = clamp(snapshot.player.overdrive + 34, 0, 100);
          pushLog(snapshot, "Overdrive shard absorbed.");
        }
        spawnParticles(snapshot, pickup.position, 14, "#ffffff", 160);
        return false;
      }

      return true;
    });
  };

  const updateParticles = (snapshot: GameSnapshot, delta: number) => {
    snapshot.particles = snapshot.particles.filter((particle) => {
      particle.position.x += particle.velocity.x * delta;
      particle.position.y += particle.velocity.y * delta;
      particle.life -= delta;
      particle.velocity.x *= 0.95;
      particle.velocity.y *= 0.95;
      return particle.life > 0;
    });
  };

  const updateLogs = (snapshot: GameSnapshot, delta: number) => {
    snapshot.logs = snapshot.logs
      .map((log) => ({ ...log, ttl: log.ttl - delta }))
      .filter((log) => log.ttl > 0);
  };

  const updateWave = (snapshot: GameSnapshot) => {
    const nextWave = 1 + Math.floor(snapshot.elapsed / 26);
    if (nextWave > snapshot.wave) {
      snapshot.wave = nextWave;
      snapshot.enemyAggression = clamp(snapshot.enemyAggression + 0.08, 0.55, 0.95);
      snapshot.enemy.health = clamp(snapshot.enemy.health + 12, 0, snapshot.enemy.maxHealth);
      pushLog(snapshot, `Wave ${snapshot.wave} reached. Enemy ace adapted.`);
    }
  };

  const resolveBodies = (snapshot: GameSnapshot) => {
    const { player, enemy } = snapshot;
    const delta = {
      x: enemy.position.x - player.position.x,
      y: enemy.position.y - player.position.y,
    };
    const overlap = player.radius + enemy.radius - Math.hypot(delta.x, delta.y);

    if (overlap > 0) {
      const normal = normalize(delta);
      player.position.x -= normal.x * overlap * 0.5;
      player.position.y -= normal.y * overlap * 0.5;
      enemy.position.x += normal.x * overlap * 0.5;
      enemy.position.y += normal.y * overlap * 0.5;
    }
  };

  const checkEndConditions = (snapshot: GameSnapshot) => {
    if (snapshot.enemy.health <= 0) {
      snapshot.enemy.health = snapshot.enemy.maxHealth * 0.55;
      snapshot.enemyCore.health = Math.max(0, snapshot.enemyCore.health - 45);
      snapshot.score += 300;
      snapshot.enemyAggression = clamp(snapshot.enemyAggression + 0.06, 0.55, 1);
      pushLog(snapshot, "Enemy ace staggered. Their core is exposed.");
      spawnParticles(snapshot, snapshot.enemy.position, 26, "#ff9eb5", 300);
      snapshot.enemy.position = { x: WORLD.width - 250, y: WORLD.height / 2 };
    }

    if (snapshot.player.health <= 0) {
      snapshot.player.health = snapshot.player.maxHealth * 0.65;
      snapshot.playerCore.health = Math.max(0, snapshot.playerCore.health - 38);
      pushLog(snapshot, "Your mech rebooted. Core shielding took the hit.");
      spawnParticles(snapshot, snapshot.player.position, 24, "#8bd3ff", 300);
      snapshot.player.position = { x: 260, y: WORLD.height / 2 };
    }

    if (snapshot.enemyCore.health <= 0) {
      endRun(snapshot, "victory");
    } else if (snapshot.playerCore.health <= 0) {
      endRun(snapshot, "defeat");
    }
  };

  const drawPanel = (
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    stroke: string,
  ) => {
    context.fillStyle = "rgba(8, 11, 28, 0.78)";
    context.strokeStyle = stroke;
    context.lineWidth = 1.5;
    context.fillRect(x, y, width, height);
    context.strokeRect(x, y, width, height);
  };

  const drawBar = (
    context: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    value: number,
    max: number,
    color: string,
    background = "rgba(255,255,255,0.12)",
  ) => {
    const ratio = clamp(value / max, 0, 1);
    context.fillStyle = background;
    context.fillRect(x, y, width, height);
    context.fillStyle = color;
    context.fillRect(x, y, width * ratio, height);
  };

  const drawArena = (context: CanvasRenderingContext2D, snapshot: GameSnapshot) => {
    const gradient = context.createLinearGradient(0, 0, WORLD.width, WORLD.height);
    gradient.addColorStop(0, "#060816");
    gradient.addColorStop(0.55, "#09112b");
    gradient.addColorStop(1, "#13091f");
    context.fillStyle = gradient;
    context.fillRect(0, 0, WORLD.width, WORLD.height);

    for (let x = 0; x <= WORLD.width; x += 80) {
      context.strokeStyle = "rgba(102, 201, 255, 0.08)";
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, WORLD.height);
      context.stroke();
    }

    for (let y = 0; y <= WORLD.height; y += 80) {
      context.strokeStyle = "rgba(255, 120, 155, 0.06)";
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(WORLD.width, y);
      context.stroke();
    }

    context.strokeStyle = "rgba(147, 227, 255, 0.18)";
    context.setLineDash([18, 16]);
    context.beginPath();
    context.moveTo(WORLD.width / 2, 0);
    context.lineTo(WORLD.width / 2, WORLD.height);
    context.stroke();
    context.setLineDash([]);

    const drawCoreZone = (core: Core, color: string) => {
      const radial = context.createRadialGradient(
        core.position.x,
        core.position.y,
        12,
        core.position.x,
        core.position.y,
        120,
      );
      radial.addColorStop(0, `${color}cc`);
      radial.addColorStop(1, `${color}00`);
      context.fillStyle = radial;
      context.beginPath();
      context.arc(core.position.x, core.position.y, 120, 0, Math.PI * 2);
      context.fill();

      context.strokeStyle = `${color}aa`;
      context.lineWidth = 3;
      context.beginPath();
      context.arc(core.position.x, core.position.y, core.radius, 0, Math.PI * 2);
      context.stroke();

      context.fillStyle = color;
      context.beginPath();
      context.arc(core.position.x, core.position.y, 22, 0, Math.PI * 2);
      context.fill();
    };

    drawCoreZone(snapshot.playerCore, "#69dbff");
    drawCoreZone(snapshot.enemyCore, "#ff7aa2");
  };

  const drawUnit = (
    context: CanvasRenderingContext2D,
    unit: Unit,
    palette: { main: string; glow: string; accent: string },
    label: string,
  ) => {
    context.save();
    context.translate(unit.position.x, unit.position.y);

    context.shadowColor = palette.glow;
    context.shadowBlur = 24;
    context.fillStyle = palette.main;
    context.beginPath();
    context.roundRect(-22, -18, 44, 36, 12);
    context.fill();

    context.fillStyle = palette.accent;
    context.fillRect(-10, -28, 20, 10);
    context.fillRect(unit.facing > 0 ? 20 : -40, -5, 20, 8);
    context.fillRect(-16, 18, 10, 15);
    context.fillRect(6, 18, 10, 15);

    context.shadowBlur = 0;
    context.strokeStyle = "rgba(255,255,255,0.4)";
    context.strokeRect(-22, -18, 44, 36);
    context.restore();

    context.fillStyle = "rgba(255,255,255,0.9)";
    context.font = "12px Inter, system-ui, sans-serif";
    context.fillText(label, unit.position.x - 16, unit.position.y - 36);

    drawBar(
      context,
      unit.position.x - 26,
      unit.position.y - 30,
      52,
      6,
      unit.health,
      unit.maxHealth,
      palette.main,
    );
  };

  const drawGame = (context: CanvasRenderingContext2D, snapshot: GameSnapshot) => {
    context.clearRect(0, 0, WORLD.width, WORLD.height);
    drawArena(context, snapshot);

    for (const pulse of snapshot.pulses) {
      context.strokeStyle = `rgba(255, 230, 109, ${pulse.alpha})`;
      context.lineWidth = 4;
      context.beginPath();
      context.arc(pulse.position.x, pulse.position.y, pulse.radius, 0, Math.PI * 2);
      context.stroke();
    }

    for (const pickup of snapshot.pickups) {
      context.fillStyle = pickup.type === "repair" ? "#9bf6ff" : "#ffe66d";
      context.shadowColor = context.fillStyle;
      context.shadowBlur = 20;
      context.beginPath();
      context.arc(pickup.position.x, pickup.position.y, pickup.radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    }

    for (const bullet of snapshot.bullets) {
      context.fillStyle = bullet.color;
      context.shadowColor = bullet.color;
      context.shadowBlur = 16;
      context.beginPath();
      context.arc(bullet.position.x, bullet.position.y, bullet.radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    }

    for (const drone of snapshot.drones) {
      context.fillStyle = "#d0a2f7";
      context.shadowColor = "#f7aef8";
      context.shadowBlur = 18;
      context.beginPath();
      context.arc(drone.position.x, drone.position.y, drone.radius, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
      drawBar(
        context,
        drone.position.x - 18,
        drone.position.y - 26,
        36,
        4,
        drone.health,
        drone.maxHealth,
        "#f7aef8",
      );
    }

    drawUnit(
      context,
      snapshot.player,
      { main: "#6ee7ff", glow: "#6ee7ff", accent: "#c9f9ff" },
      "YOU",
    );
    drawUnit(
      context,
      snapshot.enemy,
      { main: "#ff7aa2", glow: "#ff7aa2", accent: "#ffd3e0" },
      "ACE",
    );

    for (const particle of snapshot.particles) {
      context.globalAlpha = clamp(particle.life * 2.2, 0, 1);
      context.fillStyle = particle.color;
      context.fillRect(particle.position.x, particle.position.y, particle.size, particle.size);
      context.globalAlpha = 1;
    }

    drawHud(context, snapshot);
  };

  const drawHud = (context: CanvasRenderingContext2D, snapshot: GameSnapshot) => {
    drawPanel(context, 24, 22, 360, 116, "#69dbff");
    drawPanel(context, WORLD.width - 384, 22, 360, 116, "#ff7aa2");
    drawPanel(context, 24, WORLD.height - 172, 370, 132, "#93e1ff");
    drawPanel(context, WORLD.width - 424, WORLD.height - 172, 400, 132, "#ffd166");
    drawPanel(context, WORLD.width / 2 - 130, 22, 260, 88, "rgba(255,255,255,0.3)");

    context.fillStyle = "rgba(255,255,255,0.96)";
    context.font = "700 16px Inter, system-ui, sans-serif";
    context.fillText("PLAYER MECH", 40, 46);
    context.fillText("ENEMY ACE", WORLD.width - 368, 46);
    context.fillText("MISSION BOARD", WORLD.width - 402, WORLD.height - 146);
    context.fillText("TACTICAL SYSTEMS", 42, WORLD.height - 146);

    drawBar(context, 40, 58, 320, 12, snapshot.player.health, snapshot.player.maxHealth, "#69dbff");
    drawBar(context, 40, 82, 320, 10, snapshot.playerCore.health, snapshot.playerCore.maxHealth, "#8bd3ff");
    drawBar(
      context,
      40,
      102,
      320,
      8,
      100 - snapshot.player.heat,
      100,
      "#ffe66d",
      "rgba(255,255,255,0.08)",
    );

    drawBar(
      context,
      WORLD.width - 368,
      58,
      320,
      12,
      snapshot.enemy.health,
      snapshot.enemy.maxHealth,
      "#ff7aa2",
    );
    drawBar(
      context,
      WORLD.width - 368,
      82,
      320,
      10,
      snapshot.enemyCore.health,
      snapshot.enemyCore.maxHealth,
      "#ffb4c8",
    );
    drawBar(
      context,
      WORLD.width - 368,
      102,
      320,
      8,
      snapshot.enemy.overdrive,
      100,
      "#ffd166",
      "rgba(255,255,255,0.08)",
    );

    context.font = "600 12px Inter, system-ui, sans-serif";
    context.fillText("Hull", 40, 56);
    context.fillText("Core Shield", 40, 80);
    context.fillText("Heat Headroom", 40, 100);
    context.fillText("Ace Hull", WORLD.width - 368, 56);
    context.fillText("Enemy Core", WORLD.width - 368, 80);
    context.fillText("Enemy Overdrive", WORLD.width - 368, 100);

    context.textAlign = "center";
    context.font = "700 18px Inter, system-ui, sans-serif";
    context.fillText(`WAVE ${snapshot.wave}`, WORLD.width / 2, 50);
    context.font = "600 13px Inter, system-ui, sans-serif";
    context.fillStyle = "rgba(255,255,255,0.82)";
    context.fillText(`${formatTime(snapshot.elapsed)}  |  SCORE ${snapshot.score}`, WORLD.width / 2, 76);
    context.textAlign = "start";

    const systems = [
      `Fire: J / Space`,
      `Dash: K ${snapshot.player.dashCooldown > 0 ? `(${snapshot.player.dashCooldown.toFixed(1)}s)` : "(ready)"}`,
      `Nova Pulse: L ${snapshot.player.pulseCooldown > 0 ? `(${snapshot.player.pulseCooldown.toFixed(1)}s)` : "(ready)"}`,
      `Pause: P`,
    ];
    systems.forEach((line, index) => {
      context.fillStyle = "rgba(255,255,255,0.9)";
      context.fillText(line, 42, WORLD.height - 118 + index * 22);
    });

    context.fillStyle = "rgba(255,255,255,0.9)";
    context.fillText(`Overdrive ${Math.round(snapshot.player.overdrive)}%`, WORLD.width - 402, WORLD.height - 118);
    context.fillText(`Drones active ${snapshot.drones.length}`, WORLD.width - 402, WORLD.height - 96);
    context.fillText(`Enemy pressure ${(snapshot.enemyAggression * 100).toFixed(0)}%`, WORLD.width - 402, WORLD.height - 74);
    context.fillText("Destroy the enemy core before yours falls.", WORLD.width - 402, WORLD.height - 52);

    snapshot.logs.forEach((log, index) => {
      context.globalAlpha = clamp(log.ttl / 4, 0.2, 1);
      context.fillStyle = "rgba(255,255,255,0.85)";
      context.fillText(log.text, WORLD.width / 2 - 160, 136 + index * 20);
      context.globalAlpha = 1;
    });

    if (snapshot.paused) {
      context.fillStyle = "rgba(4, 7, 15, 0.72)";
      context.fillRect(0, 0, WORLD.width, WORLD.height);
      context.fillStyle = "#ffffff";
      context.textAlign = "center";
      context.font = "700 42px Inter, system-ui, sans-serif";
      context.fillText("PAUSED", WORLD.width / 2, WORLD.height / 2 - 20);
      context.font = "500 18px Inter, system-ui, sans-serif";
      context.fillText("Press P to resume the arena.", WORLD.width / 2, WORLD.height / 2 + 22);
      context.textAlign = "start";
    }
  };

  return (
    <div className="arena-shell">
      <div className="arena-stage">
        <canvas ref={canvasRef} width={WORLD.width} height={WORLD.height} />
      </div>
    </div>
  );
};

export default Game;
