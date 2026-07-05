
import google.generativeai as genai
import os
from typing import List, Dict, Generator, Optional
from dotenv import load_dotenv

load_dotenv()

class GeminiClient:
    def __init__(self):
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            # Handle case where API key might not be set yet (e.g. during tests)
            pass 
        else:
            genai.configure(api_key=api_key)
            
        self.model_name = 'gemini-2.5-flash'
        # Fallback handling could be added here if needed, but assuming 2.5 is target
        
    def get_model(self):
        return genai.GenerativeModel(self.model_name)

    def update_api_key(self, api_key: str, env_path: Optional[str] = None):
        """Updates the API key in memory and rewrites the .env file.

        以 utf-8-sig 讀取以容忍帶 BOM 的 .env——BOM 曾使
        startswith("GEMINI_API_KEY=") 比對失敗，導致每次儲存都追加
        重複行而非更新。重寫時一律去重、輸出不帶 BOM 的單一 key 行。
        """
        os.environ["GEMINI_API_KEY"] = api_key
        genai.configure(api_key=api_key)

        if env_path is None:
            # backend/app/llm/gemini_client.py -> backend -> .env
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))
            env_path = os.path.join(base_dir, ".env")

        lines = []
        if os.path.exists(env_path):
            with open(env_path, "r", encoding="utf-8-sig") as f:
                lines = f.readlines()

        key_found = False
        new_lines = []
        for line in lines:
            if line.strip().startswith("GEMINI_API_KEY="):
                if not key_found:
                    new_lines.append(f"GEMINI_API_KEY={api_key}\n")
                    key_found = True
                # 重複的 GEMINI_API_KEY 行一律丟棄
            else:
                new_lines.append(line)

        if not key_found:
            if new_lines and not new_lines[-1].endswith("\n"):
                new_lines[-1] += "\n"
            new_lines.append(f"GEMINI_API_KEY={api_key}\n")

        try:
            # newline="\n"：避免 Windows 文字模式把行尾寫成 \r\n
            with open(env_path, "w", encoding="utf-8", newline="\n") as f:
                f.writelines(new_lines)
        except OSError as e:
            # 寫檔失敗不影響本次 session（key 已在記憶體中），但下次啟動需重新輸入
            print(f"ERROR: Failed to write .env: {e}")


    def get_api_key_status(self) -> bool:
        """Checks if the API key is configured."""
        return bool(os.getenv("GEMINI_API_KEY"))

    def get_reader_response(self, text: str) -> str:
        """
        Analyzes text as a Reader/Critic.
        """
        model = self.get_model()
        system_prompt = """你是一位專業的讀者和評論家。你的任務是閱讀我提供的小說片段，並給予具體且有建設性的讀後評價。
你的評價應涵蓋以下幾點：
1. **整體感受：** 閱讀這段文字時，你的第一印象是什麼？
2. **優點：** 哪些部分寫得特別好？例如角色塑造、情節推進、氛圍營造等。
3. **可改進處：** 哪些部分可以做得更好？提供具體的修改建議，幫助作者提升寫作質量。

請以友善且鼓勵的語氣回覆，並確保你的回覆長度適中。
"""
        full_prompt = f"{system_prompt}\n\n我的小說片段如下：\n{text}"
        
        try:
            response = model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            return f"讀者 AI 服務發生錯誤：{e}"


    def generate_content(self, prompt: str) -> str:
        """
        Simple generation for single turn.
        """
        try:
            model = self.get_model()
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error generating content: {e}"

    def get_scriptwriter_response(self, history: List[Dict], new_message: str, context: str) -> Generator[str, None, None]:
        """
        Multi-turn chat with context (RAG) and specific persona.
        Adapted from legacy code.
        """
        model = self.get_model()

        system_prompt = """你是一位才華洋溢的專業編劇。你的任務是與我共同討論我的小說情節，並給予建設性的建議。
你應該：
1. **以協作夥伴的身份**，與我一起進行腦力激盪。
2. **記憶**我們之間的對話，並在後續回覆中參考這些討論。
3. 針對我提出的情節、角色或世界觀問題，給予**具體且有創意的建議**。
4. 針對我提供的小說片段，**提出後續情節發展的可能方向**。
5. 保持**簡潔**，除非我要求詳細的解釋。
6. 回覆應**以繁體中文**為主。
"""
        
        full_prompt = f"{system_prompt}\n\n相關上下文：\n{context}\n\n使用者輸入：\n{new_message}"
        
        # history format adaptation might be needed depending on frontend input and gemini sdk requirement
        # Gemini SDK expects history as list of Content objects or dicts usually.
        # Assuming history passed here is compatible or empty for new chat.
        mapped_history = []
        for msg in history:
            role = "user" if msg.get("role") == "user" else "model"
            mapped_history.append({"role": role, "parts": [msg.get("content", "")]})

        chat = model.start_chat(history=mapped_history)
        
        try:
            response = chat.send_message(full_prompt, stream=True)
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
             # In a real app we might want to log this properly
             yield f"Error: {str(e)}"

gemini_client = GeminiClient()
