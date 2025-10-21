from rest_framework.decorators import api_view
from rest_framework.response import Response
from .models import Idea
from .embeddings import generate_embedding
from .similarity import find_similar_ideas
import numpy as np
import re
from sentence_transformers import SentenceTransformer
from sklearn.feature_extraction.text import TfidfVectorizer

model = SentenceTransformer("all-MiniLM-L6-v2")

def clean_text(text: str):
    return re.sub(r"[^a-zA-Zàèéìòùç\s]", "", text.lower())

def extract_keywords(text, top_k=5):
    vectorizer = TfidfVectorizer(stop_words="italian", max_features=50)
    tfidf = vectorizer.fit_transform([text])
    scores = zip(vectorizer.get_feature_names_out(), tfidf.toarray()[0])
    sorted_keywords = sorted(scores, key=lambda x: x[1], reverse=True)
    return [kw for kw, _ in sorted_keywords[:top_k]]

def summarize_text(text: str):
    sentences = [s.strip() for s in re.split(r'[.!?]', text) if len(s.split()) > 4]
    if not sentences:
        return text
    embeddings = model.encode(sentences)
    centroid = np.mean(embeddings, axis=0)
    similarities = np.dot(embeddings, centroid) / (np.linalg.norm(embeddings, axis=1) * np.linalg.norm(centroid))
    top_sentence = sentences[np.argmax(similarities)]
    return top_sentence.strip()

def classify_text(text: str):
    topics = ["tecnologia", "educazione", "ambiente", "salute", "economia"]
    topic_embeddings = model.encode(topics)
    emb = model.encode([text])
    sims = np.dot(emb, topic_embeddings.T)[0]
    return topics[int(np.argmax(sims))]

@api_view(["POST"])
def analyze_idea(request):
    """Analizza un'idea e salva riassunto, categoria e parole chiave nel DB."""
    idea_id = request.data.get("id")
    text = request.data.get("text")

    if idea_id:
        try:
            idea = Idea.objects.get(id=idea_id)
            text = idea.content
        except Idea.DoesNotExist:
            return Response({"error": "idea not found"}, status=404)

    if not text:
        return Response({"error": "missing text"}, status=400)

    cleaned = clean_text(text)
    summary = summarize_text(cleaned)
    category = classify_text(cleaned)
    keywords = extract_keywords(cleaned)

    # 🔥 Se è stata passata un'idea esistente → aggiorniamo il DB
    if idea_id:
        idea.summary = summary
        idea.category = category
        idea.keywords = keywords
        idea.save()
        message = f"Idea {idea_id} aggiornata con analisi AI."
    else:
        message = "Analisi completata senza salvataggio (test standalone)."

    return Response({
        "message": message,
        "summary": summary,
        "category": category,
        "keywords": keywords
    })



@api_view(["POST"])
def refresh_analysis(request):
    """
    Rianalizza tutte le idee presenti nel database.
    Aggiorna summary, category e keywords per ciascuna.
    """
    ideas = Idea.objects.all()
    if not ideas.exists():
        return Response({"message": "Nessuna idea trovata nel database."}, status=404)

    updated = 0
    for idea in ideas:
        text = idea.content
        cleaned = clean_text(text)
        summary = summarize_text(cleaned)
        category = classify_text(cleaned)
        keywords = extract_keywords(cleaned)

        idea.summary = summary
        idea.category = category
        idea.keywords = keywords
        idea.save()
        updated += 1

    return Response({
        "message": f"Analisi completata. Aggiornate {updated} idee.",
        "total_updated": updated
    })
