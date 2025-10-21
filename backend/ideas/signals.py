import glob, logging, re, numpy as np
from django.db.models.signals import post_save
from django.dispatch import receiver
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from .models import Idea
from .semantic_trainer import fine_tune_model

logger = logging.getLogger(__name__)

def get_latest_model():
    paths = sorted(glob.glob("models/mindlink-v*"))
    if not paths:
        return SentenceTransformer("all-MiniLM-L6-v2")
    return SentenceTransformer(paths[-1])

model = get_latest_model()

ITALIAN_STOPWORDS = [
    "a","ad","al","allo","ai","agli","alla","alle","con","col","coi","da","dal","dallo",
    "dai","dagli","dalla","dalle","di","del","dello","dei","degli","della","delle","in",
    "nel","nello","nei","negli","nella","nelle","su","sul","sullo","sui","sugli","sulla",
    "sulle","per","tra","fra","il","lo","la","i","gli","le","un","uno","una","ma","o","e",
    "anche","come","dove","quando","che","chi","cui","non","più","meno","mi","ti","si","ci",
    "vi","ne","ho","hai","ha","abbiamo","avete","hanno","sono","sei","era","erano","fui",
    "fu","fummo","foste","furono","questo","quello","quella","queste","questi","quelli","quelle"
]

def clean_text(text: str):
    return re.sub(r"[^a-zA-Zàèéìòùç\s]", "", text.lower())

def extract_keywords(text, top_k=5):
    try:
        vectorizer = TfidfVectorizer(stop_words=ITALIAN_STOPWORDS, max_features=50)
        tfidf = vectorizer.fit_transform([text])
        scores = zip(vectorizer.get_feature_names_out(), tfidf.toarray()[0])
        sorted_keywords = sorted(scores, key=lambda x: x[1], reverse=True)
        return [kw for kw, _ in sorted_keywords[:top_k]]
    except Exception as e:
        logger.warning(f"⚠️ Errore in extract_keywords: {e}")
        return []

def summarize_text(text: str):
    sentences = [s.strip() for s in re.split(r"[.!?]", text) if len(s.split()) > 4]
    if not sentences:
        return text
    embeddings = model.encode(sentences)
    centroid = np.mean(embeddings, axis=0)
    similarities = np.dot(embeddings, centroid) / (
        np.linalg.norm(embeddings, axis=1) * np.linalg.norm(centroid)
    )
    top_sentence = sentences[np.argmax(similarities)]
    return top_sentence.strip()

def classify_text(text: str):
    topics = ["tecnologia", "educazione", "ambiente", "salute", "economia"]
    topic_embeddings = model.encode(topics)
    emb = model.encode([text])
    sims = np.dot(emb, topic_embeddings.T)[0]
    return topics[int(np.argmax(sims))]

@receiver(post_save, sender=Idea)
def auto_analyze_and_train(sender, instance, created, **kwargs):
    if created:
        try:
            text = instance.content or ""
            cleaned = clean_text(text)
            summary = summarize_text(cleaned)
            category = classify_text(cleaned)
            keywords = extract_keywords(cleaned)
            embedding = model.encode([cleaned])[0].tolist()

            instance.summary = summary
            instance.category = category
            instance.keywords = keywords
            instance.embedding = embedding
            instance.save()

            logger.info(f"🧠 Analisi e embedding completati per idea #{instance.id}")

            total = Idea.objects.filter(used_for_training=False).count()
            if total >= 9:
                print("🚀 Trigger automatico: 50 nuove idee → avvio training batch...")
                fine_tune_model()
        except Exception as e:
            logger.error(f"Errore durante analisi/embedding idea #{instance.id}: {e}")
