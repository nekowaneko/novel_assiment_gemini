import os
import shutil
import time
from typing import List
from langchain_community.document_loaders import UnstructuredFileLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_chroma import Chroma
from langchain_core.embeddings import Embeddings
from langchain_huggingface import HuggingFaceEmbeddings # 引入 HuggingFaceEmbeddings


def get_persist_directory():
    """
    獲取知識庫的持久化目錄路徑。
    """
    return "./data/knowledge_base"

KB_DIR = get_persist_directory()

def list_knowledge_bases():
    """列出所有已儲存的知識庫名稱。"""
    if not os.path.exists(KB_DIR):
        return []
    return [name for name in os.listdir(KB_DIR) if os.path.isdir(os.path.join(KB_DIR, name))]

def create_and_persist_vector_store(uploaded_files, doc_type, api_key,kb_name, progress_bar=None):
    """
    從上傳的檔案建立向量資料庫並持久化儲存。

    Args:
        uploaded_files: 使用者上傳的 Streamlit 文件物件列表。
        doc_type (str): 使用者標記的文件類型。
        api_key (str): Hugging Face API 金鑰。
        kb_name: 知識庫名稱。
        progress_bar: 用於更新進度的 Streamlit progress bar 物件。

    Returns:
        Chroma: 建立好的向量資料庫實例。
    """
    # 建立一個臨時目錄來儲存上傳的檔案
    temp_dir = "./temp_docs"
    persist_dir = os.path.join(KB_DIR, kb_name)

    # 這裡的 API Key 主要用於驗證 Hugging Face Hub 的存取權限，
    # 而不是用於每次的 API 呼叫。
    if not api_key:
        raise ValueError("Hugging Face API Key is not provided.")

    # 在將檔案寫入之前，先檢查並建立臨時目錄
    if not os.path.exists(temp_dir):
        os.makedirs(temp_dir)
    
    documents = []
    
    for uploaded_file in uploaded_files:
        file_path = os.path.join(temp_dir, uploaded_file.name)
        with open(file_path, "wb") as f:
            f.write(uploaded_file.getbuffer())

        loader = UnstructuredFileLoader(file_path)
        documents.extend(loader.load())

    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs = text_splitter.split_documents(documents)

    # 使用 HuggingFaceEmbeddings，它會在第一次運行時下載模型
    embeddings = HuggingFaceEmbeddings(
        model_name="sentence-transformers/all-MiniLM-L6-v2"
    )

    batch_size = 50
    vector_store = None
    
    for i in range(0, len(docs), batch_size):
        batch = docs[i:i + batch_size]
        try:
            if i == 0:
                vector_store = Chroma.from_documents(batch, embeddings, persist_directory=persist_dir)
            else:
                vector_store.add_documents(batch)
            
            if progress_bar:
                progress = (i + batch_size) / len(docs)
                progress_bar.progress(min(progress, 1.0))
            
            time.sleep(1)
        except Exception as e:
            print(f"Error processing batch {i // batch_size + 1}: {e}")
            shutil.rmtree(temp_dir)
            raise e

    shutil.rmtree(temp_dir)

    return vector_store

def load_vector_store(api_key, kb_name):
    """
    從持久化目錄載入現有的向量資料庫。

    Args:
        api_key (str): Hugging Face API 金鑰。
        kb_name: 知識庫名稱。

    Returns:
        Chroma: 載入的向量資料庫實例，如果不存在則返回 None。
    """
    persist_dir = os.path.join(KB_DIR, kb_name)
    if os.path.exists(persist_dir) and api_key:
        embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
        return Chroma(persist_directory=persist_dir, embedding_function=embeddings)
    return None


def get_relevant_context(vector_stores: List[Chroma], query: str) -> str:
    """
    從多個向量資料庫中檢索與查詢最相關的上下文。

    Args:
        vector_stores (List[Chroma]): 向量資料庫實例的列表。
        query (str): 使用者的查詢。

    Returns:
        str: 檢索到的相關內容。
    """
    all_docs = []
    for vector_store in vector_stores:
        all_docs.extend(vector_store.similarity_search(query))
    
    context = "相關上下文資料：\n"
    for doc in all_docs:
        context += f"---文件片段---\n{doc.page_content}\n"
    
    return context
