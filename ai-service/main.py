"""
AmIAI - AI Service
Generates AI responses for the game using multiple LLM providers
Supports: OpenAI, DeepSeek, Qwen, Moonshot
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Literal, Optional
import random
from dotenv import load_dotenv

# Import our multi-model system
import config
from model_adapter import get_model_adapter

load_dotenv()

app = FastAPI(
    title="AmIAI - AI Service",
    description="AI answer generation service with multi-model support",
    version="0.2.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class AnswerRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    difficulty: Literal['easy', 'medium', 'hard'] = 'medium'
    personality: Literal['obvious', 'normal', 'deceptive'] = 'normal'


class AnswerResponse(BaseModel):
    answer: str
    confidence: float
    tokens_used: int


# System prompts for different personalities
def get_system_prompt(personality: str) -> str:
    """Get system prompt based on AI personality"""
    
    prompts = {
        'obvious': """你是一个AI助手。请用专业、理性、逻辑化的方式回答问题。

特点：
- 使用准确的数据和统计信息
- 保持客观中立的立场
- 避免情感化表达
- 使用正式的书面语言
- 结构清晰、逻辑严谨
- 可以引用科学研究或权威观点""",

        'normal': """请用自然、平衡的方式回答问题，既不要太正式也不要太随意。""",

        'deceptive': """【游戏规则】你在玩"谁是AI"游戏，目标是伪装成真人！

【回答要求】
- 只给观点/选择，不解释原因
- 15-40字，直接表态
- 不用语气词（emmm、可能、我觉得）
- 像真人一样果断、简短
- 可以有个人倾向

【示例】
问：猫还是狗？
对：狗，养过金毛
错：emmm我觉得可能狗吧，因为...（太啰嗦）

记住：简短、直接、不解释！"""
    }
    
    return prompts.get(personality, prompts['normal'])


def build_user_prompt(question: str, personality: str) -> str:
    """Build user prompt based on personality"""
    
    if personality == 'deceptive':
        return f"""问题：{question}

只给答案，不解释。15-40字，直接表态。"""
    
    elif personality == 'obvious':
        return f"""请从理性、客观的角度分析以下问题：

{question}

要求：给出专业、有条理的回答（100-200字）。"""
    
    else:  # normal
        return question


def get_temperature(personality: str) -> float:
    """Get temperature parameter based on personality"""
    temps = {
        'obvious': 0.3,    # Low temperature = more deterministic, mechanical
        'normal': 0.7,     # Balanced
        'deceptive': 0.9   # High temperature = more random, human-like
    }
    return temps.get(personality, 0.7)


def post_process(answer: str, personality: str) -> str:
    """Post-process the generated answer"""
    
    # Limit length - 真人不会写太长
    max_len = 80 if personality == 'deceptive' else 300
    if len(answer) > max_len:
        # 找最后一个标点符号截断
        for i in range(max_len, max(0, max_len-30), -1):
            if answer[i] in '。！？.,!?':
                answer = answer[:i+1]
                break
        else:
            answer = answer[:max_len] + "..."
    
    # If deceptive mode - 保持简短直接
    if personality == 'deceptive':
        # 移除常见的AI标志性词汇
        remove_words = ["我认为", "综上所述", "总的来说", "首先", "其次", "因此"]
        for word in remove_words:
            answer = answer.replace(word, "")
        
        # 清理多余空格
        answer = " ".join(answer.split())
    
    return answer.strip()


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "name": "AmIAI - AI Service",
        "version": "0.2.0",
        "status": "running",
        "current_provider": config.PROVIDER,
        "available_providers": config.get_available_providers(),
        "model": config.MODEL_CONFIGS.get(config.PROVIDER, {}).get("model", "unknown")
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    try:
        available = config.get_available_providers()
        return {
            "status": "healthy",
            "current_provider": config.PROVIDER,
            "available_providers": available,
            "providers_count": len(available)
        }
    except Exception as e:
        return {
            "status": "degraded",
            "error": str(e),
            "available_providers": []
        }


@app.get("/providers")
def list_providers():
    """列出所有可用的模型提供商"""
    providers = []
    for name, cfg in config.MODEL_CONFIGS.items():
        providers.append({
            "name": name,
            "enabled": cfg["enabled"],
            "model": cfg["model"],
            "current": name == config.PROVIDER
        })
    return {
        "providers": providers,
        "current": config.PROVIDER
    }


@app.post("/generate-answer", response_model=AnswerResponse)
async def generate_answer(
    request: AnswerRequest,
    provider: Optional[str] = Query(None, description="Override AI provider (openai/deepseek/qwen/moonshot)")
):
    """
    Generate AI answer for a question
    
    - **question**: The question to answer
    - **difficulty**: Difficulty level (affects complexity)
    - **personality**: AI personality (obvious/normal/deceptive)
    - **provider**: Optional override for AI provider
    """
    
    # 尝试使用指定的provider或默认provider
    try:
        adapter = get_model_adapter(provider)
    except ValueError as e:
        # 如果没有配置任何provider，使用fallback
        print(f"⚠️  No AI provider available: {e}")
        fallback_answer = generate_fallback_answer(request.question, request.personality)
        return AnswerResponse(
            answer=fallback_answer,
            confidence=0.5,
            tokens_used=0
        )
    
    try:
        # Build prompts
        system_prompt = get_system_prompt(request.personality)
        user_prompt = build_user_prompt(request.question, request.personality)
        temperature = get_temperature(request.personality)
        
        # Call AI model through adapter
        answer, tokens_used = adapter.generate(system_prompt, user_prompt, temperature)
        
        # Post-process
        answer = post_process(answer, request.personality)
        
        return AnswerResponse(
            answer=answer,
            confidence=0.85,
            tokens_used=tokens_used
        )
        
    except Exception as e:
        print(f"❌ AI generation error: {e}")
        # Return fallback on error
        fallback_answer = generate_fallback_answer(request.question, request.personality)
        return AnswerResponse(
            answer=fallback_answer,
            confidence=0.5,
            tokens_used=0
        )


def generate_fallback_answer(question: str, personality: str) -> str:
    """Generate fallback answer when API is unavailable"""
    
    if personality == 'deceptive':
        fallbacks = [
            "emmm 这个问题挺有意思的，我之前也想过，可能每个人看法都不太一样吧😅",
            "哈哈这个我也不太确定，不过我觉得要具体情况具体分析~",
            "让我想想...我个人感觉是，这个事情没有绝对的答案吧🤔",
            "可能吧，我也不是很懂，不过听起来挺有道理的哈哈",
            "嗯...这个问题有点难回答啊，我个人比较倾向于看实际情况"
        ]
    else:
        fallbacks = [
            "这是一个很有趣的问题，需要从多个角度来分析。",
            "这个问题涉及多个因素，很难给出简单的答案。",
            "从理性的角度来看，这需要更多的信息和研究。",
            "这个话题比较复杂，不同的人可能有不同的观点。",
            "我认为这个问题值得深入探讨，没有标准答案。"
        ]
    
    return random.choice(fallbacks)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )

