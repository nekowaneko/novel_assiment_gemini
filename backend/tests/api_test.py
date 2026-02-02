from dotenv import load_dotenv
import os
import google.generativeai as genai

# 在程式碼最開頭呼叫 load_dotenv()
load_dotenv()

# 現在，genai 函式庫就可以讀取環境變數了
# 但為了保險，您也可以手動檢查並設定 API 金鑰
api_key = os.getenv("GOOGLE_CLOULD_API_KEY")

if api_key:
    genai.configure(api_key=api_key)
    print("API 金鑰已成功載入！")
else:
    print("錯誤：找不到 GEMINI_API_KEY 環境變數。")

# 接著，您就可以開始使用 Gemini API 了
# model = genai.GenerativeModel('gemini-pro')
# response = model.generate_content("寫一首關於貓的詩")
# print(response.text)