"""
多模型适配器
统一不同AI模型的调用接口
"""

from typing import Optional
import openai
import config


class ModelAdapter:
    """AI模型适配器基类"""
    
    def __init__(self, provider: str):
        self.provider = provider
        self.config = config.MODEL_CONFIGS.get(provider)
        if not self.config or not self.config["enabled"]:
            raise ValueError(f"Provider {provider} not available")
    
    def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> tuple[str, int]:
        """
        生成回答
        返回: (answer, tokens_used)
        """
        raise NotImplementedError


class OpenAIAdapter(ModelAdapter):
    """OpenAI兼容模型适配器（OpenAI, DeepSeek, Moonshot, Doubao, GLM 等）"""
    
    def __init__(self, provider: str):
        super().__init__(provider)
        self.client = openai.OpenAI(
            api_key=self.config["api_key"],
            base_url=self.config["base_url"]
        )
    
    def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> tuple[str, int]:
        try:
            print(f"🤖 [AI调用] Provider: {self.provider} | Model: {self.config['model']}")
            
            response = self.client.chat.completions.create(
                model=self.config["model"],
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=60,  # 限制更短，只给答案
                temperature=temperature,
                top_p=0.9
            )
            
            answer = response.choices[0].message.content.strip()
            tokens = response.usage.total_tokens
            
            print(f"✅ [AI响应] Tokens: {tokens} | Answer: {answer[:50]}...")
            
            return answer, tokens
            
        except Exception as e:
            raise Exception(f"{self.provider} API error: {str(e)}")


class QwenAdapter(ModelAdapter):
    """通义千问模型适配器（使用DashScope SDK）"""
    
    def __init__(self, provider: str):
        super().__init__(provider)
        try:
            import dashscope
            dashscope.api_key = self.config["api_key"]
            self.dashscope = dashscope
        except ImportError:
            raise ImportError("Please install dashscope: pip install dashscope")
    
    def generate(self, system_prompt: str, user_prompt: str, temperature: float = 0.7) -> tuple[str, int]:
        try:
            from dashscope import Generation
            
            print(f"🤖 [AI调用] Provider: {self.provider} | Model: {self.config['model']}")
            
            messages = [
                {'role': 'system', 'content': system_prompt},
                {'role': 'user', 'content': user_prompt}
            ]
            
            response = Generation.call(
                model=self.config["model"],
                messages=messages,
                result_format='message',
                max_tokens=60,  # 限制更短，只给答案
                temperature=temperature,
                top_p=0.9
            )
            
            if response.status_code == 200:
                answer = response.output.choices[0].message.content.strip()
                tokens = response.usage.total_tokens
                print(f"✅ [AI响应] Tokens: {tokens} | Answer: {answer[:50]}...")
                return answer, tokens
            else:
                raise Exception(f"Qwen API error: {response.message}")
                
        except Exception as e:
            raise Exception(f"Qwen API error: {str(e)}")


def get_model_adapter(provider: Optional[str] = None) -> ModelAdapter:
    """获取模型适配器"""
    
    if provider is None:
        provider = config.PROVIDER
    
    provider = provider.lower()
    
    # 检查是否可用
    if provider not in config.get_available_providers():
        available = config.get_available_providers()
        if not available:
            raise ValueError("No AI provider is configured. Please set API keys in .env file")
        # 自动切换到第一个可用的
        provider = available[0]
        print(f"⚠️  Requested provider not available, using {provider} instead")
    
    # 返回对应的适配器
    if provider == "qwen":
        return QwenAdapter(provider)
    elif provider in ["openai", "deepseek", "moonshot", "doubao", "glm"]:
        return OpenAIAdapter(provider)
    else:
        raise ValueError(f"Unknown provider: {provider}")
