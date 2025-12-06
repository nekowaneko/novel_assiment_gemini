import os
import sys
from dotenv import load_dotenv
import streamlit as st

# 將 src 目錄添加到系統路徑
sys.path.append(os.path.dirname(os.path.realpath(__file__)))

from src.utils.file_handler import read_docx, write_new_docx
from src.utils.gemini_client import get_reader_ai_response, get_scriptwriter_ai_response
from src.utils.knowledge_base import create_and_persist_vector_store, load_vector_store, get_relevant_context, list_knowledge_bases

# --- 環境設定 ---
load_dotenv()

GOOGLE_CLOULD_API_KEY = os.getenv("GOOGLE_CLOULD_API_KEY")
HUGGINGFACEHUB_API_TOKEN = os.getenv("HUGGINGFACEHUB_API_TOKEN")

# 確認至少一個 API 金鑰存在
if not GOOGLE_CLOULD_API_KEY:
    st.error("環境變數中未找到 GOOGLE_CLOULD_API_KEY，請在 .env 檔案中設定。")
    st.stop()

# --- Streamlit 頁面設定與狀態管理 ---
st.set_page_config(layout="wide")
st.title('AI 寫作伴侶')

# 確保所有 session_state 鍵都已初始化
if 'text_content' not in st.session_state:
    st.session_state.text_content = ""
if 'docx_ready' not in st.session_state:
    st.session_state.docx_ready = False
if 'messages' not in st.session_state:
    st.session_state.messages = []
if 'knowledge_bases' not in st.session_state:
    st.session_state.knowledge_bases = {}
if 'kb_ready' not in st.session_state:
    st.session_state.kb_ready = False
if 'available_kb_names' not in st.session_state:
    st.session_state.available_kb_names = []
if 'selected_kb_names' not in st.session_state:
    st.session_state.selected_kb_names = []
if 'selected_kb_objects' not in st.session_state:
    st.session_state.selected_kb_objects = []
if 'last_novel_file' not in st.session_state:
    st.session_state.last_novel_file = None

# 將兩個 uploader 的初始 key 設為不同值以避免衝突
if 'novel_uploader_key' not in st.session_state:
    st.session_state.novel_uploader_key = 0
if 'kb_uploader_key' not in st.session_state:
    st.session_state.kb_uploader_key = 1

# 在應用程式啟動時，列出所有可用的知識庫名稱，並將其儲存
# 這確保了每次重新執行時，此列表都是最新的
st.session_state.available_kb_names = list_knowledge_bases()

# --- 佈局：使用欄位來分隔不同功能 ---
col1, col2 = st.columns([1.5, 1])

with col1:
    # --- 功能 1: 小說編輯與儲存 ---
    st.header("你的小說內容")
    uploaded_file = st.file_uploader(
        "上傳 Word 檔以開始編輯",
        type=["docx"],
        accept_multiple_files=False,
        key=st.session_state.novel_uploader_key
    )
    
    if uploaded_file and uploaded_file.name != st.session_state.get('last_novel_file'):
        st.session_state.text_content = read_docx(uploaded_file)
        st.session_state.docx_ready = False
        st.session_state.last_novel_file = uploaded_file.name

    edited_text = st.text_area(
        "在這裡編輯你的小說內容：",
        value=st.session_state.text_content,
        height=500,
        key="novel_editor"
    )

    if st.button("儲存並下載"):
        if edited_text:
            new_docx_file = write_new_docx(edited_text, "你的小說.docx")
            st.session_state.docx_ready = True
            st.session_state.new_docx_file = new_docx_file
            st.success("檔案已準備好下載！")
        else:
            st.error("請先輸入一些文字內容！")

    if st.session_state.docx_ready:
        st.download_button(
            label="點此下載新文件",
            data=st.session_state.new_docx_file,
            file_name="你的小說.docx",
            mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )
    
    st.divider()

    # --- 功能 2: 讀者 AI 評價 ---
    st.header("讀者 AI 的讀後評價")
    reader_input = st.text_area(
        "將你想給 AI 閱讀的片段貼在這裡：",
        height=200,
        key="reader_input_text"
    )

    if st.button("請讀者 AI 給出評價"):
        if reader_input:
            with st.spinner("AI 正在閱讀中..."):
                try:
                    ai_response = get_reader_ai_response(reader_input,GOOGLE_CLOULD_API_KEY)
                    st.session_state.ai_response = ai_response
                except Exception as e:
                    st.error(f"呼叫 AI 服務時發生錯誤：{e}")
                    st.session_state.ai_response = ""
        else:
            st.warning("請先在上方輸入或貼上小說片段。")

    if 'ai_response' in st.session_state and st.session_state.ai_response:
        st.markdown("---")
        st.subheader("讀後評價")
        st.info(st.session_state.ai_response)

