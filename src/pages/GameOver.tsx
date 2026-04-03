import { useNavigate, useLocation } from "react-router-dom";

const GameOver = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const winner = location.state?.winner || 1;

  const restartGame = () => {
    navigate("/game");
  };

  const backToHome = () => {
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
      <div className="text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold text-[#ff7700] animate-pulse font-pixel">
          游戏结束
        </h1>
        <h2 className="text-3xl md:text-4xl font-bold text-white font-pixel">
          玩家 {winner} 获胜！
        </h2>
        <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-4">
          <button 
            onClick={restartGame} 
            className="bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white font-semibold py-3 px-8 rounded-lg border-2 border-[#ff7700] transition duration-200 font-pixel text-lg"
          >
            重新开始
          </button>
          <button 
            onClick={backToHome} 
            className="bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white font-semibold py-3 px-8 rounded-lg border-2 border-[#ff7700] transition duration-200 font-pixel text-lg"
          >
            返回主页
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOver;