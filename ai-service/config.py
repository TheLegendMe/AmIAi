"""
AI Service Configuration
支持多个模型提供商的配置
"""

import os
from dotenv import load_dotenv

load_dotenv()

# 当前使用的模型提供商
# 可选: openai, deepseek, qwen, moonshot, doubao, glm
PROVIDER = os.getenv("AI_PROVIDER", "openai").lower()

# API Keys
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
QWEN_API_KEY = os.getenv("QWEN_API_KEY", "")  # 阿里云DashScope API Key
MOONSHOT_API_KEY = os.getenv("MOONSHOT_API_KEY", "")
DOUBAO_API_KEY = os.getenv("DOUBAO_API_KEY", "")
GLM_API_KEY = os.getenv("GLM_API_KEY", "")

# 自定义Base URL（可覆盖默认值）
DOUBAO_BASE_URL = os.getenv("DOUBAO_BASE_URL", "https://ark.cn-beijing.volces.com/api/v3")
GLM_BASE_URL = os.getenv("GLM_BASE_URL", "https://open.bigmodel.cn/api/paas/v4")

# 模型配置
MODEL_CONFIGS = {
    "openai": {
        "api_key": OPENAI_API_KEY,
        "base_url": "https://api.openai.com/v1",
        "model": os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        "enabled": bool(OPENAI_API_KEY)
    },
    "deepseek": {
        "api_key": DEEPSEEK_API_KEY,
        "base_url": "https://api.deepseek.com/v1",
        "model": os.getenv("DEEPSEEK_MODEL", "deepseek-chat"),
        "enabled": bool(DEEPSEEK_API_KEY)
    },
    "qwen": {
        "api_key": QWEN_API_KEY,
        "base_url": None,  # Qwen使用DashScope SDK
        "model": os.getenv("QWEN_MODEL", "qwen-turbo"),
        "enabled": bool(QWEN_API_KEY)
    },
    "moonshot": {
        "api_key": MOONSHOT_API_KEY,
        "base_url": "https://api.moonshot.cn/v1",
        "model": os.getenv("MOONSHOT_MODEL", "moonshot-v1-8k"),
        "enabled": bool(MOONSHOT_API_KEY)
    },
    "doubao": {
        "api_key": DOUBAO_API_KEY,
        "base_url": DOUBAO_BASE_URL,
        "model": os.getenv("DOUBAO_MODEL", "ep-20240814170708-r523m"),
        "enabled": bool(DOUBAO_API_KEY)
    },
    "glm": {
        "api_key": GLM_API_KEY,
        "base_url": GLM_BASE_URL,
        "model": os.getenv("GLM_MODEL", "glm-4-flash"),
        "enabled": bool(GLM_API_KEY)
    }
}

# 获取当前配置
def get_current_config():
    config = MODEL_CONFIGS.get(PROVIDER)
    if not config:
        raise ValueError(f"Unknown provider: {PROVIDER}")
    if not config["enabled"]:
        raise ValueError(f"Provider {PROVIDER} is not configured (missing API key)")
    return config

# 获取所有可用的提供商
def get_available_providers():
    return [name for name, config in MODEL_CONFIGS.items() if config["enabled"]]
