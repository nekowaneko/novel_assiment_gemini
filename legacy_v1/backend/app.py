import os
import sys
from dotenv import load_dotenv
import streamlit as st
import re

# 將 src 目錄添加到系統路徑
sys.path.append(os.path.dirname(os.path.realpath(__file__)))

from src.utils.file_handler import read_docx, read_docx_as_text, write_new_docx
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
st.set_page_config(layout="wide", page_title="AI 寫作伴侶")

# 注入自定義 CSS 以模擬專業寫作介面
st.markdown("""
<style>
    .stApp {
        background-color: #f8f9fa;
    }
    /* 編輯器容器美化 */
    .stTextArea textarea {
        background-color: white;
        padding: 2.5rem;
        border-radius: 4px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        font-family: "Noto Sans TC", "Microsoft JhengHei", sans-serif;
        line-height: 2.0;
        font-size: 1.15rem;
        min-height: 700px;
        color: #2c3e50;
    }
    /* 隱藏標籤 */
    .stTextArea label {
        display: none;
    }
</style>
""", unsafe_allow_html=True)

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
if 'novel_uploader_key' not in st.session_state:
    st.session_state.novel_uploader_key = 0
if 'kb_uploader_key' not in st.session_state:
    st.session_state.kb_uploader_key = 1

# 初始化可用知識庫列表
st.session_state.available_kb_names = list_knowledge_bases()

# --- 側邊欄：統計資訊 ---
with st.sidebar:
    st.header("寫作統計")
    word_count = len(st.session_state.text_content)
    st.metric("目前字數", word_count)
    st.divider()

# --- 佈局：雙欄設計 ---
col1, col2 = st.columns([1.5, 1])

with col1:
    st.header("你的小說內容")
    
    # 檔案上傳
    uploaded_file = st.file_uploader(
        "上傳 Word 檔以開始編輯",
        type=["docx"],
        accept_multiple_files=False,
        key=st.session_state.novel_uploader_key
    )
    
    if uploaded_file and uploaded_file.name != st.session_state.last_novel_file:
        st.session_state.text_content = read_docx_as_text(uploaded_file)
        st.session_state.last_novel_file = uploaded_file.name
        st.rerun()

    # 專業寫作編輯區 (st.text_area)
    # 使用 on_change 處理內容同步會更穩定，但這裡先用基本的賦值
    st.session_state.text_content = st.text_area(
        "編輯區",
        value=st.session_state.text_content,
        placeholder="在這裡開始你的創作...",
        height=700,
        key="main_editor"
    )

    if st.button("儲存並下載 (.docx)"):
        if st.session_state.text_content:
            new_docx_file = write_new_docx(st.session_state.text_content, "你的小說.docx", is_html=False)
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
                    ai_response = get_reader_ai_response(reader_input, GOOGLE_CLOULD_API_KEY)
                    st.session_state.ai_response = ai_response
                except Exception as e:
                    st.error(f"呼叫 AI 服務時發生錯誤：{e}")
        else:
            st.warning("請先在上方輸入或貼上小說片段。")

    if 'ai_response' in st.session_state and st.session_state.ai_response:
        st.info(st.session_state.ai_response)

with col2:
    # --- RAG 知識庫與編劇 AI 聊天 ---
    st.header("編劇 AI 聊天室 (RAG)")
    
    # 選擇要使用的知識庫
    if st.session_state.available_kb_names:
        default_selection = [name for name in st.session_state.selected_kb_names if name in st.session_state.available_kb_names]
        st.session_state.selected_kb_names = st.multiselect(
            "選擇要使用的知識庫：",
            st.session_state.available_kb_names,
            default=default_selection,
            key='kb_selector'
        )
        
        selected_kb_objects = []
        for kb_name in st.session_state.selected_kb_names:
            if kb_name not in st.session_state.knowledge_bases:
                st.session_state.knowledge_bases[kb_name] = load_vector_store(HUGGINGFACEHUB_API_TOKEN, kb_name)
            if st.session_state.knowledge_bases[kb_name]:
                selected_kb_objects.append(st.session_state.knowledge_bases[kb_name])
        st.session_state.selected_kb_objects = selected_kb_objects
        
    st.session_state.kb_ready = bool(st.session_state.selected_kb_objects)

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
            elif uploaded_kb_files and HUGGINGFACEHUB_API_TOKEN:
                progress_bar = st.progress(0, text=f"正在建立 {new_kb_name}...")
                try:
                    vector_store = create_and_persist_vector_store(uploaded_kb_files, doc_type, HUGGINGFACEHUB_API_TOKEN, new_kb_name, progress_bar=progress_bar)
                    st.session_state.available_kb_names = list_knowledge_bases()
                    st.session_state.knowledge_bases[new_kb_name] = vector_store
                    st.success(f"知識庫 '{new_kb_name}' 建立成功！")
                    st.rerun()
                except Exception as e:
                    st.error(f"錯誤：{e}")
                finally:
                    progress_bar.empty()

    if st.session_state.kb_ready:
        st.success(f"已啟用：{', '.join(st.session_state.selected_kb_names)}")
    else:
        st.warning("請選擇一個知識庫。")

    if st.button("清空聊天"):
        st.session_state.messages = []
        st.rerun()

    # 聊天歷史
    for message in st.session_state.messages:
        with st.chat_message(message["role"]):
            st.markdown(message["parts"][0]["text"])

    if prompt := st.chat_input("輸入你的問題..."):
        st.session_state.messages.append({"role": "user", "parts": [{"text": prompt}]})
        with st.chat_message("user"):
            st.markdown(prompt)

        with st.chat_message("model"):
            with st.spinner("思考中..."):
                try:
                    context = get_relevant_context(st.session_state.selected_kb_objects, prompt) if st.session_state.kb_ready else ""
                    stream = get_scriptwriter_ai_response(st.session_state.messages, prompt, context, GOOGLE_CLOULD_API_KEY)
                    response = st.write_stream(stream)
                    st.session_state.messages.append({"role": "model", "parts": [{"text": response}]})
                except Exception as e:
                    st.error(f"服務錯誤：{e}")