with col2:
    # --- RAG 知識庫與編劇 AI 聊天 ---
    st.header("編劇 AI 聊天室 (RAG)")
    st.info("請上傳你的世界觀、人物設定等文件，AI 將自動參考這些內容。")

    # 選擇要使用的知識庫
    if st.session_state.available_kb_names:
        # 篩選預設值，確保只包含在可用列表中的知識庫名稱，解決 StreamlitAPIException
        default_selection = [name for name in st.session_state.selected_kb_names if name in st.session_state.available_kb_names]
        
        st.session_state.selected_kb_names = st.multiselect(
            "選擇要使用的知識庫：",
            st.session_state.available_kb_names,
            default=default_selection,
            key='kb_selector'
        )
        
        # 根據選擇的知識庫載入對應的 Chroma 物件
        selected_kb_objects = []
        for kb_name in st.session_state.selected_kb_names:
            if kb_name not in st.session_state.knowledge_bases:
                st.session_state.knowledge_bases[kb_name] = load_vector_store(HUGGINGFACEHUB_API_TOKEN, kb_name)
            if st.session_state.knowledge_bases[kb_name]:
                selected_kb_objects.append(st.session_state.knowledge_bases[kb_name])
        st.session_state.selected_kb_objects = selected_kb_objects
        
    st.session_state.kb_ready = bool(st.session_state.selected_kb_objects)

    # 建立新知識庫的區域
    with st.expander("建立新知識庫"):
        new_kb_name = st.text_input("輸入新知識庫名稱：", key='new_kb_name_input')
        uploaded_kb_files = st.file_uploader(
            "上傳檔案以建立知識庫",
            type=["docx", "txt"],
            accept_multiple_files=True,
            key=st.session_state.kb_uploader_key
        )
        doc_type = st.radio(
            "請選擇檔案類型：",
            ("世界觀設定", "人物設定", "小說大綱", "小說內容"),
            horizontal=True,
            key='new_kb_doc_type'
        )

        if st.button("建立知識庫"):
            if not new_kb_name:
                st.error("請為新的知識庫輸入一個名稱。")
            elif new_kb_name in st.session_state.available_kb_names:
                st.error("該知識庫名稱已存在，請使用另一個名稱。")
            elif uploaded_kb_files:
                if not HUGGINGFACEHUB_API_TOKEN:
                    st.error("請在 `.env` 檔案中設定 HUGGINGFACEHUB_API_TOKEN 來使用 Hugging Face 嵌入模型。")
                else:
                    progress_bar = st.progress(0, text=f"正在建立 {new_kb_name} 知識庫...")
                    try:
                        vector_store = create_and_persist_vector_store(uploaded_kb_files, doc_type, HUGGINGFACEHUB_API_TOKEN, new_kb_name, progress_bar=progress_bar)
                        st.session_state.available_kb_names = list_knowledge_bases()
                        st.session_state.knowledge_bases[new_kb_name] = vector_store
                        st.session_state.selected_kb_names = [new_kb_name]
                        st.success(f"知識庫 '{new_kb_name}' 建立成功！")
                        st.session_state.kb_uploader_key += 1
                        st.rerun()
                    except Exception as e:
                        st.error(f"建立知識庫時發生錯誤：{e}")
                    finally:
                        progress_bar.empty()
            else:
                st.warning("請先上傳檔案！")
                
    # 顯示知識庫狀態
    if st.session_state.kb_ready:
        selected_names_str = ", ".join(st.session_state.selected_kb_names)
        st.success(f"已啟用知識庫：{selected_names_str}")
    else:
        st.warning("請先建立或選擇一個知識庫。")

    # 清空聊天歷史按鈕
    if st.button("清空聊天歷史"):
        st.session_state.messages = []
        st.rerun()

    # 顯示過往對話
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["parts"][0]["text"])

    # 處理使用者輸入
    if prompt := st.chat_input("請輸入你的問題或想法..."):
        st.session_state.messages.append({"role": "user", "parts": [{"text": prompt}]})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("model"):
            with st.spinner("AI 正在思考..."):
                try:
                    context = ""
                    if st.session_state.kb_ready:
                        # 傳遞選定的知識庫物件列表
                        context = get_relevant_context(st.session_state.selected_kb_objects, prompt)
                        
                    stream = get_scriptwriter_ai_response(st.session_state.messages, prompt, context, GOOGLE_CLOULD_API_KEY)
                    response = st.write_stream(stream)
                    
                    
                    # full_response = ""
                    # placeholder = st.empty()
                    # for chunk in stream:
                    #     try:
                    #         full_response += chunk.text
                    #         placeholder.markdown(full_response + "▌")
                    #     except Exception as e:
                            # 忽略無效的或空的 chunk
                    #         continue
                    # placeholder.markdown(full_response)
                    
    
                    st.session_state.messages.append({"role": "model", "parts": [{"text": response}]})
                except Exception as e:
                    st.error(f"編劇 AI 服務發生錯誤：{e}")
                    st.session_state.messages.append({"role": "model", "parts": [{"text": "抱歉，服務發生了問題。"}]})
