import requests
import json
import faiss
import numpy as np
from huggingface_hub import HfApi
import docx

# Hugging Face API 令牌
API_TOKEN = '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'

# Hugging Face模型 API 的 URL
EMBEDDING_MODEL_URL = "https://api-inference.huggingface.co/models/mixedbread-ai/mxbai-embed-large-v1"

headers = {
    "Authorization": f"Bearer {API_TOKEN}"
}

# 知識庫內容提取
# 以本地.doc為例子

def extract_text_from_docx(file_path):
    doc = docx.Document(file_path)
    full_text = []
    for para in doc.paragraphs:
        full_text.append(para.text)
    return "".join(full_text)

doc_file_path = "C:/Users/Dominic/Desktop/小說集/王者的選擇/王者的選擇_大綱_結局B-2.doc"
documents = [extract_text_from_docx(doc_file_path)]

# 嵌入生成函数，調用Hugging Face API生成嵌入
def embed_texts(texts):
    embeddings = []
    for text in texts:
        payload = {
            "inputs":text,
            "options": {
                "wait_for_model": True
            }
        }
        response = requests.post(EMBEDDING_MODEL_URL, headers=headers, json=payload)
        if response.status_code == 200:
            #print(response.json())
            embeddings.append(response.json())
        else:
            raise Exception(f"Error: {response.status_code}, {response.text}")
    return np.array(embeddings)

# 建立向量資料庫（使用FAISS）
def create_faiss_index(embeddings):
    d = embeddings.shape[1]  # 嵌入向量的维度
    index = faiss.IndexFlatL2(d)  # 使用L2距离
    index.add(embeddings)  # 添加向量到数据库
    return index

# 搜尋最相關的文檔
def search(query, index, documents, top_k=2):
    query_embedding = embed_texts([query])
    distances, indices = index.search(query_embedding, top_k)
    results = [documents[i] for i in indices[0]]
    return results

# 建立嵌入向量並建立向量資料庫
document_embeddings = embed_texts(documents)
index = create_faiss_index(document_embeddings)

# 查詢和檢索相關文檔
query = "我的故事架構是勇者鬥惡龍的變體，有一個勇者與他的夥伴，要去討伐魔王，在這之前，要先打倒一位部下。我應該如何考量部下的登場時機，以及如何將部下的人生故事讓讀者知道，使部下這個角色的形象豐滿?"
search_results = search(query, index, documents)

print(f"Search results: {search_results}")