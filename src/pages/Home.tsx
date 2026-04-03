import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  const startGame = () => {
    navigate("/game");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-8">
        <h1 className="text-3xl md:text-5xl font-bold text-[#ff7700] animate-pulse font-pixel">
          机甲大师对战
        </h1>
        <p className="text-white font-pixel text-sm">基于 RoboMaster 3V3 对抗赛规则</p>
        <div className="flex justify-center">
          <button 
            onClick={startGame} 
            className="bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white font-semibold py-3 px-8 rounded-lg border-2 border-[#ff7700] transition duration-200 font-pixel text-lg"
          >
            开始游戏
          </button>
        </div>
        <div className="bg-black/50 border border-[#1a1a2e] rounded-lg p-6 max-w-3xl">
          <h2 className="text-xl font-bold text-white mb-4 font-pixel">游戏规则</h2>
          <div className="text-left text-white space-y-3 font-pixel text-xs md:text-sm">
            <p className="text-[#ff7700]">【游戏目标】</p>
            <p>保护己方基地，摧毁对方基地！</p>
            <p className="text-[#ff7700] mt-4">【操作说明】</p>
            <p><span className="text-green-400">玩家1（绿色机甲）</span>：WASD移动，J键发射弹丸</p>
            <p><span className="text-red-400">玩家2（红色机甲）</span>：方向键移动，1键发射弹丸</p>
            <p className="text-[#ff7700] mt-4">【胜负判定】</p>
            <p>当一方基地血量降至0时，游戏结束，另一方获胜！</p>
          </div>
        </div>
      </div>
    </div>
  );
}