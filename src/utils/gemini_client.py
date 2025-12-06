import google.generativeai as genai
from typing import List, Dict


# 這是為功能 2 專門設計的函式，用於呼叫讀者 AI
def get_reader_ai_response(novel_excerpt: str,  api_key: str) -> str:
    """
    呼叫 Google Gemini API，以讀者視角對小說片段進行評價。

    Args:
        novel_excerpt (str): 使用者提供的小說片段。

    Returns:
        str: Gemini API 回傳的讀後評價。
    """
    genai.configure(api_key=api_key) # 新增這行來設定 API 金鑰
    model = genai.GenerativeModel('gemini-2.5-flash')
    
    # 這是給 AI 的系統提示，引導其以讀者角度回覆
    system_prompt = """你是一位專業的讀者和評論家。你的任務是閱讀我提供的小說片段，並給予具體且有建設性的讀後評價。
你的評價應涵蓋以下幾點：
1. **整體感受：** 閱讀這段文字時，你的第一印象是什麼？
2. **優點：** 哪些部分寫得特別好？例如角色塑造、情節推進、氛圍營造等。
3. **可改進處：** 哪些部分可以做得更好？提供具體的修改建議，幫助作者提升寫作質量。

請以友善且鼓勵的語氣回覆，並確保你的回覆長度適中。
"""
    
    # 將系統提示和使用者輸入結合
    full_prompt = f"{system_prompt}\n\n我的小說片段如下：\n{novel_excerpt}"
    
    # 使用 try-except 區塊來處理潛在的 API 呼叫錯誤
    try:
        response = model.generate_content(full_prompt)
        return response.text
    except Exception as e:
        # 如果發生錯誤，回傳錯誤訊息而非程式崩潰
        return f"讀者 AI 服務發生錯誤：{e}"

def get_scriptwriter_ai_response(history: List[Dict], new_message: str, context: str, api_key: str):
    """
    處理與編劇 AI 的多輪對話，包含上下文記憶與 RAG 檢索。

    Args:
        history (List[Dict]): 包含所有過往對話的列表。
        new_message (str): 使用者輸入的新訊息。
        context (str): 來自知識庫的相關上下文內容。

    Returns:
        generator: 回傳一個產生器，逐字回傳 AI 的回覆內容，以實現串流效果。
    """
    genai.configure(api_key=api_key) # 新增這行來設定 API 金鑰
    model = genai.GenerativeModel('gemini-2.5-flash')

    # 設定編劇 AI 的系統提示，引導其行為
    system_prompt = """你是一位才華洋溢的專業編劇。你的任務是與我共同討論我的小說情節，並給予建設性的建議。
你應該：
1. **以協作夥伴的身份**，與我一起進行腦力激盪。
2. **記憶**我們之間的對話，並在後續回覆中參考這些討論。
3. 針對我提出的情節、角色或世界觀問題，給予**具體且有創意的建議**。
4. 針對我提供的小說片段，**提出後續情節發展的可能方向**。
5. 保持**簡潔**，除非我要求詳細的解釋。
6. 回覆應**以繁體中文**為主。
"""
    
    # 這是 RAG 的核心：將檢索到的上下文加入提示
    full_prompt = f"{system_prompt}\n\n相關上下文：\n{context}\n\n使用者輸入：\n{new_message}"
    
    # 使用 start_chat() 來初始化對話，並將系統提示作為起始點
    chat = model.start_chat(history=history)

    try:
        # 使用 generate_content 來進行串流回覆
        response = chat.send_message(full_prompt, stream=True)
        
        # 逐字回傳回覆內容，以便在前端實現打字機效果
        for chunk in response:
            yield chunk.text
            
    except Exception as e:
        # 如果 API 呼叫失敗，拋出異常以便在 app.py 中處理
        raise Exception(f"編劇 AI 服務發生錯誤：{e}")
