import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// 弹丸类型
type Bullet = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  ownerId: number;
};

// 游戏状态类型定义
type MechState = {
  id: number;
  health: number;
  maxHealth: number;
  position: { x: number; y: number };
  direction: 'left' | 'right';
  state: 'idle' | 'move' | 'attack';
  animationFrame: number;
  attackCooldown: number;
};

type BaseState = {
  id: number;
  health: number;
  maxHealth: number;
  position: { x: number; y: number };
  side: 'left' | 'right';
};

const Game = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  
  // 使用useRef来保存游戏状态，避免闭包问题
  const mech1Ref = useRef<MechState>({
    id: 1,
    health: 100,
    maxHealth: 100,
    position: { x: 150, y: 300 },
    direction: 'right',
    state: 'idle',
    animationFrame: 0,
    attackCooldown: 0
  });
  
  const mech2Ref = useRef<MechState>({
    id: 2,
    health: 100,
    maxHealth: 100,
    position: { x: 650, y: 300 },
    direction: 'left',
    state: 'idle',
    animationFrame: 0,
    attackCooldown: 0
  });
  
  const base1Ref = useRef<BaseState>({
    id: 1,
    health: 200,
    maxHealth: 200,
    position: { x: 50, y: 250 },
    side: 'left'
  });
  
  const base2Ref = useRef<BaseState>({
    id: 2,
    health: 200,
    maxHealth: 200,
    position: { x: 650, y: 250 },
    side: 'right'
  });
  
  const bulletsRef = useRef<Bullet[]>([]);
  const bulletIdRef = useRef(0);
  
  const [forceRender, setForceRender] = useState(0);
  const keysPressed = useRef<Set<string>>(new Set());
  const animationId = useRef<number>(0);
  const lastTime = useRef<number>(0);

  // 初始化游戏
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布尺寸
    const resizeCanvas = () => {
      canvas.width = 800;
      canvas.height = 600;
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // 键盘事件监听
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());
      keysPressed.current.add(e.key);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
      keysPressed.current.delete(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // 游戏循环
    const gameLoop = (timestamp: number) => {
      if (!lastTime.current) lastTime.current = timestamp;
      const deltaTime = timestamp - lastTime.current;
      lastTime.current = timestamp;

      // 处理玩家输入
      handleInput();

      // 更新游戏状态
      updateGameState(deltaTime);

      // 更新弹丸
      updateBullets();

      // 碰撞检测
      checkCollisions();

      // 渲染游戏
      renderGame(ctx);

      // 检查游戏结束
      checkGameOver();

      animationId.current = requestAnimationFrame(gameLoop);
    };

    animationId.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      cancelAnimationFrame(animationId.current);
    };
  }, []);

  // 处理玩家输入
  const handleInput = () => {
    const mech1 = mech1Ref.current;
    const mech2 = mech2Ref.current;
    let mech1Moved = false;
    let mech2Moved = false;

    // 玩家1控制 (WASD移动，J攻击)
    if (keysPressed.current.has('w')) {
      mech1.position.y = Math.max(100, mech1.position.y - 4);
      mech1Moved = true;
    }
    if (keysPressed.current.has('s')) {
      mech1.position.y = Math.min(500, mech1.position.y + 4);
      mech1Moved = true;
    }
    if (keysPressed.current.has('a')) {
      mech1.position.x = Math.max(100, mech1.position.x - 4);
      mech1.direction = 'left';
      mech1Moved = true;
    }
    if (keysPressed.current.has('d')) {
      mech1.position.x = Math.min(350, mech1.position.x + 4);
      mech1.direction = 'right';
      mech1Moved = true;
    }
    if (keysPressed.current.has('j') && mech1.attackCooldown <= 0) {
      mech1.state = 'attack';
      fireBullet(mech1);
      mech1.attackCooldown = 30; // 0.5秒冷却
    }

    if (mech1Moved && mech1.state !== 'attack') {
      mech1.state = 'move';
    }

    // 玩家2控制 (方向键移动，1攻击)
    if (keysPressed.current.has('ArrowUp')) {
      mech2.position.y = Math.max(100, mech2.position.y - 4);
      mech2Moved = true;
    }
    if (keysPressed.current.has('ArrowDown')) {
      mech2.position.y = Math.min(500, mech2.position.y + 4);
      mech2Moved = true;
    }
    if (keysPressed.current.has('ArrowLeft')) {
      mech2.position.x = Math.max(450, mech2.position.x - 4);
      mech2.direction = 'left';
      mech2Moved = true;
    }
    if (keysPressed.current.has('ArrowRight')) {
      mech2.position.x = Math.min(700, mech2.position.x + 4);
      mech2.direction = 'right';
      mech2Moved = true;
    }
    if (keysPressed.current.has('1') && mech2.attackCooldown <= 0) {
      mech2.state = 'attack';
      fireBullet(mech2);
      mech2.attackCooldown = 30; // 0.5秒冷却
    }

    if (mech2Moved && mech2.state !== 'attack') {
      mech2.state = 'move';
    }
  };

  // 发射弹丸
  const fireBullet = (mech: MechState) => {
    const bullet: Bullet = {
      id: bulletIdRef.current++,
      x: mech.position.x + (mech.direction === 'right' ? 64 : -8),
      y: mech.position.y + 32,
      vx: mech.direction === 'right' ? 8 : -8,
      vy: 0,
      ownerId: mech.id
    };
    bulletsRef.current.push(bullet);
  };

  // 更新弹丸
  const updateBullets = () => {
    const bullets = bulletsRef.current;
    const newBullets = bullets.filter(bullet => {
      bullet.x += bullet.vx;
      bullet.y += bullet.vy;
      
      // 移除超出边界的弹丸
      return bullet.x > -20 && bullet.x < 820 && bullet.y > -20 && bullet.y < 620;
    });
    bulletsRef.current = newBullets;
  };

  // 碰撞检测
  const checkCollisions = () => {
    const mech1 = mech1Ref.current;
    const mech2 = mech2Ref.current;
    const base1 = base1Ref.current;
    const base2 = base2Ref.current;
    const bullets = bulletsRef.current;
    
    const remainingBullets: Bullet[] = [];
    
    for (const bullet of bullets) {
      let bulletHit = false;
      
      if (bullet.ownerId === 1) {
        // 玩家1的弹丸
        // 检查是否击中玩家2
        if (checkAABB(bullet, mech2.position, 8, 8, 64, 64)) {
          mech2.health = Math.max(0, mech2.health - 10);
          bulletHit = true;
        }
        // 检查是否击中对方基地
        else if (checkAABB(bullet, base2.position, 8, 8, 100, 100)) {
          base2.health = Math.max(0, base2.health - 15);
          bulletHit = true;
        }
      } else {
        // 玩家2的弹丸
        // 检查是否击中玩家1
        if (checkAABB(bullet, mech1.position, 8, 8, 64, 64)) {
          mech1.health = Math.max(0, mech1.health - 10);
          bulletHit = true;
        }
        // 检查是否击中对方基地
        else if (checkAABB(bullet, base1.position, 8, 8, 100, 100)) {
          base1.health = Math.max(0, base1.health - 15);
          bulletHit = true;
        }
      }
      
      if (!bulletHit) {
        remainingBullets.push(bullet);
      }
    }
    
    bulletsRef.current = remainingBullets;
  };

  // AABB碰撞检测
  const checkAABB = (
    obj1: { x: number; y: number },
    obj2Pos: { x: number; y: number },
    w1: number,
    h1: number,
    w2: number,
    h2: number
  ) => {
    return obj1.x < obj2Pos.x + w2 &&
           obj1.x + w1 > obj2Pos.x &&
           obj1.y < obj2Pos.y + h2 &&
           obj1.y + h1 > obj2Pos.y;
  };

  // 更新游戏状态
  const updateGameState = (deltaTime: number) => {
    const mech1 = mech1Ref.current;
    const mech2 = mech2Ref.current;

    // 更新动画帧
    mech1.animationFrame = (mech1.animationFrame + 0.15) % 4;
    mech2.animationFrame = (mech2.animationFrame + 0.15) % 4;

    // 更新攻击冷却
    if (mech1.attackCooldown > 0) {
      mech1.attackCooldown--;
    }
    if (mech2.attackCooldown > 0) {
      mech2.attackCooldown--;
    }

    // 重置状态为 idle
    if (mech1.state !== 'attack') {
      mech1.state = 'idle';
    }
    if (mech2.state !== 'attack') {
      mech2.state = 'idle';
    }

    // 强制重新渲染
    setForceRender(prev => prev + 1);
  };

  // 检查游戏结束
  const checkGameOver = () => {
    const base1 = base1Ref.current;
    const base2 = base2Ref.current;
    
    if (base1.health <= 0) {
      cancelAnimationFrame(animationId.current);
      navigate('/gameover', { state: { winner: 2 } });
    }
    if (base2.health <= 0) {
      cancelAnimationFrame(animationId.current);
      navigate('/gameover', { state: { winner: 1 } });
    }
  };

  // 渲染游戏
  const renderGame = (ctx: CanvasRenderingContext2D) => {
    const mech1 = mech1Ref.current;
    const mech2 = mech2Ref.current;
    const base1 = base1Ref.current;
    const base2 = base2Ref.current;
    const bullets = bulletsRef.current;
    
    // 清空画布
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 800, 600);

    // 绘制场地
    drawBattlefield(ctx);

    // 绘制基地
    drawBase(ctx, base1);
    drawBase(ctx, base2);

    // 绘制机甲
    drawMech(ctx, mech1);
    drawMech(ctx, mech2);

    // 绘制弹丸
    for (const bullet of bullets) {
      drawBullet(ctx, bullet);
    }

    // 绘制UI
    drawUI(ctx, mech1, mech2, base1, base2);
  };

  // 绘制战场
  const drawBattlefield = (ctx: CanvasRenderingContext2D) => {
    // 地面
    ctx.fillStyle = '#0f0f1a';
    ctx.fillRect(0, 550, 800, 50);
    
    // 中间线
    ctx.strokeStyle = '#333344';
    ctx.lineWidth = 2;
    ctx.setLineDash([20, 10]);
    ctx.beginPath();
    ctx.moveTo(400, 0);
    ctx.lineTo(400, 600);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // 网格
    ctx.strokeStyle = '#222233';
    ctx.lineWidth = 1;
    for (let i = 0; i < 800; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 600);
      ctx.stroke();
    }
    for (let i = 0; i < 600; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(800, i);
      ctx.stroke();
    }
  };

  // 绘制基地
  const drawBase = (ctx: CanvasRenderingContext2D, base: BaseState) => {
    const color = base.id === 1 ? '#0066aa' : '#aa0066';
    const x = base.position.x;
    const y = base.position.y;
    
    // 基地主体
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 100, 100);
    
    // 基地装饰
    ctx.fillStyle = base.id === 1 ? '#0088cc' : '#cc0088';
    ctx.fillRect(x + 10, y + 10, 30, 30);
    ctx.fillRect(x + 60, y + 10, 30, 30);
    ctx.fillRect(x + 10, y + 60, 30, 30);
    ctx.fillRect(x + 60, y + 60, 30, 30);
    
    // 基地核心
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(x + 50, y + 50, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // 基地血量条
    const healthPercent = base.health / base.maxHealth;
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y - 20, 100, 10);
    ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
    ctx.fillRect(x, y - 20, 100 * healthPercent, 10);
  };

  // 绘制机甲
  const drawMech = (ctx: CanvasRenderingContext2D, mech: MechState) => {
    let color = mech.id === 1 ? '#00ff00' : '#ff0000';
    
    // 根据状态改变颜色
    if (mech.state === 'attack') {
      color = mech.id === 1 ? '#ffff00' : '#ffaa00';
    }
    
    const x = mech.position.x;
    const y = mech.position.y;
    
    // 身体
    ctx.fillStyle = color;
    ctx.fillRect(x, y, 64, 64);
    
    // 头部
    ctx.fillStyle = mech.id === 1 ? '#00cc00' : '#cc0000';
    ctx.fillRect(x + 16, y - 16, 32, 16);
    
    // 炮管
    ctx.fillStyle = '#666666';
    if (mech.direction === 'right') {
      ctx.fillRect(x + 64, y + 28, 20, 8);
    } else {
      ctx.fillRect(x - 20, y + 28, 20, 8);
    }
    
    // 腿部
    ctx.fillStyle = mech.id === 1 ? '#008800' : '#880000';
    ctx.fillRect(x + 10, y + 64, 16, 16);
    ctx.fillRect(x + 38, y + 64, 16, 16);
    
    // 机甲血量条
    const healthPercent = mech.health / mech.maxHealth;
    ctx.fillStyle = '#333333';
    ctx.fillRect(x, y - 30, 64, 8);
    ctx.fillStyle = healthPercent > 0.5 ? '#00ff00' : healthPercent > 0.25 ? '#ffff00' : '#ff0000';
    ctx.fillRect(x, y - 30, 64 * healthPercent, 8);
  };

  // 绘制弹丸
  const drawBullet = (ctx: CanvasRenderingContext2D, bullet: Bullet) => {
    ctx.fillStyle = bullet.ownerId === 1 ? '#00ffff' : '#ff00ff';
    ctx.beginPath();
    ctx.arc(bullet.x + 4, bullet.y + 4, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // 弹丸光晕
    ctx.fillStyle = bullet.ownerId === 1 ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 0, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(bullet.x + 4, bullet.y + 4, 10, 0, Math.PI * 2);
    ctx.fill();
  };

  // 绘制UI
  const drawUI = (ctx: CanvasRenderingContext2D, mech1: MechState, mech2: MechState, base1: BaseState, base2: BaseState) => {
    // 玩家1信息
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(10, 10, 180, 60);
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 180, 60);
    
    ctx.fillStyle = '#00ff00';
    ctx.font = '12px Press Start 2P';
    ctx.fillText('Player 1', 20, 30);
    ctx.fillText(`Mech: ${mech1.health}`, 20, 45);
    ctx.fillText(`Base: ${base1.health}`, 20, 60);
    
    // 玩家2信息
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(610, 10, 180, 60);
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 2;
    ctx.strokeRect(610, 10, 180, 60);
    
    ctx.fillStyle = '#ff0000';
    ctx.font = '12px Press Start 2P';
    ctx.fillText('Player 2', 620, 30);
    ctx.fillText(`Mech: ${mech2.health}`, 620, 45);
    ctx.fillText(`Base: ${base2.health}`, 620, 60);
  };

  return (
    <div className="relative w-full h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="relative">
        <canvas 
          ref={canvasRef} 
          className="border-4 border-[#ff7700]"
          style={{ width: '800px', height: '600px' }}
        />
      </div>
      <div className="mt-4 flex justify-center space-x-20 text-white font-pixel text-xs">
        <div className="text-center">
          <p className="text-green-400">玩家 1</p>
          <p>WASD 移动</p>
          <p>J 发射弹丸</p>
        </div>
        <div className="text-center">
          <p className="text-red-400">玩家 2</p>
          <p>方向键 移动</p>
          <p>1 发射弹丸</p>
        </div>
      </div>
    </div>
  );
};

export default Game;
